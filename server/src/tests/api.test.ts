import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { initDb } from '../db/schema.js';
import { runSeed } from '../db/seed.js';

describe('End-to-End API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    await initDb();
    await runSeed();
    app = createApp();
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/users returns seeded personas', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    const names = res.body.map((u: any) => u.name);
    expect(names).toContain('Aisha Sharma');
    expect(names).toContain('Priya Patel');
  });

  it('GET /api/circles returns Flat 12 circle with active mandate', async () => {
    const res = await request(app).get('/api/circles');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const circle = res.body[0];
    expect(circle.name).toContain('Flat 12');
    expect(circle.active_mandate).toBeDefined();
    expect(circle.active_mandate.per_purchase_auto_approve_limit).toBe(1500);
  });

  it('POST /api/mandates/compile translates plain English text into valid schema', async () => {
    const rawText =
      'Our flat has a ₹8,000 monthly grocery budget. Purchases under ₹1,500 are automatic. Anything above needs 2 of 3 members. Electronics always need Priya.';
    const res = await request(app).post('/api/mandates/compile').send({ rawText });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.compiled.monthly_budget.amount).toBe(8000);
    expect(res.body.compiled.per_purchase_auto_approve_limit).toBe(1500);
    expect(res.body.compiled.required_approvers.mode).toBe('quorum');
  });

  it('GET /api/proposals returns seeded proposals covering all required states', async () => {
    const res = await request(app).get('/api/proposals');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    const statuses = res.body.map((p: any) => p.status);
    expect(statuses).toContain('held');
    expect(statuses).toContain('awaiting_consent');
    expect(statuses).toContain('blocked');
    expect(statuses).toContain('captured');
    expect(statuses).toContain('voided');
  });

  it('POST /api/consents/decide records a member vote and advances consensus', async () => {
    const pending = await request(app).get('/api/consents/pending');
    expect(pending.status).toBe(200);
    expect(pending.body.length).toBeGreaterThanOrEqual(1);

    const targetProposal = pending.body[0];

    // Rohan (member) votes to approve
    const voteRes = await request(app)
      .post('/api/consents/decide')
      .send({
        proposal_id: targetProposal.id,
        user_id: 'user-rohan',
        decision: 'approved',
        comment: 'Looks good for the flat pantry',
      });

    expect(voteRes.status).toBe(200);
    expect(voteRes.body.success).toBe(true);
    expect(voteRes.body.newStatus).toBe('held'); // Quorum reached -> held in PayPal Sandbox
    expect(voteRes.body.paypalAuthId).toBeDefined();
  });

  it('GET /api/ledger returns chained log entries and GET /api/ledger/receipt returns verified receipt', async () => {
    const ledgerRes = await request(app).get('/api/ledger');
    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.length).toBeGreaterThanOrEqual(5);

    const capturedEntry = ledgerRes.body.find((e: any) => e.event_type === 'CAPTURED');
    expect(capturedEntry).toBeDefined();

    const receiptRes = await request(app).get(
      `/api/ledger/receipt/${capturedEntry.proposal_id}`
    );
    expect(receiptRes.status).toBe(200);
    expect(receiptRes.body.verification.isTamperEvidentValid).toBe(true);
    expect(receiptRes.body.verification.chainIntegrity).toBe('VERIFIED');
    expect(receiptRes.body.receipt.receipt_hash).toHaveLength(64);
  });

  it('POST /api/ledger/ask grounds answers strictly in ledger logs', async () => {
    const res = await request(app).post('/api/ledger/ask').send({
      question: 'How much total money was spent this month?',
    });
    expect(res.status).toBe(200);
    expect(res.body.grounded).toBe(true);
    expect(res.body.answer).toContain('captured spend');
  });

  it('SECURITY: Enforces security headers on API responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
  });

  it('SECURITY: Rejects observer approval attempts with 403 Forbidden', async () => {
    const { getDb } = await import('../db/schema.js');
    const db = getDb();
    const testPropId = `prop-test-observer-${Date.now()}`;

    await db.execute({
      sql: `INSERT INTO payment_proposals (
        id, circle_id, mandate_id, agent_id, proposed_by_user_id,
        merchant, item, amount, currency, category, proposed_at,
        status, decision_reason, matched_clause, release_condition
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        testPropId,
        'circle-flat12',
        'mandate-flat12-v1',
        'autonomous-purchasing-agent-v1',
        'user-aisha',
        'FreshMart Organics',
        'Security Audit Test Basket',
        1200,
        'INR',
        'Groceries',
        new Date().toISOString(),
        'awaiting_consent',
        'Policy requires consensus',
        'mandate.required_approvers.quorum',
        JSON.stringify({ type: 'manual_approval' }),
      ],
    });

    const res = await request(app)
      .post('/api/consents/decide')
      .send({
        proposal_id: testPropId,
        user_id: 'user-kunal', // Observer persona
        decision: 'approved',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Observer');
  });

  it('SECURITY: Rejects non-member voting attempts with 403 Forbidden', async () => {
    const { getDb } = await import('../db/schema.js');
    const db = getDb();
    const testPropId = `prop-test-stranger-${Date.now()}`;

    await db.execute({
      sql: `INSERT INTO payment_proposals (
        id, circle_id, mandate_id, agent_id, proposed_by_user_id,
        merchant, item, amount, currency, category, proposed_at,
        status, decision_reason, matched_clause, release_condition
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        testPropId,
        'circle-flat12',
        'mandate-flat12-v1',
        'autonomous-purchasing-agent-v1',
        'user-aisha',
        'FreshMart Organics',
        'Security Stranger Test Basket',
        1200,
        'INR',
        'Groceries',
        new Date().toISOString(),
        'awaiting_consent',
        'Policy requires consensus',
        'mandate.required_approvers.quorum',
        JSON.stringify({ type: 'manual_approval' }),
      ],
    });

    const res = await request(app)
      .post('/api/consents/decide')
      .send({
        proposal_id: testPropId,
        user_id: 'user-unknown-attacker',
        decision: 'approved',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('not a member');
  });

  it('SECURITY: Rejects activation of invalid mandate schemas with 422', async () => {
    const res = await request(app)
      .post('/api/mandates/confirm')
      .send({
        circleId: 'circle-flat12',
        rawText: 'corrupted policy',
        compiledJson: { monthly_budget: { amount: -500 } }, // Negative budget
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('invalid mandate');
  });
});
