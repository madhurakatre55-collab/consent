import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import {
  anchorPendingReceipts,
  BLOCKCHAIN_CONFIG,
  getLiveOrSimulatedBlockNumber,
  getProposalBlockchainProof,
  verifyMerkleProof,
} from '../blockchain/anchorService.js';

const router = Router();

// GET /status - Current blockchain network & Merkle anchoring summary
router.get('/status', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circle_id } = req.query;

    const { blockNumber, liveRpcConnected } = await getLiveOrSimulatedBlockNumber();

    let countSql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN blockchain_tx_hash IS NOT NULL THEN 1 ELSE 0 END) as anchored,
        SUM(CASE WHEN blockchain_tx_hash IS NULL THEN 1 ELSE 0 END) as pending
      FROM ledger_entries
    `;
    const args: any[] = [];
    if (circle_id) {
      countSql += ' WHERE circle_id = ?';
      args.push(circle_id);
    }

    const countsRes = await db.execute({ sql: countSql, args });
    const counts = countsRes.rows[0] || { total: 0, anchored: 0, pending: 0 };

    const anchorsRes = await db.execute(
      'SELECT * FROM blockchain_anchors ORDER BY anchored_at DESC LIMIT 10'
    );

    res.json({
      network: BLOCKCHAIN_CONFIG.network,
      chainId: BLOCKCHAIN_CONFIG.chainId,
      contractAddress: BLOCKCHAIN_CONFIG.contractAddress,
      explorerBaseUrl: BLOCKCHAIN_CONFIG.explorerBaseUrl,
      currentBlockNumber: blockNumber,
      liveRpcConnected,
      totalReceipts: Number(counts.total || 0),
      anchoredReceipts: Number(counts.anchored || 0),
      pendingReceipts: Number(counts.pending || 0),
      latestAnchor: anchorsRes.rows[0] || null,
      anchors: anchorsRes.rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /anchors - List all anchored batches
router.get('/anchors', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const anchorsRes = await db.execute(
      'SELECT * FROM blockchain_anchors ORDER BY anchored_at DESC'
    );
    res.json(anchorsRes.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /anchor - Anchor all pending receipts into an on-chain Merkle root batch
router.post('/anchor', async (req: Request, res: Response) => {
  try {
    const { circleId } = req.body || {};
    const result = await anchorPendingReceipts(circleId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /proof/:proposalId - Get cryptographic Merkle inclusion proof for a proposal
router.get('/proof/:proposalId', async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const proof = await getProposalBlockchainProof(proposalId);
    if (!proof) {
      return res.status(404).json({ error: 'Ledger entry not found for proposal' });
    }
    res.json(proof);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /verify-proof - Independently verify a Merkle inclusion proof
router.post('/verify-proof', (req: Request, res: Response) => {
  try {
    const { leaf, proof, root } = req.body || {};
    if (!leaf || !Array.isArray(proof) || !root) {
      return res.status(400).json({ error: 'leaf, proof array, and root are required' });
    }
    const valid = verifyMerkleProof(leaf, proof, root);
    res.json({ valid, leaf, root, algorithm: 'SHA-256 Sorted-Pair Merkle Tree' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
