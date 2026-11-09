import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { evaluateConsents, CircleMemberInput } from '../policy/engine.js';
import { MandateCompiled } from '../policy/mandateSchema.js';
import { createAndAuthorizeOrder } from '../paypal/client.js';
import { appendLedgerEntry } from '../policy/ledgerHelper.js';

const router = Router();

// GET /pending - List proposals waiting for human consent
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circle_id } = req.query;

    let sql = `
      SELECT p.*, c.name as circle_name, m.compiled_json as mandate_json,
        (SELECT COUNT(*) FROM consent_decisions cd WHERE cd.proposal_id = p.id AND cd.decision = 'approved') as approvals_count,
        (SELECT COUNT(*) FROM consent_decisions cd WHERE cd.proposal_id = p.id AND cd.decision = 'rejected') as rejections_count
      FROM payment_proposals p
      JOIN circles c ON p.circle_id = c.id
      JOIN mandates m ON p.mandate_id = m.id
      WHERE p.status = 'awaiting_consent'
    `;
    const args: any[] = [];
    if (circle_id) {
      sql += ' AND p.circle_id = ?';
      args.push(circle_id);
    }
    sql += ' ORDER BY p.proposed_at DESC';

    const proposalsRes = await db.execute({ sql, args });

    const results = await Promise.all(
      proposalsRes.rows.map(async (row: any) => {
        const decisionsRes = await db.execute({
          sql: `
            SELECT cd.*, u.name as user_name, u.role as user_role
            FROM consent_decisions cd
            JOIN users u ON cd.user_id = u.id
            WHERE cd.proposal_id = ?
            ORDER BY cd.created_at ASC
          `,
          args: [row.id],
        });

        let mandate: any = {};
        try {
          mandate = JSON.parse(row.mandate_json);
        } catch {}

        return {
          ...row,
          mandate,
          decisions: decisionsRes.rows,
        };
      })
    );

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /decide - Human approval or rejection
router.post('/decide', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { proposal_id, user_id, decision, comment = '' } = req.body;

    if (!proposal_id || !user_id || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'proposal_id, user_id, and decision ("approved" or "rejected") are required' });
    }

    // Retrieve proposal
    const propRes = await db.execute({
      sql: `
        SELECT p.*, c.name as circle_name, m.compiled_json as mandate_json
        FROM payment_proposals p
        JOIN circles c ON p.circle_id = c.id
        JOIN mandates m ON p.mandate_id = m.id
        WHERE p.id = ?
      `,
      args: [proposal_id],
    });

    if (propRes.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const proposal = propRes.rows[0];

    if (proposal.status !== 'awaiting_consent') {
      return res.status(400).json({ error: `Cannot decide on proposal in "${proposal.status}" status` });
    }

    // Check user membership and permissions
    const memberRes = await db.execute({
      sql: 'SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?',
      args: [proposal.circle_id, user_id],
    });
    if (memberRes.rows.length === 0) {
      return res.status(403).json({ error: 'User is not a member of this spending circle' });
    }
    const member = memberRes.rows[0];
    if (!member.can_approve) {
      return res.status(403).json({ error: 'User role (Observer) does not have approval permissions' });
    }

    // Get user details for ledger/receipt
    const userRes = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [user_id],
    });
    const userName = (userRes.rows[0]?.name as string) || user_id;

    // Check for existing decision by this user
    const existingDecisionRes = await db.execute({
      sql: 'SELECT * FROM consent_decisions WHERE proposal_id = ? AND user_id = ?',
      args: [proposal_id, user_id],
    });

    const now = new Date().toISOString();
    if (existingDecisionRes.rows.length > 0) {
      await db.execute({
        sql: 'UPDATE consent_decisions SET decision = ?, comment = ?, created_at = ? WHERE proposal_id = ? AND user_id = ?',
        args: [decision, comment, now, proposal_id, user_id],
      });
    } else {
      const decisionId = `cd-${proposal_id}-${user_id}`;
      await db.execute({
        sql: 'INSERT INTO consent_decisions (id, proposal_id, user_id, decision, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [decisionId, proposal_id, user_id, decision, comment, now],
      });
    }

    // Append vote to ledger
    await appendLedgerEntry({
      circle_id: proposal.circle_id as string,
      proposal_id: proposal_id,
      event_type: decision === 'approved' ? 'CONSENT_APPROVED' : 'CONSENT_REJECTED',
      actor: userName,
      detail: `${userName} (${member.role}) ${decision} proposal for ${proposal.item}`,
      explanation: comment ? `Comment: "${comment}"` : undefined,
    });

    // Evaluate overall consent status with circle members & policy
    const allMembersRes = await db.execute({
      sql: 'SELECT * FROM circle_members WHERE circle_id = ?',
      args: [proposal.circle_id],
    });
    const circleMembers: CircleMemberInput[] = allMembersRes.rows.map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      approval_weight: m.approval_weight,
      can_propose: m.can_propose,
      can_approve: m.can_approve,
    }));

    const allDecisionsRes = await db.execute({
      sql: 'SELECT * FROM consent_decisions WHERE proposal_id = ?',
      args: [proposal_id],
    });
    const decisions = allDecisionsRes.rows.map((d: any) => ({
      user_id: d.user_id as string,
      decision: d.decision as 'approved' | 'rejected',
      comment: d.comment as string,
    }));

    const mandate: MandateCompiled = JSON.parse(proposal.mandate_json as string);

    // If category requires guardian, use guardian_required mode
    const isHighRiskCategory = ['electronics', 'medical', 'travel'].includes(
      (proposal.category as string).toLowerCase()
    );
    const effectiveApprovers = isHighRiskCategory
      ? { mode: 'guardian_required' as const, count: 1, roles: ['guardian'] }
      : mandate.required_approvers;

    const consentResult = evaluateConsents(
      {
        amount: Number(proposal.amount),
        currency: proposal.currency as string,
        merchant: proposal.merchant as string,
        category: proposal.category as string,
        item: proposal.item as string,
      },
      effectiveApprovers,
      circleMembers,
      decisions
    );

    let newStatus = proposal.status;
    let paypalOrderId = proposal.paypal_order_id;
    let paypalAuthId = proposal.paypal_authorization_id;

    if (consentResult.isResolved) {
      if (consentResult.status === 'approved') {
        // Group consent satisfied! Proceed to PayPal sandbox AUTHORIZE
        try {
          const authRes = await createAndAuthorizeOrder({
            referenceId: proposal_id,
            amount: Number(proposal.amount),
            currency: proposal.currency as string,
            description: `${proposal.item} via ${proposal.merchant}`,
          });

          paypalOrderId = authRes.orderId;
          paypalAuthId = authRes.authorizationId || null;
          newStatus = 'held'; // Held for conditional release!

          await db.execute({
            sql: "UPDATE payment_proposals SET status = 'held', paypal_order_id = ?, paypal_authorization_id = ?, decision_reason = ? WHERE id = ?",
            args: [paypalOrderId, paypalAuthId, `Consent threshold achieved: ${consentResult.summary}`, proposal_id],
          });

          await appendLedgerEntry({
            circle_id: proposal.circle_id as string,
            proposal_id,
            event_type: 'PAYPAL_AUTHORIZED',
            actor: 'paypal_client',
            detail: `Created PayPal authorization ${paypalAuthId} for order ${paypalOrderId}`,
            explanation: `All required approvals verified. Funds held pending release condition.`,
          });
        } catch (err: any) {
          newStatus = 'failed';
          await db.execute({
            sql: "UPDATE payment_proposals SET status = 'failed', decision_reason = ? WHERE id = ?",
            args: [`PayPal Authorization failed: ${err.message}`, proposal_id],
          });

          await appendLedgerEntry({
            circle_id: proposal.circle_id as string,
            proposal_id,
            event_type: 'FAILED',
            actor: 'paypal_client',
            detail: `PayPal authorization failed: ${err.message}`,
          });
        }
      } else if (consentResult.status === 'blocked') {
        newStatus = 'blocked';
        await db.execute({
          sql: "UPDATE payment_proposals SET status = 'blocked', decision_reason = ? WHERE id = ?",
          args: [consentResult.summary, proposal_id],
        });

        await appendLedgerEntry({
          circle_id: proposal.circle_id as string,
          proposal_id,
          event_type: 'BLOCKED',
          actor: 'consent_engine',
          detail: `Proposal blocked by vote: ${consentResult.summary}`,
        });
      }
    }

    res.json({
      success: true,
      proposal_id,
      newStatus,
      consentResult,
      paypalOrderId,
      paypalAuthId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
