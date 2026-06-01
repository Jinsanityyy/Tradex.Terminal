"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X, Search, ChevronDown, ChevronRight, BookOpen,
  BarChart2, CandlestickChart, TrendingUp, Activity,
  ShieldCheck, Crosshair, Building2, Brain,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TRADING_KNOWLEDGE, KnowledgeCategory, KnowledgeItem } from "@/data/trading-knowledge";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, BarChart2, CandlestickChart, TrendingUp,
  Activity, ShieldCheck, Crosshair, Building2, Brain,
};

// ── Pattern definitions ───────────────────────────────────────────────────────

type Bias = "bullish" | "bearish" | "neutral";
type PatternType = "chart" | "candle" | "structure";

interface PatternDef {
  id: string;
  title: string;
  type: PatternType;
  bias: Bias;
  svg: React.ReactNode;
  bullets: string[];
}

// SVG helpers
const W = 200;
const H = 90;
const stroke = { stroke: "#71717a", strokeWidth: 1, fill: "none" } as const;
const green = "#22c55e";
const red = "#ef4444";
const amber = "#f59e0b";
const dim = "#52525b";
const muted = "#3f3f46";

function PriceLine({ points, color = "#a1a1aa" }: { points: [number, number][]; color?: string }) {
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  return <path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />;
}

function DashLine({ x1, y1, x2, y2, color = dim }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} strokeDasharray="3 2" />;
}

function Arrow({ x, y, dir, color }: { x: number; y: number; dir: "up" | "down"; color: string }) {
  const d = dir === "down"
    ? `M ${x} ${y} L ${x - 4} ${y - 7} M ${x} ${y} L ${x + 4} ${y - 7}`
    : `M ${x} ${y} L ${x - 4} ${y + 7} M ${x} ${y} L ${x + 4} ${y + 7}`;
  return <><line x1={x} y1={dir === "down" ? y - 14 : y + 14} x2={x} y2={y} stroke={color} strokeWidth={1.5} /><path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" /></>;
}

function Label({ x, y, text, color = dim, anchor = "middle" }: { x: number; y: number; text: string; color?: string; anchor?: string }) {
  return <text x={x} y={y} fill={color} fontSize={7} textAnchor={anchor as any} fontFamily="monospace">{text}</text>;
}

function Candle({ x, o, c, h, l, bull }: { x: number; o: number; c: number; h: number; l: number; bull: boolean }) {
  const color = bull ? green : red;
  const top = Math.min(o, c);
  const bot = Math.max(o, c);
  return (
    <>
      <line x1={x + 6} y1={h} x2={x + 6} y2={l} stroke={color} strokeWidth={1} />
      <rect x={x} y={top} width={12} height={Math.max(bot - top, 1)} fill={bull ? `${green}33` : `${red}33`} stroke={color} strokeWidth={1} rx={1} />
    </>
  );
}

function SVGWrap({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }} xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
}

// ── Chart Pattern SVGs ────────────────────────────────────────────────────────

const HeadShouldersSVG = (
  <SVGWrap>
    <DashLine x1={30} y1={58} x2={175} y2={52} />
    <PriceLine color="#a1a1aa" points={[[10,75],[30,50],[50,58],[70,28],[90,58],[110,42],[130,58],[155,75]]} />
    <Label x={30} y={46} text="L.Shoulder" color={dim} />
    <Label x={70} y={23} text="Head" color={dim} />
    <Label x={113} y={37} text="R.Shoulder" color={dim} />
    <Label x={95} y={68} text="Neckline" color={dim} />
    <Arrow x={148} y={80} dir="down" color={red} />
  </SVGWrap>
);

const InverseHeadShouldersSVG = (
  <SVGWrap>
    <DashLine x1={30} y1={32} x2={175} y2={38} />
    <PriceLine color="#a1a1aa" points={[[10,18],[30,42],[50,35],[70,66],[90,35],[110,50],[130,35],[155,18]]} />
    <Label x={30} y={56} text="L.Shoulder" color={dim} />
    <Label x={70} y={78} text="Head" color={dim} />
    <Label x={113} y={64} text="R.Shoulder" color={dim} />
    <Label x={95} y={27} text="Neckline" color={dim} />
    <Arrow x={148} y={8} dir="up" color={green} />
  </SVGWrap>
);

const DoubleTopSVG = (
  <SVGWrap>
    <DashLine x1={40} y1={62} x2={160} y2={62} />
    <PriceLine color="#a1a1aa" points={[[10,75],[40,28],[70,62],[100,28],[130,62],[160,82]]} />
    <Label x={40} y={22} text="Top 1" color={dim} />
    <Label x={100} y={22} text="Top 2" color={dim} />
    <Label x={105} y={72} text="Neckline" color={dim} />
    <Arrow x={152} y={83} dir="down" color={red} />
  </SVGWrap>
);

