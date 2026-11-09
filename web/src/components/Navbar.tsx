import React from 'react';
import { User } from '../api/client.js';
import { ConsentLogo } from './ConsentLogo.js';
import {
  Shield,
  Users,
  FileCode2,
  Cpu,
  Clock,
  BookOpen,
  RotateCcw,
  UserCheck,
  Bot,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  pendingConsentsCount: number;
  onResetDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  users,
  currentUser,
  setCurrentUser,
  pendingConsentsCount,
  onResetDemo,
}) => {
  const tabs = [
    { id: 'circles', label: 'Spending Circles', icon: <Users className="w-4 h-4" /> },
    { id: 'builder', label: 'Mandate Builder', icon: <FileCode2 className="w-4 h-4" /> },
    { id: 'agent', label: 'Agent Dashboard', icon: <Cpu className="w-4 h-4" /> },
    { id: 'roster', label: 'Agent Roster', icon: <Bot className="w-4 h-4" /> },
    {
      id: 'queue',
      label: 'Consent Queue',
      icon: <Clock className="w-4 h-4" />,
      badge: pendingConsentsCount > 0 ? pendingConsentsCount : null,
    },
    { id: 'ledger', label: 'Ledger & Receipts', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-dark-900/85 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-40 shadow-card-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div
            onClick={() => setCurrentTab('agent')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <ConsentLogo size={42} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white font-display">
                  CONSENT<span className="text-gold-400">.</span>
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-gold-500/15 text-gold-300 border border-gold-500/40 shadow-gold-glow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PayPal Sandbox
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
                Shared Spending Mandate for AI Agents
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition relative ${
                    isActive
                      ? 'bg-gradient-to-r from-gold-500/20 to-gold-600/10 text-[#F6E7B4] border border-gold-500/40 shadow-gold-glow'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className={isActive ? 'text-gold-400' : 'text-slate-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-gold-gradient text-dark-950 animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: User Switcher & Reset Demo */}
          <div className="flex items-center gap-3">
            {/* Persona Switcher */}
            <div className="flex items-center gap-1.5 bg-white/[0.05] rounded-xl p-1 px-2.5 border border-white/[0.1] hover:border-gold-500/30 transition">
              <UserCheck className="w-3.5 h-3.5 text-gold-400" />
              <select
                aria-label="Active Persona"
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none pr-1 cursor-pointer"
                value={currentUser?.id || ''}
                onChange={(e) => {
                  const selected = users.find((u) => u.id === e.target.value);
                  if (selected) setCurrentUser(selected);
                }}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-dark-900 text-slate-100">
                    {u.name} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Demo Reset */}
            <button
              onClick={onResetDemo}
              title="Reset Database to Standard Demo Seed"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 dark-glass-btn rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gold-400" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-white/[0.08] scrollbar-none">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  isActive
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                    : 'text-slate-400'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gold-gradient text-dark-950 font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
