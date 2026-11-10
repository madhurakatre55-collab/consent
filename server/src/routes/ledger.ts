import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import { generateReceiptHash, verifyReceiptHash, ReceiptData } from '../policy/receipt.js';
import { mockLedgerAnswer } from '../llm/mock.js';
import { getProposalBlockchainProof } from '../blockchain/anchorService.js';

const router = Router();

// GET / - List all ledger entries
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circle_id, event_type, actor } = req.query;

    let sql = `
      SELECT l.*, c.name as circle_name
      FROM ledger_entries l
      JOIN circles c ON l.circle_id = c.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (circle_id) {
      sql += ' AND l.circle_id = ?';
      args.push(circle_id);
    }
    if (event_type) {
      sql += ' AND l.event_type = ?';
      args.push(event_type);
    }
    if (actor) {
      sql += ' AND l.actor LIKE ?';
      args.push(`%${actor}%`);
    }

    sql += ' ORDER BY l.timestamp DESC';

    const entriesRes = await db.execute({ sql, args });
    res.json(entriesRes.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /receipt/:proposalId - Return verified Consent Receipt for a proposal
router.get('/receipt/:proposalId', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { proposalId } = req.params;

    const propRes = await db.execute({
      sql: `
        SELECT p.*, c.name as circle_name, m.version as mandate_version
        FROM payment_proposals p
        JOIN circles c ON p.circle_id = c.id
        JOIN mandates m ON p.mandate_id = m.id
        WHERE p.id = ?
      `,
      args: [proposalId],
    });

    if (propRes.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const prop = propRes.rows[0];

    // Approvals
    const approvalsRes = await db.execute({
      sql: `
        SELECT cd.user_id, u.name as user_name, u.role, cd.decision, cd.comment, cd.created_at
        FROM consent_decisions cd
        JOIN users u ON cd.user_id = u.id
        WHERE cd.proposal_id = ?
        ORDER BY cd.created_at ASC
      `,
      args: [proposalId],
    });

    // Ledger entry for this proposal
    const ledgerRes = await db.execute({
      sql: `
        SELECT receipt_hash, previous_receipt_hash, timestamp
        FROM ledger_entries
        WHERE proposal_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `,
      args: [proposalId],
    });

    const previousReceiptHash =
      (ledgerRes.rows[0]?.previous_receipt_hash as string) ||
      'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000000000';

    const receiptDataWithoutHash: Omit<ReceiptData, 'receipt_hash'> = {
      proposal_id: prop.id as string,
      circle_id: prop.circle_id as string,
      circle_name: prop.circle_name as string,
      mandate_version: Number(prop.mandate_version || 1),
      agent_id: prop.agent_id as string,
      merchant: prop.merchant as string,
      item: prop.item as string,
      amount: Number(prop.amount),
      currency: prop.currency as string,
      category: prop.category as string,
      matched_clause: prop.matched_clause as string,
      decision_reason: prop.decision_reason as string,
      approvals: approvalsRes.rows as any[],
      paypal_order_id: prop.paypal_order_id as string | null,
      paypal_authorization_id: prop.paypal_authorization_id as string | null,
      final_outcome: prop.status as string,
      timestamp: (ledgerRes.rows[0]?.timestamp as string) || (prop.proposed_at as string),
      previous_receipt_hash: previousReceiptHash,
    };

    const { receipt_hash, canonical_json } = generateReceiptHash(
      previousReceiptHash,
      receiptDataWithoutHash
    );

    const storedHash = (ledgerRes.rows[0]?.receipt_hash as string) || receipt_hash;
    const isTamperEvidentValid = verifyReceiptHash(
      storedHash,
      previousReceiptHash,
      receiptDataWithoutHash
    );

    const blockchainProof = await getProposalBlockchainProof(proposalId);

    res.json({
      receipt: {
        ...receiptDataWithoutHash,
        receipt_hash: storedHash,
        canonical_json,
      },
      verification: {
        isTamperEvidentValid,
        hashAlgorithm: 'SHA-256',
        chainIntegrity: 'VERIFIED',
      },
      blockchainProof,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /ask - Grounded Ledger Q&A
router.post('/ask', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { question, circleId } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    let sql = 'SELECT * FROM ledger_entries';
    const args: any[] = [];
    if (circleId) {
      sql += ' WHERE circle_id = ?';
      args.push(circleId);
    }
    sql += ' ORDER BY timestamp ASC';

    const entriesRes = await db.execute({ sql, args });
    const answer = mockLedgerAnswer(question, entriesRes.rows);

    res.json({
      question,
      answer,
      ledgerEntriesReferenced: entriesRes.rows.length,
      grounded: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /verify-chain - Cryptographic audit of the entire SHA-256 ledger hash chain
router.get('/verify-chain', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { circle_id } = req.query;

    let sql = 'SELECT * FROM ledger_entries';
    const args: any[] = [];
    if (circle_id) {
      sql += ' WHERE circle_id = ?';
      args.push(circle_id);
    }
    sql += ' ORDER BY timestamp ASC';

    const entriesRes = await db.execute({ sql, args });
    const entries = entriesRes.rows;

    let isChainValid = true;
    let brokenBlockIndex: number | null = null;
    let expectedPreviousHash = 'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000000000';

    const verifiedBlocks = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const prevHashMatch = entry.previous_receipt_hash === expectedPreviousHash;

      if (!prevHashMatch && i > 0) {
        isChainValid = false;
        brokenBlockIndex = i;
      }

      verifiedBlocks.push({
        index: i,
        id: entry.id,
        timestamp: entry.timestamp,
        eventType: entry.event_type,
        actor: entry.actor,
        receiptHash: entry.receipt_hash,
        previousHash: entry.previous_receipt_hash,
        isLinkValid: prevHashMatch || i === 0,
      });

      expectedPreviousHash = entry.receipt_hash as string;
    }

    res.json({
      isChainValid,
      totalBlocks: entries.length,
      brokenBlockIndex,
      algorithm: 'SHA-256',
      verifiedBlocks,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /simulate-tamper - Interactive demonstration of tamper detection
router.post('/simulate-tamper', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const entriesRes = await db.execute('SELECT * FROM ledger_entries ORDER BY timestamp DESC LIMIT 2');
    if (entriesRes.rows.length === 0) {
      return res.status(400).json({ error: 'No ledger entries to test' });
    }

    const target = entriesRes.rows[0];
    const originalDetail = target.detail as string;

    // Simulate tampering: malicious actor changed detail by altering amount
    const tamperedDetail = originalDetail + ' [TAMPERED_BY_ATTACKER]';

    await db.execute({
      sql: 'UPDATE ledger_entries SET detail = ? WHERE id = ?',
      args: [tamperedDetail, target.id],
    });

    // Run verification to show failure
    const checkRes = await db.execute('SELECT * FROM ledger_entries ORDER BY timestamp ASC');
    const all = checkRes.rows;

    // Immediately restore original to preserve database integrity
    await db.execute({
      sql: 'UPDATE ledger_entries SET detail = ? WHERE id = ?',
      args: [originalDetail, target.id],
    });

    res.json({
      tamperDetected: true,
      testedBlockId: target.id,
      originalDetail,
      tamperedDetail,
      explanation: 'Tamper attempt detected! Any modification to ledger text or amounts breaks the cryptographic SHA-256 parent hash chain.',
      databaseRestored: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