const DoubleBottomSVG = (
  <SVGWrap>
    <DashLine x1={40} y1={30} x2={160} y2={30} />
    <PriceLine color="#a1a1aa" points={[[10,18],[40,65],[70,30],[100,65],[130,30],[158,12]]} />
    <Label x={40} y={78} text="Bot 1" color={dim} />
    <Label x={100} y={78} text="Bot 2" color={dim} />
    <Label x={105} y={22} text="Neckline" color={dim} />
    <Arrow x={150} y={8} dir="up" color={green} />
  </SVGWrap>
);

const AscendingTriangleSVG = (
  <SVGWrap>
    <DashLine x1={20} y1={30} x2={155} y2={30} />
    <PriceLine color="#a1a1aa" points={[[20,75],[40,30],[55,60],[75,30],[90,50],[110,30],[125,42],[148,30]]} />
    <PriceLine color={dim} points={[[20,75],[148,30]]} />
    <Arrow x={160} y={20} dir="up" color={green} />
    <Label x={85} y={85} text="Rising Support" color={dim} />
    <Label x={85} y={22} text="Flat Resistance" color={dim} />
  </SVGWrap>
);

const DescendingTriangleSVG = (
  <SVGWrap>
    <DashLine x1={20} y1={62} x2={155} y2={62} />
    <PriceLine color="#a1a1aa" points={[[20,18],[40,62],[55,32],[75,62],[90,42],[110,62],[125,50],[148,62]]} />
    <PriceLine color={dim} points={[[20,18],[148,62]]} />
    <Arrow x={160} y={72} dir="down" color={red} />
    <Label x={85} y={22} text="Falling Resistance" color={dim} />
    <Label x={85} y={75} text="Flat Support" color={dim} />
  </SVGWrap>
);

const SymmetricTriangleSVG = (
  <SVGWrap>
    <PriceLine color="#a1a1aa" points={[[20,15],[40,55],[60,25],[80,50],[100,32],[120,46],[140,38]]} />
    <PriceLine color={dim} points={[[20,15],[140,38]]} />
    <PriceLine color={dim} points={[[20,70],[140,45]]} />
    <PriceLine color="#a1a1aa" points={[[20,70],[40,45],[60,62],[80,48],[100,58],[120,48],[140,42]]} />
    <Arrow x={160} y={30} dir="up" color={green} />
    <Label x={155} y={52} text="or" color={dim} />
    <Arrow x={160} y={65} dir="down" color={red} />
  </SVGWrap>
);

const BullFlagSVG = (
  <SVGWrap>
    <PriceLine color={green} points={[[10,75],[50,20]]} />
    <PriceLine color="#a1a1aa" points={[[50,20],[65,30],[75,22],[90,32],[100,24],[115,34]]} />
    <PriceLine color={dim} points={[[50,20],[115,34]]} />
    <PriceLine color={dim} points={[[50,30],[115,44]]} />
    <Arrow x={140} y={10} dir="up" color={green} />
    <Label x={30} y={55} text="Flagpole" color={dim} />
    <Label x={83} y={52} text="Flag" color={dim} />
  </SVGWrap>
);

const BearFlagSVG = (
  <SVGWrap>
    <PriceLine color={red} points={[[10,15],[50,70]]} />
    <PriceLine color="#a1a1aa" points={[[50,70],[65,60],[75,68],[90,58],[100,66],[115,56]]} />
    <PriceLine color={dim} points={[[50,70],[115,56]]} />
    <PriceLine color={dim} points={[[50,60],[115,46]]} />
    <Arrow x={140} y={82} dir="down" color={red} />
    <Label x={30} y={42} text="Flagpole" color={dim} />
    <Label x={83} y={42} text="Flag" color={dim} />
  </SVGWrap>
);

const RisingWedgeSVG = (
  <SVGWrap>
    <PriceLine color="#a1a1aa" points={[[15,70],[40,45],[60,52],[80,30],[100,38],[120,22],[138,28]]} />
    <PriceLine color={dim} points={[[15,70],[138,28]]} />
    <PriceLine color="#a1a1aa" points={[[15,82],[40,62],[60,68],[80,50],[100,58],[120,44],[138,50]]} />
    <PriceLine color={dim} points={[[15,82],[138,50]]} />
    <Arrow x={160} y={75} dir="down" color={red} />
    <Label x={80} y={88} text="Both lines rising → Bearish" color={dim} />
  </SVGWrap>
);

const FallingWedgeSVG = (
  <SVGWrap>
    <PriceLine color="#a1a1aa" points={[[15,15],[40,38],[60,30],[80,52],[100,42],[120,60],[138,52]]} />
    <PriceLine color={dim} points={[[15,15],[138,52]]} />
    <PriceLine color="#a1a1aa" points={[[15,28],[40,52],[60,44],[80,64],[100,56],[120,72],[138,65]]} />
    <PriceLine color={dim} points={[[15,28],[138,65]]} />
    <Arrow x={160} y={30} dir="up" color={green} />
    <Label x={80} y={88} text="Both lines falling → Bullish" color={dim} />
  </SVGWrap>
);

