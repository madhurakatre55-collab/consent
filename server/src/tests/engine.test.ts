import { describe, it, expect } from 'vitest';
import { evaluateProposal, evaluateConsents, CircleInput, CircleMemberInput } from '../policy/engine.js';
import { MandateCompiled } from '../policy/mandateSchema.js';

describe('Policy Engine Unit Tests', () => {
  const baseMandate: MandateCompiled = {
    monthly_budget: { amount: 8000, currency: 'INR' },
    per_purchase_auto_approve_limit: 1500,
    required_approvers: { mode: 'quorum', count: 2, roles: ['member', 'owner', 'guardian'] },
    allowed_categories: ['Groceries', 'Household', 'Food', 'Electronics'],
    blocked_categories: ['Gambling', 'Weapons', 'Alcohol'],
    blocked_merchants: ['Suspicious Deals Ltd', 'CryptoOutlet'],
    max_price_deviation_percent: 25,
    cooling_off_minutes: 1,
    release_condition: { type: 'manual_approval' },
    expires_at: null,
  };

  const baseCircle: CircleInput = {
    id: 'circle-1',
    name: 'Flat 12 Grocery Circle',
    active: 1,
    expires_at: null,
    monthly_budget: 8000,
    currency: 'INR',
  };

  const members: CircleMemberInput[] = [
    { id: 'cm-1', user_id: 'user-aisha', role: 'owner', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-2', user_id: 'user-rohan', role: 'member', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-3', user_id: 'user-priya', role: 'guardian', approval_weight: 1, can_propose: 1, can_approve: 1 },
  ];

  it('1. Expired mandate -> decision is block', () => {
    const expiredMandate: MandateCompiled = {
      ...baseMandate,
      expires_at: new Date(Date.now() - 3600000).toISOString(),
    };
    const res = evaluateProposal(
      { amount: 500, currency: 'INR', merchant: 'BigBasket', category: 'Groceries', item: 'Milk' },
      expiredMandate,
      baseCircle
    );
    expect(res.decision).toBe('block');
    expect(res.matched_clause).toBe('mandate.expires_at');
  });

  it('2. Inactive circle -> decision is block', () => {
    const inactiveCircle: CircleInput = { ...baseCircle, active: 0 };
    const res = evaluateProposal(
      { amount: 500, currency: 'INR', merchant: 'BigBasket', category: 'Groceries', item: 'Milk' },
      baseMandate,
      inactiveCircle
    );
    expect(res.decision).toBe('block');
    expect(res.matched_clause).toBe('circle.active');
  });

  it('3. Blocked merchant -> decision is block', () => {
    const res = evaluateProposal(
      { amount: 500, currency: 'INR', merchant: 'Suspicious Deals Ltd', category: 'Groceries', item: 'Tea' },
      baseMandate,
      baseCircle
    );
    expect(res.decision).toBe('block');
    expect(res.matched_clause).toBe('mandate.blocked_merchants');
  });

  it('4. Blocked category -> decision is block', () => {
    const res = evaluateProposal(
      { amount: 500, currency: 'INR', merchant: 'BigBasket', category: 'Alcohol', item: 'Wine' },
      baseMandate,
      baseCircle
    );
    expect(res.decision).toBe('block');
    expect(res.matched_clause).toBe('mandate.blocked_categories');
  });

  it('4b. Category not in allowed_categories -> decision is block', () => {
    const res = evaluateProposal(
      { amount: 500, currency: 'INR', merchant: 'BigBasket', category: 'Fashion', item: 'Shoes' },
      baseMandate,
      baseCircle
    );
    expect(res.decision).toBe('block');
    expect(res.matched_clause).toBe('mandate.allowed_categories');
  });

  it('5. Monthly budget exhausted -> decision is block', () => {
    const previousSpend = [
      { amount: 5000, status: 'captured', timestamp: new Date().toISOString() },
      { amount: 2500, status: 'held', timestamp: new Date().toISOString() },
    ];
    // Previous spend: 7500. Proposal: 600. Total = 8100 > 8000
    const res = evaluateProposal(
      { amount: 600, currency: 'INR', merchant: 'BigBasket', category: 'Groceries', item: 'Snacks' },
      baseMandate,
      baseCircle,
      previousSpend
    );
    expect(res.decision).toBe('block');
    expect(res.matched_clause).toBe('mandate.monthly_budget');
  });

  it('5b. Exactly at budget -> passes budget check and auto-approves if under threshold', () => {
    const previousSpend = [
      { amount: 7000, status: 'captured', timestamp: new Date().toISOString() },
    ];
    // Previous spend: 7000. Proposal: 1000. Total = 8000 == 8000 (exactly at budget)
    // Amount 1000 is <= 1500 auto-approve limit
    const res = evaluateProposal(
      { amount: 1000, currency: 'INR', merchant: 'BigBasket', category: 'Groceries', item: 'Olive Oil' },
      baseMandate,
      baseCircle,
      previousSpend
    );
    expect(res.decision).toBe('approve_now');
    expect(res.matched_clause).toBe('mandate.per_purchase_auto_approve_limit');
  });

  it('6. Price deviation exceeds max_price_deviation_percent vs historical median -> block', () => {
    const priceHistory = [100, 105, 95, 100]; // median = 100. 25% max deviation = 125 allowed
    const res = evaluateProposal(
      { amount: 140, currency: 'INR', merchant: 'BigBasket', category: 'Groceries', item: 'Sugar' },
      baseMandate,
      baseCircle,
      [],
      priceHistory
    );
    expect(res.decision).toBe('block');
    expect(res.matched_clause).toBe('mandate.max_price_deviation_percent');
  });

  it('6b. No merchant price history -> passes deviation check without error', () => {
    const res = evaluateProposal(
      { amount: 1000, currency: 'INR', merchant: 'NewStore', category: 'Groceries', item: 'Rice' },
      baseMandate,
      baseCircle,
      [],
      [] // empty price history
    );
    expect(res.decision).toBe('approve_now');
  });

  it('7. Guardian required for high-risk category (Electronics)', () => {
    // Under 1500 limit, but Electronics category requires guardian consent!
    const res = evaluateProposal(
      { amount: 1200, currency: 'INR', merchant: 'Croma', category: 'Electronics', item: 'HDMI Cable' },
      baseMandate,
      baseCircle
    );
    expect(res.decision).toBe('awaiting_consent');
    expect(res.requiredApprovers.mode).toBe('guardian_required');
    expect(res.matched_clause).toBe('mandate.required_approvers.guardian_required');
  });

  it('8. Exactly at auto-approve threshold -> approve_now', () => {
    // per_purchase_auto_approve_limit = 1500
    const res = evaluateProposal(
      { amount: 1500, currency: 'INR', merchant: 'BigBasket', category: 'Groceries', item: 'Bulk Dal' },
      baseMandate,
      baseCircle
    );
    expect(res.decision).toBe('approve_now');
    expect(res.matched_clause).toBe('mandate.per_purchase_auto_approve_limit');
  });

  it('9. Over auto-approve limit -> awaiting_consent with quorum', () => {
    const res = evaluateProposal(
      { amount: 2500, currency: 'INR', merchant: 'BigBasket', category: 'Groceries', item: 'Month Staples' },
      baseMandate,
      baseCircle
    );
    expect(res.decision).toBe('awaiting_consent');
    expect(res.requiredApprovers.mode).toBe('quorum');
    expect(res.requiredApprovers.count).toBe(2);
  });
});

