import React, { useState } from 'react';
import { Proposal, User, api } from '../api/client.js';
import { ApprovalProgress } from '../components/ApprovalProgress.js';
import { EmptyState } from '../components/EmptyState.js';
import {
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  Store,
} from 'lucide-react';

interface ConsentQueueProps {
  pendingProposals: Proposal[];
  currentUser: User | null;
  onRefresh: () => void;
  onOpenReceipt: (proposalId: string) => void;
}

export const ConsentQueue: React.FC<ConsentQueueProps> = ({
  pendingProposals,
  currentUser,
  onRefresh,
  onOpenReceipt,
}) => {
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const handleVote = async (proposalId: string, decision: 'approved' | 'rejected') => {
    if (!currentUser) {
      alert('Please select an active user persona in the top navigation');
      return;
    }

    if (currentUser.role === 'observer') {
      alert('Observers have read-only ledger access and cannot approve purchases.');
      return;
    }

    const comment = commentInputs[proposalId] || '';
    setIsSubmitting(proposalId);

    try {
      const res = await api.decideConsent({
        proposal_id: proposalId,
        user_id: currentUser.id,
        decision,
        comment,
      });

      if (res.newStatus === 'held') {
        alert(
          `Consent threshold achieved! Proposal approved by circle and held in PayPal Sandbox (Auth ID: ${res.paypalAuthId}).`
        );
      } else if (res.newStatus === 'blocked') {
        alert('Proposal blocked by vote.');
      }

      onRefresh();
    } catch (err: any) {
      alert(`Consent error: ${err.message}`);
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
          Consent Queue
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          When AI proposals exceed auto-approve limits or touch sensitive categories, they require verifiable human consensus before any money moves.
        </p>
      </div>

      {/* Role Reminder */}
      <div className="glass-card border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between gap-4 text-xs shadow-card-dark">
        <div className="flex items-center gap-2.5 text-slate-300">
          <Shield className="w-4 h-4 text-gold-400 shrink-0" />
          <span>
            Acting as: <strong className="text-gold-300 font-bold">{currentUser?.name}</strong> ({currentUser?.role?.toUpperCase()}).
            {currentUser?.role === 'observer'
              ? ' You are in read-only Observer mode and cannot vote.'
              : ' Your vote counts towards circle consensus.'}
          </span>
        </div>
        <span className="text-[11px] text-gold-400 font-bold uppercase tracking-wider font-mono">
          Switch persona above
        </span>
      </div>

      {pendingProposals.length === 0 ? (
        <EmptyState
          title="Consent queue is clear"
          description="All AI purchase proposals have either been approved, held, or resolved. Run the agent to generate new proposals."
        />
      ) : (
        <div className="space-y-5">
          {pendingProposals.map((prop) => {
            const hasUserVoted = prop.decisions?.some((d) => d.user_id === currentUser?.id);
            const userVote = prop.decisions?.find((d) => d.user_id === currentUser?.id);

            return (
              <div
                key={prop.id}
                className="glass-card glass-card-hover rounded-2xl border border-white/[0.08] shadow-card-dark p-6 space-y-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Awaiting Consensus
                    </span>
                    <h3 className="text-lg font-black text-white mt-1.5">{prop.item}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Store className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-300">{prop.merchant}</span>
                      <span>•</span>
                      <span>Category: <strong className="text-gold-400">{prop.category}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-gold-gradient font-mono">
                      {prop.currency === 'INR' ? '₹' : '$'}
                      {Number(prop.amount).toLocaleString('en-IN')}
                    </div>
                    <span className="text-xs text-slate-500 font-mono">ID: {prop.id}</span>
                  </div>
                </div>

                {/* Policy evaluation explanation */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-300">Matched Policy Condition:</span>
                  <p className="text-slate-400 leading-relaxed">{prop.decision_reason}</p>
                </div>

                {/* Quorum Progress Bar */}
                <ApprovalProgress
                  approvalsCount={
                    prop.approvals_count ||
                    prop.decisions?.filter((d) => d.decision === 'approved').length ||
                    0
                  }
                  totalRequired={prop.mandate?.required_approvers?.count || 2}
                  mode={prop.mandate?.required_approvers?.mode || 'quorum'}
                />

                {/* Existing votes log */}
                {prop.decisions && prop.decisions.length > 0 && (
                  <div className="border border-white/[0.08] rounded-xl p-3 bg-white/[0.02] space-y-1.5 text-xs">
                    <span className="font-bold text-slate-300 block">Recorded Votes:</span>
                    <div className="space-y-1">
                      {prop.decisions.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-medium">
                            {d.user_name} ({d.user_role}):{' '}
                            <strong
                              className={
                                d.decision === 'approved' ? 'text-gold-300 font-bold' : 'text-rose-400 font-bold'
                              }
                            >
                              {d.decision.toUpperCase()}
                            </strong>
                          </span>
                          {d.comment && (
                            <span className="italic text-slate-500">"{d.comment}"</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voting Controls for Eligible Members */}
                <div className="pt-2 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    onClick={() => onOpenReceipt(prop.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Audit Receipt Preview</span>
                  </button>

                  {hasUserVoted ? (
                    <div className="text-xs font-bold text-slate-300 bg-white/[0.05] border border-white/[0.1] px-3 py-1.5 rounded-xl">
                      You voted <strong className="capitalize text-gold-300 font-black">{userVote?.decision}</strong> on this proposal
                    </div>
                  ) : currentUser?.role === 'observer' ? (
                    <div className="text-xs text-slate-500 italic">
                      Observers cannot cast votes
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Optional note / rationale..."
                        value={commentInputs[prop.id] || ''}
                        onChange={(e) =>
                          setCommentInputs({ ...commentInputs, [prop.id]: e.target.value })
                        }
                        className="text-xs p-2 px-3 rounded-xl bg-dark-900 text-white placeholder-slate-500 border border-white/[0.12] w-48 focus:outline-none focus:border-gold-500/60"
                      />
                      <button
                        onClick={() => handleVote(prop.id, 'approved')}
                        disabled={isSubmitting === prop.id}
                        className="px-4 py-2 gold-btn text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleVote(prop.id, 'rejected')}
                        disabled={isSubmitting === prop.id}
                        className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
