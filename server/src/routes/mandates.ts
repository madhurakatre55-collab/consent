import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { llmComplete, LLMValidationError } from '../llm/client.js';
import { MandateSchema } from '../policy/mandateSchema.js';
import { appendLedgerEntry } from '../policy/ledgerHelper.js';

const router = Router();

// POST /compile - Translate plain text into typed Mandate schema
router.post('/compile', async (req: Request, res: Response) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ error: 'Please provide plain English rawText to compile' });
    }

    try {
      const compiled = await llmComplete(
        `Convert the following spending mandate plain-English text into the required structured policy JSON schema:\n"${rawText}"`,
        MandateSchema,
        'You are a strict policy compiler for shared spending circles. Output valid JSON matching the Mandate schema.'
      );

      return res.json({
        success: true,
        compiled,
        rawText,
      });
    } catch (err: any) {
      if (err instanceof LLMValidationError) {
        return res.status(422).json({
          success: false,
          error: 'LLM generated an invalid policy format',
          validationErrors: err.issues,
          message: 'The policy could not be compiled into a safe schema. Please adjust your phrasing (e.g. specify a clear monthly budget amount and auto-approve threshold).',
        });
      }
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /confirm - Explicit human confirmation and activation of mandate
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circleId, rawText, compiledJson } = req.body;

    if (!circleId || !rawText || !compiledJson) {
      return res.status(400).json({ error: 'circleId, rawText, and compiledJson are required to confirm mandate' });
    }

    // Validate schema
    const parseResult = MandateSchema.safeParse(compiledJson);
    if (!parseResult.success) {
      return res.status(422).json({
        error: 'Cannot activate an invalid mandate',
        details: parseResult.error.issues,
      });
    }

    // Determine latest version
    const versionRes = await db.execute({
      sql: 'SELECT MAX(version) as max_v FROM mandates WHERE circle_id = ?',
      args: [circleId],
    });
    const currentMax = Number(versionRes.rows[0]?.max_v || 0);
    const newVersion = currentMax + 1;

    // Deactivate previous active mandates
    await db.execute({
      sql: 'UPDATE mandates SET active = 0 WHERE circle_id = ?',
      args: [circleId],
    });

    const mandateId = `mandate-${circleId}-v${newVersion}`;
    const confirmedAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO mandates (
        id, circle_id, raw_text, compiled_json, version, confirmed_at, active, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        mandateId,
        circleId,
        rawText,
        JSON.stringify(parseResult.data),
        newVersion,
        confirmedAt,
        parseResult.data.expires_at || null,
      ],
    });

    // Update circle's monthly budget to match confirmed mandate
    await db.execute({
      sql: 'UPDATE circles SET monthly_budget = ? WHERE id = ?',
      args: [parseResult.data.monthly_budget.amount, circleId],
    });

    // Append to ledger
    await appendLedgerEntry({
      circle_id: circleId,
      event_type: 'MANDATE_ACTIVATED',
      actor: 'circle_owner',
      detail: `Activated Mandate v${newVersion} for Circle`,
      explanation: `Human owner confirmed policy: Auto-approve under ₹${parseResult.data.per_purchase_auto_approve_limit}, Budget ₹${parseResult.data.monthly_budget.amount}, Approvers: ${parseResult.data.required_approvers.mode}`,
    });

    res.json({
      success: true,
      mandateId,
      version: newVersion,
      confirmedAt,
      mandate: parseResult.data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:circleId - Retrieve active mandate and version history
router.get('/:circleId', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circleId } = req.params;

    const listRes = await db.execute({
      sql: 'SELECT * FROM mandates WHERE circle_id = ? ORDER BY version DESC',
      args: [circleId],
    });

    const mandates = listRes.rows.map((row: any) => {
      let compiled = null;
      try {
        compiled = JSON.parse(row.compiled_json);
      } catch {}
      return {
        ...row,
        compiled,
      };
    });

    const activeMandate = mandates.find((m) => m.active === 1) || mandates[0] || null;

    res.json({
      active: activeMandate,
      history: mandates,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
