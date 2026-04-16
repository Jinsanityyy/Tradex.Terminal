"use client";

/**
 * TradexNewsroom — full "Newsroom-style" multi-agent control room dashboard.
 *
 * Inspired by the Shinra pixel-art office reference but rendered as a clean,
 * professional cyberpunk UI with anime-style character avatars, live-animated
 * data screens, glowing cables, wall clock, and FX rates.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AgentState = "bullish"|"bearish"|"alert"|"valid"|"blocked"|"armed"|"no-trade"|"idle";

interface AgentDef {
  id:       string;
  label:    string;
  role:     string;
  state:    AgentState;
  hair:     string;
  skin:     string;
  suit:     string;
  trim:     string;
  accent:   string;
  // layout (% of scene container)
  x:        number;
  y:        number;
  scale:    number;
  props?:   Array<"plant"|"gloves"|"books"|"phone"|"plane"|"sword">;
  isMaster?:boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent definitions
// ─────────────────────────────────────────────────────────────────────────────

const AGENTS: AgentDef[] = [
  {
    id:"trend",      label:"TREND",      role:"BULLISH",    state:"bullish",
    hair:"#f5c518",  skin:"#e8a870",  suit:"#14366a", trim:"#204a90",
    accent:"#10b981",
    x:10,  y:39, scale:0.80,
  },
  {
    id:"master",     label:"MASTER",     role:"NO TRADE",   state:"no-trade",
    hair:"#e2e8f0",  skin:"#dfc898",  suit:"#0c2248", trim:"#163868",
    accent:"#22d3ee",
    x:50,  y:33, scale:1.00, isMaster:true,
  },
  {
    id:"risk",       label:"RISK GATE",  role:"VALID",      state:"valid",
    hair:"#92400e",  skin:"#d4956a",  suit:"#081e18", trim:"#0c3028",
    accent:"#10b981",
    x:87,  y:39, scale:0.80, props:["plant"],
  },
  {
    id:"smc",        label:"PR. ACTION", role:"ALERT",      state:"alert",
    hair:"#1a1a2e",  skin:"#c89060",  suit:"#26185a", trim:"#3a2490",
    accent:"#f59e0b",
    x:22,  y:60, scale:0.86, props:["gloves"],
  },
  {
    id:"news",       label:"NEWS",       role:"MONITORING", state:"idle",
    hair:"#374151",  skin:"#8b5e3c",  suit:"#162a3a", trim:"#1e3a4a",
    accent:"#3b82f6",
    x:50,  y:63, scale:0.86, props:["books","plane"],
  },
  {
    id:"contrarian", label:"CONTRARIAN", role:"MONITORING", state:"idle",
    hair:"#7f1d1d",  skin:"#c89060",  suit:"#24100a", trim:"#381c10",
    accent:"#f97316",
    x:77,  y:60, scale:0.86, props:["phone"],
  },
  {
    id:"execution",  label:"EXECUTION",  role:"STANDBY",    state:"idle",
    hair:"#111827",  skin:"#c89060",  suit:"#0c1e30", trim:"#183048",
    accent:"#22d3ee",
    x:91,  y:57, scale:0.78,
  },
];

const STATE_COLORS: Record<AgentState, string> = {
  bullish:  "#10b981",
  bearish:  "#ef4444",
  alert:    "#f59e0b",
  valid:    "#10b981",
  blocked:  "#ef4444",
  armed:    "#22d3ee",
  "no-trade": "#6b7280",
  idle:     "#1e3a5f",
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function useAnimatedBars(count: number, min=20, max=90, interval=1600) {
  const [vals, setVals] = useState<number[]>(()=>
    Array.from({length:count},()=>Math.random()*(max-min)+min));
  useEffect(()=>{
    const t = setInterval(()=>{
      setVals(prev=>prev.map(v=>{
        const d=(Math.random()-.5)*18;
        return Math.max(min,Math.min(max,v+d));
      }));
    },interval);
    return ()=>clearInterval(t);
  },[count,min,max,interval]);
  return vals;
}

function useClock() {
  const [time,setTime] = useState(new Date());
  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date()),1000);
    return ()=>clearInterval(t);
  },[]);
  return time;
}

function useScrollingText(lines: string[], interval=2200) {
  const [idx,setIdx] = useState(0);
  useEffect(()=>{
    const t=setInterval(()=>setIdx(i=>(i+1)%lines.length),interval);
    return ()=>clearInterval(t);
  },[lines.length,interval]);
  return idx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared screen components
// ─────────────────────────────────────────────────────────────────────────────

function BarChart({bars, color, height=36}: {bars:number[]; color:string; height?:number}) {
  return (
    <div className="flex items-end gap-px" style={{height}}>
      {bars.map((h,i)=>(
        <div key={i} className="flex-1 rounded-sm transition-all duration-700"
          style={{height:`${h}%`, background:color, opacity:0.7+i*.04}}/>
      ))}
    </div>
  );
}

function CandleChart({color, height=36}: {color:string; height?:number}) {
  const bars = useAnimatedBars(7,25,85,900);
  const opens = useRef<number[]>(bars.map(()=>Math.random()*60+20));
  return (
    <div className="flex items-center gap-px" style={{height}}>
      {bars.map((close,i)=>{
        const open=opens.current[i]??50;
        const isBull=close>open;
        const hi=Math.max(close,open)+Math.random()*12;
        const lo=Math.min(close,open)-Math.random()*12;
        const barH=Math.abs(close-open)*height/100;
        const bodyTop=(100-Math.max(close,open))*height/100;
        return (
          <div key={i} className="relative flex flex-col items-center" style={{flex:1,height}}>
            {/* Wick */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{
              top:((100-hi)/100)*height,
              height:((hi-lo)/100)*height,
              width:1,
              background:isBull?"#10b981":"#ef4444",
              opacity:.6,
            }}/>
            {/* Body */}
            <div className="absolute left-1/2 -translate-x-1/2 rounded-sm transition-all duration-600" style={{
              top:bodyTop,
              height:Math.max(2,barH),
              width:"70%",
              background:isBull?"#10b981":"#ef4444",
              opacity:.85,
            }}/>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({color, height=36}: {color:string; height?:number}) {
  const vals = useAnimatedBars(12,20,80,800);
  const w=120, h=height;
  const pts = vals.map((v,i)=>`${i*(w/(vals.length-1))},${h-(v/100)*h}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        opacity="0.9" strokeLinejoin="round" strokeLinecap="round"/>
      <polyline points={`${pts} ${w},${h} 0,${h}`}
        fill={color} opacity="0.06"/>
    </svg>
  );
}

function RadarDisplay({color, conf, aligned, total}: {color:string; conf:number; aligned:number; total:number}) {
  const [angle,setAngle] = useState(0);
  useEffect(()=>{
    const t=setInterval(()=>setAngle(a=>(a+1)%360),40);
    return ()=>clearInterval(t);
  },[]);
  const cx=40,cy=40,r=28;
  const spokes=[0,45,90,135,180,225,270,315];
  return (
    <div className="flex items-center gap-3">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="0.8"
          opacity="0.25" strokeDasharray="4 3"/>
        {/* Rotating sweep */}
        <line x1={cx} y1={cy}
          x2={cx+r*Math.cos((angle-90)*Math.PI/180)}
          y2={cy+r*Math.sin((angle-90)*Math.PI/180)}
          stroke={color} strokeWidth="1.2" opacity="0.5"/>
        {/* Spokes */}
        {spokes.map((d,i)=>{
          const rad=d*Math.PI/180;
          return <line key={i}
            x1={cx+r*.3*Math.cos(rad)} y1={cy+r*.3*Math.sin(rad)}
            x2={cx+r*.8*Math.cos(rad)} y2={cy+r*.8*Math.sin(rad)}
            stroke={color} strokeWidth="0.6" opacity="0.18"/>;
        })}
        {/* Inner circle */}
        <circle cx={cx} cy={cy} r={r*.4} fill={color} opacity="0.08"/>
        {/* Center */}
        <text x={cx} y={cy+4} textAnchor="middle" fontSize="11" fontWeight="bold"
          fill={color} fontFamily="monospace">{conf}%</text>
        <text x={cx} y={cy+13} textAnchor="middle" fontSize="6"
          fill={color} opacity="0.6" fontFamily="monospace">{aligned}/{total}</text>
      </svg>
    </div>
  );
}

function GaugeArc({value, color, size=56}: {value:number; color:string; size?:number}) {
  const r=20, cx=28, cy=30, circ=2*Math.PI*r;
  const fill=(value/100)*circ*.75;
  const offset=-circ*.375;
  return (
    <svg width={size} height={size*.9} viewBox="0 0 56 50">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0a1828" strokeWidth="4"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${fill} ${circ-.75*circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"/>
      <text x={cx} y={cy+4} textAnchor="middle" fontSize="9" fontWeight="bold"
        fill={color} fontFamily="monospace">{value}%</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen content per agent
// ─────────────────────────────────────────────────────────────────────────────

function TrendScreenContent({agent}: {agent:AgentDef}) {
  const bars = useAnimatedBars(6,35,90,1400);
  return (
    <div className="p-1.5 h-full flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-bold tracking-wider" style={{color:agent.accent}}>
          TREND ANALYSIS
        </span>
        <span className="text-[7px] px-1 rounded" style={{
          background:agent.accent+"25", color:agent.accent, border:`1px solid ${agent.accent}40`
        }}>▲ BULLISH</span>
      </div>
      <CandleChart color={agent.accent}/>
      <BarChart bars={bars} color={agent.accent} height={20}/>
      <div className="flex gap-2 text-[6px] font-mono" style={{color:agent.accent+"99"}}>
        <span>MA50↑</span><span>RSI:68</span><span>HTF✓</span>
      </div>
    </div>
  );
}

function MasterScreenContent({agent}: {agent:AgentDef}) {
  const [conf] = useState(42);
  return (
    <div className="p-2 h-full flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-bold tracking-[0.2em]" style={{color:agent.accent}}>
          MASTER CONSENSUS
        </span>
        <span className="text-[7px] px-1.5 py-0.5 rounded" style={{
          background:"#6b728025", color:"#9ca3af", border:"1px solid #6b728040"
        }}>⊘ NO TRADE</span>
      </div>
      <div className="flex items-center gap-2">
        <RadarDisplay color={agent.accent} conf={conf} aligned={3} total={7}/>
        <div className="flex-1 space-y-1">
          {["TREND","PA","NEWS","RISK","CONTRA","EXEC"].map((label,i)=>(
            <div key={i} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-sm" style={{
                background:["#10b981","#f59e0b","#3b82f6","#10b981","#f97316","#22d3ee"][i],
                opacity:i<3?0.9:0.4
              }}/>
              <div className="flex-1 h-1 rounded-sm bg-white/5">
                <div className="h-full rounded-sm transition-all duration-1000" style={{
                  width:`${[72,58,45,88,30,20][i]}%`,
                  background:["#10b981","#f59e0b","#3b82f6","#10b981","#f97316","#22d3ee"][i],
                  opacity:0.7,
                }}/>
              </div>
              <span className="text-[5.5px] font-mono w-7" style={{
                color:["#10b981","#f59e0b","#3b82f6","#10b981","#f97316","#22d3ee"][i],
                opacity:0.8,
              }}>{[72,58,45,88,30,20][i]}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 text-[6px] font-mono mt-auto" style={{color:agent.accent+"80"}}>
        <span>AGENTS: 7/7</span><span>CONF: {conf}%</span><span>SYNC: 3/7</span>
      </div>
    </div>
  );
}

function RiskScreenContent({agent}: {agent:AgentDef}) {
  const [score] = useState(88);
  return (
    <div className="p-1.5 h-full flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-bold tracking-wider" style={{color:agent.accent}}>
          RISK GATE
        </span>
        <span className="text-[7px] px-1 rounded" style={{
          background:agent.accent+"25", color:agent.accent, border:`1px solid ${agent.accent}40`
        }}>✔ VALID</span>
      </div>
      <div className="flex items-center gap-2">
        <GaugeArc value={score} color={agent.accent}/>
        <div className="flex-1 space-y-1.5">
          {[["SESSION","A+"],["VOLATILITY","72"],["MAX RISK","1.2%"],["GRADE","A"]].map(([k,v])=>(
            <div key={k} className="flex justify-between text-[6px] font-mono">
              <span style={{color:agent.accent+"70"}}>{k}</span>
              <span style={{color:agent.accent}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <LineChart color={agent.accent} height={18}/>
    </div>
  );
}

function PAScreenContent({agent}: {agent:AgentDef}) {
  return (
    <div className="p-1.5 h-full flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-bold tracking-wider" style={{color:agent.accent}}>
          PRICE ACTION
        </span>
        <span className="text-[7px] px-1 rounded animate-pulse" style={{
          background:agent.accent+"30", color:agent.accent, border:`1px solid ${agent.accent}50`
        }}>⚡ ALERT</span>
      </div>
      <CandleChart color={agent.accent}/>
      <div className="flex gap-1 text-[6px] font-mono flex-wrap" style={{color:agent.accent+"90"}}>
        <span className="px-0.5 rounded" style={{background:agent.accent+"18"}}>SWEEP</span>
        <span className="px-0.5 rounded" style={{background:agent.accent+"18"}}>BOS</span>
        <span className="px-0.5 rounded" style={{background:agent.accent+"18"}}>OB@2318</span>
      </div>
      <div className="flex justify-between text-[6px] font-mono" style={{color:agent.accent+"70"}}>
        <span>DISCOUNT ZONE</span><span>CHOCH✓</span>
      </div>
    </div>
  );
}

function NewsScreenContent({agent}: {agent:AgentDef}) {
  const NEWS_LINES = [
    "FED: Rate decision pending 14:00 EST",
    "XAUUSD: Geopolitical tension rising",
    "NFP: +220k vs +195k expected",
    "EUR: ECB holds rates at 4.25%",
    "USD: DXY holding 104.2 support",
    "FOMC: Minutes signal caution",
    "OPEC: Production cut extended Q3",
  ];
  const idx = useScrollingText(NEWS_LINES, 2000);
  const bars = useAnimatedBars(5,30,70,2000);
  return (
    <div className="p-1.5 h-full flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-bold tracking-wider" style={{color:agent.accent}}>
          NEWS FEED
        </span>
        <span className="text-[6px] font-mono" style={{color:agent.accent+"70"}}>
          RISK: 42/100
        </span>
      </div>
      <div className="flex-1 overflow-hidden text-[6px] font-mono space-y-0.5">
        {NEWS_LINES.slice(idx, idx+4).concat(NEWS_LINES.slice(0,Math.max(0,idx+4-NEWS_LINES.length))).map((l,i)=>(
          <div key={i} className="truncate transition-opacity duration-300"
            style={{color:agent.accent, opacity:1-i*.2}}>
            {i===0?"▶ ":  "  "}{l}
          </div>
        ))}
      </div>
      <BarChart bars={bars} color={agent.accent} height={18}/>
    </div>
  );
}

function ContrarianScreenContent({agent}: {agent:AgentDef}) {
  const vals1 = useAnimatedBars(8,20,80,1000);
  const vals2 = useAnimatedBars(8,20,80,1100);
  const w=100, h=36;
  const pts1 = vals1.map((v,i)=>`${i*(w/7)},${h-(v/100)*h}`).join(" ");
  const pts2 = vals2.map((v,i)=>`${i*(w/7)},${h-(v/100)*h}`).join(" ");
  return (
    <div className="p-1.5 h-full flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-bold tracking-wider" style={{color:agent.accent}}>
          CONTRARIAN
        </span>
        <span className="text-[7px] px-1 rounded" style={{
          color:"#6b7280", background:"#6b728020", border:"1px solid #6b728040"
        }}>MONITORING</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
        className="overflow-visible">
        <line x1={w/2} y1={0} x2={w/2} y2={h}
          stroke={agent.accent} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 2"/>
        <polyline points={pts1} fill="none" stroke={agent.accent} strokeWidth="1.5"
          opacity="0.7" strokeLinejoin="round"/>
        <polyline points={pts2} fill="none" stroke="#ef4444" strokeWidth="1.5"
          opacity="0.5" strokeLinejoin="round" strokeDasharray="4 2"/>
      </svg>
      <div className="flex gap-3 text-[6px] font-mono">
        <span style={{color:agent.accent}}>◆ CONTRA</span>
        <span style={{color:"#ef4444"}}>◇ CROWD</span>
        <span style={{color:"#6b7280",marginLeft:"auto"}}>TRAP: NONE</span>
      </div>
    </div>
  );
}

function ExecutionScreenContent({agent}: {agent:AgentDef}) {
  const [angle,setAngle] = useState(0);
  useEffect(()=>{
    const t=setInterval(()=>setAngle(a=>(a+2)%360),60);
    return ()=>clearInterval(t);
  },[]);
  const r=18, cx=24, cy=24;
  return (
    <div className="p-1.5 h-full flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-bold tracking-wider" style={{color:agent.accent}}>
          EXECUTION
        </span>
        <span className="text-[7px] px-1 rounded" style={{
          color:agent.accent, background:agent.accent+"20",border:`1px solid ${agent.accent}40`
        }}>STANDBY</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="48" height="48" viewBox="0 0 48 48">
          {/* Crosshair */}
          <line x1={cx-r} y1={cy} x2={cx-r*.3} y2={cy} stroke={agent.accent} strokeWidth="1.2" opacity="0.8"/>
          <line x1={cx+r*.3} y1={cy} x2={cx+r} y2={cy} stroke={agent.accent} strokeWidth="1.2" opacity="0.8"/>
          <line x1={cx} y1={cy-r} x2={cx} y2={cy-r*.3} stroke={agent.accent} strokeWidth="1.2" opacity="0.8"/>
          <line x1={cx} y1={cy+r*.3} x2={cx} y2={cy+r} stroke={agent.accent} strokeWidth="1.2" opacity="0.8"/>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={agent.accent} strokeWidth="0.8"
            opacity="0.3" strokeDasharray="5 4"/>
          <circle cx={cx} cy={cy} r={r*.5} fill="none" stroke={agent.accent} strokeWidth="1"
            opacity="0.6"/>
          <rect x={cx-2} y={cy-2} width={4} height={4} fill={agent.accent} opacity="0.9"/>
        </svg>
        <div className="flex-1 space-y-1.5">
          {[["ENTRY","—"],["SL","—"],["TP1","—"],["R:R","—"]].map(([k,v])=>(
            <div key={k} className="flex justify-between text-[6px] font-mono">
              <span style={{color:agent.accent+"60"}}>{k}</span>
              <span style={{color:agent.accent+"50"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-[6px] font-mono" style={{color:agent.accent+"60"}}>
        AWAITING CONSENSUS SIGNAL
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Character SVG heads — anime/cyberpunk style
// ─────────────────────────────────────────────────────────────────────────────

function CharacterHead({agent, w=48, h=64}: {agent:AgentDef; w?:number; h?:number}) {
  const {hair, skin, suit, trim, accent, id} = agent;
  const isIdle = agent.state==="idle"||agent.state==="no-trade";
  return (
    <svg width={w} height={h} viewBox="0 0 48 64">
      {/* Neck */}
      <rect x="20" y="42" width="8" height="8" fill={skin} opacity="0.9"/>
      {/* Collar / shoulders */}
      <rect x="8" y="46" width="32" height="14" rx="2" fill={suit}/>
      <polygon points="24,46 16,46 14,58 24,52" fill={trim} opacity="0.7"/>
      <polygon points="24,46 32,46 34,58 24,52" fill={trim} opacity="0.7"/>
      {/* Badge */}
      <rect x="20" y="50" width="8" height="4" fill={accent} opacity={isIdle?0.2:0.45}/>
      {/* Head */}
      <rect x="12" y="16" width="24" height="28" rx="5" fill={skin}/>
      {/* Eyes */}
      <rect x="16" y="26" width="6" height="4" rx="1.5" fill={isIdle?"#1a1a2e":accent} opacity={isIdle?0.5:0.85}/>
      <rect x="26" y="26" width="6" height="4" rx="1.5" fill={isIdle?"#1a1a2e":accent} opacity={isIdle?0.5:0.85}/>
      {/* Eye shine */}
      <rect x="17" y="27" width="2" height="1.5" fill="white" opacity="0.7"/>
      <rect x="27" y="27" width="2" height="1.5" fill="white" opacity="0.7"/>
      {/* Mouth */}
      <path d="M 19 36 Q 24 39 29 36" fill="none" stroke={skin==="#8b5e3c"?"#5a3a20":"#b07040"} strokeWidth="0.8" opacity="0.6"/>
      {/* Screen glow on face */}
      {!isIdle&&<rect x="12" y="16" width="24" height="28" rx="5" fill={accent} opacity="0.04"/>}

      {/* ── Hair styles per character ── */}
      {id==="trend"&&(
        /* Blonde spiky */
        <g fill={hair}>
          <rect x="12" y="10" width="24" height="10" rx="3"/>
          <polygon points="14,16 10,6 18,14"/>
          <polygon points="20,12 18,4 24,12"/>
          <polygon points="26,12 26,4 32,12"/>
          <polygon points="32,14 36,6 38,16"/>
        </g>
      )}
      {id==="master"&&(
        /* White flowing hair */
        <g fill={hair}>
          <rect x="12" y="8" width="24" height="12" rx="4"/>
          <rect x="8"  y="16" width="6" height="24" rx="3"/>
          <rect x="34" y="16" width="6" height="24" rx="3"/>
          <rect x="10" y="40" width="6" height="10" rx="3"/>
          <rect x="32" y="40" width="6" height="10" rx="3"/>
        </g>
      )}
      {id==="risk"&&(
        /* Brown braids (Aerith) */
        <g fill={hair}>
          <rect x="12" y="10" width="24" height="10" rx="3"/>
          <rect x="10" y="14" width="5" height="30" rx="2.5" opacity="0.9"/>
          <rect x="33" y="14" width="5" height="30" rx="2.5" opacity="0.9"/>
          <ellipse cx="12" cy="46" rx="3" ry="4" opacity="0.8"/>
          <ellipse cx="36" cy="46" rx="3" ry="4" opacity="0.8"/>
        </g>
      )}
      {id==="smc"&&(
        /* Dark hair pulled back (Tifa) */
        <g fill={hair}>
          <rect x="12" y="8" width="24" height="12" rx="4"/>
          <rect x="32" y="12" width="8" height="36" rx="4"/>
        </g>
      )}
      {id==="news"&&(
        /* Short flat-top dark (Barrett) */
        <g fill="#4b5563">
          <rect x="10" y="10" width="28" height="9" rx="2"/>
          <rect x="8"  y="16" width="6"  height="8"  rx="2"/>
          <rect x="34" y="16" width="6"  height="8"  rx="2"/>
        </g>
      )}
      {id==="contrarian"&&(
        /* Dark red long hair (Vincent) */
        <g fill={hair}>
          <rect x="12" y="6" width="24" height="14" rx="4"/>
          <rect x="9"  y="12" width="6" height="40" rx="3"/>
          <rect x="33" y="12" width="6" height="40" rx="3"/>
        </g>
      )}
      {id==="execution"&&(
        /* Short black cropped */
        <g fill={hair}>
          <rect x="12" y="10" width="24" height="10" rx="3"/>
          <rect x="10" y="14" width="6"  height="8"  rx="2"/>
          <rect x="32" y="14" width="6"  height="8"  rx="2"/>
        </g>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props (decorative desk objects)
// ─────────────────────────────────────────────────────────────────────────────

function DeskProp({type}: {type: "plant"|"gloves"|"books"|"phone"|"plane"|"sword"}) {
  switch(type) {
    case "plant": return (
      <svg width="24" height="32" viewBox="0 0 24 32">
        <rect x="8" y="22" width="8" height="8" rx="1" fill="#1e3a2a" stroke="#2a4a3a" strokeWidth="0.5"/>
        <ellipse cx="12" cy="18" rx="5" ry="4" fill="#166534"/>
        <ellipse cx="8"  cy="20" rx="4" ry="3" fill="#15803d"/>
        <ellipse cx="16" cy="20" rx="4" ry="3" fill="#15803d"/>
        <ellipse cx="12" cy="14" rx="3" ry="4" fill="#16a34a"/>
        <line x1="12" y1="22" x2="12" y2="18" stroke="#15803d" strokeWidth="1.2"/>
      </svg>
    );
    case "books": return (
      <svg width="28" height="24" viewBox="0 0 28 24">
        {[[0,"#1e40af"],[5,"#7c2d12"],[10,"#14532d"],[15,"#581c87"],[20,"#1e3a5f"]].map(([x,c])=>(
          <rect key={x as number} x={x as number} y={2} width="5" height="20" rx="0.5" fill={c as string} stroke="#0a1428" strokeWidth="0.5"/>
        ))}
      </svg>
    );
    case "phone": return (
      <svg width="22" height="18" viewBox="0 0 22 18">
        <rect x="2" y="4" width="18" height="12" rx="2" fill="#0a1428" stroke="#1e3a5f" strokeWidth="0.8"/>
        <rect x="4" y="6" width="14" height="8" rx="1" fill="#0d1e38"/>
        {[0,1,2].map(r=>[0,1,2].map(c=>(
          <rect key={`${r}-${c}`} x={5+c*4} y={7+r*2} width="3" height="1.5" rx="0.5"
            fill="#22d3ee" opacity="0.25"/>
        )))}
      </svg>
    );
    case "plane": return (
      <svg width="28" height="16" viewBox="0 0 28 16">
        <polygon points="2,8 22,4 22,12" fill="#1e3a5f" stroke="#22d3ee" strokeWidth="0.5"/>
        <polygon points="14,4 22,2 22,6" fill="#162a3a" stroke="#22d3ee" strokeWidth="0.5"/>
        <polygon points="14,10 22,9 22,14" fill="#162a3a" stroke="#22d3ee" strokeWidth="0.5"/>
        <rect x="20" y="6" width="6" height="4" rx="1" fill="#0c1e30" stroke="#1e3a5f" strokeWidth="0.5"/>
      </svg>
    );
    case "gloves": return (
      <svg width="20" height="16" viewBox="0 0 20 16">
        <path d="M2 14 Q2 8 5 6 L9 4 L9 8 Q10 4 11 4 L12 8 Q12 4 13 4 L14 8 Q14 4 16 5 L17 8 L17 12 Q16 14 10 14 Z"
          fill="#0a1428" stroke="#22d3ee" strokeWidth="0.7"/>
      </svg>
    );
    case "sword": return (
      <svg width="8" height="36" viewBox="0 0 8 36">
        <rect x="3" y="2" width="2" height="28" rx="1" fill="#374151" stroke="#9ca3af" strokeWidth="0.5"/>
        <rect x="1" y="28" width="6" height="3"  rx="0.5" fill="#6b7280"/>
        <rect x="2" y="31" width="4" height="4"  rx="1"   fill="#4b5563"/>
      </svg>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Station component
// ─────────────────────────────────────────────────────────────────────────────

function AgentStation({agent}: {agent:AgentDef}) {
  const stateColor = STATE_COLORS[agent.state];
  const isIdle = agent.state==="idle"||agent.state==="no-trade";

  function renderScreen() {
    switch(agent.id) {
      case "trend":      return <TrendScreenContent agent={agent}/>;
      case "master":     return <MasterScreenContent agent={agent}/>;
      case "risk":       return <RiskScreenContent agent={agent}/>;
      case "smc":        return <PAScreenContent agent={agent}/>;
      case "news":       return <NewsScreenContent agent={agent}/>;
      case "contrarian": return <ContrarianScreenContent agent={agent}/>;
      case "execution":  return <ExecutionScreenContent agent={agent}/>;
      default:           return null;
    }
  }

  const deskW = agent.isMaster ? 180 : 140;
  const screenH = agent.isMaster ? 110 : 82;

  return (
    <div
      className="absolute"
      style={{
        left: `${agent.x}%`,
        top:  `${agent.y}%`,
        transform: `translate(-50%, 0) scale(${agent.scale})`,
        transformOrigin: "top center",
        zIndex: agent.isMaster ? 20 : 10,
      }}
    >
      {/* ── Character head ── */}
      <div className="flex justify-center mb-1 relative">
        <CharacterHead agent={agent} w={agent.isMaster?56:44} h={agent.isMaster?70:56}/>
        {/* Headset glow */}
        {!isIdle && (
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{boxShadow:`0 0 12px ${agent.accent}40`}}/>
        )}
      </div>

      {/* ── Monitor screen ── */}
      <div
        className="relative rounded-sm overflow-hidden"
        style={{
          width: deskW,
          height: screenH,
          background: "#050d18",
          border: `1px solid ${isIdle ? "#1e3a5f50" : agent.accent+"70"}`,
          boxShadow: isIdle ? "none" : `0 0 14px ${agent.accent}35, inset 0 0 8px ${agent.accent}08`,
        }}
      >
        {/* CRT scanline overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 3px)",
          zIndex: 10,
        }}/>
        {/* Screen content */}
        <div className="relative z-0 h-full">
          {renderScreen()}
        </div>
        {/* Corner LEDs */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-sm"
          style={{background: agent.accent, opacity: isIdle?0.15:0.8}}/>
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-sm"
          style={{background: agent.accent, opacity: isIdle?0.15:0.8}}/>
      </div>

      {/* ── Monitor stand ── */}
      <div className="mx-auto" style={{
        width:8, height:8, background:"#060e1a",
        borderLeft:"1px solid #0a1428", borderRight:"1px solid #0a1428",
      }}/>
      <div className="mx-auto" style={{
        width:28, height:4, background:"#060e1a",
        borderBottom:"1px solid #0a1428",
      }}/>

      {/* ── Desk surface (trapezoid-ish via padding) ── */}
      <div
        className="rounded-sm relative"
        style={{
          width: deskW + 20,
          marginLeft: -10,
          height: 22,
          background: isIdle ? "#0d1628" : "#0e1e34",
          border: `1px solid ${isIdle?"#14253a":agent.accent+"55"}`,
          boxShadow: isIdle?"none":`0 0 8px ${agent.accent}20`,
        }}
      >
        {/* Keyboard */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2" style={{
          width:52, height:10,
          background:"#060e1a", borderRadius:1,
          border:`1px solid ${isIdle?"#0e1c2e":agent.accent+"40"}`,
        }}>
          {[0,1,2].map(r=>(
            <div key={r} className="flex gap-px px-0.5 mt-px">
              {[0,1,2,3,4,5].map(c=>(
                <div key={c} className="flex-1" style={{
                  height:2, background:agent.accent, opacity:isIdle?0.08:0.22, borderRadius:0.5
                }}/>
              ))}
            </div>
          ))}
        </div>
        {/* Status LED */}
        <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-sm"
          style={{background:stateColor, opacity:isIdle?0.2:1,
            boxShadow:isIdle?"none":`0 0 4px ${stateColor}`}}/>
        {/* Props on desk corner */}
        {agent.props && agent.props.length > 0 && (
          <div className="absolute top-[-20px]" style={{
            left: agent.props.includes("plant")||agent.props.includes("sword") ? "auto" : "auto",
            right: 4,
          }}>
            <DeskProp type={agent.props[0]!}/>
          </div>
        )}
        {agent.props && agent.props[1] && (
          <div className="absolute top-[-20px]" style={{left:4}}>
            <DeskProp type={agent.props[1]}/>
          </div>
        )}
      </div>

      {/* ── Desk front face ── */}
      <div style={{
        width: deskW + 10,
        marginLeft: -5,
        height: 10,
        background: "#060e18",
        borderLeft: "1px solid #0a1424",
        borderRight:"1px solid #0a1424",
        borderBottom:"1px solid #0a1424",
      }}/>

      {/* ── Floor shadow ── */}
      {!isIdle && (
        <div className="mx-auto rounded-full" style={{
          width: deskW * 1.1,
          height: 8,
          background: `radial-gradient(ellipse, ${agent.accent}30, transparent)`,
          marginLeft: -(deskW*.05),
        }}/>
      )}

      {/* ── Label ── */}
      <div className="text-center mt-1">
        <div className="font-mono font-bold uppercase tracking-widest"
          style={{fontSize:agent.isMaster?9:7.5, color:isIdle?"#1e3a5f":agent.accent,
            textShadow:isIdle?"none":`0 0 8px ${agent.accent}80`}}>
          {agent.label}
        </div>
        <div className="font-mono uppercase tracking-wide"
          style={{fontSize:6, color:agent.accent, opacity:isIdle?0.2:0.6}}>
          [{agent.role}]
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cable connections SVG
// ─────────────────────────────────────────────────────────────────────────────

function CableConnections() {
  const [phase, setPhase] = useState(0);
  useEffect(()=>{
    const t = setInterval(()=>setPhase(p=>p+2),40);
    return ()=>clearInterval(t);
  },[]);

  // Cable paths as % — from satellite to master
  // master is at x=50%, y=33%  (plus some offset for desk bottom)
  const cables = [
    { id:"trend",      x1:10, y1:77, x2:50, y2:72, color:"#ffd700", active:true  },
    { id:"smc",        x1:22, y1:84, x2:50, y2:78, color:"#ffd700", active:true  },
    { id:"news",       x1:50, y1:88, x2:50, y2:80, color:"#4ade80", active:false },
    { id:"risk",       x1:87, y1:77, x2:50, y2:72, color:"#4ade80", active:true  },
    { id:"contrarian", x1:77, y1:84, x2:50, y2:78, color:"#ffd700", active:false },
    { id:"execution",  x1:91, y1:82, x2:50, y2:78, color:"#22d3ee", active:false },
  ];

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none"
      style={{zIndex:5}} viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        {cables.map(c=>(
          <linearGradient key={c.id} id={`cg-${c.id}`}
            x1={`${c.x1}%`} y1={`${c.y1}%`} x2={`${c.x2}%`} y2={`${c.y2}%`}
            gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={c.color} stopOpacity="0.8"/>
            <stop offset="100%" stopColor={c.color} stopOpacity="0.3"/>
          </linearGradient>
        ))}
      </defs>
      {cables.map(c=>{
        const mx=(c.x1+c.x2)/2, my=Math.min(c.y1,c.y2)-3;
        return (
          <g key={c.id}>
            {/* Track */}
            <path d={`M ${c.x1} ${c.y1} Q ${mx} ${my} ${c.x2} ${c.y2}`}
              fill="none" stroke="#0a1c30" strokeWidth="0.35" opacity="0.6"/>
            {/* Active cable */}
            <path d={`M ${c.x1} ${c.y1} Q ${mx} ${my} ${c.x2} ${c.y2}`}
              fill="none" stroke={`url(#cg-${c.id})`}
              strokeWidth={c.active?"0.3":"0.2"}
              opacity={c.active?0.65:0.3}
              strokeDasharray="1.5 1.5"
              strokeDashoffset={-phase/50}/>
            {/* Endpoint dot at master */}
            {c.active&&(
              <circle cx={c.x2} cy={c.y2} r="0.4" fill={c.color} opacity="0.7"/>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Back wall: TRADEX display, clock, exchange rates
// ─────────────────────────────────────────────────────────────────────────────

function BackWall() {
  const time = useClock();
  const [rates, setRates] = useState({
    GLB:  1.0000,
    USD:  1.0842,
    EUR:  0.9214,
    GBP:  0.7832,
    JPY: 151.24,
    BTC: 67420.0,
    XAU: 2318.50,
  });

  useEffect(()=>{
    const t = setInterval(()=>{
      setRates(prev=>({
        GLB:  prev.GLB,
        USD:  +(prev.USD  + (Math.random()-.5)*.002).toFixed(4),
        EUR:  +(prev.EUR  + (Math.random()-.5)*.002).toFixed(4),
        GBP:  +(prev.GBP  + (Math.random()-.5)*.002).toFixed(4),
        JPY:  +(prev.JPY  + (Math.random()-.5)*.04).toFixed(2),
        BTC:  +(prev.BTC  + (Math.random()-.5)*80).toFixed(1),
        XAU:  +(prev.XAU  + (Math.random()-.5)*1.5).toFixed(2),
      }));
    }, 2500);
    return ()=>clearInterval(t);
  },[]);

  const hh = time.getHours().toString().padStart(2,"0");
  const mm = time.getMinutes().toString().padStart(2,"0");
  const ss = time.getSeconds().toString().padStart(2,"0");

  // Clock hand angles
  const secAngle  = (time.getSeconds()/60)*360;
  const minAngle  = (time.getMinutes()/60)*360 + (time.getSeconds()/60)*6;
  const hourAngle = (time.getHours()%12/12)*360 + (time.getMinutes()/60)*30;

  return (
    <div className="absolute top-0 left-0 right-0"
      style={{height:"36%", background:"linear-gradient(to bottom, #040c1c, #070f1e)", zIndex:2}}>

      {/* Wall panel lines */}
      {[25,50,75].map(p=>(
        <div key={p} className="absolute top-0 bottom-0"
          style={{left:`${p}%`, width:1, background:"#0c2038", opacity:0.5}}/>
      ))}
      {[33,66].map(p=>(
        <div key={p} className="absolute left-0 right-0"
          style={{top:`${p}%`, height:1, background:"#0c2038", opacity:0.5}}/>
      ))}

      {/* ── TRADEX MAIN DISPLAY (center) ── */}
      <div className="absolute"
        style={{left:"20%", right:"20%", top:"8%", bottom:"6%",
          background:"#01060e", border:"1px solid #0d2444",
          boxShadow:"0 0 30px rgba(34,211,238,0.08), inset 0 0 20px rgba(34,211,238,0.02)"}}>
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:"repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
          zIndex:5,
        }}/>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-0">
          <div className="font-mono font-bold tracking-[0.55em] text-[#c8e8ff]"
            style={{fontSize:"clamp(16px,2.5vw,32px)",
              textShadow:"0 0 20px rgba(200,232,255,0.4), 0 0 40px rgba(34,211,238,0.2)"}}>
            TRADEX
          </div>
          <div className="font-mono tracking-[0.3em] text-[#4a8cb8]"
            style={{fontSize:"clamp(5px,0.9vw,10px)"}}>
            MULTI-AGENT INTELLIGENCE PLATFORM
          </div>
          <div className="w-4/5 h-px bg-[#22d3ee] opacity-10 my-0.5"/>
          <div className="font-mono text-[#3a78a8]"
            style={{fontSize:"clamp(4px,0.7vw,8px)", letterSpacing:"0.2em"}}>
            7 ACTIVE AGENTS · REAL-TIME CONSENSUS
          </div>
        </div>
        {/* Corner brackets */}
        {[[2,2,"right","bottom"],["-2","2","left","bottom"],[2,"-2","right","top"],["-2","-2","left","top"]].map((_,i)=>(
          <div key={i} className="absolute" style={{
            [i<2?"bottom":"top"]:"4px",
            [i%2===0?"right":"left"]:"4px",
            width:14, height:14,
            borderTop: i>=2?`1.5px solid rgba(34,211,238,0.4)`:"none",
            borderBottom: i<2?`1.5px solid rgba(34,211,238,0.4)`:"none",
            borderLeft: i%2!==0?`1.5px solid rgba(34,211,238,0.4)`:"none",
            borderRight: i%2===0?`1.5px solid rgba(34,211,238,0.4)`:"none",
          }}/>
        ))}
        {/* Glow rim */}
        <div className="absolute inset-0 pointer-events-none" style={{
          border:"0.5px solid rgba(34,211,238,0.12)",
          boxShadow:"inset 0 0 30px rgba(34,211,238,0.03)",
        }}/>
      </div>

      {/* ── CLOCK (right wall area) ── */}
      <div className="absolute" style={{right:"3.5%", top:"8%", width:"12%"}}>
        <div className="text-center font-mono text-[8px] text-[#22d3ee] opacity-60 mb-1 tracking-widest">
          SYSTEM TIME
        </div>
        <div className="flex justify-center mb-1">
          <svg width="54" height="54" viewBox="0 0 54 54">
            <circle cx="27" cy="27" r="24" fill="#020c18" stroke="#0d2444" strokeWidth="1.5"/>
            <circle cx="27" cy="27" r="22" fill="none" stroke="#22d3ee" strokeWidth="0.4" opacity="0.2"/>
            {/* Hour markers */}
            {Array.from({length:12},(_,i)=>{
              const a=(i/12)*2*Math.PI-Math.PI/2;
              const r1=18, r2=21;
              return <line key={i}
                x1={27+r1*Math.cos(a)} y1={27+r1*Math.sin(a)}
                x2={27+r2*Math.cos(a)} y2={27+r2*Math.sin(a)}
                stroke="#22d3ee" strokeWidth="1" opacity="0.4"/>;
            })}
            {/* Hour hand */}
            {(()=>{
              const a=(hourAngle-90)*Math.PI/180;
              return <line x1="27" y1="27" x2={27+11*Math.cos(a)} y2={27+11*Math.sin(a)}
                stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>;
            })()}
            {/* Minute hand */}
            {(()=>{
              const a=(minAngle-90)*Math.PI/180;
              return <line x1="27" y1="27" x2={27+15*Math.cos(a)} y2={27+15*Math.sin(a)}
                stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" opacity="0.85"/>;
            })()}
            {/* Second hand */}
            {(()=>{
              const a=(secAngle-90)*Math.PI/180;
              return <line x1="27" y1="27" x2={27+16*Math.cos(a)} y2={27+16*Math.sin(a)}
                stroke="#f59e0b" strokeWidth="0.7" strokeLinecap="round" opacity="0.8"/>;
            })()}
            <circle cx="27" cy="27" r="1.5" fill="#22d3ee"/>
          </svg>
        </div>
        <div className="text-center font-mono font-bold tracking-widest"
          style={{fontSize:12, color:"#22d3ee",
            textShadow:"0 0 8px rgba(34,211,238,0.5)"}}>
          {hh}:{mm}:{ss}
        </div>
      </div>

      {/* ── FX RATES table (right side panel) ── */}
      <div className="absolute" style={{right:"3.5%", top:"52%", width:"12%"}}>
        <div className="text-center font-mono text-[7px] text-[#22d3ee] opacity-50 mb-1 tracking-widest">
          FX RATES
        </div>
        <div className="space-y-0.5">
          {Object.entries(rates).map(([sym,val])=>{
            const isUp = Math.random()>.5;
            return (
              <div key={sym} className="flex justify-between font-mono" style={{fontSize:7}}>
                <span style={{color:"#4a8cb8"}}>{sym}</span>
                <span style={{color:isUp?"#10b981":"#ef4444",
                  textShadow:isUp?"0 0 4px rgba(16,185,129,0.4)":"0 0 4px rgba(239,68,68,0.4)"}}>
                  {sym==="BTC"?val.toFixed(0):sym==="JPY"?val.toFixed(2):val.toFixed(4)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ceiling lights */}
      {[22,50,78].map(x=>(
        <div key={x} className="absolute top-0"
          style={{left:`${x}%`, transform:"translateX(-50%)", width:140, height:8,
            background:"radial-gradient(ellipse, rgba(245,158,11,0.15), transparent)",
            filter:"blur(4px)"}}>
          <div style={{
            width:"100%", height:3, background:"rgba(245,158,11,0.12)", borderRadius:2
          }}/>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation bar
// ─────────────────────────────────────────────────────────────────────────────

function NavBar({onRun, running}: {onRun:()=>void; running:boolean}) {
  const [bg, setBg] = useState("Final Fantasy");
  return (
    <div className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{background:"#060d1a", borderBottom:"1px solid #0d1e30",
        boxShadow:"0 1px 0 rgba(34,211,238,0.05)"}}>
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#22d3ee]"
          style={{boxShadow:"0 0 6px rgba(34,211,238,0.8)"}}/>
        <span className="font-mono font-bold text-sm tracking-[0.3em] text-white uppercase">
          NEWSROOM
        </span>
        <span className="text-[9px] font-mono text-[#22d3ee] opacity-40 tracking-widest hidden sm:block">
          TRADEX · AI OPERATIONS
        </span>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-3">
        {/* Agent status dots */}
        <div className="hidden md:flex items-center gap-1.5">
          {AGENTS.map(a=>(
            <div key={a.id} title={a.label}
              className="w-1.5 h-1.5 rounded-sm"
              style={{background:STATE_COLORS[a.state],
                boxShadow:`0 0 4px ${STATE_COLORS[a.state]}80`,
                opacity: a.state==="idle"?"0.3":"1"
              }}/>
          ))}
        </div>

        {/* Background selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-[#4a8cb8]">Background</span>
          <select
            value={bg} onChange={e=>setBg(e.target.value)}
            className="text-[9px] font-mono rounded px-2 py-1 outline-none cursor-pointer"
            style={{
              background:"#0d1628", color:"#22d3ee",
              border:"1px solid #1e3a5f",
            }}
          >
            {["Final Fantasy","Cyberpunk","Dark Office","Neural Net"].map(opt=>(
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Run Pipeline button */}
        <button
          onClick={onRun}
          disabled={running}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded font-mono font-bold text-[10px]",
            "uppercase tracking-widest transition-all duration-200",
            running
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105 active:scale-95"
          )}
          style={{
            background: running ? "#0a1a2e" : "linear-gradient(135deg, #0a2040, #0e2c50)",
            border:`1px solid ${running?"#1e3a5f":"#22d3ee80"}`,
            color: running ? "#22d3ee80" : "#22d3ee",
            boxShadow: running ? "none" : "0 0 12px rgba(34,211,238,0.2)",
          }}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full",
            running?"bg-[#22d3ee] animate-pulse":"bg-[#22d3ee]")}
            style={{boxShadow:"0 0 4px rgba(34,211,238,0.8)"}}/>
          {running ? "RUNNING..." : "RUN PIPELINE"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Room atmosphere (floor, ambient particles)
// ─────────────────────────────────────────────────────────────────────────────

function RoomFloor() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{zIndex:1}}>
      {/* Floor starts at 36% */}
      <div className="absolute left-0 right-0 bottom-0" style={{top:"36%",
        background:"linear-gradient(to bottom, #070f1e, #050c16)"}}>
        {/* Perspective grid */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 64"
          preserveAspectRatio="none">
          {/* Vertical lines converging to VP at (50, -10) */}
          {[-45,-30,-20,-10,0,10,20,30,45].map((dx,i)=>(
            <line key={i} x1={50+dx*.1} y1={0} x2={50+dx} y2={64}
              stroke="#0c1e34" strokeWidth="0.4" opacity="0.5"/>
          ))}
          {/* Horizontal depth bands */}
          {[10,22,36,52].map((y,i)=>(
            <line key={i} x1={0} y1={y} x2={100} y2={y}
              stroke="#0a1c2e" strokeWidth="0.4" opacity={0.3+i*.05}/>
          ))}
        </svg>
      </div>
      {/* Ceiling ambient glow */}
      <div className="absolute top-0 left-0 right-0" style={{height:"36%",
        background:"linear-gradient(to bottom, rgba(34,211,238,0.01), transparent)"}}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(()=>{
    setRunning(true);
    setTimeout(()=>setRunning(false), 4000);
  },[]);

  return (
    <div className="flex flex-col w-full rounded-xl overflow-hidden"
      style={{background:"#060c18", border:"1px solid rgba(255,255,255,0.05)",
        minHeight:580}}>
      {/* Navigation */}
      <NavBar onRun={handleRun} running={running}/>

      {/* Main scene */}
      <div className="flex-1 relative overflow-hidden" style={{minHeight:520}}>
        {/* Floor / atmosphere */}
        <RoomFloor/>

        {/* Back wall with displays */}
        <BackWall/>

        {/* Cable connections */}
        <CableConnections/>

        {/* Agent stations (z-index above cables) */}
        {AGENTS.map(agent=>(
          <AgentStation key={agent.id} agent={agent}/>
        ))}

        {/* "Running" pipeline flash */}
        {running && (
          <div className="absolute inset-0 pointer-events-none" style={{
            zIndex:50,
            background:"radial-gradient(ellipse 60% 40% at 50% 40%, rgba(34,211,238,0.04), transparent)",
            animation:"core-breathe 0.5s ease-in-out infinite",
          }}/>
        )}

        {/* Bottom status bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-1"
          style={{
            background:"linear-gradient(to top, rgba(4,8,18,0.95), transparent)",
            zIndex:40,
          }}>
          <span className="font-mono text-[7px] tracking-[0.3em] uppercase"
            style={{color:"rgba(34,211,238,0.3)"}}>
            TRADEX · AI OPERATIONS CENTER
          </span>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-[#10b981]"
              style={{boxShadow:"0 0 4px rgba(16,185,129,0.8)"}}/>
            <span className="font-mono text-[7px] tracking-widest"
              style={{color:"rgba(16,185,129,0.6)"}}>
              {running ? "PIPELINE ACTIVE" : "7 AGENTS ONLINE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
