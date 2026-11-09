import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="glass-card rounded-3xl border border-dashed border-white/[0.12] p-12 text-center my-6 shadow-card-dark">
      <div className="mx-auto w-14 h-14 text-gold-400 flex items-center justify-center bg-gold-500/10 border border-gold-500/20 rounded-2xl mb-4 shadow-gold-glow">
        {icon || <FolderOpen className="w-7 h-7" />}
      </div>
      <h3 className="text-lg font-bold text-white font-display">{title}</h3>
      <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-6 py-2.5 gold-btn rounded-full text-xs font-black uppercase tracking-wider"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