describe('Consent & Quorum Logic Unit Tests', () => {
  const proposal = { amount: 3000, currency: 'INR', merchant: 'BigBasket', category: 'Groceries', item: 'Party Pack' };
  const members: CircleMemberInput[] = [
    { id: 'cm-1', user_id: 'user-aisha', role: 'owner', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-2', user_id: 'user-rohan', role: 'member', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-3', user_id: 'user-priya', role: 'guardian', approval_weight: 1, can_propose: 1, can_approve: 1 },
  ];

  it('Quorum not yet reached: 1 of 2 approvals', () => {
    const res = evaluateConsents(
      proposal,
      { mode: 'quorum', count: 2 },
      members,
      [{ user_id: 'user-aisha', decision: 'approved', comment: 'Looks good' }]
    );
    expect(res.isResolved).toBe(false);
    expect(res.status).toBe('awaiting_consent');
    expect(res.approvalsCount).toBe(1);
    expect(res.totalRequired).toBe(2);
  });

  it('Quorum reached: 2 of 2 approvals -> approved', () => {
    const res = evaluateConsents(
      proposal,
      { mode: 'quorum', count: 2 },
      members,
      [
        { user_id: 'user-aisha', decision: 'approved' },
        { user_id: 'user-rohan', decision: 'approved' },
      ]
    );
    expect(res.isResolved).toBe(true);
    expect(res.status).toBe('approved');
    expect(res.approvalsCount).toBe(2);
  });

  it('Unanimous approval required: 2 of 3 is awaiting, 3 of 3 is approved', () => {
    const partial = evaluateConsents(
      proposal,
      { mode: 'unanimous' },
      members,
      [
        { user_id: 'user-aisha', decision: 'approved' },
        { user_id: 'user-rohan', decision: 'approved' },
      ]
    );
    expect(partial.isResolved).toBe(false);
    expect(partial.status).toBe('awaiting_consent');
    expect(partial.approvalsCount).toBe(2);
    expect(partial.totalRequired).toBe(3);

    const full = evaluateConsents(
      proposal,
      { mode: 'unanimous' },
      members,
      [
        { user_id: 'user-aisha', decision: 'approved' },
        { user_id: 'user-rohan', decision: 'approved' },
        { user_id: 'user-priya', decision: 'approved' },
      ]
    );
    expect(full.isResolved).toBe(true);
    expect(full.status).toBe('approved');
  });

  it('Unanimous approval rejected by one member -> blocked', () => {
    const rejected = evaluateConsents(
      proposal,
      { mode: 'unanimous' },
      members,
      [
        { user_id: 'user-aisha', decision: 'approved' },
        { user_id: 'user-priya', decision: 'rejected', comment: 'Too expensive' },
      ]
    );
    expect(rejected.isResolved).toBe(true);
    expect(rejected.status).toBe('blocked');
  });

  it('Guardian required: non-guardian cannot satisfy; guardian approval approves', () => {
    // Only non-guardian approved
    const nonGuardianOnly = evaluateConsents(
      proposal,
      { mode: 'guardian_required', roles: ['guardian'] },
      members,
      [{ user_id: 'user-rohan', decision: 'approved' }]
    );
    expect(nonGuardianOnly.isResolved).toBe(false);
    expect(nonGuardianOnly.status).toBe('awaiting_consent');

    // Guardian approved
    const withGuardian = evaluateConsents(
      proposal,
      { mode: 'guardian_required', roles: ['guardian'] },
      members,
      [{ user_id: 'user-priya', decision: 'approved' }]
    );
    expect(withGuardian.isResolved).toBe(true);
    expect(withGuardian.status).toBe('approved');
  });

  it('Guardian required: guardian rejection immediately blocks', () => {
    const guardianRejected = evaluateConsents(
      proposal,
      { mode: 'guardian_required', roles: ['guardian'] },
      members,
      [{ user_id: 'user-priya', decision: 'rejected', comment: 'Not permitted' }]
    );
    expect(guardianRejected.isResolved).toBe(true);
    expect(guardianRejected.status).toBe('blocked');
  });
});
