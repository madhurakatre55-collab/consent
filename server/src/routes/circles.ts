import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';

const router = Router();

// GET all circles
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const circlesRes = await db.execute(`
      SELECT c.*, u.name as owner_name, u.email as owner_email,
        (SELECT COUNT(*) FROM circle_members cm WHERE cm.circle_id = c.id) as member_count,
        (SELECT compiled_json FROM mandates m WHERE m.circle_id = c.id AND m.active = 1 ORDER BY version DESC LIMIT 1) as active_mandate_json
      FROM circles c
      LEFT JOIN users u ON c.owner_id = u.id
      ORDER BY c.name ASC
    `);

    const circles = circlesRes.rows.map((row: any) => {
      let mandate = null;
      if (row.active_mandate_json) {
        try {
          mandate = JSON.parse(row.active_mandate_json);
        } catch {}
      }
      return {
        ...row,
        active_mandate: mandate,
      };
    });

    res.json(circles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single circle with members
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const circleRes = await db.execute({
      sql: 'SELECT * FROM circles WHERE id = ?',
      args: [id],
    });
    if (circleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    const membersRes = await db.execute({
      sql: `
        SELECT cm.*, u.name, u.email
        FROM circle_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.circle_id = ?
      `,
      args: [id],
    });

    const mandateRes = await db.execute({
      sql: 'SELECT * FROM mandates WHERE circle_id = ? AND active = 1 ORDER BY version DESC LIMIT 1',
      args: [id],
    });

    let mandate = null;
    if (mandateRes.rows.length > 0) {
      try {
        mandate = {
          ...mandateRes.rows[0],
          compiled: JSON.parse(mandateRes.rows[0].compiled_json as string),
        };
      } catch {}
    }

    res.json({
      ...circleRes.rows[0],
      members: membersRes.rows,
      active_mandate: mandate,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create circle
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { name, owner_id, monthly_budget, currency = 'INR', members = [] } = req.body;

    if (!name || !owner_id || !monthly_budget) {
      return res.status(400).json({ error: 'Missing required circle fields (name, owner_id, monthly_budget)' });
    }

    const circleId = `circle-${Date.now().toString(36)}`;
    await db.execute({
      sql: 'INSERT INTO circles (id, name, owner_id, monthly_budget, currency, active) VALUES (?, ?, ?, ?, ?, 1)',
      args: [circleId, name, owner_id, monthly_budget, currency],
    });

    // Add owner as circle member
    await db.execute({
      sql: 'INSERT INTO circle_members (id, circle_id, user_id, role, approval_weight, can_propose, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [`cm-${circleId}-owner`, circleId, owner_id, 'owner', 1, 1, 1],
    });

    // Add additional members
    for (const m of members) {
      if (m.user_id !== owner_id) {
        await db.execute({
          sql: 'INSERT INTO circle_members (id, circle_id, user_id, role, approval_weight, can_propose, can_approve) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [`cm-${circleId}-${m.user_id}`, circleId, m.user_id, m.role || 'member', 1, 1, m.role === 'observer' ? 0 : 1],
        });
      }
    }

    res.status(201).json({ id: circleId, name, owner_id, monthly_budget, currency });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:id/analytics - Real-time budget analytics & spending breakdown
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const circleRes = await db.execute({
      sql: 'SELECT * FROM circles WHERE id = ?',
      args: [id],
    });
    if (circleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Circle not found' });
    }
    const circle = circleRes.rows[0];
    const budgetTotal = Number(circle.monthly_budget);

    // Proposals spend
    const proposalsRes = await db.execute({
      sql: "SELECT category, amount, status FROM payment_proposals WHERE circle_id = ?",
      args: [id],
    });

    const rows = proposalsRes.rows as any[];
    const capturedProposals = rows.filter((r) => ['captured', 'held', 'ready_to_release'].includes(r.status));
    const totalSpent = capturedProposals.reduce((sum, r) => sum + Number(r.amount), 0);

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    for (const p of capturedProposals) {
      const cat = p.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(p.amount);
    }
    const categories = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      amount: categoryMap[cat],
      percentage: totalSpent > 0 ? Math.round((categoryMap[cat] / totalSpent) * 100) : 0,
    }));

    // Approver stats
    const approversRes = await db.execute({
      sql: `
        SELECT u.name, u.role, cd.decision, COUNT(*) as count
        FROM consent_decisions cd
        JOIN users u ON cd.user_id = u.id
        JOIN payment_proposals p ON cd.proposal_id = p.id
        WHERE p.circle_id = ?
        GROUP BY u.name, u.role, cd.decision
      `,
      args: [id],
    });

    res.json({
      circleId: id,
      circleName: circle.name,
      currency: circle.currency,
      budgetTotal,
      budgetSpent: totalSpent,
      budgetRemaining: Math.max(0, budgetTotal - totalSpent),
      percentUtilized: Math.min(100, Math.round((totalSpent / budgetTotal) * 100)),
      categories,
      approverActivity: approversRes.rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
