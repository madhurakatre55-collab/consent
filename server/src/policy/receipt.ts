import crypto from 'crypto';

export interface ReceiptData {
  proposal_id: string;
  circle_id: string;
  circle_name: string;
  mandate_version: number;
  agent_id: string;
  merchant: string;
  item: string;
  amount: number;
  currency: string;
  category: string;
  matched_clause: string;
  decision_reason: string;
  approvals: Array<{
    user_id: string;
    user_name: string;
    role: string;
    decision: string;
    comment?: string;
    created_at: string;
  }>;
  paypal_order_id?: string | null;
  paypal_authorization_id?: string | null;
  final_outcome: string;
  timestamp: string;
  previous_receipt_hash: string;
}

export interface GeneratedReceipt extends ReceiptData {
  receipt_hash: string;
  canonical_json: string;
}

/**
 * Deterministically sorts object keys for canonical serialization.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`
  );
  return '{' + entries.join(',') + '}';
}

/**
 * Creates a tamper-evident SHA-256 hash chaining the previous receipt hash
 * with the canonical JSON representation of the current receipt data.
 */
export function generateReceiptHash(
  previousHash: string,
  receiptDataWithoutHash: Omit<ReceiptData, 'receipt_hash'>
): { receipt_hash: string; canonical_json: string } {
  const canonical = canonicalizeJson(receiptDataWithoutHash);
  const hash = crypto
    .createHash('sha256')
    .update((previousHash || 'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000000000') + canonical)
    .digest('hex');
  return { receipt_hash: hash, canonical_json: canonical };
}

/**
 * Verifies if a given receipt hash accurately matches its canonical payload and previous hash.
 */
export function verifyReceiptHash(
  receiptHash: string,
  previousHash: string,
  receiptDataWithoutHash: Omit<ReceiptData, 'receipt_hash'>
): boolean {
  const { receipt_hash: calculated } = generateReceiptHash(previousHash, receiptDataWithoutHash);
  return calculated === receiptHash;
}
