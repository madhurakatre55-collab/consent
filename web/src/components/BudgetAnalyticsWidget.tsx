import React from 'react';
import { CircleAnalytics } from '../api/client.js';
import { Wallet } from 'lucide-react';

interface BudgetAnalyticsWidgetProps {
  analytics: CircleAnalytics | null;
}

export const BudgetAnalyticsWidget: React.FC<BudgetAnalyticsWidgetProps> = ({ analytics }) => {
  if (!analytics) return null;

  const isNearLimit = analytics.percentUtilized >= 80;

  return (
    <div className="glass-card rounded-2xl border border-white/[0.08] p-5 shadow-card-dark space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center font-bold">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Monthly Circle Budget Utilization
            </h3>
            <span className="text-xs text-slate-400">
              {analytics.circleName} ({analytics.currency})
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400">Spent / Budget: </span>
          <strong className="text-sm font-extrabold text-gold-300 font-mono">
            {analytics.currency === 'INR' ? '₹' : '$'}
            {analytics.budgetSpent.toLocaleString()} / {analytics.currency === 'INR' ? '₹' : '$'}
            {analytics.budgetTotal.toLocaleString()}
          </strong>
        </div>
      </div>

      {/* Progress Bar with Gold Glow */}
      <div className="space-y-1.5">
        <div className="w-full bg-white/[0.04] rounded-full h-3 overflow-hidden border border-white/[0.08] p-0.5">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              analytics.percentUtilized >= 100
                ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                : analytics.percentUtilized >= 80
                ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                : 'bg-gradient-to-r from-[#FBF0D9] via-[#E5A93C] to-[#CD8E27] shadow-gold-glow'
            }`}
            style={{ width: `${Math.min(100, analytics.percentUtilized)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="text-gold-300 font-bold">{analytics.percentUtilized}% utilized</span>
          <span>
            <strong className="text-slate-200">
              {analytics.currency === 'INR' ? '₹' : '$'}
              {analytics.budgetRemaining.toLocaleString()}
            </strong>{' '}
            remaining before policy freeze
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      {analytics.categories && analytics.categories.length > 0 && (
        <div className="pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Spend Distribution by Category:
          </span>
          <div className="flex flex-wrap gap-2">
            {analytics.categories.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs hover:border-gold-500/30 transition"
              >
                <span className="w-2 h-2 rounded-full bg-gold-400" />
                <span className="font-medium text-slate-300">{cat.category}:</span>
                <span className="text-gold-300 font-bold font-mono">
                  {analytics.currency === 'INR' ? '₹' : '$'}{cat.amount.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">({cat.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
