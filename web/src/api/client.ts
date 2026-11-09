export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'member' | 'guardian' | 'observer';
}

export interface Agent {
  id: string;
  circle_id: string;
  name: string;
  description: string;
  category: string;
  daily_limit: number;
  active: number;
  lifetime_spent: number;
  avatar_icon: string;
  proposals_count?: number;
}

export interface CircleAnalytics {
  circleId: string;
  circleName: string;
  currency: string;
  budgetTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  percentUtilized: number;
  categories: Array<{ category: string; amount: number; percentage: number }>;
  approverActivity: Array<{ name: string; role: string; decision: string; count: number }>;
}

export interface Circle {
  id: string;
  name: string;
  owner_id: string;
  owner_name?: string;
  monthly_budget: number;
  currency: string;
  active: number;
  member_count?: number;
  active_mandate?: any;
  members?: Array<{
    id: string;
    circle_id: string;
    user_id: string;
    role: string;
    can_propose: number;
    can_approve: number;
    name: string;
    email: string;
  }>;
}

export interface Proposal {
  id: string;
  circle_id: string;
  circle_name?: string;
  mandate_id: string;
  agent_id: string;
  merchant: string;
  item: string;
  amount: number;
  currency: string;
  category: string;
  proposed_at: string;
  status:
    | 'proposed'
    | 'awaiting_consent'
    | 'approved'
    | 'blocked'
    | 'held'
    | 'ready_to_release'
    | 'captured'
    | 'voided'
    | 'failed'
    | 'expired'
    | 'negotiating';
  decision_reason: string;
  matched_clause: string;
  paypal_order_id?: string | null;
  paypal_authorization_id?: string | null;
  release_condition?: any;
  release_deadline?: string;
  agreed_price?: number;
  approvals_count?: number;
  rejections_count?: number;
  mandate?: any;
  decisions?: Array<{
    user_id: string;
    user_name: string;
    user_role: string;
    decision: string;
    comment?: string;
    created_at: string;
  }>;
  negotiations?: Array<{
    id: string;
    round: number;
    agent_offer: number;
    merchant_response: {
      action: 'accept' | 'counter' | 'reject';
      counter_price?: number;
      message: string;
    };
    status: string;
    created_at: string;
  }>;
}

const API_BASE = '/api';

export const api = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  // Circles
  getCircles: async (): Promise<Circle[]> => {
    const res = await fetch(`${API_BASE}/circles`);
    return res.json();
  },
  getCircle: async (id: string): Promise<Circle> => {
    const res = await fetch(`${API_BASE}/circles/${id}`);
    return res.json();
  },
  createCircle: async (data: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/circles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Mandates
  compileMandate: async (rawText: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/mandates/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText }),
    });
    return res.json();
  },
  confirmMandate: async (data: { circleId: string; rawText: string; compiledJson: any }): Promise<any> => {
    const res = await fetch(`${API_BASE}/mandates/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  getMandates: async (circleId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/mandates/${circleId}`);
    return res.json();
  },

  // Proposals
  getProposals: async (circleId?: string, status?: string): Promise<Proposal[]> => {
    const params = new URLSearchParams();
    if (circleId) params.append('circle_id', circleId);
    if (status) params.append('status', status);
    const res = await fetch(`${API_BASE}/proposals?${params.toString()}`);
    return res.json();
  },
  getProposal: async (id: string): Promise<Proposal> => {
    const res = await fetch(`${API_BASE}/proposals/${id}`);
    return res.json();
  },
  runAgent: async (params: { circleId: string; preset?: string; customProposal?: any }): Promise<any> => {
    const res = await fetch(`${API_BASE}/proposals/run-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },
  negotiate: async (proposalId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/proposals/negotiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId }),
    });
    return res.json();
  },

  // Consents
  getPendingConsents: async (circleId?: string): Promise<Proposal[]> => {
    const params = new URLSearchParams();
    if (circleId) params.append('circle_id', circleId);
    const res = await fetch(`${API_BASE}/consents/pending?${params.toString()}`);
    return res.json();
  },
  decideConsent: async (data: {
    proposal_id: string;
    user_id: string;
    decision: 'approved' | 'rejected';
    comment?: string;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/consents/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Payments & Conditional Release
  releasePayment: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/payments/release/${id}`, {
      method: 'POST',
    });
    return res.json();
  },
  voidPayment: async (id: string, reason?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/payments/void/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },
  triggerReleaseCheck: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/payments/trigger-release-check`, {
      method: 'POST',
    });
    return res.json();
  },

  // Ledger & Receipts
  getLedger: async (params?: { circle_id?: string; event_type?: string; actor?: string }): Promise<any[]> => {
    const sp = new URLSearchParams();
    if (params?.circle_id) sp.append('circle_id', params.circle_id);
    if (params?.event_type) sp.append('event_type', params.event_type);
    if (params?.actor) sp.append('actor', params.actor);
    const res = await fetch(`${API_BASE}/ledger?${sp.toString()}`);
    return res.json();
  },
  getReceipt: async (proposalId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/ledger/receipt/${proposalId}`);
    return res.json();
  },
  askLedger: async (question: string, circleId?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/ledger/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, circleId }),
    });
    return res.json();
  },

  // Demo reset
  resetDemoSeed: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/demo/reset-seed`, {
      method: 'POST',
    });
    return res.json();
  },

  // Specialized AI Agents
  getAgents: async (circleId?: string): Promise<Agent[]> => {
    const params = new URLSearchParams();
    if (circleId) params.append('circle_id', circleId);
    const res = await fetch(`${API_BASE}/agents?${params.toString()}`);
    return res.json();
  },
  toggleAgent: async (id: string, active: boolean): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    });
    return res.json();
  },
  createAgent: async (data: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Circle Analytics
  getCircleAnalytics: async (circleId: string): Promise<CircleAnalytics> => {
    const res = await fetch(`${API_BASE}/circles/${circleId}/analytics`);
    return res.json();
  },

  // Interactive Live Conditions Simulator
  simulateCondition: async (proposalId: string, action: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/proposals/simulate-condition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, action }),
    });
    return res.json();
  },

  // Custom Natural Language Agent Purchase Proposer
  customAgentPrompt: async (circleId: string, prompt: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/proposals/custom-agent-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circleId, prompt }),
    });
    return res.json();
  },

  // Cryptographic Chain Inspector & Tamper Demonstration
  verifyChain: async (circleId?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (circleId) params.append('circle_id', circleId);
    const res = await fetch(`${API_BASE}/ledger/verify-chain?${params.toString()}`);
    return res.json();
  },
  simulateTamper: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/ledger/simulate-tamper`, {
      method: 'POST',
    });
    return res.json();
  },
};
