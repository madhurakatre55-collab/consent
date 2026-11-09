import React, { useState } from 'react';
import { api, Proposal } from '../api/client.js';
import {
  Sparkles,
  ArrowDownCircle,
  PackageCheck,
  FastForward,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react';

interface ConditionsSimulatorWidgetProps {
  heldProposals: Proposal[];
  onTriggered: () => void;
}

export const ConditionsSimulatorWidget: React.FC<ConditionsSimulatorWidgetProps> = ({
  heldProposals,
  onTriggered,
}) => {
  const [selectedProposalId, setSelectedProposalId] = useState<string>(
    heldProposals[0]?.id || ''
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string | null>(null);

  if (heldProposals.length === 0) return null;

  const currentProposal =
    heldProposals.find((p) => p.id === selectedProposalId) || heldProposals[0];

  const handleSimulate = async (action: string) => {
    if (!currentProposal) return;
    setIsSimulating(true);
    setSimulationLog(null);

    try {
      const res = await api.simulateCondition(currentProposal.id, action);
      setSimulationLog(res.simulatedNote || `Action "${action}" triggered successfully.`);
      onTriggered();
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 shadow-card-dark space-y-4 border border-white/[0.08]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-gold-400 font-display">
            Live Condition Simulator (Judge Demo Control)
          </h3>
        </div>

        {heldProposals.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Target Order:</span>
            <select
              value={currentProposal?.id}
              onChange={(e) => setSelectedProposalId(e.target.value)}
              className="bg-dark-900 text-slate-200 font-bold p-1.5 px-2 rounded-lg border border-white/[0.12] focus:outline-none text-xs cursor-pointer"
            >
              {heldProposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.item} (₹{p.amount})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        PayPal sandbox authorization for <strong className="text-white font-semibold">{currentProposal?.item}</strong> is held pending conditions.
        Click below to simulate real-world trigger feeds:
      </p>

      {/* Simulator Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <button
          onClick={() => handleSimulate('drop_price')}
          disabled={isSimulating}
          className="p-3 dark-glass-btn rounded-xl font-bold flex items-center gap-2 justify-center hover:text-gold-300"
        >
          <ArrowDownCircle className="w-4 h-4 text-gold-400" />
          <span>Drop Price Feed</span>
        </button>

        <button
          onClick={() => handleSimulate('in_stock')}
          disabled={isSimulating}
          className="p-3 dark-glass-btn rounded-xl font-bold flex items-center gap-2 justify-center hover:text-gold-300"
        >
          <PackageCheck className="w-4 h-4 text-gold-400" />
          <span>Restock Inventory</span>
        </button>

        <button
          onClick={() => handleSimulate('fast_forward_timer')}
          disabled={isSimulating}
          className="p-3 dark-glass-btn rounded-xl font-bold flex items-center gap-2 justify-center hover:text-gold-300"
        >
          <FastForward className="w-4 h-4 text-gold-400" />
          <span>Fast-Forward 60s</span>
        </button>

        <button
          onClick={() => handleSimulate('advance_delivery')}
          disabled={isSimulating}
          className="p-3 dark-glass-btn rounded-xl font-bold flex items-center gap-2 justify-center hover:text-gold-300"
        >
          <CalendarCheck className="w-4 h-4 text-gold-400" />
          <span>Milestone Date</span>
        </button>
      </div>

      {simulationLog && (
        <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-3 text-xs text-gold-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
          <span>{simulationLog}</span>
        </div>
      )}
    </div>
  );
};
