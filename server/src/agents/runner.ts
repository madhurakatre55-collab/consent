import { getDb } from '../db/schema.js';
import { evaluateProposal, LedgerSpendRecord } from '../policy/engine.js';
import { MandateCompiled } from '../policy/mandateSchema.js';
import { createAndAuthorizeOrder } from '../paypal/client.js';
import { appendLedgerEntry } from '../policy/ledgerHelper.js';

export interface RunAgentParams {
  circleId: string;
  preset?: 'auto_approve' | 'needs_quorum' | 'blocked_merchant' | 'negotiable' | 'custom';
  customProposal?: {
    merchant: string;
    item: string;
    amount: number;
    category: string;
    releaseConditionType?: 'manual_approval' | 'price_target' | 'stock_available' | 'delivery_date';
    targetAmount?: number;
  };
}

export async function runAgentProposal(params: RunAgentParams): Promise<any> {
  const db = getDb();
  const { circleId, preset = 'auto_approve', customProposal } = params;

  // Retrieve circle and active mandate
  const circleRes = await db.execute({
    sql: 'SELECT * FROM circles WHERE id = ?',
    args: [circleId],
  });
  if (circleRes.rows.length === 0) {
    throw new Error(`Circle ${circleId} not found`);
  }
  const circleRow = circleRes.rows[0];

  const mandateRes = await db.execute({
    sql: 'SELECT * FROM mandates WHERE circle_id = ? AND active = 1 ORDER BY version DESC LIMIT 1',
    args: [circleId],
  });
  if (mandateRes.rows.length === 0) {
    throw new Error(`No active mandate found for circle ${circleId}`);
  }
  const mandateRow = mandateRes.rows[0];
  const mandate: MandateCompiled = JSON.parse(mandateRow.compiled_json as string);

  // Retrieve ledger entries to calculate monthly spend
  const proposalsSpendRes = await db.execute({
    sql: 'SELECT amount, status, proposed_at as timestamp FROM payment_proposals WHERE circle_id = ?',
    args: [circleId],
  });
  const ledgerSpend: LedgerSpendRecord[] = proposalsSpendRes.rows.map((r: any) => ({
    amount: Number(r.amount),
    status: r.status,
    timestamp: r.timestamp,
  }));

  // Build candidate proposal based on preset or custom
  let proposalData: {
    merchant: string;
    item: string;
    amount: number;
    category: string;
    currency: string;
    releaseCondition: any;
    isNegotiable?: boolean;
    maxAcceptablePrice?: number;
  };

  if (preset === 'auto_approve') {
    proposalData = {
      merchant: 'FreshMart Organics',
      item: 'Weekly Organic Grocery Basket (Milk, Eggs, Vegetables)',
      amount: Math.min(1250, mandate.per_purchase_auto_approve_limit * 0.8),
      category: 'Groceries',
      currency: mandate.monthly_budget.currency || 'INR',
      releaseCondition: { type: 'manual_approval' },
    };
  } else if (preset === 'needs_quorum') {
    proposalData = {
      merchant: 'MegaBazaar Wholesalers',
      item: 'Quarterly Pantry Restock (Flour, Oil, Rice Bulk 50kg)',
      amount: Math.max(3400, mandate.per_purchase_auto_approve_limit * 1.8),
      category: 'Groceries',
      currency: mandate.monthly_budget.currency || 'INR',
      releaseCondition: {
        type: 'price_target',
        target_amount: 3200,
        current_price: 3400,
      },
    };
  } else if (preset === 'blocked_merchant') {
    proposalData = {
      merchant: mandate.blocked_merchants[0] || 'Suspicious Deals Ltd',
      item: 'Discount High-Wattage Induction Cooker',
      amount: 1999,
      category: 'Household',
      currency: mandate.monthly_budget.currency || 'INR',
      releaseCondition: { type: 'manual_approval' },
    };
  } else if (preset === 'negotiable') {
    proposalData = {
      merchant: 'SmartHome Technologies',
      item: 'Smart Robotic Vacuum & Air Purifier Filter',
      amount: 4999,
      category: 'Household',
      currency: mandate.monthly_budget.currency || 'INR',
      releaseCondition: { type: 'manual_approval' },
      isNegotiable: true,
      maxAcceptablePrice: 4200,
    };
  } else if (customProposal) {
    proposalData = {
      merchant: customProposal.merchant,
      item: customProposal.item,
      amount: customProposal.amount,
      category: customProposal.category,
      currency: mandate.monthly_budget.currency || 'INR',
      releaseCondition: {
        type: customProposal.releaseConditionType || 'manual_approval',
        target_amount: customProposal.targetAmount,
      },
    };
  } else {
    throw new Error(`Invalid preset: ${preset}`);
  }

  // Get merchant price history
  const merchantRes = await db.execute({
    sql: 'SELECT price_history FROM merchants WHERE LOWER(name) = ? LIMIT 1',
    args: [proposalData.merchant.toLowerCase()],
  });
  let priceHistory: number[] = [];
  if (merchantRes.rows.length > 0 && merchantRes.rows[0].price_history) {
    try {
      priceHistory = JSON.parse(merchantRes.rows[0].price_history as string);
    } catch {}
  }

  // Pass strictly to Pure Policy Engine
  const evaluation = evaluateProposal(
    {
      amount: proposalData.amount,
      currency: proposalData.currency,
      merchant: proposalData.merchant,
      category: proposalData.category,
      item: proposalData.item,
    },
    mandate,
    {
      id: circleId,
      name: circleRow.name as string,
      active: circleRow.active as number,
      expires_at: circleRow.expires_at as string | null,
      monthly_budget: Number(circleRow.monthly_budget),
      currency: circleRow.currency as string,
    },
    ledgerSpend,
    priceHistory
  );

  const proposalId = `prop-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const proposedAt = new Date().toISOString();

  let initialStatus: string = 'proposed';
  let paypalOrderId: string | null = null;
  let paypalAuthId: string | null = null;

  if (proposalData.isNegotiable && evaluation.decision !== 'block') {
    initialStatus = 'negotiating';
  } else if (evaluation.decision === 'block') {
    initialStatus = 'blocked';
  } else if (evaluation.decision === 'awaiting_consent') {
    initialStatus = 'awaiting_consent';
  } else if (evaluation.decision === 'approve_now') {
    // Engine explicitly approved! Proceed to PayPal Sandbox intent: AUTHORIZE
    try {
      const authRes = await createAndAuthorizeOrder({
        referenceId: proposalId,
        amount: proposalData.amount,
        currency: proposalData.currency,
        description: `${proposalData.item} via ${proposalData.merchant}`,
      });
      paypalOrderId = authRes.orderId;
      paypalAuthId = authRes.authorizationId || null;
      initialStatus = 'held'; // Held for conditional release
    } catch (err: any) {
      initialStatus = 'failed';
      console.error('PayPal Authorization Failed during auto-approve:', err);
    }
  }

  const releaseDeadline = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO payment_proposals (
      id, circle_id, mandate_id, agent_id, proposed_by_user_id,
      merchant, item, amount, currency, category, proposed_at,
      status, decision_reason, matched_clause, paypal_order_id,
      paypal_authorization_id, release_condition, release_deadline, agreed_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      proposalId,
      circleId,
      mandateRow.id as string,
      'autonomous-purchasing-agent-v1',
      (circleRow.owner_id as string) || 'system',
      proposalData.merchant,
      proposalData.item,
      proposalData.amount,
      proposalData.currency,
      proposalData.category,
      proposedAt,
      initialStatus,
      evaluation.reason,
      evaluation.matched_clause,
      paypalOrderId,
      paypalAuthId,
      JSON.stringify(proposalData.releaseCondition),
      releaseDeadline,
      proposalData.amount,
    ],
  });

  // Append initial ledger entry
  await appendLedgerEntry({
    circle_id: circleId,
    proposal_id: proposalId,
    event_type: initialStatus === 'held' ? 'AUTHORIZED' : initialStatus.toUpperCase(),
    actor: 'purchasing_agent',
    detail: `Proposed ${proposalData.currency} ${proposalData.amount} for "${proposalData.item}" from ${proposalData.merchant}`,
    explanation: `Policy Engine decision: ${evaluation.decision}. Matched clause: ${evaluation.matched_clause}. Reason: ${evaluation.reason}`,
    receiptData: {
      proposal_id: proposalId,
      circle_id: circleId,
      circle_name: circleRow.name as string,
      mandate_version: mandateRow.version as number,
      agent_id: 'autonomous-purchasing-agent-v1',
      merchant: proposalData.merchant,
      item: proposalData.item,
      amount: proposalData.amount,
      currency: proposalData.currency,
      category: proposalData.category,
      matched_clause: evaluation.matched_clause,
      decision_reason: evaluation.reason,
      approvals: [],
      paypal_order_id: paypalOrderId,
      paypal_authorization_id: paypalAuthId,
      final_outcome: initialStatus,
      timestamp: proposedAt,
    },
  });

  return {
    proposalId,
    status: initialStatus,
    evaluation,
    paypalOrderId,
    paypalAuthId,
    item: proposalData.item,
    amount: proposalData.amount,
    merchant: proposalData.merchant,
  };
}
