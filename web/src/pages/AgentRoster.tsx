import React, { useState } from 'react';
import { Agent, api, User } from '../api/client.js';
import { EmptyState } from '../components/EmptyState.js';
import {
  Cpu,
  Bot,
  Plus,
  ShoppingCart,
  Zap,
  Plane,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface AgentRosterProps {
  agents: Agent[];
  selectedCircleId: string;
  currentUser: User | null;
  onRefresh: () => void;
}

export const AgentRoster: React.FC<AgentRosterProps> = ({
  agents,
  selectedCircleId,
  currentUser,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [dailyLimit, setDailyLimit] = useState('2000');
  const [avatarIcon, setAvatarIcon] = useState('bot');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async (agent: Agent) => {
    if (currentUser?.role !== 'owner') {
      alert('Only the Circle Owner (Aisha) can activate or revoke agent mandates.');
      return;
    }

    try {
      await api.toggleAgent(agent.id, agent.active === 0);
      onRefresh();
    } catch (err: any) {
      alert(`Error toggling agent: ${err.message}`);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createAgent({
        circle_id: selectedCircleId,
        name,
        description,
        category,
        daily_limit: parseFloat(dailyLimit),
        avatar_icon: avatarIcon,
      });
      setShowAddModal(false);
      setName('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      alert(`Error creating agent: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAgentIcon = (icon: string) => {
    switch (icon) {
      case 'shopping-cart':
        return <ShoppingCart className="w-5 h-5 text-gold-400" />;
      case 'zap':
        return <Zap className="w-5 h-5 text-gold-400" />;
      case 'plane':
        return <Plane className="w-5 h-5 text-gold-400" />;
      case 'cpu':
        return <Cpu className="w-5 h-5 text-gold-400" />;
      default:
        return <Bot className="w-5 h-5 text-gold-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
            Specialized AI Agent Roster
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Delegate distinct procurement domains to specialized AI agents. Owners can revoke or re-activate agent spending mandates at any time.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 gold-btn rounded-full text-xs font-black uppercase tracking-wider transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-dark-950" />
          <span>Register New Agent</span>
        </button>
      </div>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <EmptyState
          title="No agents registered"
          description="Register your first specialized AI purchasing agent to begin."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`glass-card glass-card-hover rounded-3xl border transition p-6 space-y-4 shadow-card-dark ${
                agent.active ? 'border-white/[0.08]' : 'border-rose-500/30 bg-rose-500/5 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shadow-gold-glow">
                    {getAgentIcon(agent.avatar_icon)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white leading-snug font-display">
                      {agent.name}
                    </h3>
                    <span className="text-xs text-gold-400 font-mono">{agent.category} Domain</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(agent)}
                    title={agent.active ? 'Click to revoke mandate' : 'Click to reactivate mandate'}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border font-mono ${
                      agent.active
                        ? 'bg-gold-500/15 text-gold-300 border-gold-500/40 hover:bg-gold-500/25 shadow-gold-glow'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                    }`}
                  >
                    {agent.active ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-gold-400" />
                        <span>Active Mandate</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Revoked</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{agent.description}</p>

              <div className="grid grid-cols-2 gap-3 bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.08] text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Daily Limit</span>
                  <strong className="text-gold-300 font-bold font-mono text-sm">₹{agent.daily_limit}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Lifetime Spend</span>
                  <strong className="text-white font-bold font-mono text-sm">₹{agent.lifetime_spent}</strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 font-mono">
                <span>Agent Identifier: <code className="text-gold-300 font-bold">{agent.id}</code></span>
                <span>Proposals Logged: <strong className="text-white">{agent.proposals_count || 0}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-card-dark border border-white/[0.12] space-y-5">
            <div>
              <h2 className="text-xl font-black text-white font-display">Register Autonomous Agent</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Connect a new autonomous AI agent to this spending circle with strict daily caps.
              </p>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-display">
                  Agent Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office Supplies Restocker"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-dark-900 text-white placeholder-slate-500 border border-white/[0.12] focus:outline-none focus:border-gold-500/60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-display">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What is this agent allowed to buy?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-dark-900 text-white placeholder-slate-500 border border-white/[0.12] focus:outline-none focus:border-gold-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-display">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-dark-900 text-gold-300 font-bold border border-white/[0.12] focus:outline-none"
                  >
                    <option value="Groceries">Groceries</option>
                    <option value="Household">Household</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Travel">Travel</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-display">
                    Daily Cap (₹)
                  </label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-dark-900 text-white font-mono border border-white/[0.12] focus:outline-none focus:border-gold-500/60"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-black gold-btn uppercase tracking-wider rounded-xl transition"
                >
                  {isSubmitting ? 'Registering...' : 'Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
