import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { runAgentProposal } from '../agents/runner.js';
import { stepNegotiation } from '../agents/negotiator.js';
import { evaluateProposal, LedgerSpendRecord } from '../policy/engine.js';
import { MandateCompiled } from '../policy/mandateSchema.js';
import { createAndAuthorizeOrder } from '../paypal/client.js';
import { appendLedgerEntry } from '../policy/ledgerHelper.js';

const router = Router();

// GET all proposals
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circle_id, status } = req.query;

    let sql = `
      SELECT p.*, c.name as circle_name,
        (SELECT COUNT(*) FROM consent_decisions cd WHERE cd.proposal_id = p.id AND cd.decision = 'approved') as approvals_count,
        (SELECT COUNT(*) FROM consent_decisions cd WHERE cd.proposal_id = p.id AND cd.decision = 'rejected') as rejections_count
      FROM payment_proposals p
      JOIN circles c ON p.circle_id = c.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (circle_id) {
      sql += ' AND p.circle_id = ?';
      args.push(circle_id);
    }
    if (status) {
      sql += ' AND p.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY p.proposed_at DESC';

    const proposalsRes = await db.execute({ sql, args });

    const results = proposalsRes.rows.map((row: any) => {
      let releaseCondition = null;
      try {
        releaseCondition = JSON.parse(row.release_condition);
      } catch {}

      return {
        ...row,
        release_condition: releaseCondition,
      };
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single proposal
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const proposalRes = await db.execute({
      sql: `
        SELECT p.*, c.name as circle_name, m.compiled_json as mandate_json
        FROM payment_proposals p
        JOIN circles c ON p.circle_id = c.id
        JOIN mandates m ON p.mandate_id = m.id
        WHERE p.id = ?
      `,
      args: [id],
    });

    if (proposalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const row = proposalRes.rows[0];

    // Get decisions
    const decisionsRes = await db.execute({
      sql: `
        SELECT cd.*, u.name as user_name, u.role as user_role
        FROM consent_decisions cd
        JOIN users u ON cd.user_id = u.id
        WHERE cd.proposal_id = ?
        ORDER BY cd.created_at ASC
      `,
      args: [id],
    });

    // Get negotiations
    const negRes = await db.execute({
      sql: 'SELECT * FROM negotiations WHERE proposal_id = ? ORDER BY round ASC',
      args: [id],
    });

    const negotiations = negRes.rows.map((n: any) => {
      let parsedResponse = {};
      try {
        parsedResponse = JSON.parse(n.merchant_response);
      } catch {}
      return {
        ...n,
        merchant_response: parsedResponse,
      };
    });

    let releaseCondition = null;
    try {
      releaseCondition = JSON.parse(row.release_condition as string);
    } catch {}

    let mandate = null;
    try {
      mandate = JSON.parse(row.mandate_json as string);
    } catch {}

    res.json({
      ...row,
      release_condition: releaseCondition,
      mandate,
      decisions: decisionsRes.rows,
      negotiations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST run agent
router.post('/run-agent', async (req: Request, res: Response) => {
  try {
    const { circleId, preset, customProposal } = req.body;
    if (!circleId) {
      return res.status(400).json({ error: 'circleId is required' });
    }

    const result = await runAgentProposal({
      circleId,
      preset: preset || 'auto_approve',
      customProposal,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST advance negotiation turn
router.post('/negotiate', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { proposalId } = req.body;

    if (!proposalId) {
      return res.status(400).json({ error: 'proposalId is required' });
    }

    const proposalRes = await db.execute({
      sql: `
        SELECT p.*, m.compiled_json as mandate_json, c.name as circle_name, c.monthly_budget as circle_budget
        FROM payment_proposals p
        JOIN mandates m ON p.mandate_id = m.id
        JOIN circles c ON p.circle_id = c.id
        WHERE p.id = ?
      `,
      args: [proposalId],
    });

    if (proposalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const prop = proposalRes.rows[0];
    const mandate: MandateCompiled = JSON.parse(prop.mandate_json as string);

    // Mandate max acceptable price constraint
    const maxAcceptablePrice = Math.min(
      mandate.monthly_budget.amount,
      4200 // Default negotiation target ceiling
    );

    const stepResult = await stepNegotiation({
      proposalId,
      maxAcceptablePrice,
      currentListedPrice: Number(prop.amount),
      item: prop.item as string,
    });

    // If deal accepted by merchant, evaluate with Policy Engine
    if (stepResult.status === 'accepted') {
      const agreedPrice = stepResult.merchantResponse.counter_price || stepResult.agentOffer;

      // Re-evaluate agreed price with Policy Engine
      const evaluation = evaluateProposal(
        {
          amount: agreedPrice,
          currency: prop.currency as string,
          merchant: prop.merchant as string,
          category: prop.category as string,
          item: prop.item as string,
        },
        mandate,
        {
          id: prop.circle_id as string,
          name: prop.circle_name as string,
          active: 1,
          monthly_budget: Number(prop.circle_budget),
          currency: prop.currency as string,
        }
      );

      if (evaluation.decision === 'approve_now') {
        // Authorize with PayPal Sandbox!
        try {
          const authRes = await createAndAuthorizeOrder({
            referenceId: proposalId,
            amount: agreedPrice,
            currency: prop.currency as string,
            description: `Negotiated: ${prop.item}`,
          });

          await db.execute({
            sql: "UPDATE payment_proposals SET status = 'held', paypal_order_id = ?, paypal_authorization_id = ?, decision_reason = ? WHERE id = ?",
            args: [
              authRes.orderId,
              authRes.authorizationId || null,
              `Negotiation completed at ₹${agreedPrice}. Policy auto-approved. PayPal authorized and held.`,
              proposalId,
            ],
          });
        } catch (err: any) {
          await db.execute({
            sql: "UPDATE payment_proposals SET status = 'failed', decision_reason = ? WHERE id = ?",
            args: [`PayPal authorization failed after negotiation: ${err.message}`, proposalId],
          });
        }
      } else if (evaluation.decision === 'awaiting_consent') {
        await db.execute({
          sql: "UPDATE payment_proposals SET status = 'awaiting_consent', decision_reason = ? WHERE id = ?",
          args: [
            `Negotiation succeeded at ₹${agreedPrice}. Engine requires ${evaluation.requiredApprovers.mode} approval before moving funds.`,
            proposalId,
          ],
        });
      } else {
        await db.execute({
          sql: "UPDATE payment_proposals SET status = 'blocked', decision_reason = ? WHERE id = ?",
          args: [`Policy Engine blocked final negotiated amount: ${evaluation.reason}`, proposalId],
        });
      }
    }

    res.json(stepResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /simulate-condition - Interactively simulates real-time price drops, stock feeds, or cooling-off
router.post('/simulate-condition', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { proposalId, action } = req.body;

    if (!proposalId || !action) {
      return res.status(400).json({ error: 'proposalId and action are required' });
    }

    const propRes = await db.execute({
      sql: 'SELECT * FROM payment_proposals WHERE id = ?',
      args: [proposalId],
    });

    if (propRes.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const prop = propRes.rows[0];

    let cond: any = {};
    try {
      cond = JSON.parse(prop.release_condition as string || '{}');
    } catch {}

    let simulatedNote = '';
    // Make cooling off passed immediately
    const pastTimestamp = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    if (action === 'drop_price') {
      const target = Number(cond.target_amount || prop.amount);
      cond.current_price = target - 50;
      simulatedNote = `Simulated merchant feed: Price dropped to ₹${cond.current_price} (Target: ₹${target})`;
    } else if (action === 'in_stock') {
      cond.stock_status = 'in_stock';
      cond.is_available = true;
      simulatedNote = 'Simulated merchant stock feed: Inventory confirmed in stock';
    } else if (action === 'advance_delivery') {
      cond.date = new Date(Date.now() - 1000).toISOString();
      simulatedNote = 'Simulated delivery milestone: Delivery date milestone reached';
    } else if (action === 'fast_forward_timer') {
      simulatedNote = 'Fast-forwarded cooling-off countdown timer to 0s';
    }

    await db.execute({
      sql: 'UPDATE payment_proposals SET release_condition = ?, proposed_at = ? WHERE id = ?',
      args: [JSON.stringify(cond), pastTimestamp, proposalId],
    });

    // Run release check job
    const { checkAndProcessHeldProposals } = await import('../jobs/releaseJob.js');
    const results = await checkAndProcessHeldProposals();

    const updatedRes = await db.execute({
      sql: 'SELECT * FROM payment_proposals WHERE id = ?',
      args: [proposalId],
    });

    res.json({
      success: true,
      action,
      simulatedNote,
      proposal: updatedRes.rows[0],
      releaseJobResults: results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /custom-agent-prompt - Natural language purchase proposal parsed and bounded by policy
router.post('/custom-agent-prompt', async (req: Request, res: Response) => {
  try {
    const { circleId, prompt, agentId = 'autonomous-purchasing-agent-v1' } = req.body;

    if (!circleId || !prompt) {
      return res.status(400).json({ error: 'circleId and prompt are required' });
    }

    // Parse prompt for item, amount, merchant, category
    let amount = 1200;
    const amountMatch = prompt.match(/(?:₹|rs\.?|inr|\$)\s?(\d+(?:,\d+)*(?:\.\d+)?)/i) ||
                        prompt.match(/for\s*(?:₹|rs\.?|inr|\$)?\s?(\d+(?:,\d+)*)/i);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    let merchant = 'FreshMart Organics';
    if (prompt.toLowerCase().includes('croma')) merchant = 'Croma Electronics';
    else if (prompt.toLowerCase().includes('megabazaar') || prompt.toLowerCase().includes('bulk')) merchant = 'MegaBazaar Wholesalers';
    else if (prompt.toLowerCase().includes('suspicious')) merchant = 'Suspicious Deals Ltd';
    else if (prompt.toLowerCase().includes('amazon')) merchant = 'Amazon';
    else if (prompt.toLowerCase().includes('bigbasket')) merchant = 'BigBasket';

    let category = 'Groceries';
    if (prompt.toLowerCase().includes('phone') || prompt.toLowerCase().includes('cable') || prompt.toLowerCase().includes('headphone') || prompt.toLowerCase().includes('monitor') || prompt.toLowerCase().includes('electronic')) {
      category = 'Electronics';
    } else if (prompt.toLowerCase().includes('flight') || prompt.toLowerCase().includes('hotel') || prompt.toLowerCase().includes('trip') || prompt.toLowerCase().includes('travel')) {
      category = 'Travel';
    } else if (prompt.toLowerCase().includes('blender') || prompt.toLowerCase().includes('cleaner') || prompt.toLowerCase().includes('detergent') || prompt.toLowerCase().includes('household')) {
      category = 'Household';
    }

    // Clean item name
    let item = prompt.replace(/(?:buy|order|purchase|for|₹|from|at|\d+|,)/gi, ' ').trim();
    if (item.length < 3) item = 'Custom Requested Item';

    const result = await runAgentProposal({
      circleId,
      preset: 'custom',
      customProposal: {
        item,
        amount,
        merchant,
        category,
        releaseConditionType: 'price_target',
        targetAmount: Math.round(amount * 0.95),
      },
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
