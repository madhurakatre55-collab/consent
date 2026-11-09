import { MandateCompiled, RequiredApprovers } from './mandateSchema.js';

export interface ProposalInput {
  id?: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  item: string;
  proposed_at?: string;
}

export interface CircleInput {
  id: string;
  name: string;
  active: number | boolean;
  expires_at?: string | null;
  monthly_budget: number;
  currency: string;
}

export interface CircleMemberInput {
  id: string;
  user_id: string;
  role: 'owner' | 'member' | 'guardian' | 'observer' | string;
  approval_weight: number;
  can_propose: number | boolean;
  can_approve: number | boolean;
}

export interface ConsentDecisionInput {
  user_id: string;
  decision: 'approved' | 'rejected';
  comment?: string;
}

export interface LedgerSpendRecord {
  amount: number;
  status: string; // 'held', 'captured', 'ready_to_release', etc.
  timestamp: string;
}

export interface EvaluationResult {
  decision: 'approve_now' | 'awaiting_consent' | 'block';
  matched_clause: string;
  reason: string;
  requiredApprovers: RequiredApprovers;
}

export function calculateMedian(numbers: number[]): number | null {
  if (!numbers || numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

const GUARDIAN_CATEGORIES = ['Electronics', 'Medical', 'Travel'];

/**
 * Pure policy evaluation engine.
 * Evaluation order (first failure wins):
 * 1. Mandate expired
 * 2. Circle inactive
 * 3. Merchant blocked
 * 4. Category blocked or not allowed
 * 5. Monthly budget exhausted (current month held + captured + this proposal)
 * 6. Price deviation exceeds max_price_deviation_percent vs merchant historical median
 * 7. Category requiring guardian override -> awaiting_consent (guardian_required)
 * 8. Amount within per_purchase_auto_approve_limit -> approve_now
 * 9. Otherwise -> awaiting_consent with required approvers
 */
export function evaluateProposal(
  proposal: ProposalInput,
  mandate: MandateCompiled,
  circle: CircleInput,
  ledgerToDate: LedgerSpendRecord[] = [],
  merchantPriceHistory: number[] = [],
  now: Date = new Date()
): EvaluationResult {
  const defaultApprovers: RequiredApprovers = mandate.required_approvers || {
    mode: 'quorum',
    count: 2,
    roles: ['member', 'owner', 'guardian'],
  };

  // 1. Mandate expired
  if (mandate.expires_at) {
    const mandateExpiry = new Date(mandate.expires_at);
    if (now.getTime() > mandateExpiry.getTime()) {
      return {
        decision: 'block',
        matched_clause: 'mandate.expires_at',
        reason: `Mandate expired on ${mandateExpiry.toISOString()}`,
        requiredApprovers: defaultApprovers,
      };
    }
  }

  // 2. Circle inactive
  const isCircleActive =
    Boolean(circle.active) &&
    (!circle.expires_at || new Date(circle.expires_at).getTime() >= now.getTime());
  if (!isCircleActive) {
    return {
      decision: 'block',
      matched_clause: 'circle.active',
      reason: 'Spending circle is inactive or expired',
      requiredApprovers: defaultApprovers,
    };
  }

  // 3. Merchant blocked
  const normalizedMerchant = proposal.merchant.trim().toLowerCase();
  const isMerchantBlocked = (mandate.blocked_merchants || []).some(
    (bm) => bm.trim().toLowerCase() === normalizedMerchant
  );
  if (isMerchantBlocked) {
    return {
      decision: 'block',
      matched_clause: 'mandate.blocked_merchants',
      reason: `Merchant "${proposal.merchant}" is on the circle's blocked merchants list`,
      requiredApprovers: defaultApprovers,
    };
  }

  // 4. Category blocked or not allowed
  const normalizedCategory = proposal.category.trim().toLowerCase();
  const isCategoryBlocked = (mandate.blocked_categories || []).some(
    (bc) => bc.trim().toLowerCase() === normalizedCategory
  );
  if (isCategoryBlocked) {
    return {
      decision: 'block',
      matched_clause: 'mandate.blocked_categories',
      reason: `Category "${proposal.category}" is blocked by policy`,
      requiredApprovers: defaultApprovers,
    };
  }

  const allowedList = mandate.allowed_categories || [];
  if (allowedList.length > 0) {
    const isAllowed = allowedList.some(
      (ac) => ac.trim().toLowerCase() === normalizedCategory
    );
    if (!isAllowed) {
      return {
        decision: 'block',
        matched_clause: 'mandate.allowed_categories',
        reason: `Category "${proposal.category}" is not in the allowed categories list (${allowedList.join(', ')})`,
        requiredApprovers: defaultApprovers,
      };
    }
  }

  // 5. Monthly budget exhausted
  // Current calendar month spending (held, captured, ready_to_release)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthSpend = ledgerToDate
    .filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return (
        entryDate.getFullYear() === currentYear &&
        entryDate.getMonth() === currentMonth &&
        ['held', 'captured', 'ready_to_release', 'approved'].includes(entry.status)
      );
    })
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalProjectedSpend = currentMonthSpend + proposal.amount;
  if (totalProjectedSpend > mandate.monthly_budget.amount) {
    return {
      decision: 'block',
      matched_clause: 'mandate.monthly_budget',
      reason: `Monthly budget of ${mandate.monthly_budget.currency} ${mandate.monthly_budget.amount} exceeded (Current spent/held: ${currentMonthSpend}, Proposal: ${proposal.amount}, Total: ${totalProjectedSpend})`,
      requiredApprovers: defaultApprovers,
    };
  }

  // 6. Price deviation exceeds max_price_deviation_percent versus merchant historical median
  if (merchantPriceHistory && merchantPriceHistory.length > 0) {
    const median = calculateMedian(merchantPriceHistory);
    if (median !== null && median > 0) {
      const allowedMax = median * (1 + mandate.max_price_deviation_percent / 100);
      if (proposal.amount > allowedMax) {
        return {
          decision: 'block',
          matched_clause: 'mandate.max_price_deviation_percent',
          reason: `Proposal price of ${proposal.amount} exceeds historical median (${median}) by more than ${mandate.max_price_deviation_percent}% (threshold: ${allowedMax.toFixed(2)})`,
          requiredApprovers: defaultApprovers,
        };
      }
    }
  }

  // 7. Check if category specifically requires Guardian (e.g. Electronics, Medical, Travel)
  const isHighRiskCategory = GUARDIAN_CATEGORIES.some(
    (c) => c.toLowerCase() === normalizedCategory
  );
  if (mandate.required_approvers.mode === 'guardian_required' || isHighRiskCategory) {
    const guardianApprovers: RequiredApprovers = {
      mode: 'guardian_required',
      count: 1,
      roles: ['guardian'],
    };
    return {
      decision: 'awaiting_consent',
      matched_clause: 'mandate.required_approvers.guardian_required',
      reason: `Category "${proposal.category}" is high-risk and explicitly requires Guardian consent`,
      requiredApprovers: guardianApprovers,
    };
  }

  // 8. Amount is within per_purchase_auto_approve_limit -> approve_now
  if (proposal.amount <= mandate.per_purchase_auto_approve_limit) {
    return {
      decision: 'approve_now',
      matched_clause: 'mandate.per_purchase_auto_approve_limit',
      reason: `Amount ${proposal.amount} is within auto-approve threshold of ${mandate.per_purchase_auto_approve_limit}`,
      requiredApprovers: defaultApprovers,
    };
  }

  // 9. Otherwise: awaiting_consent with the configured required approvers
  return {
    decision: 'awaiting_consent',
    matched_clause: 'mandate.required_approvers',
    reason: `Amount ${proposal.amount} exceeds auto-approve threshold of ${mandate.per_purchase_auto_approve_limit}; requires ${mandate.required_approvers.mode} approval`,
    requiredApprovers: defaultApprovers,
  };
}

