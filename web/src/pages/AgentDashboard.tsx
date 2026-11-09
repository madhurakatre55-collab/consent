import React, { useState, useEffect } from 'react';
import { Proposal, User, Circle, api, CircleAnalytics } from '../api/client.js';
import { ProposalCard } from '../components/ProposalCard.js';
import { EmptyState } from '../components/EmptyState.js';
import { ConditionsSimulatorWidget } from '../components/ConditionsSimulatorWidget.js';
import { BudgetAnalyticsWidget } from '../components/BudgetAnalyticsWidget.js';
import { HeroShowcase } from '../components/HeroShowcase.js';
import {
  Sparkles,
  RefreshCw,
  Send,
  X,
  Search,
  ShoppingCart,
  MessageSquare,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface AgentDashboardProps {
  proposals: Proposal[];
  circles: Circle[];
  selectedCircleId: string;
  onCircleChange: (circleId: string) => void;
  currentUser: User | null;
  onRefresh: () => void;
  onOpenReceipt: (proposalId: string) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  proposals,
  circles,
  selectedCircleId,
  currentUser,
  onRefresh,
  onOpenReceipt,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [isCheckingRelease, setIsCheckingRelease] = useState(false);
  const [negotiatingProposalId, setNegotiatingProposalId] = useState<string | null>(null);
  const [activeNegotiation, setActiveNegotiation] = useState<Proposal | null>(null);
  const [isSteppingNegotiation, setIsSteppingNegotiation] = useState(false);

  // Custom Agent Prompt state
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<CircleAnalytics | null>(null);

  useEffect(() => {
    if (selectedCircleId) {
      api.getCircleAnalytics(selectedCircleId).then(setAnalytics).catch(console.error);
    }
  }, [selectedCircleId, proposals]);

  const filteredProposals = proposals.filter((p) => {
    if (selectedCircleId && p.circle_id !== selectedCircleId) return false;
    if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
    return true;
  });

  const heldProposals = proposals.filter(
    (p) => (!selectedCircleId || p.circle_id === selectedCircleId) && p.status === 'held'
  );

  const handleRunAgent = async (
    scenario: 'auto_approve' | 'needs_quorum' | 'blocked_merchant' | 'negotiable'
  ) => {
    if (!selectedCircleId) return;
    setIsRunningAgent(true);
    try {
      const res = await api.runAgent({ circleId: selectedCircleId, preset: scenario });
      onRefresh();
      alert(`Autonomous Agent evaluated: ${res.item} (₹${res.amount}). Decision: ${res.evaluation.decision.toUpperCase()}. Rule: ${res.evaluation.matchedClause}`);
    } catch (err: any) {
      alert(`Agent run error: ${err.message}`);
    } finally {
      setIsRunningAgent(false);
    }
  };

  const handleCustomPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || !selectedCircleId) return;

    setIsSubmittingCustom(true);
    try {
      const res = await api.customAgentPrompt(selectedCircleId, customPrompt);
      setCustomPrompt('');
      onRefresh();
      alert(`Agent proposed "${res.item}" for ₹${res.amount}! Engine decision: ${res.evaluation.decision.toUpperCase()}.`);
    } catch (err: any) {
      alert(`Custom agent proposal error: ${err.message}`);
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleOpenNegotiation = async (proposalId: string) => {
    setNegotiatingProposalId(proposalId);
    try {
      const full = await api.getProposal(proposalId);
      setActiveNegotiation(full);
    } catch (err: any) {
      alert(`Could not load negotiation details: ${err.message}`);
    }
  };

  const handleStepNegotiation = async () => {
    if (!negotiatingProposalId) return;
    setIsSteppingNegotiation(true);
    try {
      await api.negotiate(negotiatingProposalId);
      const updated = await api.getProposal(negotiatingProposalId);
      setActiveNegotiation(updated);
      onRefresh();
    } catch (err: any) {
      alert(`Negotiation error: ${err.message}`);
    } finally {
      setIsSteppingNegotiation(false);
    }
  };

  const handleApprove = async (proposalId: string, comment?: string) => {
    if (!currentUser) return;
    try {
      await api.decideConsent({
        proposal_id: proposalId,
        user_id: currentUser.id,
        decision: 'approved',
        comment,
      });
      onRefresh();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (proposalId: string, comment?: string) => {
    if (!currentUser) return;
    try {
      await api.decideConsent({
        proposal_id: proposalId,
        user_id: currentUser.id,
        decision: 'rejected',
        comment,
      });
      onRefresh();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  const handleRelease = async (proposalId: string) => {
    try {
      await api.releasePayment(proposalId);
      alert('Conditions verified! PayPal sandbox authorization captured successfully.');
      onRefresh();
    } catch (err: any) {
      alert(`Release error: ${err.message}`);
    }
  };

  const handleVoid = async (proposalId: string) => {
    try {
      await api.voidPayment(proposalId, 'Manually cancelled by user');
      onRefresh();
    } catch (err: any) {
      alert(`Void error: ${err.message}`);
    }
  };

  const handleTriggerReleaseCheck = async () => {
    setIsCheckingRelease(true);
    try {
      const res = await api.triggerReleaseCheck();
      alert(`Evaluated release conditions. Processed ${res.processedCount} held payment(s).`);
      onRefresh();
    } catch (err: any) {
      alert(`Release check error: ${err.message}`);
    } finally {
      setIsCheckingRelease(false);
    }
  };

  const selectedCircle = circles.find((c) => c.id === selectedCircleId) || null;

  return (
    <div className="space-y-6">
      {/* Exact Pinterest Reference Hero Showcase */}
      <HeroShowcase
        circle={selectedCircle}
        onRunAgentPreset={handleRunAgent}
        onExploreLedger={onRefresh}
      />

      {/* Circle Budget Analytics Widget */}
      <BudgetAnalyticsWidget analytics={analytics} />

      {/* Header & Agent Trigger Presets */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-card-dark border border-white/[0.08] text-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gold-400 shadow-gold-glow animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-display">
                Autonomous Agent Dashboard
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              AI agents research items and propose purchases, but the deterministic Policy Engine governs money-moving authority.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleTriggerReleaseCheck}
              disabled={isCheckingRelease}
              title="Runs conditional release evaluation job immediately"
              className="px-4 py-2.5 dark-glass-btn text-gold-300 rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gold-400 ${isCheckingRelease ? 'animate-spin' : ''}`} />
              <span>Check Release Conditions</span>
            </button>
          </div>
        </div>

        {/* Quick Agent Run Presets */}
        <div className="pt-2 border-t border-white/[0.08]">
          <span className="text-[11px] font-black text-gold-400 uppercase tracking-widest block mb-3 font-display">
            Simulate Autonomous Agent Scenarios:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => handleRunAgent('auto_approve')}
              disabled={isRunningAgent}
              className="p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl text-left border border-white/[0.08] hover:border-gold-500/40 shadow-sm transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-gold-300 transition flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                  <span>1. Auto-Approve</span>
                </span>
                <span className="text-[10px] text-dark-950 bg-gold-gradient font-black px-2 py-0.5 rounded-md font-mono">
                  &lt; ₹1,500
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Organic milk & eggs. Policy auto-authorizes and holds in PayPal.
              </p>
            </button>

            <button
              onClick={() => handleRunAgent('needs_quorum')}
              disabled={isRunningAgent}
              className="p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl text-left border border-white/[0.08] hover:border-gold-500/40 shadow-sm transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-gold-300 transition flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-gold-400" />
                  <span>2. Quorum Order</span>
                </span>
                <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                  ₹3,400
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Pantry bulk restock. Enters consent queue needing 2-of-3 votes.
              </p>
            </button>

            <button
              onClick={() => handleRunAgent('blocked_merchant')}
              disabled={isRunningAgent}
              className="p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl text-left border border-white/[0.08] hover:border-gold-500/40 shadow-sm transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-gold-300 transition flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>3. Blocked Vendor</span>
                </span>
                <span className="text-[10px] text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                  Blocked
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Suspicious Deals Ltd. Blocked instantly by policy clause.
              </p>
            </button>

            <button
              onClick={() => handleRunAgent('negotiable')}
              disabled={isRunningAgent}
              className="p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl text-left border border-white/[0.08] hover:border-gold-500/40 shadow-sm transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-gold-300 transition flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>4. Negotiation</span>
                </span>
                <span className="text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                  Interactive
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Smart Vacuum (₹4,999). Agent negotiates price down to cap!
              </p>
            </button>
          </div>
        </div>

        {/* Natural Language Purchase Proposer */}
        <div className="pt-3 border-t border-white/[0.08]">
          <form onSubmit={handleCustomPromptSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder="Tell agent what to buy (e.g. 'Order 5kg basmati rice for ₹450 from BigBasket' or 'Buy Sony headphones for ₹18,000 from Croma')..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="flex-1 text-xs p-3.5 rounded-xl bg-dark-900/90 text-white placeholder-slate-500 border border-white/[0.12] focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/40"
            />
            <button
              type="submit"
              disabled={isSubmittingCustom}
              className="px-6 py-3.5 gold-btn font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingCustom ? 'Processing...' : 'Propose Purchase'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Conditions Simulator Widget (Shows whenever proposals are held!) */}
      {heldProposals.length > 0 && (
        <ConditionsSimulatorWidget
          heldProposals={heldProposals}
          onTriggered={onRefresh}
        />
      )}

      {/* Circle & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-4 rounded-2xl border border-white/[0.08] shadow-card-dark">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display">Filter Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-bold p-2 rounded-xl border border-white/[0.12] bg-dark-900 text-gold-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Proposals</option>
            <option value="held">Held (PayPal Auth)</option>
            <option value="awaiting_consent">Awaiting Consent</option>
            <option value="captured">Captured (Paid)</option>
            <option value="blocked">Blocked</option>
            <option value="negotiating">Negotiating</option>
            <option value="voided">Voided</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <strong className="text-gold-300">{filteredProposals.length}</strong> proposal(s)
        </div>
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <EmptyState
          title="No proposals found"
          description="Click one of the agent scenarios above to have an autonomous agent propose a purchase."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              currentUser={currentUser}
              onApprove={handleApprove}
              onReject={handleReject}
              onRelease={handleRelease}
              onVoid={handleVoid}
              onNegotiate={handleOpenNegotiation}
              onOpenReceipt={onOpenReceipt}
            />
          ))}
        </div>
      )}

      {/* Interactive Negotiation Room Modal */}
      {activeNegotiation && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-card-dark border border-white/[0.12] space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Feature 4: Agent Negotiation Room
                </span>
                <h2 className="text-xl font-black text-white mt-2 font-display">
                  Negotiating: {activeNegotiation.item}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Merchant: <strong className="text-slate-200">{activeNegotiation.merchant}</strong> • Initial Price: ₹{activeNegotiation.amount} • Mandate Ceiling: ₹4,200
                </p>
              </div>
              <button
                onClick={() => setActiveNegotiation(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              <div className="bg-gold-500/10 p-3 rounded-xl border border-gold-500/20 text-xs text-gold-200 leading-relaxed">
                <strong className="text-gold-400">Safety Invariant: </strong> The LLM agent can counteroffer and explain, but it can never change the mandate, approve itself, or exceed the maximum limit.
              </div>

              {activeNegotiation.negotiations && activeNegotiation.negotiations.length > 0 ? (
                activeNegotiation.negotiations.map((n, idx) => (
                  <div key={idx} className="space-y-2 border border-white/[0.08] rounded-2xl p-4 bg-white/[0.02]">
                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Round {n.round}</span>
                    </div>

                    {/* Agent offer */}
                    <div className="bg-gold-500/10 text-gold-200 p-3 rounded-xl text-xs border border-gold-500/20">
                      <strong className="text-gold-400">AI Agent Offer: </strong>
                      Counter-offered ₹{n.agent_offer} (strictly within circle policy limits).
                    </div>

                    {/* Merchant response */}
                    <div className="bg-white/[0.04] text-slate-300 p-3 rounded-xl text-xs border border-white/[0.08]">
                      <strong className="text-white">Merchant Response ({n.merchant_response.action}): </strong>
                      {n.merchant_response.message}
                      {n.merchant_response.counter_price && (
                        <div className="font-bold text-gold-300 mt-1 font-mono">
                          Counter Price: ₹{n.merchant_response.counter_price}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">
                  No rounds recorded yet. Click "Send Counteroffer" to begin negotiation.
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-white/[0.08] pt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Status: <strong className="capitalize text-white font-mono">{activeNegotiation.status}</strong>
              </span>

              {activeNegotiation.status === 'negotiating' ? (
                <button
                  onClick={handleStepNegotiation}
                  disabled={isSteppingNegotiation}
                  className="px-5 py-2.5 gold-btn text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSteppingNegotiation ? 'Sending...' : 'Send AI Counteroffer'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-300 font-bold bg-emerald-500/15 px-3 py-1 rounded-xl border border-emerald-500/30">
                    Negotiation Completed!
                  </span>
                  <button
                    onClick={() => setActiveNegotiation(null)}
                    className="px-4 py-1.5 dark-glass-btn text-white text-xs font-bold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
