import React from 'react';
import { Users, Shield, Check, Clock } from 'lucide-react';

interface ApprovalProgressProps {
  approvalsCount: number;
  totalRequired: number;
  mode?: string;
  hasGuardianApproved?: boolean;
}

export const ApprovalProgress: React.FC<ApprovalProgressProps> = ({
  approvalsCount,
  totalRequired,
  mode = 'quorum',
  hasGuardianApproved,
}) => {
  const percentage = Math.min(100, Math.round((approvalsCount / (totalRequired || 1)) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
        <span className="flex items-center gap-1.5">
          {mode === 'guardian_required' ? (
            <Shield className="w-3.5 h-3.5 text-gold-400" />
          ) : (
            <Users className="w-3.5 h-3.5 text-gold-400" />
          )}
          <span>
            {mode === 'guardian_required'
              ? 'Guardian Consent'
              : mode === 'unanimous'
              ? `Unanimous Approval (${approvalsCount}/${totalRequired})`
              : `Quorum Consent (${approvalsCount} of ${totalRequired} required)`}
          </span>
        </span>
        <span className="font-bold text-white font-mono">
          {mode === 'guardian_required' ? (
            hasGuardianApproved ? (
              <span className="text-gold-300 inline-flex items-center gap-1 font-bold">
                <Check className="w-3 h-3 text-gold-400" /> Guardian Confirmed
              </span>
            ) : (
              <span className="text-amber-400 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> Awaiting Guardian
              </span>
            )
          ) : (
            `${percentage}%`
          )}
        </span>
      </div>

      <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden border border-white/[0.08]">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            percentage >= 100
              ? 'bg-gradient-to-r from-emerald-400 to-gold-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-gold-gradient shadow-gold-glow'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
