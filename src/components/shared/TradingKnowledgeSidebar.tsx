"use client";

import React, { useState, useMemo, useEffect } from "react";
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

// ── Types ─────────────────────────────────────────────────────────────────────
type Bias = "bullish" | "bearish" | "neutral";
type PatternType = "chart" | "candle" | "structure";
interface PatternDef { id: string; title: string; type: PatternType; bias: Bias; svg: React.ReactNode; bullets: string[]; }

// ── SVG design system ─────────────────────────────────────────────────────────
const VW = 280;
const VH = 140;
const G  = "#22c55e";   // green
const R  = "#ef4444";   // red
const AM = "#f59e0b";   // amber
const DM = "#71717a";   // dim label
const LN = "#e4e4e7";   // price line

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: VH }} xmlns="http://www.w3.org/2000/svg">
      {/* grid */}
      {[35, 70, 105].map(y => (
        <line key={y} x1={0} y1={y} x2={VW} y2={y} stroke="#27272a" strokeWidth={1} />
      ))}
      {children}
    </svg>
  );
}

// Smooth price line via bezier curves
function Line({ pts, color = LN, w = 2 }: { pts: [number,number][]; color?: string; w?: number }) {
  if (pts.length < 2) return null;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mx = (px + cx) / 2;
    d += ` C ${mx} ${py} ${mx} ${cy} ${cx} ${cy}`;
  }
  return <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />;
}

