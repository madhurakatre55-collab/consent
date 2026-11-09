import { getDb } from '../db/schema.js';
import { captureAuthorization, voidAuthorization } from '../paypal/client.js';
import { appendLedgerEntry } from '../policy/ledgerHelper.js';
import { config } from '../config/env.js';

export interface ReleaseCheckResult {
  proposalId: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}

/**
 * Checks all held proposals and evaluates if conditions are met to trigger capture or void.
 */
export async function checkAndProcessHeldProposals(): Promise<ReleaseCheckResult[]> {
  const db = getDb();
  const results: ReleaseCheckResult[] = [];

  const heldProposalsRes = await db.execute(`
    SELECT p.*, m.compiled_json as mandate_json, c.name as circle_name
    FROM payment_proposals p
    JOIN mandates m ON p.mandate_id = m.id
    JOIN circles c ON p.circle_id = c.id
    WHERE p.status = 'held'
  `);

  const now = Date.now();

  for (const row of heldProposalsRes.rows as any[]) {
    const proposalId = row.id as string;
    const authId = row.paypal_authorization_id as string;
    const amount = Number(row.amount);
    const currency = row.currency as string;
    const circleId = row.circle_id as string;
    const proposedAt = new Date(row.proposed_at).getTime();

    let mandateData: any = {};
    try {
      mandateData = JSON.parse(row.mandate_json);
    } catch {}

    const coolingOffMinutes = config.demoMode
      ? 1
      : mandateData.cooling_off_minutes ?? 1;
    const coolingOffMs = coolingOffMinutes * 60 * 1000;
    const coolingOffPassed = now - proposedAt >= coolingOffMs;

    let condition: any = {};
    try {
      condition = JSON.parse(row.release_condition || '{}');
    } catch {}

    // Check 1: Expiration / Deadline passed
    if (row.release_deadline) {
      const deadline = new Date(row.release_deadline).getTime();
      if (now > deadline) {
        try {
          if (authId) {
            await voidAuthorization({ authorizationId: authId });
          }
          await db.execute({
            sql: "UPDATE payment_proposals SET status = 'expired', decision_reason = ? WHERE id = ?",
            args: ['Authorization voided: release deadline elapsed without condition fulfillment', proposalId],
          });

          await appendLedgerEntry({
            circle_id: circleId,
            proposal_id: proposalId,
            event_type: 'VOIDED',
            actor: 'release_job',
            detail: `Authorization ${authId} voided due to expired deadline`,
            explanation: `Release deadline of ${row.release_deadline} passed. PayPal authorization voided automatically.`,
          });

          results.push({
            proposalId,
            previousStatus: 'held',
            newStatus: 'expired',
            reason: 'Release deadline expired; authorization voided',
          });
          continue;
        } catch (err: any) {
          console.error(`Failed to void expired proposal ${proposalId}:`, err);
        }
      }
    }

    // Check 2: Evaluate condition
    let isConditionSatisfied = false;
    let satisfiedReason = '';

    if (condition.type === 'manual_approval') {
      // Manual approval is handled by explicit endpoint trigger
      isConditionSatisfied = false;
    } else if (condition.type === 'price_target') {
      // Check if price reached target
      const target = Number(condition.target_amount || 0);
      if (amount <= target || condition.current_price <= target) {
        isConditionSatisfied = true;
        satisfiedReason = `Target price of ${currency} ${target} reached`;
      }
    } else if (condition.type === 'stock_available') {
      // Simulated stock availability
      if (condition.stock_status === 'in_stock' || condition.is_available === true) {
        isConditionSatisfied = true;
        satisfiedReason = 'Merchant confirmed inventory in stock';
      }
    } else if (condition.type === 'delivery_date') {
      if (condition.date && now >= new Date(condition.date).getTime()) {
        isConditionSatisfied = true;
        satisfiedReason = `Scheduled delivery milestone date ${condition.date} reached`;
      }
    }

    // Check 3: If cooling off passed AND condition satisfied -> Capture!
    if (coolingOffPassed && isConditionSatisfied) {
      try {
        const captureRes = await captureAuthorization({
          authorizationId: authId,
          amount,
          currency,
        });

        await db.execute({
          sql: "UPDATE payment_proposals SET status = 'captured', decision_reason = ? WHERE id = ?",
          args: [`Captured via PayPal Sandbox: ${satisfiedReason}`, proposalId],
        });

        await appendLedgerEntry({
          circle_id: circleId,
          proposal_id: proposalId,
          event_type: 'CAPTURED',
          actor: 'release_job',
          detail: `Captured authorization ${authId} (Capture ID: ${captureRes.captureId})`,
          explanation: `Conditional release fulfilled: ${satisfiedReason}. Funds captured.`,
        });

        results.push({
          proposalId,
          previousStatus: 'held',
          newStatus: 'captured',
          reason: satisfiedReason,
        });
      } catch (err: any) {
        await db.execute({
          sql: "UPDATE payment_proposals SET status = 'failed', decision_reason = ? WHERE id = ?",
          args: [`PayPal Capture Failed: ${err.message}`, proposalId],
        });

        await appendLedgerEntry({
          circle_id: circleId,
          proposal_id: proposalId,
          event_type: 'FAILED',
          actor: 'release_job',
          detail: `PayPal capture failed for authorization ${authId}`,
          explanation: err.message,
        });

        results.push({
          proposalId,
          previousStatus: 'held',
          newStatus: 'failed',
          reason: `PayPal capture error: ${err.message}`,
        });
      }
    }
  }

  return results;
}

let jobInterval: NodeJS.Timeout | null = null;

export function startReleaseJob(intervalMs: number = 30000): void {
  if (jobInterval) return;
  jobInterval = setInterval(async () => {
    try {
      await checkAndProcessHeldProposals();
    } catch (err) {
      console.error('Error during scheduled release check job:', err);
    }
  }, intervalMs);
}

export function stopReleaseJob(): void {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
  }
}
