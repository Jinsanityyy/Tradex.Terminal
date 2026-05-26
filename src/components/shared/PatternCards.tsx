"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Sentiment = "bullish" | "bearish" | "neutral";
type Category = "chart" | "candle" | "structure";

interface PatternDef {
  id: string;
  name: string;
  category: Category;
  sentiment: Sentiment;
  points: string[];
  Diagram: React.FC;
}

// ─── SVG Diagrams ─────────────────────────────────────────────────────────────

const HeadAndShouldersDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Head and Shoulders diagram">
    {/* Price path: left shoulder, head, right shoulder */}
    <polyline
      points="10,110 50,100 70,70 90,100 130,30 170,100 190,70 210,100 250,120"
      fill="none" stroke="#71717a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Neckline (dashed blue) */}
    <line x1="50" y1="100" x2="230" y2="100" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5,4" />
    {/* Breakdown arrow */}
    <line x1="240" y1="100" x2="240" y2="128" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrowDown1)" />
    <defs>
      <marker id="arrowDown1" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
      </marker>
    </defs>
    {/* Labels */}
    <text x="70" y="64" textAnchor="middle" fontSize="9" fill="#a1a1aa">Head</text>
    <text x="35" y="66" textAnchor="middle" fontSize="8" fill="#a1a1aa">L.Shoulder</text>
    <text x="205" y="66" textAnchor="middle" fontSize="8" fill="#a1a1aa">R.Shoulder</text>
    <text x="145" y="95" textAnchor="middle" fontSize="8" fill="#93c5fd">Neckline</text>
  </svg>
);

const InverseHeadAndShouldersDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Inverse Head and Shoulders diagram">
    {/* Inverted: three troughs */}
    <polyline
      points="10,30 50,40 70,70 90,40 130,110 170,40 190,70 210,40 260,20"
      fill="none" stroke="#71717a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Neckline */}
    <line x1="50" y1="40" x2="230" y2="40" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5,4" />
    {/* Breakout arrow */}
    <line x1="250" y1="40" x2="250" y2="12" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrowUp2)" />
    <defs>
      <marker id="arrowUp2" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,8 L8,4 L0,0 Z" fill="#34d399" />
      </marker>
    </defs>
    <text x="130" y="122" textAnchor="middle" fontSize="9" fill="#a1a1aa">Head</text>
    <text x="40" y="90" textAnchor="middle" fontSize="8" fill="#a1a1aa">L.Shoulder</text>
    <text x="215" y="90" textAnchor="middle" fontSize="8" fill="#a1a1aa">R.Shoulder</text>
    <text x="145" y="35" textAnchor="middle" fontSize="8" fill="#93c5fd">Neckline</text>
  </svg>
);

const DoubleTopDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Double Top diagram">
    <polyline
      points="20,120 60,40 100,80 140,40 180,90 220,130"
      fill="none" stroke="#71717a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Neckline at valley */}
    <line x1="60" y1="80" x2="220" y2="80" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5,4" />
    {/* Down arrow */}
    <line x1="200" y1="80" x2="200" y2="120" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrowDown3)" />
    <defs>
      <marker id="arrowDown3" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
      </marker>
    </defs>
    <text x="60" y="34" textAnchor="middle" fontSize="9" fill="#a1a1aa">Top 1</text>
    <text x="140" y="34" textAnchor="middle" fontSize="9" fill="#a1a1aa">Top 2</text>
    <text x="145" y="75" textAnchor="middle" fontSize="8" fill="#93c5fd">Neckline</text>
  </svg>
);

const DoubleBottomDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Double Bottom diagram">
    <polyline
      points="20,20 60,100 100,60 140,100 180,50 220,10"
      fill="none" stroke="#71717a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Neckline at peak between troughs */}
    <line x1="20" y1="60" x2="220" y2="60" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5,4" />
    {/* Up arrow */}
    <line x1="200" y1="60" x2="200" y2="20" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrowUp4)" />
    <defs>
      <marker id="arrowUp4" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,8 L8,4 L0,0 Z" fill="#34d399" />
      </marker>
    </defs>
    <text x="60" y="118" textAnchor="middle" fontSize="9" fill="#a1a1aa">Bottom 1</text>
    <text x="140" y="118" textAnchor="middle" fontSize="9" fill="#a1a1aa">Bottom 2</text>
    <text x="145" y="55" textAnchor="middle" fontSize="8" fill="#93c5fd">Neckline</text>
  </svg>
);

const BullFlagDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Bull Flag diagram">
    {/* Pole — strong vertical move up */}
    <line x1="60" y1="120" x2="100" y2="30" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" />
    {/* Flag body — small downward-sloping channel */}
    <line x1="100" y1="30" x2="160" y2="55" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="100" y1="50" x2="160" y2="75" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4,3" />
    {/* Consolidation zig inside flag */}
    <polyline points="100,30 115,48 130,37 145,58 160,50" fill="none" stroke="#71717a" strokeWidth="1" />
    {/* Breakout arrow */}
    <line x1="190" y1="48" x2="260" y2="10" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrowUpFlag)" />
    <defs>
      <marker id="arrowUpFlag" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,8 L8,4 L0,0 Z" fill="#34d399" />
      </marker>
    </defs>
    <text x="60" y="132" textAnchor="middle" fontSize="8" fill="#a1a1aa">Pole</text>
    <text x="130" y="84" textAnchor="middle" fontSize="8" fill="#a1a1aa">Flag</text>
    <text x="240" y="14" textAnchor="middle" fontSize="8" fill="#34d399">Breakout</text>
  </svg>
);

const BearFlagDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Bear Flag diagram">
    {/* Pole — strong drop */}
    <line x1="60" y1="20" x2="100" y2="110" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" />
    {/* Flag — small upward channel */}
    <line x1="100" y1="110" x2="160" y2="85" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="100" y1="90" x2="160" y2="65" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4,3" />
    {/* Zig inside flag */}
    <polyline points="100,110 115,92 130,102 145,82 160,88" fill="none" stroke="#71717a" strokeWidth="1" />
    {/* Breakdown arrow */}
    <line x1="185" y1="90" x2="255" y2="130" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrowDownFlag)" />
    <defs>
      <marker id="arrowDownFlag" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
      </marker>
    </defs>
    <text x="60" y="16" textAnchor="middle" fontSize="8" fill="#a1a1aa">Pole</text>
    <text x="130" y="60" textAnchor="middle" fontSize="8" fill="#a1a1aa">Flag</text>
    <text x="248" y="128" textAnchor="middle" fontSize="8" fill="#f87171">Breakdown</text>
  </svg>
);

const AscendingTriangleDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Ascending Triangle diagram">
    {/* Flat resistance line */}
    <line x1="20" y1="40" x2="230" y2="40" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5,4" />
    {/* Rising support line */}
    <line x1="20" y1="120" x2="200" y2="48" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Price bouncing */}
    <polyline
      points="20,120 60,40 80,90 120,40 145,70 180,40 200,48"
      fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Breakout arrow */}
    <line x1="215" y1="40" x2="270" y2="12" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrowUpAsc)" />
    <defs>
      <marker id="arrowUpAsc" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,8 L8,4 L0,0 Z" fill="#34d399" />
      </marker>
    </defs>
    <text x="115" y="34" textAnchor="middle" fontSize="8" fill="#93c5fd">Resistance</text>
    <text x="60" y="108" textAnchor="middle" fontSize="8" fill="#a1a1aa">Rising Support</text>
  </svg>
);

const DescendingTriangleDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Descending Triangle diagram">
    {/* Flat support line */}
    <line x1="20" y1="100" x2="230" y2="100" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5,4" />
    {/* Falling resistance line */}
    <line x1="20" y1="20" x2="200" y2="92" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Price bouncing down */}
    <polyline
      points="20,20 60,100 80,50 120,100 145,70 180,100 200,92"
      fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Breakdown arrow */}
    <line x1="215" y1="100" x2="270" y2="128" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrowDownDesc)" />
    <defs>
      <marker id="arrowDownDesc" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
      </marker>
    </defs>
    <text x="115" y="96" textAnchor="middle" fontSize="8" fill="#93c5fd">Support</text>
    <text x="60" y="38" textAnchor="middle" fontSize="8" fill="#a1a1aa">Falling Resistance</text>
  </svg>
);

const RisingWedgeDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Rising Wedge diagram">
    {/* Upper rising line (less steep) */}
    <line x1="20" y1="60" x2="210" y2="25" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Lower rising line (steeper) */}
    <line x1="20" y1="115" x2="205" y2="50" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Price movement inside */}
    <polyline
      points="20,115 50,80 80,90 110,60 140,70 170,48 200,40"
      fill="none" stroke="#71717a" strokeWidth="1" strokeLinejoin="round"
    />
    {/* Breakdown arrow */}
    <line x1="215" y1="45" x2="270" y2="100" stroke="#f87171" strokeWidth="2" markerEnd="url(#arrowDownWedge)" />
    <defs>
      <marker id="arrowDownWedge" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
      </marker>
    </defs>
    <text x="100" y="18" textAnchor="middle" fontSize="8" fill="#a1a1aa">Rising Wedge</text>
    <text x="255" y="115" textAnchor="middle" fontSize="8" fill="#f87171">Breakdown</text>
  </svg>
);

const FallingWedgeDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Falling Wedge diagram">
    {/* Upper falling line */}
    <line x1="20" y1="25" x2="210" y2="80" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Lower falling line (steeper) */}
    <line x1="20" y1="60" x2="205" y2="110" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Price inside */}
    <polyline
      points="20,60 50,80 80,68 110,88 140,78 170,96 200,92"
      fill="none" stroke="#71717a" strokeWidth="1" strokeLinejoin="round"
    />
    {/* Breakout arrow */}
    <line x1="215" y1="90" x2="270" y2="40" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrowUpFalling)" />
    <defs>
      <marker id="arrowUpFalling" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,8 L8,4 L0,0 Z" fill="#34d399" />
      </marker>
    </defs>
    <text x="100" y="20" textAnchor="middle" fontSize="8" fill="#a1a1aa">Falling Wedge</text>
    <text x="258" y="36" textAnchor="middle" fontSize="8" fill="#34d399">Breakout</text>
  </svg>
);

// ─── Candlestick Diagrams ──────────────────────────────────────────────────────

const BullishEngulfingDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Bullish Engulfing diagram">
    {/* Small red candle (left) */}
    {/* Wick top */}
    <line x1="115" y1="45" x2="115" y2="55" stroke="#dc2626" strokeWidth="1.5" />
    {/* Body */}
    <rect x="103" y="55" width="24" height="32" fill="#dc2626" rx="1" />
    {/* Wick bottom */}
    <line x1="115" y1="87" x2="115" y2="97" stroke="#dc2626" strokeWidth="1.5" />
    {/* Large green candle (right) engulfs */}
    {/* Wick top */}
    <line x1="175" y1="30" x2="175" y2="42" stroke="#16a34a" strokeWidth="1.5" />
    {/* Body */}
    <rect x="163" y="42" width="24" height="58" fill="#16a34a" rx="1" />
    {/* Wick bottom */}
    <line x1="175" y1="100" x2="175" y2="112" stroke="#16a34a" strokeWidth="1.5" />
    {/* Labels */}
    <text x="115" y="38" textAnchor="middle" fontSize="9" fill="#f87171">Bearish</text>
    <text x="175" y="24" textAnchor="middle" fontSize="9" fill="#34d399">Bullish</text>
  </svg>
);

const BearishEngulfingDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Bearish Engulfing diagram">
    {/* Small green candle */}
    <line x1="115" y1="45" x2="115" y2="55" stroke="#16a34a" strokeWidth="1.5" />
    <rect x="103" y="55" width="24" height="32" fill="#16a34a" rx="1" />
    <line x1="115" y1="87" x2="115" y2="97" stroke="#16a34a" strokeWidth="1.5" />
    {/* Large red candle engulfs */}
    <line x1="175" y1="28" x2="175" y2="40" stroke="#dc2626" strokeWidth="1.5" />
    <rect x="163" y="40" width="24" height="62" fill="#dc2626" rx="1" />
    <line x1="175" y1="102" x2="175" y2="114" stroke="#dc2626" strokeWidth="1.5" />
    {/* Labels */}
    <text x="115" y="38" textAnchor="middle" fontSize="9" fill="#34d399">Bullish</text>
    <text x="175" y="22" textAnchor="middle" fontSize="9" fill="#f87171">Bearish</text>
  </svg>
);

const HammerDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Hammer diagram">
    {/* Candle: small body at top, long lower wick */}
    {/* Short upper wick */}
    <line x1="150" y1="40" x2="150" y2="48" stroke="#16a34a" strokeWidth="1.5" />
    {/* Body */}
    <rect x="138" y="48" width="24" height="18" fill="#16a34a" rx="1" />
    {/* Long lower wick */}
    <line x1="150" y1="66" x2="150" y2="115" stroke="#16a34a" strokeWidth="1.5" />
    {/* Label arrow */}
    <line x1="185" y1="95" x2="160" y2="90" stroke="#a1a1aa" strokeWidth="1" markerEnd="url(#arrowLabelH)" />
    <defs>
      <marker id="arrowLabelH" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#a1a1aa" />
      </marker>
    </defs>
    <text x="210" y="98" textAnchor="middle" fontSize="8" fill="#a1a1aa">Long lower wick</text>
    <text x="150" y="32" textAnchor="middle" fontSize="9" fill="#34d399">Hammer</text>
  </svg>
);

const ShootingStarDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Shooting Star diagram">
    {/* Long upper wick */}
    <line x1="150" y1="22" x2="150" y2="72" stroke="#dc2626" strokeWidth="1.5" />
    {/* Body */}
    <rect x="138" y="72" width="24" height="18" fill="#dc2626" rx="1" />
    {/* Short lower wick */}
    <line x1="150" y1="90" x2="150" y2="98" stroke="#dc2626" strokeWidth="1.5" />
    {/* Label */}
    <line x1="185" y1="48" x2="162" y2="48" stroke="#a1a1aa" strokeWidth="1" markerEnd="url(#arrowLabelSS)" />
    <defs>
      <marker id="arrowLabelSS" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#a1a1aa" />
      </marker>
    </defs>
    <text x="220" y="51" textAnchor="middle" fontSize="8" fill="#a1a1aa">Long upper wick</text>
    <text x="150" y="118" textAnchor="middle" fontSize="9" fill="#f87171">Shooting Star</text>
  </svg>
);

const DojiDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Doji diagram">
    {/* Long upper wick */}
    <line x1="150" y1="20" x2="150" y2="68" stroke="#a1a1aa" strokeWidth="1.5" />
    {/* Doji body — just a thin line (open = close) */}
    <rect x="130" y="68" width="40" height="4" fill="#a1a1aa" rx="1" />
    {/* Long lower wick */}
    <line x1="150" y1="72" x2="150" y2="118" stroke="#a1a1aa" strokeWidth="1.5" />
    {/* Label */}
    <line x1="195" y1="70" x2="172" y2="70" stroke="#93c5fd" strokeWidth="1" markerEnd="url(#arrowDoji)" />
    <defs>
      <marker id="arrowDoji" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#93c5fd" />
      </marker>
    </defs>
    <text x="228" y="73" textAnchor="middle" fontSize="8" fill="#93c5fd">Open = Close</text>
    <text x="150" y="132" textAnchor="middle" fontSize="9" fill="#a1a1aa">Doji</text>
  </svg>
);

const PinBarDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Pin Bar diagram">
    {/* Key level horizontal line */}
    <line x1="20" y1="108" x2="280" y2="108" stroke="#93c5fd" strokeWidth="1" strokeDasharray="5,4" />
    {/* Pin bar — very long lower wick */}
    <line x1="150" y1="42" x2="150" y2="48" stroke="#16a34a" strokeWidth="1.5" />
    <rect x="138" y="48" width="24" height="14" fill="#16a34a" rx="1" />
    <line x1="150" y1="62" x2="150" y2="122" stroke="#16a34a" strokeWidth="2" />
    {/* Labels */}
    <line x1="200" y1="95" x2="162" y2="92" stroke="#a1a1aa" strokeWidth="1" markerEnd="url(#arrowPinBar)" />
    <defs>
      <marker id="arrowPinBar" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#a1a1aa" />
      </marker>
    </defs>
    <text x="233" y="98" textAnchor="middle" fontSize="8" fill="#a1a1aa">Rejection wick</text>
    <text x="150" y="105" textAnchor="start" fontSize="7" fill="#93c5fd">  Key Level</text>
  </svg>
);

const MorningStarDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Morning Star diagram">
    {/* Candle 1: large red */}
    <line x1="75" y1="22" x2="75" y2="30" stroke="#dc2626" strokeWidth="1.5" />
    <rect x="63" y="30" width="24" height="52" fill="#dc2626" rx="1" />
    <line x1="75" y1="82" x2="75" y2="90" stroke="#dc2626" strokeWidth="1.5" />
    {/* Candle 2: small doji */}
    <line x1="150" y1="72" x2="150" y2="80" stroke="#a1a1aa" strokeWidth="1.5" />
    <rect x="141" y="80" width="18" height="10" fill="#a1a1aa" rx="1" />
    <line x1="150" y1="90" x2="150" y2="98" stroke="#a1a1aa" strokeWidth="1.5" />
    {/* Candle 3: large green */}
    <line x1="225" y1="28" x2="225" y2="38" stroke="#16a34a" strokeWidth="1.5" />
    <rect x="213" y="38" width="24" height="52" fill="#16a34a" rx="1" />
    <line x1="225" y1="90" x2="225" y2="98" stroke="#16a34a" strokeWidth="1.5" />
    {/* Labels */}
    <text x="75" y="18" textAnchor="middle" fontSize="8" fill="#f87171">Bearish</text>
    <text x="150" y="68" textAnchor="middle" fontSize="8" fill="#a1a1aa">Doji</text>
    <text x="225" y="24" textAnchor="middle" fontSize="8" fill="#34d399">Bullish</text>
  </svg>
);

const EveningStarDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Evening Star diagram">
    {/* Candle 1: large green */}
    <line x1="75" y1="22" x2="75" y2="30" stroke="#16a34a" strokeWidth="1.5" />
    <rect x="63" y="30" width="24" height="52" fill="#16a34a" rx="1" />
    <line x1="75" y1="82" x2="75" y2="90" stroke="#16a34a" strokeWidth="1.5" />
    {/* Candle 2: small doji */}
    <line x1="150" y1="18" x2="150" y2="26" stroke="#a1a1aa" strokeWidth="1.5" />
    <rect x="141" y="26" width="18" height="10" fill="#a1a1aa" rx="1" />
    <line x1="150" y1="36" x2="150" y2="44" stroke="#a1a1aa" strokeWidth="1.5" />
    {/* Candle 3: large red */}
    <line x1="225" y1="28" x2="225" y2="38" stroke="#dc2626" strokeWidth="1.5" />
    <rect x="213" y="38" width="24" height="52" fill="#dc2626" rx="1" />
    <line x1="225" y1="90" x2="225" y2="98" stroke="#dc2626" strokeWidth="1.5" />
    {/* Labels */}
    <text x="75" y="18" textAnchor="middle" fontSize="8" fill="#34d399">Bullish</text>
    <text x="150" y="14" textAnchor="middle" fontSize="8" fill="#a1a1aa">Doji</text>
    <text x="225" y="24" textAnchor="middle" fontSize="8" fill="#f87171">Bearish</text>
  </svg>
);

