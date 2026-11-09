import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading details...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
      <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mb-3 shadow-gold-glow">
        <Loader2 className="w-6 h-6 animate-spin text-gold-400" />
      </div>
      <p className="text-sm font-semibold text-slate-300 font-display">{message}</p>
    </div>
  );
};
