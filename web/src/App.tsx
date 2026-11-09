import React, { useEffect, useState } from 'react';
import { api, User, Circle, Proposal, Agent } from './api/client.js';
import { Navbar } from './components/Navbar.js';
import { Circles } from './pages/Circles.js';
import { MandateBuilder } from './pages/MandateBuilder.js';
import { AgentDashboard } from './pages/AgentDashboard.js';
import { AgentRoster } from './pages/AgentRoster.js';
import { ConsentQueue } from './pages/ConsentQueue.js';
import { Ledger } from './pages/Ledger.js';
import { ReceiptDetail } from './pages/ReceiptDetail.js';
import { ConsentLogo } from './components/ConsentLogo.js';
import { LoadingState } from './components/LoadingState.js';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('agent');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [selectedReceiptProposalId, setSelectedReceiptProposalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial dataset
  const loadData = async () => {
    try {
      const [u, c, p, l] = await Promise.all([
        api.getUsers(),
        api.getCircles(),
        api.getProposals(),
        api.getLedger(),
      ]);

      setUsers(u);
      if (!currentUser && u.length > 0) {
        setCurrentUser(u[0]); // Default to Aisha (Owner)
      }

      setCircles(c);
      const activeCircle = selectedCircleId || (c[0]?.id || '');
      if ((!selectedCircleId || !c.some((ci) => ci.id === selectedCircleId)) && c.length > 0) {
        setSelectedCircleId(c[0].id);
      }

      setProposals(p);
      setLedgerEntries(l);

      if (activeCircle) {
        const ags = await api.getAgents(activeCircle);
        setAgents(ags);
      }
    } catch (err: any) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh every 10 seconds for real-time background jobs
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    if (confirm('Reset database to standard demo seed with all scenarios?')) {
      try {
        await api.resetDemoSeed();
        await loadData();
        setSelectedReceiptProposalId(null);
        setCurrentTab('agent');
        alert('Demo seed restored successfully!');
      } catch (err: any) {
        alert(`Reset failed: ${err.message}`);
      }
    }
  };

  const handleOpenReceipt = (proposalId: string) => {
    setSelectedReceiptProposalId(proposalId);
    setCurrentTab('receipt');
  };

  const pendingConsents = proposals.filter((p) => p.status === 'awaiting_consent');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090B] flex items-center justify-center">
        <LoadingState message="Initializing Consent Sandbox Engine..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090B] text-slate-100 flex flex-col font-sans selection:bg-gold-500 selection:text-black">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setSelectedReceiptProposalId(null);
          setCurrentTab(tab);
        }}
        users={users}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        pendingConsentsCount={pendingConsents.length}
        onResetDemo={handleResetDemo}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'circles' && (
          <Circles
            circles={circles}
            users={users}
            onSelectCircle={(id) => {
              setSelectedCircleId(id);
              setCurrentTab('agent');
            }}
            onRefresh={loadData}
            onOpenBuilder={() => setCurrentTab('builder')}
          />
        )}

        {currentTab === 'builder' && (
          <MandateBuilder
            circles={circles}
            selectedCircleId={selectedCircleId}
            onCircleChange={setSelectedCircleId}
            onMandateConfirmed={() => {
              loadData();
              setCurrentTab('agent');
            }}
          />
        )}

        {currentTab === 'agent' && (
          <AgentDashboard
            proposals={proposals}
            circles={circles}
            selectedCircleId={selectedCircleId}
            onCircleChange={setSelectedCircleId}
            currentUser={currentUser}
            onRefresh={loadData}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {currentTab === 'roster' && (
          <AgentRoster
            agents={agents}
            selectedCircleId={selectedCircleId}
            currentUser={currentUser}
            onRefresh={loadData}
          />
        )}

        {currentTab === 'queue' && (
          <ConsentQueue
            pendingProposals={pendingConsents}
            currentUser={currentUser}
            onRefresh={loadData}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {currentTab === 'ledger' && (
          <Ledger
            ledgerEntries={ledgerEntries}
            circles={circles}
            selectedCircleId={selectedCircleId}
            onCircleChange={setSelectedCircleId}
            onOpenReceipt={handleOpenReceipt}
            onRefresh={loadData}
          />
        )}

        {currentTab === 'receipt' && selectedReceiptProposalId && (
          <ReceiptDetail
            proposalId={selectedReceiptProposalId}
            onBack={() => setCurrentTab('agent')}
          />
        )}
      </main>

      <footer className="border-t border-white/[0.08] bg-dark-900/90 backdrop-blur-md py-5 mt-auto text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ConsentLogo size={22} />
            <span className="text-white font-bold tracking-tight font-display">CONSENT</span>
            <span className="text-slate-600">•</span>
            <span>Shared Spending Mandates for Autonomous AI Agents</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-gold-300">
              PayPal Developer Platform SANDBOX
            </span>
            <span>Orders v2 AUTHORIZE / CAPTURE / VOID</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
