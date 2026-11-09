import React, { useState } from 'react';
import { Circle, User, api } from '../api/client.js';
import { EmptyState } from '../components/EmptyState.js';
import {
  Users,
  Plus,
  Shield,
  Layers,
  KeyRound,
} from 'lucide-react';

interface CirclesPageProps {
  circles: Circle[];
  users: User[];
  onSelectCircle: (circleId: string) => void;
  onRefresh: () => void;
  onOpenBuilder: () => void;
}

export const Circles: React.FC<CirclesPageProps> = ({
  circles,
  users,
  onSelectCircle,
  onRefresh,
  onOpenBuilder,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('8000');
  const [currency, setCurrency] = useState('INR');
  const [ownerId, setOwnerId] = useState(users[0]?.id || 'user-aisha');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await api.createCircle({
        name,
        monthly_budget: parseFloat(monthlyBudget),
        currency,
        owner_id: ownerId,
        members: users.map((u) => ({
          user_id: u.id,
          role: u.role,
        })),
      });
      setShowCreateModal(false);
      setName('');
      onRefresh();
    } catch (err: any) {
      alert(`Error creating circle: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
            Spending Circles
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Shared mandates for households, flatmates, and small teams. Multi-human consent ensures AI agents spend safely.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 gold-btn rounded-full text-xs font-black uppercase tracking-wider transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-dark-950" />
          <span>New Spending Circle</span>
        </button>
      </div>

      {/* Circles Grid */}
      {circles.length === 0 ? (
        <EmptyState
          title="No Spending Circles yet"
          description="Create your first group spending mandate to let AI agents propose purchases safely."
          actionText="Create Circle"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {circles.map((circle) => {
            const mandate = circle.active_mandate;
            return (
              <div
                key={circle.id}
                className="glass-card glass-card-hover rounded-3xl border border-white/[0.08] shadow-card-dark p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center font-bold shadow-gold-glow">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-gold-500/15 text-gold-300 border border-gold-500/30">
                      Active Circle
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white leading-tight font-display">
                      {circle.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">Circle ID: {circle.id}</p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Monthly Budget</span>
                      <strong className="text-gold-gradient font-black text-base font-mono">
                        {circle.currency === 'INR' ? '₹' : '$'}
                        {Number(circle.monthly_budget).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Auto-Approve Under</span>
                      <strong className="text-gold-300 font-black text-base font-mono">
                        {mandate?.per_purchase_auto_approve_limit
                          ? `${circle.currency === 'INR' ? '₹' : '$'}${mandate.per_purchase_auto_approve_limit}`
                          : 'Not set'}
                      </strong>
                    </div>
                  </div>

                  {/* Mandate Summary */}
                  {mandate ? (
                    <div className="text-xs space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-slate-300">
                        <KeyRound className="w-3.5 h-3.5 text-gold-400" />
                        <span>Approval Mode: </span>
                        <strong className="capitalize font-bold text-white font-mono">
                          {mandate.required_approvers?.mode === 'quorum'
                            ? `Quorum (${mandate.required_approvers.count} of 3)`
                            : mandate.required_approvers?.mode || 'Quorum'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Shield className="w-3.5 h-3.5 text-gold-400" />
                        <span>Guardian Required: </span>
                        <span className="font-semibold text-slate-200">Electronics, Medical, Travel</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
                      No active policy compiled yet. Configure rules to enable AI agents.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2.5">
                  <button
                    onClick={() => onSelectCircle(circle.id)}
                    className="flex-1 py-2.5 px-4 gold-btn rounded-xl text-xs font-black uppercase tracking-wider text-center"
                  >
                    View Proposals
                  </button>
                  <button
                    onClick={onOpenBuilder}
                    className="py-2.5 px-4 dark-glass-btn text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-gold-400" />
                    <span>Edit Mandate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-card rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-card-dark border border-white/[0.12] space-y-5">
            <div>
              <h2 className="text-xl font-black text-white font-display">Create Spending Circle</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Establish a shared financial boundary for AI agents with your flatmates or team.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-display">
                  Circle Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flat 12 Living & Groceries"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-dark-900 text-white placeholder-slate-500 border border-white/[0.12] focus:outline-none focus:border-gold-500/60"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-display">
                    Monthly Budget
                  </label>
                  <input
                    type="number"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-dark-900 text-white border border-white/[0.12] focus:outline-none focus:border-gold-500/60 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-display">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-dark-900 text-gold-300 font-bold border border-white/[0.12] focus:outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider font-display">
                  Circle Owner
                </label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-dark-900 text-slate-200 font-bold border border-white/[0.12] focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.08] text-xs text-slate-400 leading-relaxed">
                <strong className="text-white">Included Members: </strong>
                All registered demo participants (Aisha, Rohan, Priya, Kunal) will automatically join with their respective roles.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-black gold-btn uppercase tracking-wider rounded-xl transition"
                >
                  {isSubmitting ? 'Creating...' : 'Create Circle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
