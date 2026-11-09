import React, { useState } from 'react';
import { Circle, api } from '../api/client.js';
import {
  FileCode2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Layers,
  Shield,
} from 'lucide-react';

interface MandateBuilderProps {
  circles: Circle[];
  selectedCircleId: string;
  onCircleChange: (circleId: string) => void;
  onMandateConfirmed: () => void;
}

export const MandateBuilder: React.FC<MandateBuilderProps> = ({
  circles,
  selectedCircleId,
  onCircleChange,
  onMandateConfirmed,
}) => {
  const defaultText =
    'Our flat has a ₹8,000 monthly grocery budget. The grocery agent can buy food and household items. Purchases under ₹1,500 are automatic. Anything from ₹1,500 to ₹5,000 needs 2 of 3 members. Anything above ₹5,000 needs all members. Electronics always require Priya (Guardian). Do not buy from Suspicious Deals Ltd or unknown merchants.';

  const [rawText, setRawText] = useState(defaultText);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [compiledResult, setCompiledResult] = useState<any | null>(null);
  const [errorDetails, setErrorDetails] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCompile = async () => {
    setErrorDetails(null);
    setSuccessMessage(null);
    setIsCompiling(true);

    try {
      const res = await api.compileMandate(rawText);
      if (res.success && res.compiled) {
        setCompiledResult(res.compiled);
      } else {
        setErrorDetails({
          message: res.message || res.error || 'Compilation failed',
          issues: res.validationErrors || [],
        });
      }
    } catch (err: any) {
      setErrorDetails({
        message: err.message || 'Network error compiling policy',
        issues: [],
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleConfirmAndActivate = async () => {
    if (!compiledResult || !selectedCircleId) return;

    setIsConfirming(true);
    try {
      const res = await api.confirmMandate({
        circleId: selectedCircleId,
        rawText,
        compiledJson: compiledResult,
      });

      if (res.success) {
        setSuccessMessage(
          `Mandate v${res.version} confirmed and activated! AI agents in this circle are now bounded by this deterministic policy.`
        );
        onMandateConfirmed();
      }
    } catch (err: any) {
      alert(`Activation failed: ${err.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
          Mandate Compiler & Policy Builder
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Draft group spending rules in plain English. The AI compiles them into a typed, deterministic Zod schema that you review and confirm before it ever touches PayPal.
        </p>
      </div>

      {/* Select Circle */}
      <div className="glass-card p-4 rounded-2xl border border-white/[0.08] shadow-card-dark flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-gold-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Target Spending Circle:</span>
        </div>
        <select
          value={selectedCircleId}
          onChange={(e) => onCircleChange(e.target.value)}
          className="text-xs font-bold p-2 px-3 rounded-xl border border-white/[0.12] bg-dark-900 text-gold-300 focus:outline-none cursor-pointer"
        >
          {circles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (Budget: ₹{c.monthly_budget})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Natural Language Input */}
        <div className="glass-card rounded-3xl border border-white/[0.08] p-6 space-y-4 shadow-card-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <FileCode2 className="w-4 h-4 text-gold-400" />
              <span>Plain-English Policy Rules</span>
            </h2>
            <button
              onClick={() => setRawText(defaultText)}
              className="text-xs text-gold-400 hover:text-gold-300 font-bold transition"
            >
              Load Example
            </button>
          </div>

          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full text-xs font-mono p-4 rounded-2xl bg-dark-900/90 text-white placeholder-slate-500 border border-white/[0.12] focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/40 leading-relaxed"
            placeholder="Describe your household rules..."
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-400">
              Deterministic validation prevents prompt injection & schema drift.
            </span>
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="px-5 py-2.5 gold-btn text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isCompiling ? 'Compiling...' : 'Compile with AI'}</span>
            </button>
          </div>

          {/* Validation Error Banner */}
          {errorDetails && (
            <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-4 text-xs space-y-2 text-rose-200">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{errorDetails.message}</span>
              </div>
              {errorDetails.issues && errorDetails.issues.length > 0 && (
                <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-rose-300">
                  {errorDetails.issues.map((issue: any, idx: number) => (
                    <li key={idx}>
                      {issue.path?.join('.')}: {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Compiled Policy Summary & Activation */}
        <div className="glass-card rounded-3xl border border-white/[0.08] p-6 space-y-5 shadow-card-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <Shield className="w-4 h-4 text-gold-400" />
              <span>Compiled Policy Preview</span>
            </h2>
            {compiledResult && (
              <span className="text-[11px] font-mono font-bold text-gold-300 bg-gold-500/15 px-2.5 py-0.5 rounded-full border border-gold-500/30">
                Zod Schema Validated
              </span>
            )}
          </div>

          {compiledResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.08]">
                  <span className="text-slate-400 block font-medium">Monthly Budget</span>
                  <strong className="text-sm text-gold-300 font-bold font-mono">
                    {compiledResult.monthly_budget.currency} {compiledResult.monthly_budget.amount.toLocaleString()}
                  </strong>
                </div>

                <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.08]">
                  <span className="text-slate-400 block font-medium">Auto-Approve Under</span>
                  <strong className="text-sm text-gold-300 font-bold font-mono">
                    {compiledResult.monthly_budget.currency} {compiledResult.per_purchase_auto_approve_limit}
                  </strong>
                </div>
              </div>

              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.08] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Approval Mode:</span>
                  <span className="font-bold text-white capitalize bg-dark-900 px-2 py-0.5 rounded-md border border-white/[0.12]">
                    {compiledResult.required_approvers.mode === 'quorum'
                      ? `Quorum (${compiledResult.required_approvers.count} of 3)`
                      : compiledResult.required_approvers.mode}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Cooling-Off Period:</span>
                  <span className="font-semibold text-gold-300 font-mono">
                    {compiledResult.cooling_off_minutes} min (Demo mode speed)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Release Condition:</span>
                  <span className="font-semibold text-gold-300 capitalize font-mono">
                    {compiledResult.release_condition?.type?.replace('_', ' ') || 'Manual Approval'}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-white/[0.06]">
                  <span className="text-slate-400 block font-medium mb-1.5">Allowed Categories:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {compiledResult.allowed_categories.map((c: string) => (
                      <span key={c} className="px-2.5 py-0.5 rounded-md text-[11px] bg-gold-500/10 text-gold-300 border border-gold-500/30 font-medium font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-white/[0.06]">
                  <span className="text-slate-400 block font-medium mb-1.5">Blocked Merchants & Categories:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {compiledResult.blocked_merchants.map((m: string) => (
                      <span key={m} className="px-2.5 py-0.5 rounded-md text-[11px] bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium font-mono">
                        {m}
                      </span>
                    ))}
                    {compiledResult.blocked_categories.map((bc: string) => (
                      <span key={bc} className="px-2.5 py-0.5 rounded-md text-[11px] bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium font-mono">
                        {bc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirmation Action */}
              <div className="pt-2">
                <button
                  onClick={handleConfirmAndActivate}
                  disabled={isConfirming}
                  className="w-full py-3.5 gold-btn font-black text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isConfirming ? 'Activating...' : 'Confirm and Activate Mandate'}</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2 leading-relaxed">
                  Human-in-the-loop: An AI output cannot activate spending authority without explicit human confirmation.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <FileCode2 className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">Compile policy rules on the left to inspect the structured mandate.</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-gold-500/10 border border-gold-500/30 rounded-2xl p-4 text-xs text-gold-300 font-medium flex items-center gap-2 shadow-gold-glow">
              <CheckCircle className="w-4 h-4 text-gold-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