// ─── Market Structure Diagrams ─────────────────────────────────────────────────

const BreakOfStructureDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Break of Structure diagram">
    {/* Zigzag uptrend */}
    <polyline
      points="15,115 45,75 65,95 95,50 120,70 155,28 180,48 220,15"
      fill="none" stroke="#71717a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Previous HH level line */}
    <line x1="90" y1="50" x2="220" y2="50" stroke="#93c5fd" strokeWidth="1" strokeDasharray="4,3" />
    {/* BOS label */}
    <text x="160" y="20" textAnchor="middle" fontSize="10" fill="#60a5fa" fontWeight="bold">BOS</text>
    <line x1="155" y1="22" x2="155" y2="30" stroke="#60a5fa" strokeWidth="1.5" markerEnd="url(#arrowBOS)" />
    <defs>
      <marker id="arrowBOS" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#60a5fa" />
      </marker>
    </defs>
    {/* HH/HL labels */}
    <text x="45" y="70" textAnchor="middle" fontSize="7" fill="#34d399">HL</text>
    <text x="65" y="90" textAnchor="middle" fontSize="7" fill="#34d399">HL</text>
    <text x="95" y="45" textAnchor="middle" fontSize="7" fill="#34d399">HH</text>
    <text x="120" y="65" textAnchor="middle" fontSize="7" fill="#34d399">HL</text>
    <text x="155" y="43" textAnchor="middle" fontSize="7" fill="#60a5fa">HH</text>
  </svg>
);

const ChangeOfCharacterDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Change of Character diagram">
    {/* Uptrend then CHoCH */}
    <polyline
      points="15,115 45,75 65,95 100,45 125,70 160,25 185,65 215,48 245,90"
      fill="none" stroke="#71717a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Dashed line at previous HH */}
    <line x1="155" y1="25" x2="245" y2="25" stroke="#f87171" strokeWidth="1" strokeDasharray="4,3" />
    {/* CHoCH label */}
    <text x="215" y="20" textAnchor="middle" fontSize="9" fill="#f87171" fontWeight="bold">CHoCH</text>
    <line x1="215" y1="22" x2="215" y2="45" stroke="#f87171" strokeWidth="1" strokeDasharray="3,2" />
    {/* HH HL labels */}
    <text x="45" y="70" textAnchor="middle" fontSize="7" fill="#34d399">HL</text>
    <text x="100" y="40" textAnchor="middle" fontSize="7" fill="#34d399">HH</text>
    <text x="125" y="65" textAnchor="middle" fontSize="7" fill="#34d399">HL</text>
    <text x="160" y="20" textAnchor="middle" fontSize="7" fill="#34d399">HH</text>
    <text x="215" y="60" textAnchor="middle" fontSize="7" fill="#f87171">LH</text>
  </svg>
);

const FairValueGapDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Fair Value Gap diagram">
    {/* Candle 1: big up */}
    <line x1="85" y1="88" x2="85" y2="95" stroke="#16a34a" strokeWidth="1.5" />
    <rect x="73" y="38" width="24" height="50" fill="#16a34a" rx="1" />
    <line x1="85" y1="32" x2="85" y2="38" stroke="#16a34a" strokeWidth="1.5" />
    {/* FVG gap zone highlighted */}
    <rect x="109" y="38" width="82" height="20" fill="#3b82f6" fillOpacity="0.2" stroke="#93c5fd" strokeWidth="0.5" strokeDasharray="3,2" />
    <text x="150" y="52" textAnchor="middle" fontSize="8" fill="#93c5fd">FVG</text>
    {/* Candle 2: middle impulse */}
    <line x1="130" y1="10" x2="130" y2="20" stroke="#16a34a" strokeWidth="1.5" />
    <rect x="118" y="20" width="24" height="58" fill="#16a34a" rx="1" />
    <line x1="130" y1="78" x2="130" y2="88" stroke="#16a34a" strokeWidth="1.5" />
    {/* Candle 3: next candle */}
    <line x1="175" y1="14" x2="175" y2="20" stroke="#16a34a" strokeWidth="1.5" />
    <rect x="163" y="20" width="24" height="40" fill="#16a34a" rx="1" />
    <line x1="175" y1="60" x2="175" y2="70" stroke="#16a34a" strokeWidth="1.5" />
    {/* Price returns to fill arrow */}
    <path d="M200,30 Q230,50 215,58" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrowFVG)" />
    <defs>
      <marker id="arrowFVG" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#93c5fd" />
      </marker>
    </defs>
    <text x="232" y="28" textAnchor="middle" fontSize="7" fill="#93c5fd">Fill</text>
  </svg>
);

const OrderBlockDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Order Block diagram">
    {/* Prior price action declining */}
    <polyline points="15,30 45,50 75,70 100,85" fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Last bearish candle (OB) — highlighted */}
    <rect x="80" y="65" width="40" height="22" fill="#3b82f6" fillOpacity="0.15" stroke="#93c5fd" strokeWidth="1" rx="2" />
    <line x1="100" y1="60" x2="100" y2="65" stroke="#dc2626" strokeWidth="1.5" />
    <rect x="88" y="65" width="24" height="22" fill="#dc2626" rx="1" />
    <line x1="100" y1="87" x2="100" y2="93" stroke="#dc2626" strokeWidth="1.5" />
    {/* Strong bullish impulse from OB */}
    <polyline
      points="100,87 130,60 155,30 185,10"
      fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Price return arrow to OB zone */}
    <path d="M210,12 Q240,50 190,75" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrowOB)" />
    <defs>
      <marker id="arrowOB" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#93c5fd" />
      </marker>
    </defs>
    <text x="55" y="62" textAnchor="middle" fontSize="8" fill="#93c5fd">OB Zone</text>
    <text x="220" y="10" textAnchor="middle" fontSize="8" fill="#93c5fd">Retest</text>
  </svg>
);

const LiquiditySweepDiagram: React.FC = () => (
  <svg viewBox="0 0 300 140" width="100%" preserveAspectRatio="xMidYMid meet" aria-label="Liquidity Sweep diagram">
    {/* Equal lows support line */}
    <line x1="20" y1="100" x2="270" y2="100" stroke="#93c5fd" strokeWidth="1" strokeDasharray="5,4" />
    {/* Price action touching lows */}
    <polyline
      points="20,60 50,100 70,75 100,100 120,70"
      fill="none" stroke="#71717a" strokeWidth="1.5" strokeLinejoin="round"
    />
    {/* Sweep wick below equal lows */}
    <polyline
      points="120,70 135,100 145,122 155,100 165,85"
      fill="none" stroke="#f87171" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Strong reversal up */}
    <polyline
      points="165,85 195,55 225,30 260,15"
      fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
    />
    {/* Labels */}
    <text x="70" y="118" textAnchor="middle" fontSize="8" fill="#93c5fd">Liquidity</text>
    <text x="145" y="134" textAnchor="middle" fontSize="8" fill="#f87171">Sweep</text>
    <text x="240" y="28" textAnchor="middle" fontSize="8" fill="#34d399">Reversal</text>
  </svg>
);

// ─── Pattern Definitions ───────────────────────────────────────────────────────