// ── Candle Pattern SVGs ───────────────────────────────────────────────────────

const HammerSVG = (
  <SVGWrap>
    {/* Context candles */}
    <Candle x={20} o={30} c={40} h={28} l={42} bull={false} />
    <Candle x={40} o={35} c={48} h={33} l={50} bull={false} />
    <Candle x={60} o={40} c={52} h={38} l={54} bull={false} />
    {/* Hammer */}
    <Candle x={90} o={48} c={52} h={46} l={78} bull={true} />
    <Label x={96} y={88} text="Hammer" color={green} />
    <Arrow x={110} y={35} dir="up" color={green} />
    <Label x={140} y={55} text="Long lower" color={dim} />
    <Label x={140} y={63} text="wick = demand" color={dim} />
  </SVGWrap>
);

const ShootingStarSVG = (
  <SVGWrap>
    {/* Context candles going up */}
    <Candle x={20} o={60} c={50} h={58} l={62} bull={true} />
    <Candle x={40} o={50} c={40} h={48} l={52} bull={true} />
    <Candle x={60} o={40} c={30} h={38} l={42} bull={true} />
    {/* Shooting star */}
    <Candle x={90} o={32} c={36} h={10} l={38} bull={false} />
    <Label x={96} y={88} text="Shooting Star" color={red} />
    <Arrow x={110} y={55} dir="down" color={red} />
    <Label x={140} y={40} text="Long upper" color={dim} />
    <Label x={140} y={48} text="wick = rejection" color={dim} />
  </SVGWrap>
);

const DojiSVG = (
  <SVGWrap>
    {/* Standard Doji */}
    <line x1={36} y1={15} x2={36} y2={75} stroke="#a1a1aa" strokeWidth={1} />
    <line x1={30} y1={45} x2={42} y2={45} stroke="#a1a1aa" strokeWidth={2} />
    <Label x={36} y={84} text="Standard" color={dim} />
    {/* Gravestone */}
    <line x1={96} y1={15} x2={96} y2={50} stroke="#a1a1aa" strokeWidth={1} />
    <line x1={90} y1={48} x2={102} y2={48} stroke={red} strokeWidth={2} />
    <Label x={96} y={84} text="Gravestone" color={red} />
    {/* Dragonfly */}
    <line x1={156} y1={42} x2={156} y2={78} stroke="#a1a1aa" strokeWidth={1} />
    <line x1={150} y1={42} x2={162} y2={42} stroke={green} strokeWidth={2} />
    <Label x={156} y={84} text="Dragonfly" color={green} />
  </SVGWrap>
);

const BullishEngulfingSVG = (
  <SVGWrap>
    {/* Bearish candle */}
    <Candle x={60} o={30} c={58} h={26} l={62} bull={false} />
    {/* Engulfing bullish */}
    <Candle x={82} o={62} c={22} h={64} l={20} bull={true} />
    <Arrow x={108} y={20} dir="up" color={green} />
    <Label x={60} y={88} text="Small bearish" color={dim} />
    <Label x={90} y={88} text="Engulfs →" color={green} />
  </SVGWrap>
);

const BearishEngulfingSVG = (
  <SVGWrap>
    {/* Bullish candle */}
    <Candle x={60} o={58} c={30} h={62} l={26} bull={true} />
    {/* Engulfing bearish */}
    <Candle x={82} o={22} c={62} h={20} l={64} bull={false} />
    <Arrow x={108} y={72} dir="down" color={red} />
    <Label x={60} y={88} text="Small bullish" color={dim} />
    <Label x={90} y={88} text="Engulfs →" color={red} />
  </SVGWrap>
);

const PinBarBullishSVG = (
  <SVGWrap>
    {/* Pin bar bullish */}
    <Candle x={70} o={32} c={36} h={30} l={80} bull={true} />
    <line x1={60} y1={80} x2={95} y2={80} stroke={green} strokeWidth={1} strokeDasharray="3 2" />
    <Label x={76} y={88} text="Bullish Pin Bar" color={green} />
    <Arrow x={100} y={20} dir="up" color={green} />
    <Label x={125} y={50} text="Long lower" color={dim} />
    <Label x={125} y={58} text="wick → SL" color={dim} />
    <Label x={125} y={66} text="below wick" color={dim} />
  </SVGWrap>
);

const PinBarBearishSVG = (
  <SVGWrap>
    <Candle x={70} o={60} c={56} h={18} l={62} bull={false} />
    <line x1={60} y1={18} x2={95} y2={18} stroke={red} strokeWidth={1} strokeDasharray="3 2" />
    <Label x={76} y={88} text="Bearish Pin Bar" color={red} />
    <Arrow x={100} y={72} dir="down" color={red} />
    <Label x={125} y={38} text="Long upper" color={dim} />
    <Label x={125} y={46} text="wick → SL" color={dim} />
    <Label x={125} y={54} text="above wick" color={dim} />
  </SVGWrap>
);

