import React from 'react';
import { Proposal, User } from '../api/client.js';
import { StatusBadge } from './StatusBadge.js';
import { ApprovalProgress } from './ApprovalProgress.js';
import { Countdown } from './Countdown.js';
import {
  FileText,
  Store,
  Layers,
  Lock,
  Sparkles,
} from 'lucide-react';

interface ProposalCardProps {
  proposal: Proposal;
  currentUser: User | null;
  onApprove?: (proposalId: string, comment?: string) => void;
  onReject?: (proposalId: string, comment?: string) => void;
  onRelease?: (proposalId: string) => void;
  onVoid?: (proposalId: string) => void;
  onNegotiate?: (proposalId: string) => void;
  onOpenReceipt: (proposalId: string) => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  currentUser,
  onApprove,
  onReject,
  onRelease,
  onVoid,
  onNegotiate,
  onOpenReceipt,
}) => {
  const isHeld = proposal.status === 'held';
  const isAwaiting = proposal.status === 'awaiting_consent';
  const isNegotiating = proposal.status === 'negotiating';

  // Check if current user has already voted
  const userVote = proposal.decisions?.find((d) => d.user_id === currentUser?.id);
  const canVote = isAwaiting && currentUser?.role !== 'observer';

  return (
    <div className="glass-card glass-card-hover rounded-2xl border border-white/[0.08] shadow-card-dark p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-300 border border-gold-500/30">
              {proposal.category}
            </span>
            <span className="text-xs text-slate-500 font-mono">ID: {proposal.id}</span>
          </div>
          <h3 className="text-base font-extrabold text-white leading-snug">{proposal.item}</h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Store className="w-3.5 h-3.5 text-gold-400" />
            <span className="font-semibold text-slate-300">{proposal.merchant}</span>
            <span>•</span>
            <span>Proposed by <strong className="text-gold-400 font-mono">{proposal.agent_id}</strong></span>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-1.5">
          <div className="text-2xl font-black text-gold-gradient tracking-tight font-mono">
            {proposal.currency === 'INR' ? '₹' : '$'}
            {Number(proposal.amount).toLocaleString('en-IN')}
          </div>
          <StatusBadge status={proposal.status} />
        </div>
      </div>

      {/* Policy Engine Evaluation Note */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-300">
          <Layers className="w-3.5 h-3.5 text-gold-400" />
          <span>Policy Rule: </span>
          <code className="text-gold-300 bg-dark-900 border border-gold-500/30 px-1.5 py-0.5 rounded font-mono text-[11px]">
            {proposal.matched_clause || 'mandate.policy_engine'}
          </code>
        </div>
        <p className="text-slate-400 leading-relaxed">{proposal.decision_reason}</p>
      </div>

      {/* Held Authorization & Countdown */}
      {isHeld && (
        <div className="bg-gradient-to-br from-amber-500/10 via-dark-850 to-dark-900 border border-gold-500/40 rounded-xl p-3.5 text-xs space-y-2 shadow-gold-glow">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 font-bold text-gold-300">
              <Lock className="w-3.5 h-3.5 text-gold-400" />
              <span>PayPal Authorization Held: <span className="font-mono">{proposal.paypal_authorization_id || 'AUTH-SANDBOX'}</span></span>
            </div>
            <Countdown proposedAt={proposal.proposed_at} coolingOffMinutes={1} />
          </div>
          {proposal.release_condition && (
            <p className="text-slate-300">
              <span className="font-semibold text-gold-400">Release Condition: </span>
              {proposal.release_condition.type === 'price_target'
                ? `Price target threshold ≤ ₹${proposal.release_condition.target_amount}`
                : proposal.release_condition.type === 'delivery_date'
                ? `Scheduled milestone date: ${proposal.release_condition.date || 'Pending'}`
                : 'Manual release confirmation by circle member'}
            </p>
          )}
        </div>
      )}

      {/* Quorum Progress for Awaiting Consent */}
      {isAwaiting && (
        <div className="border-t border-white/[0.08] pt-3">
          <ApprovalProgress
            approvalsCount={proposal.approvals_count || proposal.decisions?.filter(d => d.decision === 'approved').length || 0}
            totalRequired={proposal.mandate?.required_approvers?.count || 2}
            mode={proposal.mandate?.required_approvers?.mode || 'quorum'}
          />
          {proposal.decisions && proposal.decisions.length > 0 && (
            <div className="mt-2 text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300">Votes recorded:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {proposal.decisions.map((d, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded text-xs border font-medium ${
                      d.decision === 'approved'
                        ? 'bg-gold-500/10 text-gold-300 border-gold-500/30'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {d.user_name || d.user_id}: {d.decision} {d.comment ? `("${d.comment}")` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 flex-wrap gap-2">
        <button
          onClick={() => onOpenReceipt(proposal.id)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300 transition"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Consent Receipt</span>
        </button>

        <div className="flex items-center gap-2">
          {isNegotiating && onNegotiate && (
            <button
              onClick={() => onNegotiate(proposal.id)}
              className="px-3.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Negotiate with Merchant</span>
            </button>
          )}

          {isHeld && onRelease && (
            <button
              onClick={() => onRelease(proposal.id)}
              className="px-4 py-1.5 gold-btn rounded-xl text-xs font-extrabold uppercase tracking-wide"
            >
              Release & Capture
            </button>
          )}

          {isHeld && onVoid && (
            <button
              onClick={() => onVoid(proposal.id)}
              className="px-3.5 py-1.5 dark-glass-btn text-slate-300 text-xs font-semibold rounded-xl hover:text-rose-300 hover:border-rose-500/40"
            >
              Void Auth
            </button>
          )}

          {canVote && !userVote && (
            <>
              {onApprove && (
                <button
                  onClick={() => onApprove(proposal.id)}
                  className="px-4 py-1.5 gold-btn rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Approve ({currentUser?.name?.split(' ')[0]})
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(proposal.id)}
                  className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition"
                >
                  Reject
                </button>
              )}
            </>
          )}

          {userVote && (
            <span className="text-xs text-slate-400 font-medium">
              You voted: <strong className="capitalize text-white font-bold">{userVote.decision}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
