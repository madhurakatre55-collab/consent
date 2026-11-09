import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Circle } from '../api/client.js';
import { ConsentLogo } from './ConsentLogo.js';

interface HeroShowcaseProps {
  circle: Circle | null;
  onRunAgentPreset: (scenario: 'auto_approve' | 'needs_quorum' | 'blocked_merchant' | 'negotiable') => void;
  onExploreLedger: () => void;
}

export const HeroShowcase: React.FC<HeroShowcaseProps> = ({
  circle,
  onRunAgentPreset,
  onExploreLedger,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl glass-card border border-white/[0.08] p-6 sm:p-10 lg:p-12 mb-8 shadow-card-dark">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Headline, CTAs, Value Props */}
        <div className="lg:col-span-7 space-y-6">
          {/* Brand & Sparkle */}
          <div className="flex items-center gap-2">
            <span className="text-gold-400 text-lg font-serif animate-pulse">✦</span>
            <span className="text-xs uppercase font-extrabold tracking-widest text-gold-400">
              Autonomous AI Spending Mandates
            </span>
          </div>

          {/* Main Title matching Pinterest reference */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.12] font-display">
            Fast And Simple <br />
            <span className="text-gold-gradient">Digital Payment</span> <br />
            Solution
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Many credit cards are lost by users, stolen, or overspent by unconstrained AI bots. 
            <strong className="text-white font-semibold"> Consent</strong> provides families and small teams with a shared, revocable spending mandate—where PayPal money moves only after the right people and verifiable conditions approve.
          </p>

          {/* Action Buttons matching Pinterest pill CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onRunAgentPreset('auto_approve')}
              className="px-6 py-3 rounded-full gold-btn text-xs font-black uppercase tracking-wider flex items-center gap-2"
            >
              <span>Get It Now</span>
              <ArrowRight className="w-4 h-4 text-dark-900" />
            </button>

            <button
              onClick={onExploreLedger}
              className="px-6 py-3 rounded-full dark-glass-btn text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <span>Explore Ledger</span>
            </button>
          </div>

          {/* Numbered 01 / 02 Value Props matching reference layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/[0.08]">
            <div className="space-y-1">
              <span className="text-sm font-extrabold text-gold-400 font-display">01</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Financial Transactions
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous AI agents propose purchases, but deterministic policy engines enforce strict budget caps.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-sm font-extrabold text-gold-400 font-display">02</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Easy To Use System
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-party k-of-n quorum, merchant negotiation, and PayPal sandbox conditional authorizations.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Floating Metallic Cards & Circular Stamp */}
        <div className="lg:col-span-5 relative flex items-center justify-center min-h-[340px]">
          {/* Subtle Golden Pedestal Glow */}
          <div className="absolute bottom-4 w-64 h-16 bg-gradient-to-t from-gold-500/20 via-gold-500/5 to-transparent rounded-full blur-md" />

          {/* 3D Stack of Cards */}
          <div className="relative w-full max-w-[340px] h-[230px]">
            {/* Background Gold Card */}
            <div className="absolute top-0 right-4 w-64 h-40 rounded-2xl bg-gradient-to-br from-[#FBF0D9] via-[#E5A93C] to-[#976210] p-4 text-dark-950 shadow-2xl transform rotate-6 hover:rotate-4 transition-all duration-300 border border-gold-300/60 opacity-90">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">Credit Card</span>
                <span className="text-[10px] font-mono font-bold">06/28</span>
              </div>
              <div className="mt-8 font-mono text-xs tracking-wider opacity-90 font-bold">
                1234 •••• •••• 9821
              </div>
              <div className="mt-3 flex justify-between items-end">
                <span className="text-[10px] font-bold uppercase">{circle ? circle.name : 'Consent Circle'}</span>
                <span className="text-[10px] font-black tracking-widest">PAYPAL</span>
              </div>
            </div>

            {/* Foreground Matte Black Titanium Card */}
            <div className="absolute top-5 left-2 w-72 h-44 rounded-2xl bg-gradient-to-br from-[#1E222B] via-[#121419] to-[#0A0B0E] p-5 text-white shadow-card-dark transform -rotate-3 hover:rotate-0 transition-all duration-300 border border-white/[0.15]">
              {/* Gold EMV Chip */}
              <div className="flex justify-between items-start">
                <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-gold-600 via-gold-400 to-gold-200 border border-gold-300/80 shadow-xs flex items-center justify-center">
                  <div className="w-5 h-4 border border-dark-900/30 rounded-xs" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm animate-pulse" />
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-300">
                    AUTH HOLD
                  </span>
                </div>
              </div>

              {/* Card Number */}
              <div className="mt-6 font-mono text-sm tracking-widest font-bold text-slate-200">
                1234 5678 9012 245
              </div>

              {/* Cardholder & Expiry */}
              <div className="mt-4 flex justify-between items-end">
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Mandate Budget</span>
                  <span className="text-xs font-black text-gold-300 tracking-wide font-mono">
                    {circle?.currency === 'INR' ? '₹' : '$'}{circle ? circle.monthly_budget.toLocaleString() : '8,000'} / mo
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-slate-400 block">VALID 08/29</span>
                  <span className="text-[10px] font-black tracking-widest text-slate-200">CONSENT</span>
                </div>
              </div>
            </div>

            {/* Star Sparkle near cards */}
            <div className="absolute -top-3 right-0 text-gold-400 text-lg font-serif">✦</div>
          </div>

          {/* Rotating Circular Stamp Badge */}
          <div className="absolute -bottom-6 left-0 sm:left-4 z-20 flex items-center justify-center w-24 h-24">
            <svg className="w-24 h-24 animate-spin-slow" viewBox="0 0 100 100">
              <path
                id="circlePath"
                d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
                fill="none"
              />
              <text className="text-[8px] uppercase tracking-widest fill-gold-400 font-bold">
                <textPath href="#circlePath">
                  your one stop banking solution • consent •
                </textPath>
              </text>
            </svg>
            <div className="absolute w-11 h-11 rounded-2xl bg-dark-900 border border-gold-500/50 flex items-center justify-center shadow-gold-glow">
              <ConsentLogo size={28} />
            </div>
          </div>

          {/* Floating Stat Badge: 1.24M World Active User */}
          <div className="absolute -bottom-3 right-0 sm:right-2 z-20 flex items-center gap-2.5 bg-dark-900/90 backdrop-blur-md border border-white/[0.12] rounded-2xl p-2 pr-3.5 shadow-card-dark">
            <div className="px-3 py-1 rounded-xl bg-gold-gradient text-dark-950 font-black text-xs font-mono">
              1.24M
            </div>
            <div className="flex items-center">
              <div className="flex -space-x-1.5 overflow-hidden">
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-dark-900 bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">A</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-dark-900 bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">R</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-dark-900 bg-amber-600 flex items-center justify-center text-[10px] text-white font-bold">M</div>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-tight leading-tight">
              World Active <br /> User
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