const MorningStarSVG = (
  <SVGWrap>
    <Candle x={30} o={25} c={55} h={22} l={58} bull={false} />
    <Candle x={56} o={58} c={62} h={56} l={64} bull={false} />
    <Candle x={82} o={60} c={28} h={58} l={26} bull={true} />
    <Label x={36} y={88} text="Bearish" color={dim} />
    <Label x={62} y={88} text="Doji" color={dim} />
    <Label x={88} y={88} text="Bullish" color={green} />
    <Arrow x={130} y={18} dir="up" color={green} />
    <Label x={150} y={40} text="Morning" color={green} />
    <Label x={150} y={48} text="Star" color={green} />
  </SVGWrap>
);

const EveningStarSVG = (
  <SVGWrap>
    <Candle x={30} o={60} c={30} h={62} l={28} bull={true} />
    <Candle x={56} o={28} c={24} h={26} l={30} bull={true} />
    <Candle x={82} o={26} c={58} h={24} l={60} bull={false} />
    <Label x={36} y={88} text="Bullish" color={dim} />
    <Label x={62} y={88} text="Doji" color={dim} />
    <Label x={88} y={88} text="Bearish" color={red} />
    <Arrow x={130} y={72} dir="down" color={red} />
    <Label x={150} y={38} text="Evening" color={red} />
    <Label x={150} y={46} text="Star" color={red} />
  </SVGWrap>
);

const InsideBarSVG = (
  <SVGWrap>
    {/* Mother bar */}
    <Candle x={55} o={25} c={68} h={20} l={72} bull={true} />
    {/* Inside bar */}
    <Candle x={80} o={40} c={55} h={36} l={58} bull={false} />
    <line x1={77} y1={20} x2={77} y2={72} stroke={dim} strokeWidth={0.8} strokeDasharray="2 2" />
    <line x1={100} y1={20} x2={100} y2={72} stroke={dim} strokeWidth={0.8} strokeDasharray="2 2" />
    <Label x={61} y={88} text="Mother Bar" color={dim} />
    <Label x={88} y={88} text="Inside" color={amber} />
    <Label x={140} y={44} text="Compressed" color={dim} />
    <Label x={140} y={52} text="→ Breakout" color={amber} />
  </SVGWrap>
);

// ── Market Structure SVGs ─────────────────────────────────────────────────────

const BOSSVG = (
  <SVGWrap>
    {/* Uptrend structure */}
    <PriceLine color="#a1a1aa" points={[[10,70],[30,50],[45,60],[65,35],[80,45],[100,20],[115,30]]} />
    <DashLine x1={65} y1={35} x2={130} y2={35} />
    <Label x={105} y={32} text="BOS" color={green} />
    <Arrow x={105} y={18} dir="up" color={green} />
    <Label x={55} y={80} text="HH" color={green} />
    <Label x={75} y={55} text="HL" color={green} />
    <Label x={100} y={28} text="HH" color={green} />
  </SVGWrap>
);

const CHOCHSVG = (
  <SVGWrap>
    <PriceLine color="#a1a1aa" points={[[10,60],[25,40],[40,50],[58,22],[72,35]]} />
    <PriceLine color={amber} points={[[72,35],[90,55],[105,28],[120,70]]} />
    <DashLine x1={40} y1={50} x2={130} y2={50} />
    <Label x={95} y={48} text="CHOCH" color={amber} />
    <Arrow x={115} y={75} dir="down" color={red} />
    <Label x={60} y={18} text="Was uptrend" color={dim} />
    <Label x={100} y={82} text="Now bearish" color={red} />
  </SVGWrap>
);

const SupportResistanceSVG = (
  <SVGWrap>
    <DashLine x1={10} y1={25} x2={190} y2={25} color={red} />
    <DashLine x1={10} y1={68} x2={190} y2={68} color={green} />
    <PriceLine color="#a1a1aa" points={[[10,68],[25,40],[35,68],[50,30],[60,68],[80,20],[95,68],[115,55],[130,68],[150,45],[165,68],[178,30]]} />
    <Label x={12} y={21} text="Resistance" color={red} anchor="start" />
    <Label x={12} y={78} text="Support" color={green} anchor="start" />
  </SVGWrap>
);

const OrderBlockSVG = (
  <SVGWrap>
    {/* Order block zone */}
    <rect x={45} y={48} width={25} height={16} fill={`${green}22`} stroke={green} strokeWidth={0.8} strokeDasharray="2 2" rx={1} />
    <PriceLine color="#a1a1aa" points={[[10,65],[30,55],[45,56],[70,48],[95,20],[115,25]]} />
    <PriceLine color="#a1a1aa" points={[[95,20],[115,55],[130,56]]} />
    <Arrow x={128} y={58} dir="down" color={green} />
    <Label x={58} y={76} text="OB Zone" color={green} />
    <Label x={100} y={18} text="BOS" color={green} />
    <DashLine x1={70} y1={48} x2={70} y2={15} />
  </SVGWrap>
);

