import { getDb } from '../db/schema.js';
import { generateReceiptHash, ReceiptData } from './receipt.js';

export async function appendLedgerEntry(params: {
  circle_id: string;
  proposal_id?: string;
  event_type: string;
  actor: string;
  detail: string;
  explanation?: string;
  receiptData?: Partial<Omit<ReceiptData, 'receipt_hash'>>;
}): Promise<string> {
  const db = getDb();
  const timestamp = new Date().toISOString();
  const id = `ledg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  // Find latest entry for previous hash
  const latestRes = await db.execute({
    sql: 'SELECT receipt_hash FROM ledger_entries WHERE circle_id = ? ORDER BY timestamp DESC LIMIT 1',
    args: [params.circle_id],
  });

  const previousHash =
    (latestRes.rows?.[0]?.receipt_hash as string) ||
    'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000000000';

  const defaultReceiptData: Omit<ReceiptData, 'receipt_hash'> = {
    proposal_id: params.proposal_id || 'n/a',
    circle_id: params.circle_id,
    circle_name: 'Spending Circle',
    mandate_version: 1,
    agent_id: 'system',
    merchant: 'N/A',
    item: 'General Transaction',
    amount: 0,
    currency: 'INR',
    category: 'General',
    matched_clause: 'n/a',
    decision_reason: params.explanation || params.detail,
    approvals: [],
    final_outcome: params.event_type.toLowerCase(),
    timestamp,
    previous_receipt_hash: previousHash,
    ...(params.receiptData || {}),
  };

  const { receipt_hash } = generateReceiptHash(previousHash, defaultReceiptData);

  await db.execute({
    sql: `INSERT INTO ledger_entries (
      id, circle_id, proposal_id, timestamp, event_type, actor, detail, explanation, receipt_hash, previous_receipt_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      params.circle_id,
      params.proposal_id || null,
      timestamp,
      params.event_type,
      params.actor,
      params.detail,
      params.explanation || null,
      receipt_hash,
      previousHash,
    ],
  });

  return receipt_hash;
}
