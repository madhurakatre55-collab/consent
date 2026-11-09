import { MandateCompiled } from '../policy/mandateSchema.js';

export function mockCompileMandate(rawText: string): MandateCompiled {
  const lower = rawText.toLowerCase();

  // Extract budget
  let amount = 8000;
  const budgetMatch = rawText.match(/(?:₹|rs\.?|inr|\$)\s?(\d+(?:,\d+)*(?:\.\d+)?)/i) ||
                      rawText.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:monthly|budget|rupees)/i);
  if (budgetMatch) {
    amount = parseFloat(budgetMatch[1].replace(/,/g, ''));
  }

  // Extract auto-approve limit
  let autoLimit = 1500;
  const autoMatch = rawText.match(/under\s*(?:₹|rs\.?|inr|\$)?\s?(\d+(?:,\d+)*)/i) ||
                    rawText.match(/automatic\s*(?:below|under)?\s*(?:₹|rs\.?|inr|\$)?\s?(\d+(?:,\d+)*)/i);
  if (autoMatch) {
    autoLimit = parseFloat(autoMatch[1].replace(/,/g, ''));
  }

  // Determine approval mode
  let mode: 'quorum' | 'unanimous' | 'guardian_required' = 'quorum';
  let count = 2;
  if (lower.includes('unanimous') || lower.includes('all members') || lower.includes('needs everyone')) {
    mode = 'unanimous';
    count = 3;
  } else if (lower.includes('guardian') && !lower.includes('2 of 3')) {
    mode = 'guardian_required';
    count = 1;
  } else {
    mode = 'quorum';
    count = 2;
  }

  const allowedCategories: string[] = [];
  if (lower.includes('food') || lower.includes('grocery') || lower.includes('groceries')) {
    allowedCategories.push('Groceries', 'Food');
  }
  if (lower.includes('household')) {
    allowedCategories.push('Household');
  }
  if (lower.includes('electronics')) {
    allowedCategories.push('Electronics');
  }
  if (lower.includes('travel') || lower.includes('flight') || lower.includes('hotel')) {
    allowedCategories.push('Travel');
  }
  if (allowedCategories.length === 0) {
    allowedCategories.push('Groceries', 'Household', 'Food', 'Electronics');
  }

  const blockedCategories = ['Gambling', 'Weapons', 'Adult', 'Crypto'];
  if (lower.includes('alcohol')) blockedCategories.push('Alcohol');

  const blockedMerchants = ['Suspicious Deals Ltd', 'DarkWebMarket', 'Unknown Merchants'];
  if (lower.includes('unknown merchants')) {
    blockedMerchants.push('Unknown');
  }

  // Release condition type
  let conditionType: 'manual_approval' | 'price_target' | 'stock_available' | 'delivery_date' = 'manual_approval';
  if (lower.includes('price drops') || lower.includes('price target')) {
    conditionType = 'price_target';
  } else if (lower.includes('stock')) {
    conditionType = 'stock_available';
  } else if (lower.includes('delivery')) {
    conditionType = 'delivery_date';
  }

  return {
    monthly_budget: {
      amount,
      currency: 'INR',
    },
    per_purchase_auto_approve_limit: autoLimit,
    required_approvers: {
      mode,
      count,
      roles: ['owner', 'member', 'guardian'],
    },
    allowed_categories: allowedCategories,
    blocked_categories: blockedCategories,
    blocked_merchants: blockedMerchants,
    max_price_deviation_percent: 25,
    cooling_off_minutes: 1, // 1 minute in demo mode for fast testing
    release_condition: {
      type: conditionType,
      target_amount: autoLimit,
    },
    expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
  };
}

export function mockNegotiationTurn(round: number, currentOffer: number, targetMax: number, item: string): {
  agentMessage: string;
  merchantResponse: {
    action: 'accept' | 'counter' | 'reject';
    counter_price?: number;
    message: string;
  };
} {
  if (round === 1) {
    return {
      agentMessage: `We are interested in ${item}, but our spending mandate cap is ₹${targetMax}. We can offer ₹${targetMax} for immediate settlement.`,
      merchantResponse: {
        action: 'counter',
        counter_price: Math.round(targetMax + (currentOffer - targetMax) * 0.4),
        message: `Our listed price is ₹${currentOffer}, but we can offer a bundle discount down to ₹${Math.round(targetMax + (currentOffer - targetMax) * 0.4)}.`,
      },
    };
  } else {
    return {
      agentMessage: `Our mandate strictly forbids exceeding ₹${targetMax}. If you can meet ₹${targetMax}, we can complete the purchase via instant PayPal authorization.`,
      merchantResponse: {
        action: 'accept',
        counter_price: targetMax,
        message: `Deal accepted at ₹${targetMax} with priority dispatch.`,
      },
    };
  }
}

export function mockLedgerAnswer(question: string, ledgerRecords: any[]): string {
  const q = question.toLowerCase();

  if (ledgerRecords.length === 0) {
    return 'The ledger currently contains no recorded transactions for this circle.';
  }

  if (q.includes('total') || q.includes('spent') || q.includes('how much')) {
    const captured = ledgerRecords.filter((r) => r.event_type === 'CAPTURED');
    const total = captured.reduce((sum, r) => {
      try {
        const detail = JSON.parse(r.detail);
        return sum + (detail.amount || 0);
      } catch {
        return sum;
      }
    }, 0);
    return `Based strictly on the ledger records: Total captured spend across all verified transactions is ₹${total.toLocaleString('en-IN')}.`;
  }

  if (q.includes('who approved') || q.includes('approv')) {
    const approvals = ledgerRecords.filter((r) => r.event_type.includes('CONSENT') || r.event_type.includes('APPROV'));
    if (approvals.length === 0) {
      return 'No manual consent approvals are recorded in the ledger yet.';
    }
    const details = approvals.map((a) => `${a.actor} (${a.detail})`).join('; ');
    return `According to verified ledger entries: Approvals were logged by: ${details}.`;
  }

  if (q.includes('blocked') || q.includes('reject')) {
    const blocks = ledgerRecords.filter((r) => r.event_type.includes('BLOCK') || r.event_type.includes('REJECT'));
    if (blocks.length === 0) {
      return 'No transactions have been blocked or rejected in the current ledger.';
    }
    return `Found ${blocks.length} blocked/rejected proposal(s) in the ledger: ${blocks.map((b) => b.explanation || b.detail).join(' | ')}.`;
  }

  if (q.includes('hash') || q.includes('chain') || q.includes('tamper')) {
    const latest = ledgerRecords[ledgerRecords.length - 1];
    return `The ledger is anchored with a SHA-256 hash chain. The latest block hash is ${latest.receipt_hash.substring(0, 16)}... and chains from previous hash ${latest.previous_receipt_hash.substring(0, 16)}...`;
  }

  return `Based on ${ledgerRecords.length} recorded ledger entries: The requested detail regarding "${question}" was not explicitly found in the transaction log.`;
}
