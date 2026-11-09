import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { captureAuthorization, voidAuthorization } from '../paypal/client.js';
import { checkAndProcessHeldProposals } from '../jobs/releaseJob.js';
import { appendLedgerEntry } from '../policy/ledgerHelper.js';

const router = Router();

// POST /release/:id - Release and capture a held authorization
router.post('/release/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const propRes = await db.execute({
      sql: 'SELECT * FROM payment_proposals WHERE id = ?',
      args: [id],
    });

    if (propRes.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const prop = propRes.rows[0];

    if (prop.status !== 'held') {
      return res.status(400).json({ error: `Proposal is in "${prop.status}" status, not "held"` });
    }

    const authId = prop.paypal_authorization_id as string;
    if (!authId) {
      return res.status(400).json({ error: 'No PayPal authorization ID found on proposal' });
    }

    try {
      const captureResult = await captureAuthorization({
        authorizationId: authId,
        amount: Number(prop.amount),
        currency: prop.currency as string,
      });

      await db.execute({
        sql: "UPDATE payment_proposals SET status = 'captured', decision_reason = ? WHERE id = ?",
        args: [`Manual release approved: Funds captured via PayPal (Capture ID: ${captureResult.captureId})`, id],
      });

      await appendLedgerEntry({
        circle_id: prop.circle_id as string,
        proposal_id: id,
        event_type: 'CAPTURED',
        actor: 'circle_member',
        detail: `Released and captured PayPal authorization ${authId}`,
        explanation: `Condition verified manually by user. PayPal capture completed.`,
      });

      res.json({
        success: true,
        status: 'captured',
        captureResult,
      });
    } catch (err: any) {
      await db.execute({
        sql: "UPDATE payment_proposals SET status = 'failed', decision_reason = ? WHERE id = ?",
        args: [`PayPal capture failed: ${err.message}`, id],
      });

      await appendLedgerEntry({
        circle_id: prop.circle_id as string,
        proposal_id: id,
        event_type: 'FAILED',
        actor: 'paypal_client',
        detail: `Capture error: ${err.message}`,
      });

      res.status(500).json({ error: `PayPal Capture Failed: ${err.message}` });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /void/:id - Void a held authorization
router.post('/void/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { reason = 'Cancelled by user before release' } = req.body;

    const propRes = await db.execute({
      sql: 'SELECT * FROM payment_proposals WHERE id = ?',
      args: [id],
    });

    if (propRes.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const prop = propRes.rows[0];

    if (prop.status !== 'held') {
      return res.status(400).json({ error: `Proposal is in "${prop.status}" status, not "held"` });
    }

    const authId = prop.paypal_authorization_id as string;
    if (authId) {
      try {
        await voidAuthorization({ authorizationId: authId });
      } catch (err: any) {
        console.warn(`PayPal void warning: ${err.message}`);
      }
    }

    await db.execute({
      sql: "UPDATE payment_proposals SET status = 'voided', decision_reason = ? WHERE id = ?",
      args: [`Authorization voided: ${reason}`, id],
    });

    await appendLedgerEntry({
      circle_id: prop.circle_id as string,
      proposal_id: id,
      event_type: 'VOIDED',
      actor: 'user',
      detail: `Voided authorization ${authId || 'N/A'}`,
      explanation: reason,
    });

    res.json({
      success: true,
      status: 'voided',
      reason,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /trigger-release-check - Evaluates background conditional releases on-demand
router.post('/trigger-release-check', async (req: Request, res: Response) => {
  try {
    const results = await checkAndProcessHeldProposals();
    res.json({
      success: true,
      processedCount: results.length,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
