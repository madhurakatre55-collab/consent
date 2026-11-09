import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { appendLedgerEntry } from '../policy/ledgerHelper.js';

const router = Router();

// GET all agents for a circle
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circle_id } = req.query;

    let sql = 'SELECT * FROM agents';
    const args: any[] = [];
    if (circle_id) {
      sql += ' WHERE circle_id = ?';
      args.push(circle_id);
    }
    sql += ' ORDER BY created_at ASC';

    const agentsRes = await db.execute({ sql, args });

    // Enrich with current proposals count
    const enriched = await Promise.all(
      agentsRes.rows.map(async (a: any) => {
        const countRes = await db.execute({
          sql: 'SELECT COUNT(*) as count FROM payment_proposals WHERE agent_id = ?',
          args: [a.id],
        });
        return {
          ...a,
          proposals_count: Number(countRes.rows[0]?.count || 0),
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST toggle agent active status
router.post('/toggle', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id, active } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Agent id is required' });
    }

    const newActiveState = active ? 1 : 0;
    await db.execute({
      sql: 'UPDATE agents SET active = ? WHERE id = ?',
      args: [newActiveState, id],
    });

    const agentRes = await db.execute({
      sql: 'SELECT * FROM agents WHERE id = ?',
      args: [id],
    });
    const agent = agentRes.rows[0];

    if (agent) {
      await appendLedgerEntry({
        circle_id: agent.circle_id as string,
        event_type: newActiveState === 1 ? 'AGENT_ACTIVATED' : 'AGENT_REVOKED',
        actor: 'circle_owner',
        detail: `Agent "${agent.name}" spending mandate was ${newActiveState === 1 ? 'activated' : 'paused/revoked'}`,
      });
    }

    res.json({ success: true, id, active: newActiveState });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST register new agent
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circle_id, name, description, category, daily_limit, avatar_icon = 'bot' } = req.body;

    if (!circle_id || !name || !daily_limit) {
      return res.status(400).json({ error: 'circle_id, name, and daily_limit are required' });
    }

    const id = `agent-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO agents (id, circle_id, name, description, category, daily_limit, active, lifetime_spent, avatar_icon, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      args: [id, circle_id, name, description || '', category || 'General', daily_limit, avatar_icon, now],
    });

    await appendLedgerEntry({
      circle_id,
      event_type: 'AGENT_REGISTERED',
      actor: 'circle_owner',
      detail: `Registered new autonomous AI agent: "${name}" (${category}) with daily limit ₹${daily_limit}`,
    });

    res.status(201).json({ id, circle_id, name, description, category, daily_limit, active: 1 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
