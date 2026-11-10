import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  buildMerkleTree,
  verifyMerkleProof,
  toBytes32,
  anchorPendingReceipts,
  getProposalBlockchainProof,
} from '../blockchain/anchorService.js';
import { runSeed } from '../db/seed.js';

function sha256(val: string): string {
  return '0x' + crypto.createHash('sha256').update(val).digest('hex');
}

describe('Blockchain Merkle Tree & On-Chain Anchoring', () => {
  it('computes a deterministic Merkle root and valid inclusion proofs for all leaves', () => {
    const leaves = [
      sha256('receipt-1'),
      sha256('receipt-2'),
      sha256('receipt-3'),
      sha256('receipt-4'),
    ];

    const { root, getProof } = buildMerkleTree(leaves);
    expect(root).toMatch(/^0x[0-9a-f]{64}$/);

    for (const leaf of leaves) {
      const proof = getProof(leaf);
      expect(proof.length).toBeGreaterThan(0);
      expect(verifyMerkleProof(leaf, proof, root)).toBe(true);
    }
  });

  it('handles odd numbers of leaves and rejects tampered leaves or roots', () => {
    const leaves = [sha256('a'), sha256('b'), sha256('c')];
    const { root, getProof } = buildMerkleTree(leaves);

    const validProof = getProof(leaves[1]);
    expect(verifyMerkleProof(leaves[1], validProof, root)).toBe(true);

    // Tampered leaf must fail verification
    const tamperedLeaf = sha256('a-tampered');
    expect(verifyMerkleProof(tamperedLeaf, validProof, root)).toBe(false);

    // Tampered root must fail verification
    const wrongRoot = toBytes32('deadbeef'.repeat(8));
    expect(verifyMerkleProof(leaves[1], validProof, wrongRoot)).toBe(false);
  });

  it('anchors pending receipts in SQLite and produces verifiable proofs', async () => {
    await runSeed();

    // Seed leaves 2 newest entries pending
    const beforeProof = await getProposalBlockchainProof('prop-demo-auto-approved');
    expect(beforeProof?.isAnchored).toBe(false);
    expect(beforeProof?.status).toBe('PENDING_ANCHOR');

    // Anchor pending receipts
    const anchorResult = await anchorPendingReceipts('circle-flat12');
    expect(anchorResult.anchored).toBe(true);
    expect(anchorResult.anchor?.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(anchorResult.anchor?.receiptCount).toBe(2);

    // Proof must now be confirmed and cryptographically verified
    const afterProof = await getProposalBlockchainProof('prop-demo-auto-approved');
    expect(afterProof?.isAnchored).toBe(true);
    expect(afterProof?.proofVerified).toBe(true);
    expect(afterProof?.txHash).toBe(anchorResult.anchor?.txHash);
  });
});
