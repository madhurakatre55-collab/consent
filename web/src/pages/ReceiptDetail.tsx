import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { LoadingState } from '../components/LoadingState.js';
import {
  FileText,
  Download,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Layers,
  KeyRound,
  Check,
} from 'lucide-react';

interface ReceiptDetailProps {
  proposalId: string;
  onBack: () => void;
}

export const ReceiptDetail: React.FC<ReceiptDetailProps> = ({ proposalId, onBack }) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setIsLoading(true);
        const res = await api.getReceipt(proposalId);
        setData(res);
      } catch (err: any) {
        alert(`Error fetching receipt: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReceipt();
  }, [proposalId]);

  if (isLoading) {
    return <LoadingState message="Verifying cryptographic receipt hash chain..." />;
  }

  if (!data || !data.receipt) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <p>No receipt generated for proposal {proposalId}</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 gold-btn rounded-xl text-xs font-black uppercase tracking-wider"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { receipt, verification } = data;

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent-receipt-${receipt.proposal_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-gold-400 hover:text-gold-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyJson}
            className="px-4 py-2 dark-glass-btn text-slate-300 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-gold-400" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-5 py-2 gold-btn text-xs font-black uppercase tracking-wider rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-dark-950" />
            <span>Download Receipt</span>
          </button>
        </div>
      </div>

      {/* Main Certificate Card */}
      <div className="glass-card rounded-3xl border border-gold-500/30 shadow-card-dark p-6 sm:p-10 space-y-6 relative overflow-hidden">
        {/* Subtle background ambient gold glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Watermark / Status */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-6 flex-wrap gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black text-dark-950 bg-gold-gradient px-3 py-0.5 rounded-full uppercase tracking-wider">
                OFFICIAL CONSENT RECEIPT
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-white/[0.05] text-gold-300 border border-gold-500/30">
                {receipt.final_outcome}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
              {receipt.item}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Proposal Reference: <code className="text-gold-300">{receipt.proposal_id}</code>
            </p>
          </div>

          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-black text-gold-gradient tracking-tight font-mono">
              {receipt.currency === 'INR' ? '₹' : '$'}
              {Number(receipt.amount).toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-slate-400 block mt-1 font-mono">
              Circle: {receipt.circle_name} (v{receipt.mandate_version})
            </span>
          </div>
        </div>

        {/* Essential Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.08]">
            <span className="text-slate-400 block font-medium">Merchant</span>
            <strong className="text-white text-sm mt-0.5 block font-bold">{receipt.merchant}</strong>
          </div>

          <div className="p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.08]">
            <span className="text-slate-400 block font-medium">Category</span>
            <strong className="text-gold-300 text-sm mt-0.5 block font-bold">{receipt.category}</strong>
          </div>

          <div className="p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.08]">
            <span className="text-slate-400 block font-medium">Proposing Agent</span>
            <strong className="text-white text-sm mt-0.5 block font-mono font-bold">{receipt.agent_id}</strong>
          </div>
        </div>

        {/* Policy Verification Clause */}
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.08] p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-200 font-display">
            <Layers className="w-4 h-4 text-gold-400" />
            <span>Deterministic Policy Evaluation</span>
          </div>
          <div className="text-slate-300">
            <strong className="text-slate-400">Matched Policy Clause: </strong>
            <code className="text-gold-300 bg-dark-900 px-2 py-0.5 rounded font-mono border border-gold-500/30">
              {receipt.matched_clause}
            </code>
          </div>
          <div className="text-slate-300 leading-relaxed">
            <strong className="text-slate-400">Decision Rationale: </strong>
            {receipt.decision_reason}
          </div>
        </div>

        {/* Approvals Table */}
        <div className="space-y-2.5 text-xs">
          <h3 className="font-bold text-white flex items-center gap-2 font-display">
            <KeyRound className="w-4 h-4 text-gold-400" />
            <span>Recorded Human Consent Approvals</span>
          </h3>

          {receipt.approvals && receipt.approvals.length > 0 ? (
            <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-white/[0.02]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] border-b border-white/[0.08] text-slate-400 uppercase text-[10px] font-mono">
                  <tr>
                    <th className="py-2.5 px-4">Member</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Vote</th>
                    <th className="py-2.5 px-4">Comment / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {receipt.approvals.map((app: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 font-bold text-white">
                        {app.user_name || app.user_id}
                      </td>
                      <td className="py-3 px-4 uppercase text-[10px] text-slate-400 font-bold font-mono">
                        {app.role}
                      </td>
                      <td className="py-3 px-4 font-bold text-gold-300 capitalize font-mono">
                        {app.decision}
                      </td>
                      <td className="py-3 px-4 text-slate-400 italic">
                        {app.comment || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08] text-slate-400 italic">
              Auto-approved under mandate threshold without manual voting required.
            </div>
          )}
        </div>

        {/* PayPal Sandbox References */}
        <div className="bg-gradient-to-br from-gold-500/10 via-dark-850 to-dark-900 border border-gold-500/30 rounded-2xl p-4 text-xs space-y-2.5 shadow-gold-glow">
          <div className="flex items-center gap-2 font-bold text-gold-300 font-display">
            <Lock className="w-4 h-4 text-gold-400" />
            <span>PayPal Sandbox Integration References</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block font-sans text-xs">Order ID:</span>
              <strong className="text-white text-xs">{receipt.paypal_order_id || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-sans text-xs">Authorization ID:</span>
              <strong className="text-gold-300 text-xs">{receipt.paypal_authorization_id || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* Cryptographic Hash Chain Seal */}
        <div className="glass-card border border-white/[0.08] shadow-card-dark rounded-2xl p-5 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white font-display">
              <ShieldCheck className="w-4 h-4 text-gold-400" />
              <span>Tamper-Evident SHA-256 Hash Chain</span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-gold-gradient text-dark-950 px-2.5 py-0.5 rounded-full">
              {verification.chainIntegrity}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[10px]">
            <div>
              <span className="font-sans font-semibold text-slate-400 block">Current Block Hash:</span>
              <code className="text-gold-300 break-all select-all font-bold">
                {receipt.receipt_hash}
              </code>
            </div>
            <div>
              <span className="font-sans font-semibold text-slate-400 block">Parent Block Hash:</span>
              <code className="text-slate-500 break-all select-all">
                {receipt.previous_receipt_hash}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