export interface ConsentEvaluationResult {
  isResolved: boolean;
  status: 'approved' | 'blocked' | 'awaiting_consent';
  approvalsCount: number;
  rejectionsCount: number;
  totalRequired: number;
  summary: string;
}

/**
 * Evaluates human decisions for a proposal in the consent queue.
 * - Human action only (LLM cannot approve).
 * - Quorum: count approvals from members with can_approve=1.
 * - Unanimous: all members with can_approve=1 must approve.
 * - Guardian required: at least 1 approval from a guardian member.
 * - If a required member or guardian rejects, or rejections make quorum impossible -> blocked.
 */
export function evaluateConsents(
  proposal: ProposalInput,
  requiredApprovers: RequiredApprovers,
  circleMembers: CircleMemberInput[],
  decisions: ConsentDecisionInput[]
): ConsentEvaluationResult {
  const eligibleApprovers = circleMembers.filter((m) => Boolean(m.can_approve));
  const eligibleUserIds = new Set(eligibleApprovers.map((m) => m.user_id));

  // Only count decisions made by members with approval power (e.g. observers excluded)
  const approvals = decisions.filter(
    (d) => d.decision === 'approved' && eligibleUserIds.has(d.user_id)
  );
  const rejections = decisions.filter(
    (d) => d.decision === 'rejected' && eligibleUserIds.has(d.user_id)
  );

  const approvalUserIds = new Set(approvals.map((a) => a.user_id));
  const rejectionUserIds = new Set(rejections.map((r) => r.user_id));

  // Guardian required check
  if (requiredApprovers.mode === 'guardian_required') {
    const guardianMembers = eligibleApprovers.filter((m) => m.role === 'guardian');
    const guardianIds = new Set(guardianMembers.map((g) => g.user_id));

    // Has any guardian rejected?
    const guardianRejection = [...rejectionUserIds].some((id) => guardianIds.has(id));
    if (guardianRejection) {
      return {
        isResolved: true,
        status: 'blocked',
        approvalsCount: approvals.length,
        rejectionsCount: rejections.length,
        totalRequired: 1,
        summary: 'Blocked: Designated Guardian rejected the proposal',
      };
    }

    // Has at least one guardian approved?
    const guardianApproval = [...approvalUserIds].some((id) => guardianIds.has(id));
    if (guardianApproval) {
      return {
        isResolved: true,
        status: 'approved',
        approvalsCount: approvals.length,
        rejectionsCount: rejections.length,
        totalRequired: 1,
        summary: 'Approved: Guardian consent received',
      };
    }

    return {
      isResolved: false,
      status: 'awaiting_consent',
      approvalsCount: 0,
      rejectionsCount: rejections.length,
      totalRequired: 1,
      summary: 'Awaiting Guardian consent',
    };
  }

  // Unanimous mode
  if (requiredApprovers.mode === 'unanimous') {
    const totalRequired = eligibleApprovers.length;

    if (rejections.length > 0) {
      return {
        isResolved: true,
        status: 'blocked',
        approvalsCount: approvals.length,
        rejectionsCount: rejections.length,
        totalRequired,
        summary: 'Blocked: Unanimous consent failed due to rejection',
      };
    }

    if (approvals.length >= totalRequired && totalRequired > 0) {
      return {
        isResolved: true,
        status: 'approved',
        approvalsCount: approvals.length,
        rejectionsCount: 0,
        totalRequired,
        summary: `Approved: All ${totalRequired} members approved unanimously`,
      };
    }

    return {
      isResolved: false,
      status: 'awaiting_consent',
      approvalsCount: approvals.length,
      rejectionsCount: 0,
      totalRequired,
      summary: `${approvals.length} of ${totalRequired} unanimous approvals received`,
    };
  }

  // Quorum mode (e.g. k of n)
  const requiredCount = requiredApprovers.count || 2;
  const totalEligible = eligibleApprovers.length;

  // If rejections prevent reaching quorum
  const maxPossibleApprovals = totalEligible - rejections.length;
  if (maxPossibleApprovals < requiredCount) {
    return {
      isResolved: true,
      status: 'blocked',
      approvalsCount: approvals.length,
      rejectionsCount: rejections.length,
      totalRequired: requiredCount,
      summary: `Blocked: Impossible to reach quorum (${rejections.length} rejections, ${requiredCount} required)`,
    };
  }

  if (approvals.length >= requiredCount) {
    return {
      isResolved: true,
      status: 'approved',
      approvalsCount: approvals.length,
      rejectionsCount: rejections.length,
      totalRequired: requiredCount,
      summary: `Approved: ${approvals.length} of ${requiredCount} required approvals received`,
    };
  }

  return {
    isResolved: false,
    status: 'awaiting_consent',
    approvalsCount: approvals.length,
    rejectionsCount: rejections.length,
    totalRequired: requiredCount,
    summary: `${approvals.length} of ${requiredCount} approvals received`,
  };
}
