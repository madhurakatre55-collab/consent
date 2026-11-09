import React from 'react';

interface ConsentLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const ConsentLogo: React.FC<ConsentLogoProps> = ({
  size = 40,
  className = '',
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          {/* Radiant Champagne Gold Gradient (Primary) */}
          <linearGradient id="goldPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFDF7" />
            <stop offset="25%" stopColor="#F6E7B4" />
            <stop offset="60%" stopColor="#E5A93C" />
            <stop offset="100%" stopColor="#B87714" />
          </linearGradient>

          {/* Deep Bronze & Amber Gradient (Secondary Depth) */}
          <linearGradient id="goldSecondary" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E5A93C" />
            <stop offset="50%" stopColor="#976210" />
            <stop offset="100%" stopColor="#4A310A" />
          </linearGradient>

          {/* High-Luminance Core Gradient */}
          <linearGradient id="coreLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#FFF2D1" />
            <stop offset="100%" stopColor="#E5A93C" />
          </linearGradient>

          {/* Dark Titanium Background Gradient */}
          <linearGradient id="titaniumBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1B1E26" />
            <stop offset="50%" stopColor="#101217" />
            <stop offset="100%" stopColor="#08090B" />
          </linearGradient>

          {/* Outer Aura Glow Filter */}
          <filter id="goldAura" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="#E5A93C" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Geometric Squircle Titanium Chassis with Gold Bevel */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#titaniumBg)"
          stroke="url(#goldPrimary)"
          strokeWidth="1.5"
          filter="url(#goldAura)"
        />

        {/* 2. Micro Ticks & Tech Geometry on Edges */}
        <line x1="8" y1="8" x2="12" y2="8" stroke="#E5A93C" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="8" y1="8" x2="8" y2="12" stroke="#E5A93C" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="40" y1="8" x2="36" y2="8" stroke="#E5A93C" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="40" y1="8" x2="40" y2="12" stroke="#E5A93C" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="8" y1="40" x2="12" y2="40" stroke="#E5A93C" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="8" y1="40" x2="8" y2="36" stroke="#E5A93C" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="40" y1="40" x2="36" y2="40" stroke="#E5A93C" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="40" y1="40" x2="40" y2="36" stroke="#E5A93C" strokeWidth="1" strokeOpacity="0.7" />

        {/* 3. Subtle Concentric Consensus Circle */}
        <circle
          cx="24"
          cy="24"
          r="14"
          stroke="url(#goldSecondary)"
          strokeWidth="1"
          strokeDasharray="2 3"
          strokeOpacity="0.5"
        />

        {/* 4. The Interlocking Futuristic "C" Crest (Double-Ribbon Consensus) */}
        {/* Outer Ribbon: Top & Left Spine curving down */}
        <path
          d="M 32 15 C 24 11, 14 15, 13 24 C 12 32, 22 37, 33 33 C 34 32.5, 33.5 30.5, 32 31 C 24 33.5, 17 30, 17 24 C 17 18, 24 15, 31 17 C 32.5 17.5, 33.5 15.5, 32 15 Z"
          fill="url(#goldPrimary)"
        />

        {/* Inner Ribbon: Overlapping Lock Loop forming the multi-party link */}
        <path
          d="M 21 19 C 27 16, 34 20, 34 25 C 34 29, 29 32, 24 31 C 28 29.5, 30.5 27, 30.5 25 C 30.5 22, 25 19, 21 21 C 19.5 21.8, 19.5 19.8, 21 19 Z"
          fill="url(#goldPrimary)"
          opacity="0.9"
        />

        {/* 5. Central Cryptographic Diamond Sparkle Core (Consensus Node) */}
        <path
          d="M 24 18.5 L 26.2 22.2 L 29.5 24 L 26.2 25.8 L 24 29.5 L 21.8 25.8 L 18.5 24 L 21.8 22.2 Z"
          fill="url(#coreLight)"
          filter="url(#goldAura)"
        />
        
        {/* Diamond Node Center Pin */}
        <circle cx="24" cy="24" r="1.5" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white font-display">
              CONSENT
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 shadow-gold-glow animate-pulse" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
            Shared Spending Mandates
          </span>
        </div>
      )}
    </div>
  );
};
