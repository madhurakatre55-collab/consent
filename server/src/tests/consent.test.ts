import { describe, it, expect } from 'vitest';
import { evaluateProposal, evaluateConsents, CircleMemberInput, CircleInput } from '../policy/engine.js';
import { MandateCompiled } from '../policy/mandateSchema.js';

describe('Consent & Authorization Invariants (Safety Verification)', () => {
  const mandate: MandateCompiled = {
    monthly_budget: { amount: 8000, currency: 'INR' },
    per_purchase_auto_approve_limit: 1500,
    required_approvers: { mode: 'quorum', count: 2, roles: ['member', 'owner', 'guardian'] },
    allowed_categories: ['Groceries', 'Household'],
    blocked_categories: ['Gambling'],
    blocked_merchants: ['Suspicious Deals Ltd'],
    max_price_deviation_percent: 25,
    cooling_off_minutes: 1,
    release_condition: { type: 'manual_approval' },
    expires_at: null,
  };

  const circle: CircleInput = {
    id: 'circle-1',
    name: 'Flat 12 Grocery Circle',
    active: 1,
    monthly_budget: 8000,
    currency: 'INR',
  };

  const members: CircleMemberInput[] = [
    { id: 'cm-1', user_id: 'user-aisha', role: 'owner', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-2', user_id: 'user-rohan', role: 'member', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-3', user_id: 'user-priya', role: 'guardian', approval_weight: 1, can_propose: 1, can_approve: 1 },
    { id: 'cm-4', user_id: 'user-kunal', role: 'observer', approval_weight: 0, can_propose: 0, can_approve: 0 },
  ];

  it('INVARIANT 1: LLM output or proposal alone cannot authorize payments without passing policy engine', () => {
    // An agent proposes a purchase exceeding auto-approve limit
    const agentProposal = {
      amount: 4000,
      currency: 'INR',
      merchant: 'MegaBazaar Wholesalers',
      category: 'Groceries',
      item: 'Pantry Bulk Provisions',
    };

    const evaluation = evaluateProposal(agentProposal, mandate, circle);
    // Must NOT be approve_now
    expect(evaluation.decision).not.toBe('approve_now');
    expect(evaluation.decision).toBe('awaiting_consent');
  });

  it('INVARIANT 2: An observer role cannot cast an approval towards the quorum', () => {
    const proposal = {
      amount: 3000,
      currency: 'INR',
      merchant: 'MegaBazaar Wholesalers',
      category: 'Groceries',
      item: 'Household Goods',
    };

    // Observer user-kunal attempts to vote
    const decisions = [
      { user_id: 'user-kunal', decision: 'approved' as const, comment: 'I approve!' },
    ];

    // Filter to only eligible approvers (as enforced by backend route)
    const eligibleMembers = members.filter((m) => Boolean(m.can_approve));
    const result = evaluateConsents(proposal, mandate.required_approvers, eligibleMembers, decisions);

    // Kunal is not an eligible approver, so valid approvals count remains 0
    expect(result.approvalsCount).toBe(0);
    expect(result.status).toBe('awaiting_consent');
    expect(result.isResolved).toBe(false);
  });

  it('INVARIANT 3: PayPal authorization path is barred when proposal is blocked by policy', () => {
    // Proposing from blocked merchant
    const blockedProposal = {
      amount: 500,
      currency: 'INR',
      merchant: 'Suspicious Deals Ltd',
      category: 'Groceries',
      item: 'Cheap Flour',
    };

    const evaluation = evaluateProposal(blockedProposal, mandate, circle);
    expect(evaluation.decision).toBe('block');

    // Verify money-moving guard: only 'approve_now' or 'approved' consent can trigger PayPal
    const canAuthorizePayPal = evaluation.decision === 'approve_now';
    expect(canAuthorizePayPal).toBe(false);
  });

  it('INVARIANT 4: 2 of 3 quorum requires exactly 2 distinct eligible member approvals', () => {
    const proposal = {
      amount: 2500,
      currency: 'INR',
      merchant: 'MegaBazaar',
      category: 'Groceries',
      item: 'Spices and Oil',
    };

    // 1 approval -> still awaiting
    const step1 = evaluateConsents(
      proposal,
      mandate.required_approvers,
      members,
      [{ user_id: 'user-aisha', decision: 'approved' }]
    );
    expect(step1.isResolved).toBe(false);
    expect(step1.status).toBe('awaiting_consent');

    // 2nd approval from another eligible member -> APPROVED
    const step2 = evaluateConsents(
      proposal,
      mandate.required_approvers,
      members,
      [
        { user_id: 'user-aisha', decision: 'approved' },
        { user_id: 'user-rohan', decision: 'approved' },
      ]
    );
    expect(step2.isResolved).toBe(true);
    expect(step2.status).toBe('approved');
  });
});
