import React from 'react';
import {
  CheckCircle,
  Clock,
  Lock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  const configs: Record<
    string,
    { label: string; bg: string; text: string; border: string; glow: string; icon: React.ReactNode }
  > = {
    proposed: {
      label: 'Proposed',
      bg: 'bg-sky-500/10',
      text: 'text-sky-300',
      border: 'border-sky-500/30',
      glow: '',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    awaiting_consent: {
      label: 'Awaiting Consent',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      icon: <Clock className="w-3.5 h-3.5 animate-pulse" />,
    },
    approved: {
      label: 'Approved',
      bg: 'bg-gold-500/15',
      text: 'text-[#F6E7B4]',
      border: 'border-gold-500/40',
      glow: 'shadow-gold-glow',
      icon: <CheckCircle className="w-3.5 h-3.5 text-gold-400" />,
    },
    held: {
      label: 'Held (PayPal Auth)',
      bg: 'bg-amber-500/20',
      text: 'text-gold-200',
      border: 'border-gold-400/50',
      glow: 'shadow-gold-glow',
      icon: <Lock className="w-3.5 h-3.5 text-gold-300" />,
    },
    captured: {
      label: 'Captured (Paid)',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    },
    voided: {
      label: 'Voided',
      bg: 'bg-white/[0.05]',
      text: 'text-slate-400',
      border: 'border-white/[0.12]',
      glow: '',
      icon: <RotateCcw className="w-3.5 h-3.5" />,
    },
    blocked: {
      label: 'Policy Blocked',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    failed: {
      label: 'Payment Failed',
      bg: 'bg-rose-500/20',
      text: 'text-rose-200',
      border: 'border-rose-500/40',
      glow: '',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    negotiating: {
      label: 'Negotiating',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      glow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]',
      icon: <Sparkles className="w-3.5 h-3.5 text-purple-300" />,
    },
    expired: {
      label: 'Expired',
      bg: 'bg-white/[0.03]',
      text: 'text-slate-500',
      border: 'border-white/[0.08]',
      glow: '',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
  };

  const c = configs[normalized] || {
    label: status,
    bg: 'bg-white/[0.05]',
    text: 'text-slate-300',
    border: 'border-white/[0.1]',
    glow: '',
    icon: null,
  };

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-xs font-bold gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-md font-mono ${c.bg} ${c.text} ${c.border} ${c.glow} ${sizeClasses}`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};