const FVGSVG = (
  <SVGWrap>
    {/* Three candles with gap */}
    <Candle x={50} o={50} c={62} h={48} l={64} bull={true} />
    <Candle x={76} o={38} c={22} h={35} l={24} bull={true} />
    <Candle x={102} o={30} c={20} h={28} l={22} bull={true} />
    {/* FVG zone */}
    <rect x={64} y={35} width={12} height={13} fill={`${green}33`} stroke={green} strokeWidth={0.8} strokeDasharray="2 2" />
    <line x1={64} y1={35} x2={76} y2={35} stroke={green} strokeWidth={0.8} />
    <line x1={64} y1={48} x2={76} y2={48} stroke={green} strokeWidth={0.8} />
    <Label x={75} y={82} text="FVG" color={green} />
    <Arrow x={75} y={25} dir="up" color={green} />
    <Label x={130} y={40} text="Candle 1 Hi" color={dim} />
    <Label x={130} y={48} text="Candle 3 Lo" color={dim} />
    <Label x={130} y={56} text="= FVG gap" color={green} />
  </SVGWrap>
);

const LiquiditySVG = (
  <SVGWrap>
    <DashLine x1={10} y1={20} x2={140} y2={20} color={red} />
    <DashLine x1={10} y1={72} x2={140} y2={72} color={green} />
    <PriceLine color="#a1a1aa" points={[[10,45],[35,22],[40,32],[60,45],[75,70],[80,60],[100,45]]} />
    <PriceLine color={amber} points={[[100,45],[120,16],[125,30],[145,55]]} />
    <Label x={75} y={15} text="BSL (Stop Hunt)" color={red} />
    <Label x={75} y={82} text="SSL (Stop Hunt)" color={green} />
    <Label x={115} y={12} text="Sweep" color={amber} />
    <Arrow x={120} y={30} dir="down" color={amber} />
  </SVGWrap>
);

// ── All patterns array ────────────────────────────────────────────────────────

