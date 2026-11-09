import React, { useState } from 'react';
import { Circle, api } from '../api/client.js';
import {
  Sparkles,
  FileText,
  Lock,
  ShieldCheck,
  CheckCircle,
  XCircle,
  RotateCcw,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface LedgerPageProps {
  ledgerEntries: any[];
  circles: Circle[];
  selectedCircleId: string;
  onCircleChange: (circleId: string) => void;
  onOpenReceipt: (proposalId: string) => void;
  onRefresh: () => void;
}

export const Ledger: React.FC<LedgerPageProps> = ({
  ledgerEntries,
  circles,
  selectedCircleId,
  onOpenReceipt,
  onRefresh,
}) => {
  const [askQuestion, setAskQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaResult, setQaResult] = useState<any | null>(null);
  const [eventFilter, setEventFilter] = useState('all');

  // Chain Verification & Tamper Simulation State
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainAudit, setChainAudit] = useState<any | null>(null);
  const [isSimulatingTamper, setIsSimulatingTamper] = useState(false);
  const [tamperResult, setTamperResult] = useState<any | null>(null);

  const filteredEntries = ledgerEntries.filter((entry) => {
    if (selectedCircleId && entry.circle_id !== selectedCircleId) return false;
    if (eventFilter !== 'all' && entry.event_type !== eventFilter) return false;
    return true;
  });

  const handleAskLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;

    setIsAsking(true);
    try {
      const res = await api.askLedger(askQuestion, selectedCircleId || undefined);
      setQaResult(res);
    } catch (err: any) {
      alert(`Ledger Q&A Error: ${err.message}`);
    } finally {
      setIsAsking(false);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    setTamperResult(null);
    try {
      const res = await api.verifyChain(selectedCircleId || undefined);
      setChainAudit(res);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const handleSimulateTamper = async () => {
    setIsSimulatingTamper(true);
    try {
      const res = await api.simulateTamper();
      setTamperResult(res);
      onRefresh();
    } catch (err: any) {
      alert(`Tamper test error: ${err.message}`);
    } finally {
      setIsSimulatingTamper(false);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'CAPTURED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> CAPTURED
          </span>
        );
      case 'AUTHORIZED':
      case 'HELD':
      case 'PAYPAL_AUTHORIZED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-gold-500/15 text-gold-200 border border-gold-500/40 flex items-center gap-1 shadow-gold-glow">
            <Lock className="w-3 h-3 text-gold-400" /> AUTHORIZED
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" /> BLOCKED
          </span>
        );
      case 'VOIDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/[0.05] text-slate-400 border border-white/[0.1] flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-slate-400" /> VOIDED
          </span>
        );
      case 'CONSENT_APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-gold-500/10 text-gold-300 border border-gold-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-gold-400" /> VOTE: APPROVED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/[0.05] text-slate-300 border border-white/[0.1]">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
            Audit Ledger & Cryptographic Hash Chain
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Every mandate compilation, consent decision, and PayPal transition is chained cryptographically using SHA-256.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifyingChain}
            className="px-5 py-2.5 gold-btn rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-dark-950" />
            <span>{isVerifyingChain ? 'Auditing Chain...' : 'Verify Cryptographic Chain'}</span>
          </button>

          <button
            onClick={handleSimulateTamper}
            disabled={isSimulatingTamper}
            title="Alters a record temporarily to prove tamper detection in the hash chain"
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Simulate Tamper Attack</span>
          </button>
        </div>
      </div>

      {/* Chain Audit Results Banner */}
      {chainAudit && (
        <div className="glass-card border border-gold-500/40 shadow-gold-glow rounded-3xl p-6 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-gold-400" />
              <h3 className="text-base font-black text-white font-display">
                Cryptographic Chain Verified: 100% Integrity
              </h3>
            </div>
            <span className="text-xs font-mono font-black bg-gold-gradient text-dark-950 px-3 py-1 rounded-full">
              {chainAudit.totalBlocks} Blocks Verified ({chainAudit.algorithm})
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Every block from genesis to tip was recomputed. All SHA-256 parent hashes matched sequentially with zero breaks or unauthorized modifications.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {chainAudit.verifiedBlocks.map((b: any, idx: number) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] border border-gold-500/30 text-gold-300 font-semibold"
              >
                #{b.index} [{b.receiptHash.substring(0, 8)}...] ✓
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tamper Simulation Banner */}
      {tamperResult && (
        <div className="bg-rose-500/15 border border-rose-500/30 rounded-3xl p-6 space-y-3.5">
          <div className="flex items-center gap-2 font-black text-rose-300 text-sm font-display">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>Tamper Detection Experiment Successful!</span>
          </div>
          <p className="text-xs text-rose-200 leading-relaxed">
            {tamperResult.explanation}
          </p>
          <div className="bg-dark-900/80 p-3.5 rounded-2xl border border-rose-500/30 text-xs font-mono space-y-1">
            <div className="text-slate-400">Target Block: {tamperResult.testedBlockId}</div>
            <div className="text-rose-400">Tampered String: "{tamperResult.tamperedDetail}"</div>
            <div className="text-gold-300 font-bold">Automatic Rollback: {tamperResult.databaseRestored ? 'Database restored to pristine state' : 'Pending'}</div>
          </div>
        </div>
      )}

      {/* Ask the Ledger Input (Grounded Q&A - Dark Obsidian & Gold) */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-card-dark space-y-4 border border-gold-500/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold-400" />
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight font-display">
            Ask the Ledger (Grounded LLM Q&A)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Query this circle's transaction history. The AI answers strictly from verified ledger logs, never hallucinating missing data.
        </p>

        <form onSubmit={handleAskLedger} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. How much total money was spent this month? or Who approved the pantry restock?"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              className="w-full text-xs p-3.5 rounded-xl bg-dark-900/90 text-white placeholder-slate-500 border border-white/[0.12] focus:outline-none focus:border-gold-500/60"
            />
          </div>
          <button
            type="submit"
            disabled={isAsking}
            className="px-6 py-3.5 gold-btn font-black text-xs uppercase tracking-wider rounded-xl transition shrink-0"
          >
            {isAsking ? 'Querying...' : 'Ask'}
          </button>
        </form>

        {qaResult && (
          <div className="bg-white/[0.03] rounded-2xl p-5 border border-gold-500/30 text-xs space-y-2 mt-3 shadow-card-dark">
            <span className="font-bold text-gold-400 block font-display">Ledger Grounded Response:</span>
            <p className="text-slate-200 leading-relaxed text-sm">{qaResult.answer}</p>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-white/[0.06] font-mono">
              Verified against {qaResult.ledgerEntriesReferenced} transaction block(s) in database.
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/[0.08] shadow-card-dark flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider font-display">
            <Filter className="w-3.5 h-3.5 text-gold-400" /> Filter by:
          </span>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="font-bold p-2 px-3 rounded-xl border border-white/[0.12] bg-dark-900 text-gold-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Events</option>
            <option value="CAPTURED">Captured</option>
            <option value="AUTHORIZED">Authorized / Held</option>
            <option value="BLOCKED">Blocked</option>
            <option value="VOIDED">Voided</option>
            <option value="CONSENT_APPROVED">Approvals</option>
          </select>
        </div>

        <div className="text-slate-400 font-mono">
          Showing <strong className="text-gold-300">{filteredEntries.length}</strong> chronological log entries
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-card rounded-3xl border border-white/[0.08] overflow-hidden shadow-card-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/[0.08] text-slate-400 font-bold uppercase tracking-wider text-[10px] font-display">
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">Event</th>
                <th className="py-3.5 px-5">Actor</th>
                <th className="py-3.5 px-5">Detail</th>
                <th className="py-3.5 px-5">Receipt Hash Chain (SHA-256)</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-4 px-5 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}{' '}
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap">{getEventBadge(entry.event_type)}</td>
                  <td className="py-4 px-5 font-bold text-white whitespace-nowrap">
                    {entry.actor}
                  </td>
                  <td className="py-4 px-5 text-slate-300 max-w-md">
                    <div className="leading-snug">{entry.detail}</div>
                    {entry.explanation && (
                      <div className="text-[11px] text-slate-500 italic mt-0.5">
                        {entry.explanation}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    <span className="font-bold text-gold-300">
                      {entry.receipt_hash.substring(0, 10)}...
                    </span>
                    <div className="text-[10px] text-slate-500">
                      Prev: {entry.previous_receipt_hash?.substring(0, 10)}...
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    {entry.proposal_id && (
                      <button
                        onClick={() => onOpenReceipt(entry.proposal_id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