const PATTERNS: PatternDef[] = [
  // CHART PATTERNS
  {
    id: "head-shoulders",
    name: "Head & Shoulders",
    category: "chart",
    sentiment: "bearish",
    points: [
      "Bearish reversal after an uptrend",
      "Three peaks — middle is the highest",
      "Neckline break confirms the signal",
      "Stop loss placed above right shoulder",
    ],
    Diagram: HeadAndShouldersDiagram,
  },
  {
    id: "inverse-head-shoulders",
    name: "Inverse Head & Shoulders",
    category: "chart",
    sentiment: "bullish",
    points: [
      "Bullish reversal after a downtrend",
      "Three troughs — middle is the lowest",
      "Neckline break is the entry signal",
      "Stop loss placed below right shoulder",
    ],
    Diagram: InverseHeadAndShouldersDiagram,
  },
  {
    id: "double-top",
    name: "Double Top",
    category: "chart",
    sentiment: "bearish",
    points: [
      "Bearish reversal pattern",
      "Two peaks at the same resistance level",
      "Neckline break confirms the signal",
      "Stop loss placed above both tops",
    ],
    Diagram: DoubleTopDiagram,
  },
  {
    id: "double-bottom",
    name: "Double Bottom",
    category: "chart",
    sentiment: "bullish",
    points: [
      "Bullish reversal pattern",
      "Two troughs at the same support level",
      "Neckline break is the entry signal",
      "Stop loss placed below both bottoms",
    ],
    Diagram: DoubleBottomDiagram,
  },
  {
    id: "bull-flag",
    name: "Bull Flag",
    category: "chart",
    sentiment: "bullish",
    points: [
      "Bullish continuation after a strong move",
      "Pole = impulse, Flag = consolidation",
      "Enter on breakout above the flag",
      "Stop loss placed below the flag low",
    ],
    Diagram: BullFlagDiagram,
  },
  {
    id: "bear-flag",
    name: "Bear Flag",
    category: "chart",
    sentiment: "bearish",
    points: [
      "Bearish continuation after a strong drop",
      "Pole = impulse, Flag = pullback",
      "Enter on breakdown below the flag",
      "Stop loss placed above the flag high",
    ],
    Diagram: BearFlagDiagram,
  },
  {
    id: "ascending-triangle",
    name: "Ascending Triangle",
    category: "chart",
    sentiment: "bullish",
    points: [
      "Bullish continuation pattern",
      "Flat top resistance + rising lows",
      "Buyers getting more aggressive over time",
      "Enter on breakout above flat resistance",
    ],
    Diagram: AscendingTriangleDiagram,
  },
  {
    id: "descending-triangle",
    name: "Descending Triangle",
    category: "chart",
    sentiment: "bearish",
    points: [
      "Bearish continuation pattern",
      "Flat bottom support + falling highs",
      "Sellers are in control of price",
      "Enter on breakdown below flat support",
    ],
    Diagram: DescendingTriangleDiagram,
  },
  {
    id: "rising-wedge",
    name: "Rising Wedge",
    category: "chart",
    sentiment: "bearish",
    points: [
      "Bearish reversal or continuation signal",
      "Both lines slope up but converge",
      "Momentum weakening as price narrows",
      "Enter breakdown below the lower line",
    ],
    Diagram: RisingWedgeDiagram,
  },
  {
    id: "falling-wedge",
    name: "Falling Wedge",
    category: "chart",
    sentiment: "bullish",
    points: [
      "Bullish reversal signal",
      "Both lines slope down and converge",
      "Selling pressure fading with each swing",
      "Enter breakout above the upper line",
    ],
    Diagram: FallingWedgeDiagram,
  },
  // CANDLESTICK PATTERNS
  {
    id: "bullish-engulfing",
    name: "Bullish Engulfing",
    category: "candle",
    sentiment: "bullish",
    points: [
      "Strong bullish reversal signal",
      "Green candle fully engulfs prior red",
      "Appears at key support levels",
      "Confirms buyers have taken control",
    ],
    Diagram: BullishEngulfingDiagram,
  },
  {
    id: "bearish-engulfing",
    name: "Bearish Engulfing",
    category: "candle",
    sentiment: "bearish",
    points: [
      "Strong bearish reversal signal",
      "Red candle fully engulfs prior green",
      "Appears at key resistance levels",
      "Sellers overwhelm buyers entirely",
    ],
    Diagram: BearishEngulfingDiagram,
  },
  {
    id: "hammer",
    name: "Hammer",
    category: "candle",
    sentiment: "bullish",
    points: [
      "Bullish reversal at a support level",
      "Long lower wick — buyers stepped in hard",
      "Small body shows indecision resolved bullish",
      "Must appear after a downtrend to be valid",
    ],
    Diagram: HammerDiagram,
  },
  {
    id: "shooting-star",
    name: "Shooting Star",
    category: "candle",
    sentiment: "bearish",
    points: [
      "Bearish reversal at a resistance level",
      "Long upper wick — sellers rejected the rally",
      "Small body at the bottom of the range",
      "Appears after an uptrend at key resistance",
    ],
    Diagram: ShootingStarDiagram,
  },
  {
    id: "doji",
    name: "Doji",
    category: "candle",
    sentiment: "neutral",
    points: [
      "Indecision between buyers and sellers",
      "Open and close prices are nearly equal",
      "Often precedes a reversal in trend",
      "Wait for confirmation from the next candle",
    ],
    Diagram: DojiDiagram,
  },
  {
    id: "pin-bar",
    name: "Pin Bar",
    category: "candle",
    sentiment: "bullish",
    points: [
      "Strong rejection of lower price levels",
      "Extreme wick shows where price was rejected",
      "Most powerful at key support/resistance zones",
      "Enter above the pin bar high for confirmation",
    ],
    Diagram: PinBarDiagram,
  },
  {
    id: "morning-star",
    name: "Morning Star",
    category: "candle",
    sentiment: "bullish",
    points: [
      "Three-candle bullish reversal pattern",
      "Red candle → indecision → strong green",
      "Green must close above red candle's midpoint",
      "Appears at key support after a downtrend",
    ],
    Diagram: MorningStarDiagram,
  },
  {
    id: "evening-star",
    name: "Evening Star",
    category: "candle",
    sentiment: "bearish",
    points: [
      "Three-candle bearish reversal pattern",
      "Green candle → indecision → strong red",
      "Red must close below green candle's midpoint",
      "Appears at key resistance after an uptrend",
    ],
    Diagram: EveningStarDiagram,
  },
  // MARKET STRUCTURE
  {
    id: "bos",
    name: "Break of Structure (BOS)",
    category: "structure",
    sentiment: "neutral",
    points: [
      "Price breaks a previous swing high or low",
      "Confirms the current trend direction",
      "Bullish BOS = new Higher High formed",
      "Used to confirm overall market bias",
    ],
    Diagram: BreakOfStructureDiagram,
  },
  {
    id: "choch",
    name: "Change of Character (CHoCH)",
    category: "structure",
    sentiment: "neutral",
    points: [
      "First sign that a trend may be reversing",
      "In uptrend: first lower high signals CHoCH",
      "Warns of a potential bearish directional shift",
      "Wait for BOS in new direction to fully confirm",
    ],
    Diagram: ChangeOfCharacterDiagram,
  },
  {
    id: "fvg",
    name: "Fair Value Gap (FVG)",
    category: "structure",
    sentiment: "neutral",
    points: [
      "Imbalance between buyers and sellers",
      "Gap visible between three consecutive candles",
      "Price often returns to fill the imbalance",
      "Used as entry zones for pullback trades",
    ],
    Diagram: FairValueGapDiagram,
  },
  {
    id: "order-block",
    name: "Order Block",
    category: "structure",
    sentiment: "neutral",
    points: [
      "Last opposite candle before a major move",
      "Marks where institutional orders were placed",
      "Price often returns to test this zone",
      "Used as high-probability entry areas",
    ],
    Diagram: OrderBlockDiagram,
  },
  {
    id: "liquidity-sweep",
    name: "Liquidity Sweep",
    category: "structure",
    sentiment: "neutral",
    points: [
      "Price dips below obvious stop-loss clusters",
      "Retail stop orders get triggered (swept)",
      "Smart money accumulates at these levels",
      "A strong reversal often follows the sweep",
    ],
    Diagram: LiquiditySweepDiagram,
  },
];