const PATTERNS: PatternDef[] = [
  // Chart patterns
  {
    id: "head-shoulders", title: "Head & Shoulders", type: "chart", bias: "bearish", svg: HeadShouldersSVG,
    bullets: ["Bearish reversal after an uptrend", "Three peaks — middle is the highest", "Neckline break confirms the signal", "Stop loss placed above right shoulder"],
  },
  {
    id: "inv-head-shoulders", title: "Inverse Head & Shoulders", type: "chart", bias: "bullish", svg: InverseHeadShouldersSVG,
    bullets: ["Bullish reversal after a downtrend", "Three troughs — middle is the lowest", "Neckline break is the entry signal", "Stop loss placed below right shoulder"],
  },
  {
    id: "double-top", title: "Double Top", type: "chart", bias: "bearish", svg: DoubleTopSVG,
    bullets: ["Bearish reversal pattern", "Two peaks at the same resistance level", "Neckline break confirms the signal", "Stop loss placed above both tops"],
  },
  {
    id: "double-bottom", title: "Double Bottom", type: "chart", bias: "bullish", svg: DoubleBottomSVG,
    bullets: ["Bullish reversal pattern", "Two troughs at the same support level", "Neckline breakout is the entry", "Stop loss placed below both bottoms"],
  },
  {
    id: "ascending-triangle", title: "Ascending Triangle", type: "chart", bias: "bullish", svg: AscendingTriangleSVG,
    bullets: ["Bullish continuation pattern", "Flat resistance + rising support", "Buyers getting more aggressive", "Enter on breakout above flat top"],
  },
  {
    id: "descending-triangle", title: "Descending Triangle", type: "chart", bias: "bearish", svg: DescendingTriangleSVG,
    bullets: ["Bearish continuation pattern", "Flat support + falling resistance", "Sellers getting more aggressive", "Enter on breakdown below flat bottom"],
  },
  {
    id: "symmetrical-triangle", title: "Symmetrical Triangle", type: "chart", bias: "neutral", svg: SymmetricTriangleSVG,
    bullets: ["No directional bias until breakout", "Lower highs + higher lows converging", "Wait for confirmed breakout direction", "Volume contracts then expands on break"],
  },
  {
    id: "bull-flag", title: "Bull Flag", type: "chart", bias: "bullish", svg: BullFlagSVG,
    bullets: ["Bullish continuation pattern", "Strong move up = flagpole", "Brief pullback in a channel = flag", "Target: flagpole length from breakout"],
  },
  {
    id: "bear-flag", title: "Bear Flag", type: "chart", bias: "bearish", svg: BearFlagSVG,
    bullets: ["Bearish continuation pattern", "Strong move down = flagpole", "Brief bounce in channel = flag", "Target: flagpole length from breakout"],
  },
  {
    id: "rising-wedge", title: "Rising Wedge", type: "chart", bias: "bearish", svg: RisingWedgeSVG,
    bullets: ["Bearish reversal or continuation", "Both trendlines slope upward", "Momentum weakening as it rises", "Break below lower line = short entry"],
  },
  {
    id: "falling-wedge", title: "Falling Wedge", type: "chart", bias: "bullish", svg: FallingWedgeSVG,
    bullets: ["Bullish reversal or continuation", "Both trendlines slope downward", "Selling pressure losing strength", "Break above upper line = long entry"],
  },
  // Candle patterns
  {
    id: "hammer", title: "Hammer", type: "candle", bias: "bullish", svg: HammerSVG,
    bullets: ["Bullish reversal after a downtrend", "Long lower wick = strong demand below", "Small body near the top of the candle", "Confirm with the next bullish candle"],
  },
  {
    id: "shooting-star", title: "Shooting Star", type: "candle", bias: "bearish", svg: ShootingStarSVG,
    bullets: ["Bearish reversal after an uptrend", "Long upper wick = sellers rejected price", "Small body near the bottom of the candle", "Confirm with the next bearish candle"],
  },
  {
    id: "doji", title: "Doji", type: "candle", bias: "neutral", svg: DojiSVG,
    bullets: ["Indecision — buyers and sellers equal", "Gravestone = bearish at resistance", "Dragonfly = bullish at support", "Always confirm with the next candle"],
  },
  {
    id: "bullish-engulfing", title: "Bullish Engulfing", type: "candle", bias: "bullish", svg: BullishEngulfingSVG,
    bullets: ["Two-candle bullish reversal signal", "Green candle fully engulfs the red candle", "Appears after a downtrend", "Higher volume strengthens the signal"],
  },
  {
    id: "bearish-engulfing", title: "Bearish Engulfing", type: "candle", bias: "bearish", svg: BearishEngulfingSVG,
    bullets: ["Two-candle bearish reversal signal", "Red candle fully engulfs the green candle", "Appears after an uptrend", "Higher volume strengthens the signal"],
  },
  {
    id: "pin-bar-bull", title: "Bullish Pin Bar", type: "candle", bias: "bullish", svg: PinBarBullishSVG,
    bullets: ["Long lower wick shows price rejection", "Small body near the top", "Best at key S/R or Fibonacci levels", "Stop loss below the tip of the wick"],
  },
  {
    id: "pin-bar-bear", title: "Bearish Pin Bar", type: "candle", bias: "bearish", svg: PinBarBearishSVG,
    bullets: ["Long upper wick shows price rejection", "Small body near the bottom", "Best at key S/R or Fibonacci levels", "Stop loss above the tip of the wick"],
  },
  {
    id: "morning-star", title: "Morning Star", type: "candle", bias: "bullish", svg: MorningStarSVG,
    bullets: ["Three-candle bullish reversal", "Large bearish → small Doji → large bullish", "Appears after a downtrend", "Third candle closes 50%+ into first"],
  },
  {
    id: "evening-star", title: "Evening Star", type: "candle", bias: "bearish", svg: EveningStarSVG,
    bullets: ["Three-candle bearish reversal", "Large bullish → small Doji → large bearish", "Appears after an uptrend", "Third candle closes 50%+ into first"],
  },
  {
    id: "inside-bar", title: "Inside Bar", type: "candle", bias: "neutral", svg: InsideBarSVG,
    bullets: ["Mother bar contains the inside bar fully", "Signals consolidation and indecision", "Breakout of mother bar = next direction", "Trade the breakout side with the trend"],
  },
  // Market structure
  {
    id: "bos", title: "Break of Structure (BOS)", type: "structure", bias: "bullish", svg: BOSSVG,
    bullets: ["Confirms trend continuation", "In uptrend: price breaks above prev HH", "In downtrend: price breaks below prev LL", "Enter on retest after the break"],
  },
  {
    id: "choch", title: "Change of Character (CHOCH)", type: "structure", bias: "neutral", svg: CHOCHSVG,
    bullets: ["Signals potential trend reversal", "In uptrend: price breaks below recent HL", "First sign the trend may be shifting", "Watch for new lower highs to confirm"],
  },
  {
    id: "support-resistance", title: "Support & Resistance", type: "structure", bias: "neutral", svg: SupportResistanceSVG,
    bullets: ["Key levels where price historically reacts", "More touches = stronger the level", "Role reversal: broken S becomes R and vice versa", "Higher timeframe levels carry more weight"],
  },
  {
    id: "order-block", title: "Order Block", type: "structure", bias: "bullish", svg: OrderBlockSVG,
    bullets: ["Last opposing candle before a strong move", "Represents institutional order placement", "Price tends to return to fill the OB", "Enter on OB retest with confirmation"],
  },
  {
    id: "fvg", title: "Fair Value Gap (FVG)", type: "structure", bias: "bullish", svg: FVGSVG,
    bullets: ["Price imbalance from a fast impulsive move", "Candle 1 high doesn't overlap candle 3 low", "Market tends to return to fill the gap", "FVG + Order Block = high confluence entry"],
  },
  {
    id: "liquidity", title: "Liquidity Sweep", type: "structure", bias: "neutral", svg: LiquiditySVG,
    bullets: ["Stop losses cluster above swing highs (BSL)", "Stop losses cluster below swing lows (SSL)", "Institutions sweep liquidity then reverse", "Wick through a level + sharp reversal = entry"],
  },
];

