import { Router, Request, Response } from 'express';
import { runSeed } from '../db/seed.js';

const router = Router();

// POST /api/demo/reset-seed - Re-seeds database with standard demo state
router.post('/reset-seed', async (req: Request, res: Response) => {
  try {
    await runSeed();
    res.json({
      success: true,
      message: 'Demo dataset reset successfully with standard scenarios and verified hash chains.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
