import { describe, it, expect } from 'vitest';
import {
  generateReceiptHash,
  verifyReceiptHash,
  canonicalizeJson,
  ReceiptData,
} from '../policy/receipt.js';

describe('Consent Receipt & Hash Chain Unit Tests', () => {
  const baseReceiptData: Omit<ReceiptData, 'receipt_hash'> = {
    proposal_id: 'prop-101',
    circle_id: 'circle-1',
    circle_name: 'Flat 12 Grocery Circle',
    mandate_version: 1,
    agent_id: 'grocery-agent-v1',
    merchant: 'BigBasket',
    item: 'Weekly Provisions',
    amount: 1200,
    currency: 'INR',
    category: 'Groceries',
    matched_clause: 'mandate.per_purchase_auto_approve_limit',
    decision_reason: 'Amount is within auto-approve threshold of 1500',
    approvals: [],
    paypal_order_id: 'PAYPAL-ORD-TEST-123',
    paypal_authorization_id: 'PAYPAL-AUTH-TEST-456',
    final_outcome: 'captured',
    timestamp: '2026-03-30T10:00:00.000Z',
    previous_receipt_hash: 'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000000000',
  };

  it('generates consistent deterministic sha256 hash regardless of object key order', () => {
    const dataWithKeysSwapped = {
      ...baseReceiptData,
      amount: 1200,
      item: 'Weekly Provisions',
    };

    const r1 = generateReceiptHash(baseReceiptData.previous_receipt_hash, baseReceiptData);
    const r2 = generateReceiptHash(baseReceiptData.previous_receipt_hash, dataWithKeysSwapped);

    expect(r1.receipt_hash).toHaveLength(64);
    expect(r1.receipt_hash).toEqual(r2.receipt_hash);
  });

  it('detects tampering if receipt content is modified', () => {
    const gen = generateReceiptHash(baseReceiptData.previous_receipt_hash, baseReceiptData);

    const tamperedData = {
      ...baseReceiptData,
      amount: 1201, // Tampered by 1 rupee!
    };

    const isValid = verifyReceiptHash(
      gen.receipt_hash,
      baseReceiptData.previous_receipt_hash,
      tamperedData
    );
    expect(isValid).toBe(false);
  });

  it('forms a sequential cryptographic chain across multiple receipts', () => {
    const genesis = 'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000000000';

    // Block 1
    const receipt1Data = { ...baseReceiptData, proposal_id: 'prop-1' };
    const receipt1 = generateReceiptHash(genesis, receipt1Data);

    // Block 2 chains to Block 1
    const receipt2Data = {
      ...baseReceiptData,
      proposal_id: 'prop-2',
      amount: 4500,
      previous_receipt_hash: receipt1.receipt_hash,
    };
    const receipt2 = generateReceiptHash(receipt1.receipt_hash, receipt2Data);

    // Block 3 chains to Block 2
    const receipt3Data = {
      ...baseReceiptData,
      proposal_id: 'prop-3',
      amount: 800,
      previous_receipt_hash: receipt2.receipt_hash,
    };
    const receipt3 = generateReceiptHash(receipt2.receipt_hash, receipt3Data);

    expect(receipt1.receipt_hash).not.toEqual(receipt2.receipt_hash);
    expect(receipt2.receipt_hash).not.toEqual(receipt3.receipt_hash);

    expect(verifyReceiptHash(receipt2.receipt_hash, receipt1.receipt_hash, receipt2Data)).toBe(true);
    expect(verifyReceiptHash(receipt3.receipt_hash, receipt2.receipt_hash, receipt3Data)).toBe(true);
  });
});