// ─── Sentiment Badge ───────────────────────────────────────────────────────────

const sentimentConfig: Record<Sentiment, { label: string; dot: string; text: string; bg: string; border: string }> = {
  bullish: {
    label: "BULLISH",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  bearish: {
    label: "BEARISH",
    dot: "bg-red-400",
    text: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  neutral: {
    label: "NEUTRAL",
    dot: "bg-amber-400",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
};

interface SentimentBadgeProps {
  sentiment: Sentiment;
}

const SentimentBadge: React.FC<SentimentBadgeProps> = ({ sentiment }) => {
  const cfg = sentimentConfig[sentiment];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide border",
        cfg.bg,
        cfg.text,
        cfg.border
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
};

// ─── Pattern Card ──────────────────────────────────────────────────────────────

const categoryLabel: Record<Category, string> = {
  chart: "Chart Pattern",
  candle: "Candlestick",
  structure: "Market Structure",
};

const categoryBadgeClass: Record<Category, string> = {
  chart: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  candle: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  structure: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

interface PatternCardProps {
  pattern: PatternDef;
}

const PatternCard: React.FC<PatternCardProps> = ({ pattern }) => {
  const { name, category, sentiment, points, Diagram } = pattern;
  return (
    <article
      className={cn(
        "rounded-2xl border border-white/5 bg-zinc-900 overflow-hidden",
        "shadow-xl shadow-black/50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-[17px] leading-tight truncate">{name}</h3>
          <span
            className={cn(
              "inline-block mt-1.5 text-[11px] font-semibold tracking-widest uppercase px-2.5 py-0.5 rounded-md border",
              categoryBadgeClass[category]
            )}
          >
            {categoryLabel[category]}
          </span>
        </div>
        <div className="shrink-0 mt-0.5">
          <SentimentBadge sentiment={sentiment} />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-5" />

      {/* SVG Diagram — taller for better visibility */}
      <div className="px-4 py-4 bg-black/30">
        <div style={{ minHeight: 160 }}>
          <Diagram />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-5" />

      {/* Bullet points */}
      <ul className="px-5 py-4 space-y-2.5">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] text-zinc-300 leading-snug">
            <span className="mt-[2px] shrink-0 text-zinc-500 select-none text-base">›</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </article>
  );
};

// ─── Filter Tabs ───────────────────────────────────────────────────────────────

type FilterTab = "all" | Category;

interface FilterTabConfig {
  id: FilterTab;
  label: string;
  count: number;
}

// ─── PatternCardsView ──────────────────────────────────────────────────────────

export const PatternCardsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const tabs: FilterTabConfig[] = [
    { id: "all", label: "All", count: PATTERNS.length },
    { id: "chart", label: "Chart", count: PATTERNS.filter((p) => p.category === "chart").length },
    { id: "candle", label: "Candle", count: PATTERNS.filter((p) => p.category === "candle").length },
    { id: "structure", label: "Structure", count: PATTERNS.filter((p) => p.category === "structure").length },
  ];

  const filtered = activeTab === "all" ? PATTERNS : PATTERNS.filter((p) => p.category === activeTab);

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 px-4 pt-4 pb-3 shrink-0 overflow-x-auto scrollbar-none border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium whitespace-nowrap transition-all",
              activeTab === tab.id
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "text-[11px] font-bold px-2 py-0.5 rounded-full",
                activeTab === tab.id
                  ? "bg-zinc-700 text-zinc-200"
                  : "bg-zinc-900 text-zinc-600"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Scrollable card list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {filtered.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
      </div>
    </div>
  );
};

export default PatternCardsView;
