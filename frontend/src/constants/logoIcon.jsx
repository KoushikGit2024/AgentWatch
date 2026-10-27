import React from 'react';

export const LogoIcon = (
  <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
    {/* Outer Watch Case Bezel */}
    <rect x="2" y="2" width="44" height="44" rx="10" fill="#14181F" stroke="#2D3542" strokeWidth="2.5" />
    {/* Dial Ring & Outer Chrono Ticks */}
    <circle cx="24" cy="24" r="19" stroke="#1F2633" strokeWidth="1.5" />
    <line x1="24" y1="3.5" x2="24" y2="7.5" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="24" y1="40.5" x2="24" y2="44.5" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="3.5" y1="24" x2="7.5" y2="24" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="40.5" y1="24" x2="44.5" y2="24" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
    {/* Top Center Antenna */}
    <line x1="24" y1="8" x2="24" y2="12" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="7.5" r="2.2" fill="#38BDF8" />
    {/* Robo Ear Modules */}
    <rect x="6.5" y="19" width="3.5" height="10" rx="1.5" fill="#0284C7" stroke="#38BDF8" strokeWidth="1" />
    <rect x="38" y="19" width="3.5" height="10" rx="1.5" fill="#0284C7" stroke="#38BDF8" strokeWidth="1" />
    {/* Main Bold Square Robo Head */}
    <rect x="9.5" y="12" width="29" height="25" rx="5" fill="#181D24" stroke="#38BDF8" strokeWidth="2" />
    {/* Visor Screen */}
    <rect x="13.5" y="16" width="21" height="9.5" rx="3" fill="#0A0D12" stroke="#1E2838" strokeWidth="1.2" />
    {/* Big Glowing Square Pixel Eyes */}
    <rect x="16" y="18.5" width="5.5" height="4.5" rx="1" fill="#38BDF8" />
    <rect x="26.5" y="18.5" width="5.5" height="4.5" rx="1" fill="#38BDF8" />
    {/* Status Mouth Indicator */}
    <line x1="16" y1="30" x2="19.5" y2="30" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
    <line x1="22" y1="30" x2="26" y2="30" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
    <line x1="28.5" y1="30" x2="32" y2="30" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