// Filled area beneath/above a price line
function Fill({ pts, color, base = VH, opacity = 0.12 }: { pts: [number,number][]; color: string; base?: number; opacity?: number }) {
  const area = [...pts, [pts[pts.length-1][0], base], [pts[0][0], base]];
  let d = `M ${area[0][0]} ${area[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i-1]; const [cx, cy] = pts[i];
    const mx = (px+cx)/2;
    d += ` C ${mx} ${py} ${mx} ${cy} ${cx} ${cy}`;
  }
  for (let i = pts.length; i < area.length; i++) d += ` L ${area[i][0]} ${area[i][1]}`;
  d += " Z";
  return <path d={d} fill={color} fillOpacity={opacity} />;
}

function Dash({ x1,y1,x2,y2, color=DM }: { x1:number;y1:number;x2:number;y2:number;color?:string }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} strokeDasharray="4 3" />;
}

function Lbl({ x, y, text, color=DM, anchor="middle", size=8 }: { x:number;y:number;text:string;color?:string;anchor?:string;size?:number }) {
  const w = text.length * size * 0.55 + 6;
  return (
    <>
      <rect x={x - w/2} y={y - size - 1} width={w} height={size + 4} fill="rgba(9,9,11,0.75)" rx={2} />
      <text x={x} y={y} fill={color} fontSize={size} textAnchor={anchor as any} fontFamily="ui-monospace,monospace" fontWeight="600">{text}</text>
    </>
  );
}

function ArrowDown({ x, y, color }: { x:number;y:number;color:string }) {
  return (
    <g>
      <line x1={x} y1={y-22} x2={x} y2={y} stroke={color} strokeWidth={2} />
      <polygon points={`${x},${y} ${x-5},${y-8} ${x+5},${y-8}`} fill={color} />
    </g>
  );
}
function ArrowUp({ x, y, color }: { x:number;y:number;color:string }) {
  return (
    <g>
      <line x1={x} y1={y+22} x2={x} y2={y} stroke={color} strokeWidth={2} />
      <polygon points={`${x},${y} ${x-5},${y+8} ${x+5},${y+8}`} fill={color} />
    </g>
  );
}

// Candle component
function C({ x, o, c, h, l }: { x:number;o:number;c:number;h:number;l:number }) {
  const bull = c <= o;
  const col  = bull ? G : R;
  const top  = Math.min(o,c); const bot = Math.max(o,c);
  return (
    <g>
      <line x1={x+8} y1={h} x2={x+8} y2={l} stroke={col} strokeWidth={1.5} />
      <rect x={x} y={top} width={16} height={Math.max(bot-top,2)} fill={bull ? `${G}28` : `${R}28`} stroke={col} strokeWidth={1.5} rx={1} />
    </g>
  );
}

// ── Chart Pattern SVGs ────────────────────────────────────────────────────────

const svgHS = (
  <Wrap>
    {/* price path */}
    <Fill pts={[[15,120],[50,70],[80,95],[135,32],[185,95],[220,72],[255,120]]} color={R} base={VH} opacity={0.08} />
    <Line pts={[[15,120],[50,70],[80,95],[135,32],[185,95],[220,72],[255,125]]} />
    {/* neckline */}
    <Dash x1={70} y1={95} x2={258} y2={95} color={DM} />
    {/* breakdown */}
    <ArrowDown x={255} y={130} color={R} />
    {/* labels */}
    <Lbl x={50}  y={65}  text="L.Shoulder" color={DM} />
    <Lbl x={135} y={27}  text="Head"        color={DM} />
    <Lbl x={220} y={67}  text="R.Shoulder"  color={DM} />
    <Lbl x={165} y={90}  text="Neckline"    color={DM} />
    <Lbl x={258} y={118} text="SHORT"       color={R}  />
  </Wrap>
);

const svgIHS = (
  <Wrap>
    <Fill pts={[[15,22],[50,72],[80,47],[135,110],[185,47],[220,70],[258,20]]} color={G} base={0} opacity={0.08} />
    <Line pts={[[15,22],[50,72],[80,47],[135,110],[185,47],[220,70],[258,20]]} />
    <Dash x1={70} y1={47} x2={258} y2={47} color={DM} />
    <ArrowUp x={258} y={18} color={G} />
    <Lbl x={50}  y={78}  text="L.Shoulder" color={DM} />
    <Lbl x={135} y={118} text="Head"        color={DM} />
    <Lbl x={220} y={76}  text="R.Shoulder"  color={DM} />
    <Lbl x={160} y={42}  text="Neckline"    color={DM} />
    <Lbl x={258} y={14}  text="LONG"        color={G}  />
  </Wrap>
);

const svgDT = (
  <Wrap>
    <Fill pts={[[15,120],[65,35],[115,85],[165,35],[220,85],[258,125]]} color={R} base={VH} opacity={0.1} />
    <Line pts={[[15,120],[65,35],[115,85],[165,35],[220,85],[258,125]]} />
    <Dash x1={100} y1={85} x2={258} y2={85} color={DM} />
    <ArrowDown x={252} y={128} color={R} />
    <Lbl x={65}  y={29}  text="Top 1"     color={DM} />
    <Lbl x={165} y={29}  text="Top 2"     color={DM} />
    <Lbl x={185} y={80}  text="Neckline"  color={DM} />
    <Lbl x={255} y={118} text="SHORT"     color={R}  />
  </Wrap>
);

const svgDB = (
  <Wrap>
    <Fill pts={[[15,20],[65,105],[115,55],[165,105],[220,55],[258,18]]} color={G} base={0} opacity={0.1} />
    <Line pts={[[15,20],[65,105],[115,55],[165,105],[220,55],[258,18]]} />
    <Dash x1={100} y1={55} x2={258} y2={55} color={DM} />
    <ArrowUp x={252} y={15} color={G} />
    <Lbl x={65}  y={118} text="Bot 1"     color={DM} />
    <Lbl x={165} y={118} text="Bot 2"     color={DM} />
    <Lbl x={185} y={50}  text="Neckline"  color={DM} />
    <Lbl x={255} y={13}  text="LONG"      color={G}  />
  </Wrap>
);

const svgAT = (
  <Wrap>
    {/* flat resistance */}
    <Dash x1={20} y1={38} x2={220} y2={38} color={R} />
    {/* rising support */}
    <Line pts={[[20,115],[220,55]]} color={G} w={1} />
    {/* price bouncing */}
    <Line pts={[[20,115],[55,38],[80,75],[110,38],[135,60],[160,38],[185,50],[215,38]]} color={LN} />
    <ArrowUp x={238} y={28} color={G} />
    <Lbl x={120} y={33}  text="Flat Resistance"  color={R}  />
    <Lbl x={80}  y={125} text="Rising Support"   color={G}  />
    <Lbl x={240} y={22}  text="LONG"             color={G}  />
  </Wrap>
);

const svgDT2 = (
  <Wrap>
    {/* flat support */}
    <Dash x1={20} y1={102} x2={220} y2={102} color={G} />
    {/* falling resistance */}
    <Line pts={[[20,25],[220,85]]} color={R} w={1} />
    {/* price */}
    <Line pts={[[20,25],[55,102],[80,65],[110,102],[135,80],[160,102],[185,90],[215,102]]} color={LN} />
    <ArrowDown x={238} y={120} color={R} />
    <Lbl x={120} y={22}  text="Falling Resistance" color={R} />
    <Lbl x={80}  y={118} text="Flat Support"        color={G} />
    <Lbl x={240} y={112} text="SHORT"               color={R} />
  </Wrap>
);

const svgST = (
  <Wrap>
    <Line pts={[[20,22],[220,70]]}  color={R} w={1} />
    <Line pts={[[20,118],[220,70]]} color={G} w={1} />
    <Line pts={[[20,22],[55,90],[80,45],[110,80],[135,55],[160,72],[185,62],[215,70]]} color={LN} />
    <Line pts={[[20,118],[55,80],[80,110],[110,88],[135,98],[160,88],[185,92],[215,70]]} color={LN} />
    <ArrowUp   x={245} y={45} color={G} />
    <ArrowDown x={245} y={95} color={R} />
    <Lbl x={140} y={14} text="Breakout either way" color={DM} />
  </Wrap>
);

const svgBF = (
  <Wrap>
    {/* Flagpole */}
    <Line pts={[[20,120],[80,32]]} color={G} w={2.5} />
    {/* Flag channel */}
    <Line pts={[[80,32],[105,42],[120,35],[140,46],[158,39],[175,50]]}  color={LN} />
    <Dash x1={80}  y1={32} x2={178} y2={50} color={DM} />
    <Dash x1={80}  y1={52} x2={178} y2={70} color={DM} />
    <Line pts={[[80,52],[105,62],[120,55],[140,66],[158,59],[175,70]]}  color={LN} />
    {/* Continuation */}
    <Line pts={[[175,50],[210,15]]} color={G} w={2} />
    <ArrowUp x={218} y={12} color={G} />
    <Lbl x={45}  y={78}  text="Flagpole" color={G}  />
    <Lbl x={130} y={80}  text="Flag"     color={DM} />
    <Lbl x={216} y={9}   text="LONG"     color={G}  />
  </Wrap>
);

const svgBeF = (
  <Wrap>
    <Line pts={[[20,20],[80,108]]} color={R} w={2.5} />
    <Line pts={[[80,108],[105,98],[120,105],[140,94],[158,101],[175,90]]}  color={LN} />
    <Dash x1={80}  y1={108} x2={178} y2={90} color={DM} />
    <Dash x1={80}  y1={88}  x2={178} y2={70} color={DM} />
    <Line pts={[[80,88],[105,78],[120,85],[140,74],[158,81],[175,70]]}  color={LN} />
    <Line pts={[[175,90],[210,125]]} color={R} w={2} />
    <ArrowDown x={218} y={130} color={R} />
    <Lbl x={45}  y={62}  text="Flagpole" color={R}  />
    <Lbl x={130} y={62}  text="Flag"     color={DM} />
    <Lbl x={216} y={122} text="SHORT"    color={R}  />
  </Wrap>
);

const svgRW = (
  <Wrap>
    <Fill pts={[[20,112],[60,82],[100,88],[140,58],[180,65],[220,40]]} color={R} base={VH} opacity={0.08} />
    <Line pts={[[20,112],[60,82],[100,88],[140,58],[180,65],[220,40]]} />
    <Line pts={[[20,112],[220,40]]} color={DM} w={1} />
    <Line pts={[[20,128],[60,98],[100,105],[140,75],[180,82],[220,58]]} />
    <Line pts={[[20,128],[220,58]]} color={DM} w={1} />
    <ArrowDown x={248} y={120} color={R} />
    <Lbl x={140} y={132} text="Both lines rising → BEARISH" color={R} />
  </Wrap>
);

const svgFW = (
  <Wrap>
    <Fill pts={[[20,28],[60,58],[100,52],[140,82],[180,75],[220,100]]} color={G} base={0} opacity={0.08} />
    <Line pts={[[20,28],[60,58],[100,52],[140,82],[180,75],[220,100]]} />
    <Line pts={[[20,28],[220,100]]} color={DM} w={1} />
    <Line pts={[[20,12],[60,42],[100,35],[140,65],[180,58],[220,82]]} />
    <Line pts={[[20,12],[220,82]]} color={DM} w={1} />
    <ArrowUp x={248} y={18} color={G} />
    <Lbl x={140} y={128} text="Both lines falling → BULLISH" color={G} />
  </Wrap>
);

// ── Candle Pattern SVGs ───────────────────────────────────────────────────────

const svgHammer = (
  <Wrap>
    {/* context downtrend */}
    <C x={20}  o={40} c={55} h={38} l={57} />
    <C x={44}  o={55} c={68} h={53} l={70} />
    <C x={68}  o={68} c={82} h={66} l={84} />
    <C x={92}  o={82} c={95} h={80} l={97} />
    {/* hammer */}
    <C x={125} o={92} c={97} h={90} l={130} />
    {/* next bullish */}
    <C x={160} o={95} c={72} h={70} l={97} />
    <ArrowUp x={200} y={58} color={G} />
    <Lbl x={141} y={138} text="Hammer"     color={G}   size={9} />
    <Lbl x={168} y={68}  text="Confirmed"  color={G}   size={8} />
    <Lbl x={200} y={52}  text="LONG"       color={G}   size={9} />
    {/* SL line */}
    <Dash x1={115} y1={130} x2={155} y2={130} color={R} />
    <Lbl x={140} y={126} text="SL"  color={R} size={7} />
  </Wrap>
);

const svgSS = (
  <Wrap>
    <C x={20}  o={80} c={68} h={82} l={66} />
    <C x={44}  o={68} c={56} h={70} l={54} />
    <C x={68}  o={56} c={44} h={58} l={42} />
    <C x={92}  o={44} c={32} h={46} l={30} />
    {/* shooting star */}
    <C x={125} o={38} c={32} h={12} l={40} />
    {/* next bearish */}
    <C x={160} o={35} c={58} h={33} l={60} />
    <ArrowDown x={200} y={80} color={R} />
    <Lbl x={141} y={138} text="Shooting Star" color={R}   size={9} />
    <Lbl x={168} y={70}  text="Confirmed"     color={R}   size={8} />
    <Lbl x={200} y={90}  text="SHORT"         color={R}   size={9} />
    <Dash x1={115} y1={12} x2={155} y2={12} color={R} />
    <Lbl x={140} y={10} text="SL" color={R} size={7} />
  </Wrap>
);

const svgDoji = (
  <Wrap>
    {/* Standard */}
    <line x1={60}  y1={22}  x2={60}  y2={118} stroke={LN} strokeWidth={1.5} />
    <line x1={52}  y1={70}  x2={68}  y2={70}  stroke={LN} strokeWidth={3} />
    <Lbl x={60}  y={130} text="Standard"   color={DM} size={9} />
    {/* Gravestone */}
    <line x1={140} y1={22}  x2={140} y2={80}  stroke={LN} strokeWidth={1.5} />
    <line x1={132} y1={78}  x2={148} y2={78}  stroke={R}  strokeWidth={3} />
    <Lbl x={140} y={130} text="Gravestone" color={R}  size={9} />
    <Lbl x={140} y={20}  text="Bearish"    color={R}  size={8} />
    {/* Dragonfly */}
    <line x1={220} y1={60}  x2={220} y2={118} stroke={LN} strokeWidth={1.5} />
    <line x1={212} y1={62}  x2={228} y2={62}  stroke={G}  strokeWidth={3} />
    <Lbl x={220} y={130} text="Dragonfly"  color={G}  size={9} />
    <Lbl x={220} y={58}  text="Bullish"    color={G}  size={8} />
  </Wrap>
);

const svgBullEng = (
  <Wrap>
    {/* small bearish */}
    <C x={70}  o={52} c={70} h={48} l={74} />
    {/* big bullish engulfing */}
    <C x={105} o={78} c={40} h={36} l={82} />
    <ArrowUp x={170} y={28} color={G} />
    <Lbl x={78}  y={90} text="Bearish"  color={R} size={9} />
    <Lbl x={113} y={90} text="Engulfs"  color={G} size={9} />
    <Lbl x={170} y={24} text="LONG"     color={G} size={9} />
    {/* engulf indicator lines */}
    <Dash x1={95} y1={40} x2={140} y2={40} color={G} />
    <Dash x1={95} y1={78} x2={140} y2={78} color={G} />
  </Wrap>
);

const svgBearEng = (
  <Wrap>
    <C x={70}  o={72} c={54} h={76} l={50} />
    <C x={105} o={46} c={84} h={42} l={88} />
    <ArrowDown x={170} y={110} color={R} />
    <Lbl x={78}  y={50} text="Bullish"  color={G} size={9} />
    <Lbl x={113} y={50} text="Engulfs"  color={R} size={9} />
    <Lbl x={170} y={124} text="SHORT"   color={R} size={9} />
    <Dash x1={95} y1={46} x2={140} y2={46} color={R} />
    <Dash x1={95} y1={84} x2={140} y2={84} color={R} />
  </Wrap>
);

const svgPinBull = (
  <Wrap>
    {/* context */}
    <C x={20}  o={52} c={65} h={50} l={67} />
    <C x={44}  o={65} c={76} h={63} l={78} />
    {/* pin bar */}
    <C x={90}  o={72} c={78} h={68} l={125} />
    {/* next candle */}
    <C x={125} o={75} c={50} h={48} l={77} />
    <ArrowUp x={195} y={35} color={G} />
    <Dash x1={80}  y1={125} x2={115} y2={125} color={R} />
    <Lbl x={100} y={134} text="Stop Loss" color={R} size={8} />
    <Lbl x={195} y={30}  text="Entry"     color={G} size={8} />
    <Lbl x={100} y={138} text="(below wick)" color={DM} size={7} />
  </Wrap>
);

const svgPinBear = (
  <Wrap>
    <C x={20}  o={90} c={78} h={92} l={76} />
    <C x={44}  o={78} c={66} h={80} l={64} />
    <C x={90}  o={68} c={62} h={18} l={70} />
    <C x={125} o={65} c={90} h={63} l={92} />
    <ArrowDown x={195} y={108} color={R} />
    <Dash x1={80}  y1={18} x2={115} y2={18} color={R} />
    <Lbl x={100} y={14}  text="Stop Loss"   color={R} size={8} />
    <Lbl x={195} y={118} text="Entry"       color={R} size={8} />
    <Lbl x={100} y={10}  text="(above wick)" color={DM} size={7} />
  </Wrap>
);

const svgMorningStar = (
  <Wrap>
    {/* 3 candles */}
    <C x={55}  o={40} c={80} h={36} l={84} />
    <C x={88}  o={84} c={90} h={82} l={92} />
    <C x={121} o={88} c={42} h={38} l={90} />
    {/* next */}
    <C x={165} o={40} c={22} h={18} l={42} />
    <ArrowUp x={222} y={14} color={G} />
    <Lbl x={63}  y={96} text="Bearish"  color={R}  size={9} />
    <Lbl x={96}  y={105} text="Doji"   color={DM} size={9} />
    <Lbl x={129} y={96} text="Bullish"  color={G}  size={9} />
    <Lbl x={222} y={10} text="LONG"     color={G}  size={9} />
  </Wrap>
);

const svgEveningStar = (
  <Wrap>
    <C x={55}  o={80} c={40} h={82} l={38} />
    <C x={88}  o={36} c={30} h={34} l={38} />
    <C x={121} o={32} c={78} h={28} l={80} />
    <C x={165} o={80} c={98} h={78} l={100} />
    <ArrowDown x={222} y={118} color={R} />
    <Lbl x={63}  y={36}  text="Bullish"  color={G}  size={9} />
    <Lbl x={96}  y={28}  text="Doji"     color={DM} size={9} />
    <Lbl x={129} y={36}  text="Bearish"  color={R}  size={9} />
    <Lbl x={222} y={130} text="SHORT"    color={R}  size={9} />
  </Wrap>
);

const svgInsideBar = (
  <Wrap>
    {/* mother bar */}
    <C x={75}  o={35} c={105} h={28} l={112} />
    {/* inside bar — smaller, fits within mother */}
    <C x={108} o={55} c={85}  h={48}  l={90} />
    {/* boundary lines */}
    <Dash x1={73}  y1={28}  x2={130} y2={28}  color={DM} />
    <Dash x1={73}  y1={112} x2={130} y2={112} color={DM} />
    <ArrowUp   x={180} y={20}  color={G} />
    <ArrowDown x={200} y={120} color={R} />
    <Lbl x={91}  y={125} text="Mother Bar"      color={DM} size={9} />
    <Lbl x={119} y={42}  text="Inside"          color={AM} size={9} />
    <Lbl x={195} y={14}  text="Bull break"      color={G}  size={8} />
    <Lbl x={195} y={132} text="Bear break"      color={R}  size={8} />
  </Wrap>
);

// ── Market Structure SVGs ─────────────────────────────────────────────────────

const svgBOS = (
  <Wrap>
    <Fill pts={[[20,105],[60,80],[90,92],[130,58],[165,72],[205,38]]} color={G} base={VH} opacity={0.1} />
    <Line pts={[[20,105],[60,80],[90,92],[130,58],[165,72],[205,38]]} color={G} />
    <Dash x1={90}  y1={92} x2={230} y2={92} color={DM} />
    <Dash x1={130} y1={58} x2={230} y2={58} color={G}  />
    <ArrowUp x={220} y={25} color={G} />
    <Lbl x={50}  y={75}  text="HL" color={G}  size={9} />
    <Lbl x={90}  y={100} text="HL" color={G}  size={9} />
    <Lbl x={130} y={52}  text="HH" color={G}  size={9} />
    <Lbl x={165} y={68}  text="HL" color={G}  size={9} />
    <Lbl x={205} y={32}  text="HH" color={G}  size={9} />
    <Lbl x={185} y={54}  text="BOS ↑" color={G} size={9} />
  </Wrap>
);

const svgCHOCH = (
  <Wrap>
    {/* uptrend */}
    <Line pts={[[20,105],[55,80],[80,90],[115,52],[145,65]]} color={G} />
    {/* choch reversal */}
    <Line pts={[[145,65],[170,90],[195,45],[230,125]]} color={AM} />
    {/* choch level */}
    <Dash x1={70} y1={90} x2={240} y2={90} color={AM} />
    <ArrowDown x={228} y={128} color={R} />
    <Lbl x={115} y={46}  text="Was uptrend" color={DM} size={8} />
    <Lbl x={197} y={42}  text="LH"          color={R}  size={9} />
    <Lbl x={155} y={105} text="CHOCH"       color={AM} size={9} />
    <Lbl x={228} y={120} text="SHORT"       color={R}  size={9} />
  </Wrap>
);

const svgSR = (
  <Wrap>
    <Dash x1={10} y1={32}  x2={270} y2={32}  color={R} />
    <Dash x1={10} y1={108} x2={270} y2={108} color={G} />
    {/* bounces */}
    <Line pts={[[15,108],[45,55],[70,108],[100,38],[120,108],[155,62],[175,108],[210,45],[230,108],[258,60]]} color={LN} />
    <Lbl x={140} y={26}  text="Resistance"    color={R} size={9} />
    <Lbl x={140} y={122} text="Support"       color={G} size={9} />
  </Wrap>
);

const svgOB = (
  <Wrap>
    {/* impulse */}
    <Line pts={[[20,105],[55,95],[80,100],[115,60],[150,30],[185,25]]} color={LN} />
    {/* OB zone */}
    <rect x={68} y={88} width={35} height={20} fill={`${G}18`} stroke={G} strokeWidth={1} strokeDasharray="3 2" rx={2} />
    {/* price returns to OB */}
    <Line pts={[[185,25],[210,60],[225,95]]} color={LN} />
    <ArrowDown x={225} y={95} color={G} />
    <Line pts={[[225,95],[250,50]]} color={G} w={1.5} />
    <ArrowUp x={250} y={48} color={G} />
    <Lbl x={86}  y={82}  text="OB Zone" color={G} size={8} />
    <Lbl x={145} y={26}  text="BOS"     color={G} size={9} />
    <Lbl x={250} y={44}  text="Entry"   color={G} size={8} />
  </Wrap>
);

const svgFVG = (
  <Wrap>
    {/* three candles */}
    <C x={75}  o={85}  c={65}  h={88}  l={62} />
    <C x={110} o={60}  c={28}  h={56}  l={25} />
    <C x={145} o={32}  c={15}  h={28}  l={12} />
    {/* FVG gap */}
    <rect x={91} y={32} width={18} height={28} fill={`${G}22`} stroke={G} strokeWidth={1} strokeDasharray="3 2" rx={2} />
    <line x1={91} y1={32} x2={109} y2={32} stroke={G} strokeWidth={1} />
    <line x1={91} y1={60} x2={109} y2={60} stroke={G} strokeWidth={1} />
    <ArrowUp x={205} y={25} color={G} />
    <Lbl x={100} y={76}  text="FVG"          color={G}  size={9} />
    <Lbl x={100} y={88}  text="(Gap fills)"   color={DM} size={8} />
    <Lbl x={205} y={20}  text="Price returns" color={G}  size={8} />
    <Lbl x={68}  y={96}  text="C1"  color={DM} size={8} />
    <Lbl x={118} y={130} text="C2"  color={DM} size={8} />
    <Lbl x={153} y={130} text="C3"  color={DM} size={8} />
  </Wrap>
);

const svgLiq = (
  <Wrap>
    <Dash x1={10} y1={28}  x2={200} y2={28}  color={R} />
    <Dash x1={10} y1={112} x2={200} y2={112} color={G} />
    <Line pts={[[15,70],[50,30],[60,50],[90,70],[120,110],[130,88],[160,70]]} color={LN} />
    {/* sweep up */}
    <Line pts={[[160,70],[185,18],[195,42],[220,55]]} color={AM} />
    <ArrowDown x={195} y={42} color={AM} />
    <Line pts={[[220,55],[255,20]]} color={G} w={2} />
    <Lbl x={100} y={22}  text="BSL (Buy-Side Liquidity)"  color={R} size={8} />
    <Lbl x={100} y={126} text="SSL (Sell-Side Liquidity)" color={G} size={8} />
    <Lbl x={187} y={14}  text="Sweep"  color={AM} size={9} />
    <Lbl x={255} y={16}  text="LONG"   color={G}  size={9} />
  </Wrap>
);

// ── Pattern definitions ───────────────────────────────────────────────────────
const PATTERNS: PatternDef[] = [
  { id:"head-shoulders",    title:"Head & Shoulders",         type:"chart",     bias:"bearish", svg:svgHS,       bullets:["Bearish reversal after an uptrend","Three peaks — middle is the highest","Neckline break confirms the signal","Stop loss placed above right shoulder"] },
  { id:"inv-head-shoulders",title:"Inverse Head & Shoulders", type:"chart",     bias:"bullish", svg:svgIHS,      bullets:["Bullish reversal after a downtrend","Three troughs — middle is the lowest","Neckline break is the entry signal","Stop loss placed below right shoulder"] },
  { id:"double-top",        title:"Double Top",               type:"chart",     bias:"bearish", svg:svgDT,       bullets:["Bearish reversal pattern","Two peaks at the same resistance level","Neckline break confirms the signal","Stop loss placed above both tops"] },
  { id:"double-bottom",     title:"Double Bottom",            type:"chart",     bias:"bullish", svg:svgDB,       bullets:["Bullish reversal pattern","Two troughs at the same support level","Neckline breakout is the entry","Stop loss placed below both bottoms"] },
  { id:"asc-triangle",      title:"Ascending Triangle",       type:"chart",     bias:"bullish", svg:svgAT,       bullets:["Bullish continuation pattern","Flat resistance + rising support","Buyers getting more aggressive","Enter on breakout above flat top"] },
  { id:"desc-triangle",     title:"Descending Triangle",      type:"chart",     bias:"bearish", svg:svgDT2,      bullets:["Bearish continuation pattern","Flat support + falling resistance","Sellers getting more aggressive","Enter on breakdown below flat bottom"] },
  { id:"sym-triangle",      title:"Symmetrical Triangle",     type:"chart",     bias:"neutral", svg:svgST,       bullets:["No directional bias until breakout","Lower highs + higher lows converging","Wait for confirmed breakout direction","Volume contracts then expands on break"] },
  { id:"bull-flag",         title:"Bull Flag",                type:"chart",     bias:"bullish", svg:svgBF,       bullets:["Bullish continuation pattern","Strong move up = flagpole","Brief pullback in a channel = flag","Target: flagpole length from breakout"] },
  { id:"bear-flag",         title:"Bear Flag",                type:"chart",     bias:"bearish", svg:svgBeF,      bullets:["Bearish continuation pattern","Strong move down = flagpole","Brief bounce in channel = flag","Target: flagpole length from breakout"] },
  { id:"rising-wedge",      title:"Rising Wedge",             type:"chart",     bias:"bearish", svg:svgRW,       bullets:["Bearish reversal or continuation","Both trendlines slope upward","Momentum weakening as it rises","Break below lower line = short entry"] },
  { id:"falling-wedge",     title:"Falling Wedge",            type:"chart",     bias:"bullish", svg:svgFW,       bullets:["Bullish reversal or continuation","Both trendlines slope downward","Selling pressure losing strength","Break above upper line = long entry"] },
  { id:"hammer",            title:"Hammer",                   type:"candle",    bias:"bullish", svg:svgHammer,   bullets:["Bullish reversal after a downtrend","Long lower wick = strong demand below","Small body near the top of the candle","Confirm with the next bullish candle"] },
  { id:"shooting-star",     title:"Shooting Star",            type:"candle",    bias:"bearish", svg:svgSS,       bullets:["Bearish reversal after an uptrend","Long upper wick = sellers rejected price","Small body near the bottom of the candle","Confirm with the next bearish candle"] },
  { id:"doji",              title:"Doji",                     type:"candle",    bias:"neutral", svg:svgDoji,     bullets:["Indecision — buyers and sellers equal","Gravestone = bearish at resistance","Dragonfly = bullish at support","Always confirm with the next candle"] },
  { id:"bull-engulfing",    title:"Bullish Engulfing",        type:"candle",    bias:"bullish", svg:svgBullEng,  bullets:["Two-candle bullish reversal signal","Green candle fully engulfs the red candle","Appears after a downtrend","Higher volume strengthens the signal"] },
  { id:"bear-engulfing",    title:"Bearish Engulfing",        type:"candle",    bias:"bearish", svg:svgBearEng,  bullets:["Two-candle bearish reversal signal","Red candle fully engulfs the green candle","Appears after an uptrend","Higher volume strengthens the signal"] },
  { id:"pin-bar-bull",      title:"Bullish Pin Bar",          type:"candle",    bias:"bullish", svg:svgPinBull,  bullets:["Long lower wick shows price rejection","Small body near the top","Best at key S/R or Fibonacci levels","Stop loss below the tip of the wick"] },
  { id:"pin-bar-bear",      title:"Bearish Pin Bar",          type:"candle",    bias:"bearish", svg:svgPinBear,  bullets:["Long upper wick shows price rejection","Small body near the bottom","Best at key S/R or Fibonacci levels","Stop loss above the tip of the wick"] },
  { id:"morning-star",      title:"Morning Star",             type:"candle",    bias:"bullish", svg:svgMorningStar, bullets:["Three-candle bullish reversal","Large bearish → small Doji → large bullish","Appears after a downtrend","Third candle closes 50%+ into first"] },
  { id:"evening-star",      title:"Evening Star",             type:"candle",    bias:"bearish", svg:svgEveningStar, bullets:["Three-candle bearish reversal","Large bullish → small Doji → large bearish","Appears after an uptrend","Third candle closes 50%+ into first"] },
  { id:"inside-bar",        title:"Inside Bar",               type:"candle",    bias:"neutral", svg:svgInsideBar, bullets:["Mother bar contains the inside bar fully","Signals consolidation and indecision","Breakout of mother bar = next direction","Trade the breakout side with the trend"] },
  { id:"bos",               title:"Break of Structure (BOS)", type:"structure", bias:"bullish", svg:svgBOS,      bullets:["Confirms trend continuation","In uptrend: price breaks above prev HH","In downtrend: price breaks below prev LL","Enter on retest after the break"] },
  { id:"choch",             title:"Change of Character",      type:"structure", bias:"neutral", svg:svgCHOCH,    bullets:["Signals potential trend reversal","In uptrend: price breaks below recent HL","First sign the trend may be shifting","Watch for new lower highs to confirm"] },
  { id:"support-resistance",title:"Support & Resistance",     type:"structure", bias:"neutral", svg:svgSR,       bullets:["Key levels where price historically reacts","More touches = stronger the level","Role reversal: broken S becomes R and vice versa","Higher timeframe levels carry more weight"] },
  { id:"order-block",       title:"Order Block",              type:"structure", bias:"bullish", svg:svgOB,       bullets:["Last opposing candle before a strong move","Represents institutional order placement","Price tends to return to fill the OB","Enter on OB retest with confirmation"] },
  { id:"fvg",               title:"Fair Value Gap (FVG)",     type:"structure", bias:"bullish", svg:svgFVG,      bullets:["Price imbalance from a fast impulsive move","Candle 1 high doesn't overlap candle 3 low","Market tends to return to fill the gap","FVG + Order Block = high confluence entry"] },
  { id:"liquidity",         title:"Liquidity Sweep",          type:"structure", bias:"neutral", svg:svgLiq,      bullets:["Stop losses cluster above swing highs (BSL)","Stop losses cluster below swing lows (SSL)","Institutions sweep liquidity then reverse","Wick through a level + sharp reversal = entry"] },
];

// ── Pattern card ──────────────────────────────────────────────────────────────
const BIAS_BADGE: Record<Bias, { label: string; cls: string; dot: string }> = {
  bullish: { label: "BULLISH", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  bearish: { label: "BEARISH", cls: "bg-red-500/15 text-red-400 border-red-500/30",             dot: "bg-red-400"     },
  neutral: { label: "NEUTRAL", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",          dot: "bg-zinc-500"    },
};
const TYPE_BADGE: Record<PatternType, string> = {
  chart:     "CHART PATTERN",
  candle:    "CANDLE PATTERN",
  structure: "MARKET STRUCTURE",
};

function PatternCard({ p }: { p: PatternDef }) {
  const [open, setOpen] = useState(false);
  const badge = BIAS_BADGE[p.bias];
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden bg-[hsl(var(--background))]/60">
      <button onClick={() => setOpen(v => !v)} className="w-full text-left">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="text-[14px] font-bold text-zinc-100 leading-tight">{p.title}</p>
          <span className={cn("text-[9px] font-bold tracking-wider px-2 py-[3px] rounded-full border shrink-0 flex items-center gap-1.5 ml-2", badge.cls)}>
            <span className={cn("w-[5px] h-[5px] rounded-full shrink-0", badge.dot)} />
            {badge.label}
          </span>
        </div>
        <div className="px-4 pb-2">
          <span className="text-[9px] font-bold tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-[3px] rounded-full">
            {TYPE_BADGE[p.type]}
          </span>
        </div>
        {/* SVG diagram */}
        <div className="mx-3 mb-3 rounded-xl border border-white/[0.06] bg-[#0a0a0b] overflow-hidden">
          {p.svg}
        </div>
      </button>

      {/* Expand details */}
      <button onClick={() => setOpen(v => !v)} className="w-full px-4 pb-3 text-left">
        <div className="flex items-center gap-1.5 mb-2">
          <ChevronRight className={cn("h-3.5 w-3.5 text-zinc-600 transition-transform duration-200", open && "rotate-90")} />
          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{open ? "Hide" : "Key Rules"}</span>
        </div>
        {open && (
          <ul className="space-y-1.5">
            {p.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[hsl(var(--primary))] mt-[2px] shrink-0 text-[10px]">›</span>
                <span className="text-[12px] text-zinc-300 leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        )}
      </button>
    </div>
  );
}

// ── Topics tab ────────────────────────────────────────────────────────────────
function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("|") && lines[i+1]?.match(/^\|[-| ]+\|$/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) { tableLines.push(lines[i]); i++; }
      const headers = tableLines[0].split("|").filter(c=>c.trim()).map(c=>c.trim());
      const rows = tableLines.slice(2).map(row => row.split("|").filter(c=>c.trim()).map(c=>c.trim()));
      elements.push(
        <div key={`t${i}`} className="overflow-x-auto my-2.5">
          <table className="w-full text-[11px] border-collapse">
            <thead><tr className="border-b border-[hsl(var(--border))]">{headers.map((h,idx)=><th key={idx} className="text-left py-1.5 px-2 text-[hsl(var(--muted-foreground))] font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{rows.map((row,rIdx)=><tr key={rIdx} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30">{row.map((cell,cIdx)=><td key={cIdx} className="py-1.5 px-2 text-[hsl(var(--foreground))]/80">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (line === "") { i++; continue; }
    if (line.startsWith("## ")) { elements.push(<p key={`h${i}`} className="text-[12px] font-bold text-[hsl(var(--foreground))] mt-3 mb-1">{line.slice(3)}</p>); i++; continue; }
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const parsed = parts.map((pt,pi) => pt.startsWith("**") && pt.endsWith("**") ? <strong key={pi} className="font-semibold text-[hsl(var(--foreground))]">{pt.slice(2,-2)}</strong> : pt);
    elements.push(<p key={`p${i}`} className="text-[12px] text-[hsl(var(--foreground))]/80 leading-relaxed">{parsed}</p>);
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}

function ItemCard({ item }: { item: KnowledgeItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(v=>!v)} className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[hsl(var(--secondary))]/50 transition-colors">
        <span className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]">{expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-[hsl(var(--foreground))] leading-tight">{item.title}</p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-snug">{item.summary}</p>
        </div>
      </button>
      {expanded && <div className="px-3 pb-3 pt-1 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/40">{renderContent(item.content)}</div>}
    </div>
  );
}

function CategorySection({ category, defaultOpen }: { category: KnowledgeCategory; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div>
      <button onClick={() => setOpen(v=>!v)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[hsl(var(--secondary))]/60 transition-colors">
        {(() => { const Icon = ICON_MAP[category.icon] ?? BookOpen; return <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />; })()}
        <span className="flex-1 text-left text-[13px] font-semibold text-[hsl(var(--foreground))]">{category.label}</span>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] mr-1">{category.items.length}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" /> : <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />}
      </button>
      {open && <div className="mt-1 mb-2 ml-2 space-y-1.5">{category.items.map(item => <ItemCard key={item.id} item={item} />)}</div>}
    </div>
  );
}

// ── Main content component ────────────────────────────────────────────────────
type Tab = "patterns" | "topics";
type FilterType = "all" | PatternType;

export function TradingKnowledgeContent() {
  const [tab, setTab]       = useState<Tab>("patterns");
  const [filter, setFilter] = useState<FilterType>("all");
  const [query, setQuery]   = useState("");

  const filteredPatterns = useMemo(() => {
    let list = PATTERNS;
    if (filter !== "all") list = list.filter(p => p.type === filter);
    if (query.trim()) { const q = query.toLowerCase(); list = list.filter(p => p.title.toLowerCase().includes(q) || p.bullets.some(b => b.toLowerCase().includes(q))); }
    return list;
  }, [filter, query]);

  const topicResults = useMemo(() => {
    if (tab !== "topics") return null;
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const results: Array<{ category: KnowledgeCategory; item: KnowledgeItem }> = [];
    for (const cat of TRADING_KNOWLEDGE) for (const item of cat.items)
      if (item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.tags?.some(t=>t.includes(q)))
        results.push({ category: cat, item });
    return results;
  }, [query, tab]);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key:"all",       label:`All ${PATTERNS.length}` },
    { key:"chart",     label:`Chart ${PATTERNS.filter(p=>p.type==="chart").length}` },
    { key:"candle",    label:`Candle ${PATTERNS.filter(p=>p.type==="candle").length}` },
    { key:"structure", label:`Structure ${PATTERNS.filter(p=>p.type==="structure").length}` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))] shrink-0">
        {(["patterns","topics"] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setQuery(""); setFilter("all"); }}
            className={cn("flex-1 py-2.5 text-[13px] font-semibold capitalize transition-colors",
              tab===t ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] -mb-px" : "text-zinc-500 hover:text-zinc-300")}>
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-[hsl(var(--border))] shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={tab==="patterns" ? "Search patterns…" : "Search topics, indicators…"}
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-white/[0.03] pl-9 pr-3 py-2 text-[13px] text-[hsl(var(--foreground))] placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]/50 transition-colors" />
        </div>
      </div>

      {tab === "patterns" && (
        <>
          {/* Filter chips */}
          <div className="flex gap-2 px-3 py-2.5 overflow-x-auto shrink-0">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn("shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors whitespace-nowrap",
                  filter===f.key
                    ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30"
                    : "bg-white/[0.03] text-zinc-500 border-white/[0.07] hover:text-zinc-300 hover:border-white/[0.12]")}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-4">
            {filteredPatterns.length === 0
              ? <div className="flex flex-col items-center justify-center py-20 gap-3"><Search className="h-10 w-10 text-zinc-800" /><p className="text-[13px] text-zinc-600">No patterns found</p></div>
              : filteredPatterns.map(p => <PatternCard key={p.id} p={p} />)
            }
          </div>
        </>
      )}

      {tab === "topics" && (
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {topicResults !== null ? (
            topicResults.length === 0
              ? <div className="flex flex-col items-center justify-center py-20 gap-3"><Search className="h-10 w-10 text-zinc-800" /><p className="text-[13px] text-zinc-600">No results for &ldquo;{query}&rdquo;</p></div>
              : <div className="space-y-1.5 px-1">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-2 py-1">{topicResults.length} result{topicResults.length!==1?"s":""}</p>
                  {topicResults.map(({ category, item }) => (
                    <div key={item.id}>
                      <p className="text-[10px] text-zinc-600 px-2 mb-1">{(() => { const Icon = ICON_MAP[category.icon] ?? BookOpen; return <><Icon className="inline h-3 w-3 mr-1 text-zinc-500" />{category.label}</>; })()}</p>
                      <ItemCard item={item} />
                    </div>
                  ))}
                </div>
          ) : TRADING_KNOWLEDGE.map((cat, idx) => <CategorySection key={cat.id} category={cat} defaultOpen={idx===0} />)}
        </div>
      )}
    </div>
  );
}

// ── Sidebar shell ─────────────────────────────────────────────────────────────
export function TradingKnowledgeSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <>
      <div className={cn("fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} onClick={onClose} />
      <aside className={cn(
        "fixed right-0 top-0 z-[50] flex h-screen w-[520px] max-w-[calc(100vw-60px)] flex-col",
        "border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-4 py-3.5 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
            <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[hsl(var(--foreground))] leading-tight">Trading Knowledge</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{PATTERNS.length} patterns · {TRADING_KNOWLEDGE.reduce((n,c)=>n+c.items.length,0)} topics · Basics to SMC</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors">
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