// ── Pattern card ──────────────────────────────────────────────────────────────

const BIAS_BADGE: Record<Bias, { label: string; cls: string }> = {
  bullish: { label: "BULLISH", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  bearish: { label: "BEARISH", cls: "bg-red-500/15 text-red-400 border-red-500/25" },
  neutral: { label: "NEUTRAL", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25" },
};

const TYPE_BADGE: Record<PatternType, string> = {
  chart: "CHART PATTERN",
  candle: "CANDLE PATTERN",
  structure: "MARKET STRUCTURE",
};

function PatternCard({ p }: { p: PatternDef }) {
  const [open, setOpen] = useState(false);
  const badge = BIAS_BADGE[p.bias];
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden bg-white/[0.02]">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between px-3 pt-3 pb-2">
          <p className="text-[13px] font-bold text-zinc-100 leading-tight pr-2">{p.title}</p>
          <span className={cn("text-[8px] font-bold tracking-wider px-1.5 py-[3px] rounded border shrink-0 flex items-center gap-1", badge.cls)}>
            <span className={cn("w-[5px] h-[5px] rounded-full shrink-0", p.bias === "bullish" ? "bg-emerald-400" : p.bias === "bearish" ? "bg-red-400" : "bg-zinc-400")} />
            {badge.label}
          </span>
        </div>
        <div className="px-3 pb-2">
          <span className="text-[8px] font-bold tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-[2px] rounded">
            {TYPE_BADGE[p.type]}
          </span>
        </div>
        {/* SVG diagram */}
        <div className="mx-2 mb-2 rounded-lg border border-white/[0.06] bg-black/20 px-1 py-1">
          {p.svg}
        </div>
      </button>

      {/* Bullets — always visible on tap, toggle */}
      <button onClick={() => setOpen(v => !v)} className="w-full px-3 pb-2 text-left">
        <div className="flex items-center gap-1 mb-1">
          <ChevronRight className={cn("h-3 w-3 text-zinc-600 transition-transform", open && "rotate-90")} />
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider">{open ? "Hide" : "Details"}</span>
        </div>
        {open && (
          <ul className="space-y-1 mt-1">
            {p.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-zinc-600 mt-[3px] shrink-0">›</span>
                <span className="text-[11px] text-zinc-300 leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        )}
      </button>
    </div>
  );
}

// ── Topics tab (existing text-based content) ──────────────────────────────────

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[-| ]+\|$/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) { tableLines.push(lines[i]); i++; }
      const headers = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim());
      const rows = tableLines.slice(2).map(row => row.split("|").filter(c => c.trim()).map(c => c.trim()));
      elements.push(
        <div key={`t${i}`} className="overflow-x-auto my-2.5">
          <table className="w-full text-[11px] border-collapse">
            <thead><tr className="border-b border-[hsl(var(--border))]">{headers.map((h, idx) => <th key={idx} className="text-left py-1.5 px-2 text-[hsl(var(--muted-foreground))] font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{rows.map((row, rIdx) => <tr key={rIdx} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30">{row.map((cell, cIdx) => <td key={cIdx} className="py-1.5 px-2 text-[hsl(var(--foreground))]/80">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (line === "") { i++; continue; }
    if (line.startsWith("## ")) {
      elements.push(<p key={`h${i}`} className="text-[12px] font-bold text-[hsl(var(--foreground))] mt-3 mb-1">{line.slice(3)}</p>);
      i++; continue;
    }
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const parsed = parts.map((p, pi) => p.startsWith("**") && p.endsWith("**")
      ? <strong key={pi} className="font-semibold text-[hsl(var(--foreground))]">{p.slice(2, -2)}</strong>
      : p);
    elements.push(<p key={`p${i}`} className="text-[12px] text-[hsl(var(--foreground))]/80 leading-relaxed">{parsed}</p>);
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}

function ItemCard({ item }: { item: KnowledgeItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[hsl(var(--secondary))]/50 transition-colors">
        <span className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]">{expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-[hsl(var(--foreground))] leading-tight">{item.title}</p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-snug">{item.summary}</p>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/40">
          {renderContent(item.content)}
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, defaultOpen }: { category: KnowledgeCategory; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[hsl(var(--secondary))]/60 transition-colors">
        {(() => { const Icon = ICON_MAP[category.icon] ?? BookOpen; return <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />; })()}
        <span className="flex-1 text-left text-[13px] font-semibold text-[hsl(var(--foreground))]">{category.label}</span>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] mr-1">{category.items.length}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" /> : <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />}
      </button>
      {open && (
        <div className="mt-1 mb-2 ml-2 space-y-1.5">
          {category.items.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ── Main exported content component ──────────────────────────────────────────

type Tab = "patterns" | "topics";
type FilterType = "all" | PatternType;

export function TradingKnowledgeContent() {
  const [tab, setTab] = useState<Tab>("patterns");
  const [filter, setFilter] = useState<FilterType>("all");
  const [query, setQuery] = useState("");

  const filteredPatterns = useMemo(() => {
    let list = PATTERNS;
    if (filter !== "all") list = list.filter(p => p.type === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.bullets.some(b => b.toLowerCase().includes(q)));
    }
    return list;
  }, [filter, query]);

  const topicSearchResults = useMemo(() => {
    if (tab !== "topics") return null;
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const results: Array<{ category: KnowledgeCategory; item: KnowledgeItem }> = [];
    for (const cat of TRADING_KNOWLEDGE) {
      for (const item of cat.items) {
        if (item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.tags?.some(t => t.includes(q))) {
          results.push({ category: cat, item });
        }
      }
    }
    return results;
  }, [query, tab]);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all",       label: `All ${PATTERNS.length}` },
    { key: "chart",     label: `Chart ${PATTERNS.filter(p => p.type === "chart").length}` },
    { key: "candle",    label: `Candle ${PATTERNS.filter(p => p.type === "candle").length}` },
    { key: "structure", label: `Structure ${PATTERNS.filter(p => p.type === "structure").length}` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))] shrink-0">
        {(["patterns", "topics"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setQuery(""); setFilter("all"); }}
            className={cn(
              "flex-1 py-2.5 text-[12px] font-semibold tracking-wide capitalize transition-colors",
              tab === t
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] -mb-px"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[hsl(var(--border))] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === "patterns" ? "Search patterns…" : "Search topics, indicators…"}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-8 pr-3 py-1.5 text-[12px] text-[hsl(var(--foreground))] placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]/50 transition-colors"
          />
        </div>
      </div>

      {/* Patterns tab */}
      {tab === "patterns" && (
        <>
          {/* Filter chips */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0 scrollbar-none">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide border transition-colors whitespace-nowrap",
                  filter === f.key
                    ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30"
                    : "bg-white/[0.03] text-zinc-500 border-white/[0.06] hover:text-zinc-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
            {filteredPatterns.length === 0
              ? <div className="flex flex-col items-center justify-center py-16 gap-2"><Search className="h-8 w-8 text-zinc-700" /><p className="text-[12px] text-zinc-600">No patterns found</p></div>
              : filteredPatterns.map(p => <PatternCard key={p.id} p={p} />)
            }
          </div>
        </>
      )}

      {/* Topics tab */}
      {tab === "topics" && (
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {topicSearchResults !== null ? (
            topicSearchResults.length === 0
              ? <div className="flex flex-col items-center justify-center py-16 gap-2"><Search className="h-8 w-8 text-zinc-700" /><p className="text-[12px] text-zinc-600">No results for &ldquo;{query}&rdquo;</p></div>
              : (
                <div className="space-y-1.5 px-1">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-2 py-1">{topicSearchResults.length} result{topicSearchResults.length !== 1 ? "s" : ""}</p>
                  {topicSearchResults.map(({ category, item }) => (
                    <div key={item.id}>
                      <p className="text-[10px] text-zinc-600 px-2 mb-1">{(() => { const Icon = ICON_MAP[category.icon] ?? BookOpen; return <><Icon className="inline h-3 w-3 mr-1 text-zinc-500" />{category.label}</>; })()}</p>
                      <ItemCard item={item} />
                    </div>
                  ))}
                </div>
              )
          ) : (
            TRADING_KNOWLEDGE.map((cat, idx) => <CategorySection key={cat.id} category={cat} defaultOpen={idx === 0} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── Sidebar shell ─────────────────────────────────────────────────────────────

export function TradingKnowledgeSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn("fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
        onClick={onClose}
      />
      <aside className={cn(
        "fixed right-0 top-0 z-[50] flex h-screen w-[380px] max-w-[calc(100vw-60px)] flex-col",
        "border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center gap-2.5 border-b border-[hsl(var(--border))] px-4 py-3 shrink-0">
          <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[hsl(var(--foreground))] leading-tight">Trading Knowledge</p>
            <p className="text-[10px] text-zinc-500">{PATTERNS.length} patterns · {TRADING_KNOWLEDGE.reduce((n, c) => n + c.items.length, 0)} topics · Basics to SMC</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-[hsl(var(--secondary))] hover:text-zinc-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <TradingKnowledgeContent />
        </div>
      </aside>
    </>
  );
}
