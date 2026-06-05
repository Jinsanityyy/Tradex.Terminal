"use client";

import React, { useState, useEffect } from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─── State system (UNCHANGED) ─────────────────────────────────────────────────
type AgentState = "idle"|"bull"|"bear"|"alert"|"approved"|"blocked"|"armed"|"analyzing";
interface SC { accent:string; screen:string; badge:string }

const STATE:Record<AgentState,SC> = {
  idle:      {accent:"#1e3a5f", screen:"#020810", badge:"IDLE"      },
  bull:      {accent:"#00ff9c", screen:"#001a0a", badge:"BULLISH"   },
  bear:      {accent:"#ff4466", screen:"#180006", badge:"BEARISH"   },
  alert:     {accent:"#ffaa00", screen:"#100800", badge:"ALERT"     },
  approved:  {accent:"#00ff9c", screen:"#001a0a", badge:"VALID"     },
  blocked:   {accent:"#ff4466", screen:"#180006", badge:"BLOCKED"   },
  armed:     {accent:"#00ffee", screen:"#001210", badge:"ARMED"     },
  analyzing: {accent:"#22d3ee", screen:"#010c10", badge:"ANALYZING" },
};

function deriveStates(d:AgentRunResult):Record<string,AgentState> {
  const {agents} = d;
  const bias = agents.master.finalBias;
  return {
    // Directional bias always wins regardless of confidence.
    // Confidence only resolves neutral → idle (low) vs alert (mid).
    trend:
      agents.trend.bias==="bullish" ? "bull" :
      agents.trend.bias==="bearish" ? "bear" :
      agents.trend.confidence<35    ? "idle" : "alert",
    smc:
      agents.smc.bias==="bullish"   ? "bull" :
      agents.smc.bias==="bearish"   ? "bear" :
      agents.smc.liquiditySweepDetected ? "alert" :
      agents.smc.confidence<35      ? "idle" : "alert",
    news:
      agents.news.impact==="bullish" ? "bull" :
      agents.news.impact==="bearish" ? "bear" :
      agents.news.riskScore>=65      ? "alert" : "idle",
    risk:       agents.risk.valid ? "approved" : "blocked",
    contrarian:
      agents.contrarian.challengesBias&&agents.contrarian.trapConfidence>=60 ? "blocked" :
      agents.contrarian.challengesBias ? "alert" : "idle",
    master:
      bias==="bullish" ? "bull" :
      bias==="bearish" ? "bear" :
      bias==="no-trade" ? "analyzing" : "alert",
    execution:
      agents.execution.hasSetup&&agents.risk.valid&&bias!=="no-trade" ? "armed" :
      agents.execution.hasSetup ? "alert" : "idle",
  };
}

// ─── Agent pin config ─────────────────────────────────────────────────────────
// Positions as % of image (detected from user-annotated circles)
interface PinConfig {
  id: string;
  stateKey: string;
  label: string;
  role: string;
  px: number; // left %
  py: number; // top %
  isMaster?: boolean;
}

const PINS: PinConfig[] = [
  { id:"trend",      stateKey:"trend",      label:"TREND",      role:"Macro Bias Analyst",         px:27.08, py:39.65 },
  { id:"priceaction",stateKey:"smc",        label:"PR. ACTION", role:"Price Action Analyst",       px:42.97, py:41.70 },
  { id:"newsintel",  stateKey:"news",       label:"NEWS INTEL", role:"Fundamentals Analyst",       px:62.76, py:47.85 },
  { id:"mastercmo",  stateKey:"master",     label:"MASTER CMO", role:"Chief Market Officer",       px:80.40, py:50.10, isMaster:true },
  { id:"riskrate",   stateKey:"risk",       label:"RISK RATE",  role:"Risk Management Agent",      px:13.09, py:57.03 },
  { id:"contrarian", stateKey:"contrarian", label:"CONTRARIAN", role:"Counter-Signal Analyst",     px:42.64, py:69.24 },
  { id:"execution",  stateKey:"execution",  label:"EXECUTION",  role:"Entry Timing Agent",         px:72.66, py:77.05 },
];

function getAgentReasons(key: string, data: AgentRunResult | null): string[] {
  if (!data) return ["Awaiting analysis data..."];
  const { agents } = data;
  switch (key) {
    case "trend":      return agents.trend.reasons.length ? agents.trend.reasons : ["No trend reasons available."];
    case "smc":        return agents.smc.reasons.length ? agents.smc.reasons : ["No price action reasons available."];
    case "news":       return agents.news.reasons.length ? agents.news.reasons : ["No news data."];
    case "master": {
      const lines = [...(agents.master.supports ?? []), ...(agents.master.noTradeReason ? [agents.master.noTradeReason] : [])];
      return lines.length ? lines : ["No consensus data."];
    }
    case "risk":       return agents.risk.reasons.length ? agents.risk.reasons : ["No risk reasons available."];
    case "contrarian": return agents.contrarian.failureReasons.length ? agents.contrarian.failureReasons : [agents.contrarian.alternativeScenario || "No counter-signals detected."];
    case "execution":  return agents.execution.hasSetup
      ? ([agents.execution.triggerCondition, ...agents.execution.managementNotes].filter(Boolean) as string[])
      : ["No valid setup found. Waiting for entry conditions."];
    default:           return ["No data available."];
  }
}

function getConsolePrefixAndColor(reason: string): { prefix: string; color: string } {
  const r = reason.toLowerCase();
  if (/pdh|pwh|pdl|pwl|sweep|liquidity grab|hunt/.test(r))        return { prefix: "⬛ [CRITICAL]", color: "#ff6655" };
  if (/imbalance|fvg|fair value|order block|\bob\b|zone|gap/.test(r)) return { prefix: "🟧 [ZONE]",     color: "#ffaa44" };
  if (/bias|trend|structure|bos|choch|break of/.test(r))            return { prefix: "🟦 [BIAS]",     color: "#22d3ee" };
  if (/confluence|aligned|confirmed|valid.*setup|setup.*valid/.test(r)) return { prefix: "🟩 [CONFIRM]", color: "#00ff9c" };
  if (/risk|invalid|reject|block|fail|not.*valid/.test(r))          return { prefix: "🟥 [RISK]",     color: "#ff4466" };
  if (/news|event|cpi|nfp|fomc|rate|gdp|pmi|fed/.test(r))          return { prefix: "🟪 [NEWS]",     color: "#9b6dff" };
  if (/entry|trigger|arm|execut|fire|scalp/.test(r))               return { prefix: "⬜ [ENTRY]",    color: "#00ffee" };
  if (/wait|pending|monitor|watch|approach|return/.test(r))         return { prefix: "⬛ [WATCH]",    color: "#668899" };
  return { prefix: "⬛ [INFO]",     color: "#667788" };
}

function getSession(): { label: string; color: string } {
  const h = new Date().getUTCHours();
  if (h >= 21 || h < 7)  return { label: "ASIA",   color: "#9b6dff" };
  if (h >= 7  && h < 13) return { label: "LONDON", color: "#22d3ee" };
  return { label: "NY", color: "#00ff9c" };
}

function getConfidenceValue(stateKey: string, data: AgentRunResult | null): number {
  if (!data) return 0;
  const { agents } = data;
  switch (stateKey) {
    case "master":     return agents.master.confidence;
    case "trend":      return agents.trend.confidence;
    case "smc":        return agents.smc.confidence;
    case "news":       return agents.news.confidence;
    case "risk":       return agents.risk.sessionScore;
    case "contrarian": return agents.contrarian.trapConfidence;
    case "execution":  return agents.execution.hasSetup ? 75 : 30;
    default:           return 0;
  }
}

function ConfidenceArc({ value, color }: { value: number; color: string }) {
  const r = 26; const size = 68; const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#0a1a2a" strokeWidth="5" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.7s ease", filter:`drop-shadow(0 0 4px ${color}88)` }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ color, fontSize:15, fontWeight:700, fontFamily:"var(--font-geist-mono), monospace", lineHeight:1 }}>{value}</span>
        <span style={{ color:"#3a4a5a", fontSize:7, fontFamily:"var(--font-geist-mono), monospace" }}>%</span>
      </div>
    </div>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────
export function AgentCommandRoom({ data, loading=false, focusedAgentId, onHoverAgentChange, onSelectAgentChange }: {
  data: AgentRunResult|null; loading?: boolean; focusedAgentId?: string | null; onHoverAgentChange?: (agentId: string | null) => void; onSelectAgentChange?: (agentId: string | null) => void;
}) {
  const [activeId, setActiveId] = useState<string|null>(null);
  const [hoveredId, setHoveredId] = useState<string|null>(null);
  const [session, setSession] = useState(getSession);

  useEffect(() => {
    const t = setInterval(() => setSession(getSession()), 60_000);
    return () => clearInterval(t);
  }, []);

  const states: Record<string,AgentState> = data
    ? deriveStates(data)
    : { trend:"idle", smc:"idle", news:"idle", risk:"idle", contrarian:"idle", master:"analyzing", execution:"idle" };

  const sc = (key: string): SC => STATE[states[key] ?? "idle"];
  const activePinData = PINS.find(p => p.id === activeId);
  const activeSC = activePinData ? sc(activePinData.stateKey) : null;
  const activeState = activePinData ? (states[activePinData.stateKey] ?? "idle") : null;
  const visualFocusId = hoveredId ?? focusedAgentId ?? activeId;

  const masterSC = sc("master");
  const conf       = data?.agents.master.confidence ?? 0;
  const finalBias  = data?.agents.master.finalBias ?? "no-trade";
  const sigState   = data?.agents.execution?.signalState;
  const isExpired  = sigState === "EXPIRED";
  // Only override detail panel for execution + master — trend/smc/news/risk/contrarian show real analysis even when entry signal expires.
  const agentExpiredOverride = isExpired && (activePinData?.stateKey === "execution" || activePinData?.stateKey === "master");
  const biasColor  = isExpired ? "#4a5568"
    : finalBias==="bullish" ? "#00ff9c"
    : finalBias==="bearish" ? "#ff4466"
    : "#ffaa00";
  const biasLabel  = isExpired ? "◌  EXPIRED"
    : finalBias==="bullish" ? "▲ BULLISH"
    : finalBias==="bearish" ? "▼ BEARISH"
    : " -  NO TRADE";

  const confVal        = activePinData ? getConfidenceValue(activePinData.stateKey, data) : 0;
  const tradePlan      = data?.agents.master.tradePlan ?? null;
  const showPrices     = !!activePinData && (activePinData.stateKey==="master"||activePinData.stateKey==="execution") && !!tradePlan;
  const showProgress   = !!activePinData && (activePinData.stateKey==="execution"||activePinData.stateKey==="master");
  const progressStep   = !data || finalBias === "no-trade" || agentExpiredOverride ? -1 : sigState==="ARMED" ? 1 : 0;
  const progressSteps  = ["ARMED","TRIGGERED","COMPLETE"] as const;

  return (
    <div className="w-full rounded-xl border border-cyan-500/20 bg-[#07090f] flex flex-col h-full overflow-y-auto scrollbar-none">
      <style>{`
        @keyframes hqPulse {
          0%   { transform:translate(-50%,-50%) scale(1);    opacity:0.7; }
          60%  { transform:translate(-50%,-50%) scale(1.55); opacity:0.12; }
          100% { transform:translate(-50%,-50%) scale(1);    opacity:0.7; }
        }
        @keyframes hqPulse2 {
          0%   { transform:translate(-50%,-50%) scale(1.1);  opacity:0.35; }
          60%  { transform:translate(-50%,-50%) scale(1.8);  opacity:0; }
          100% { transform:translate(-50%,-50%) scale(1.1);  opacity:0.35; }
        }
        @keyframes hqAlert {
          0%   { transform:translate(-50%,-50%) scale(1);    opacity:1; }
          50%  { transform:translate(-50%,-50%) scale(1.75); opacity:0.15; }
          100% { transform:translate(-50%,-50%) scale(1);    opacity:1; }
        }
        @keyframes hqFadeUp {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .hq-card-enter { animation: hqFadeUp 0.28s ease both; }
      `}</style>

      {/* ── IMAGE + PINS ── */}
      <div className="w-full overflow-hidden bg-[#07090f] shrink-0">
        <div
          className="relative mx-auto w-full bg-[#07090f] overflow-hidden"
          style={{ lineHeight:0, aspectRatio:"1536 / 1024", maxHeight:"45vh" }}
        >
          <svg viewBox="0 0 1536 1024" className="absolute inset-0 block w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="hqBg" cx="55%" cy="52%" r="70%"><stop offset="0%" stopColor="#071828"/><stop offset="100%" stopColor="#07090f"/></radialGradient>
              <filter id="hqG25" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="25"/></filter>
              <filter id="hqGS" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            {/* Background */}
            <rect width="1536" height="1024" fill="url(#hqBg)"/>
            {/* Horizontal grid lines */}
            <g stroke="#0d2238" strokeWidth="0.8" opacity="0.7">
              {[320,380,450,530,620,720,830,940].map(y=><line key={y} x1="0" y1={y} x2="1536" y2={y}/>)}
            </g>
            {/* Perspective vertical lines → VP (768,300) */}
            <g stroke="#0d2238" strokeWidth="0.5" opacity="0.5">
              {[0,150,300,460,614,768,922,1076,1236,1386,1536].map(bx=><line key={bx} x1={bx} y1={1024} x2={768} y2={300}/>)}
            </g>
            {/* Main display screen */}
            <rect x="380" y="18" width="776" height="228" rx="3" fill="#030c18" stroke="#0f2d4a" strokeWidth="1.5"/>
            <rect x="395" y="32" width="746" height="202" rx="2" fill="#020a15"/>
            <text x="768" y="47" textAnchor="middle" fill="#0e3a5a" fontFamily="monospace" fontSize="9" letterSpacing="5" fontWeight="700">TRADEX · MARKET INTELLIGENCE TERMINAL · COMMAND FLOOR</text>
            <line x1="940" y1="40" x2="940" y2="228" stroke="#0d2a42" strokeWidth="1"/>
            <g fill="#0a2535" opacity="0.9">{[58,71,84,97,110,123,136,149,162,175,188,201,214].map((y,i)=><rect key={y} x="410" y={y} width={[520,340,440,280,390,460,300,420,350,500,260,480,380][i]} height="3" rx="1.5"/>)}</g>
            <g fill="#0d3a5a" opacity="0.9">{[58,71,84,97,110,123,136,149,162,175,188,201,214].map((y,i)=><rect key={y} x="960" y={y} width={[170,130,155,120,145,165,110,150,175,125,140,160,135][i]} height="3" rx="1.5"/>)}</g>
            <polyline points="960,192 980,177 1010,183 1042,166 1072,171 1102,149 1112,156 1128,139" fill="none" stroke="#0d3a5a" strokeWidth="1.5"/>
            {/* TradeX watermark */}
            <text x="768" y="313" textAnchor="middle" fill="#071828" fontFamily="monospace" fontSize="52" letterSpacing="22" fontWeight="900" opacity="0.35">TRADEX</text>
            <text x="768" y="335" textAnchor="middle" fill="#071828" fontFamily="monospace" fontSize="10" letterSpacing="8" opacity="0.25">COMMAND FLOOR</text>
            {/* Agent ambient glows */}
            <ellipse cx="201" cy="584" rx="80" ry="55" fill="#7f1d1d" filter="url(#hqG25)" opacity="0.35"/>
            <ellipse cx="416" cy="406" rx="80" ry="55" fill="#064e3b" filter="url(#hqG25)" opacity="0.35"/>
            <ellipse cx="655" cy="709" rx="80" ry="55" fill="#7c2d12" filter="url(#hqG25)" opacity="0.35"/>
            <ellipse cx="660" cy="427" rx="80" ry="55" fill="#0c4a6e" filter="url(#hqG25)" opacity="0.35"/>
            <ellipse cx="964" cy="490" rx="80" ry="55" fill="#3b0764" filter="url(#hqG25)" opacity="0.35"/>
            <ellipse cx="1115" cy="789" rx="80" ry="55" fill="#78350f" filter="url(#hqG25)" opacity="0.35"/>
            <ellipse cx="1234" cy="513" rx="130" ry="85" fill="#1e3a8a" filter="url(#hqG25)" opacity="0.45"/>
            {/* Connection lines */}
            <g stroke="#0d2a40" strokeWidth="0.8" strokeDasharray="5 5" opacity="0.55">
              <line x1="201" y1="584" x2="416" y2="406"/>
              <line x1="416" y1="406" x2="660" y2="427"/>
              <line x1="660" y1="427" x2="964" y2="490"/>
              <line x1="964" y1="490" x2="1234" y2="513"/>
              <line x1="201" y1="584" x2="655" y2="709"/>
              <line x1="655" y1="709" x2="1115" y2="789"/>
              <line x1="1115" y1="789" x2="1234" y2="513"/>
              <line x1="416" y1="406" x2="1234" y2="513"/>
            </g>
            {/* Risk Rate monitor (201,584) red */}
            <g filter="url(#hqGS)"><rect x="155" y="555" width="92" height="58" rx="2" fill="#0a0f15" stroke="#ef444430" strokeWidth="1"/><rect x="161" y="560" width="80" height="47" rx="1" fill="#0a1520"/><g fill="#ef444420">{[564,572,580,588,596].map((y,i)=><rect key={y} x="165" y={y} width={[50,38,45,35,42][i]} height="2" rx="1"/>)}</g></g>
            <rect x="148" y="609" width="110" height="11" rx="1" fill="#0a1520" stroke="#1a2840" strokeWidth="0.8"/>
            {/* Trend monitor (416,406) green */}
            <g filter="url(#hqGS)"><rect x="370" y="377" width="92" height="58" rx="2" fill="#0a0f15" stroke="#10b98130" strokeWidth="1"/><rect x="376" y="382" width="80" height="47" rx="1" fill="#0a1a14"/><g fill="#10b98120">{[386,394,402,410,418,426].map((y,i)=><rect key={y} x="380" y={y} width={[55,40,50,35,48,32][i]} height="2" rx="1"/>)}</g><polyline points="380,426 393,420 406,415 419,419 432,411 445,413 451,406" fill="none" stroke="#10b98130" strokeWidth="1"/></g>
            <rect x="363" y="431" width="110" height="11" rx="1" fill="#0a1520" stroke="#1a2840" strokeWidth="0.8"/>
            {/* Price Action monitor (660,427) blue */}
            <g filter="url(#hqGS)"><rect x="614" y="398" width="92" height="58" rx="2" fill="#0a0f15" stroke="#38bdf830" strokeWidth="1"/><rect x="620" y="403" width="80" height="47" rx="1" fill="#0a1525"/><g fill="#38bdf820">{[407,415,423,431,439].map((y,i)=><rect key={y} x="624" y={y} width={[52,38,48,33,45][i]} height="2" rx="1"/>)}</g></g>
            <rect x="607" y="452" width="110" height="11" rx="1" fill="#0a1520" stroke="#1a2840" strokeWidth="0.8"/>
            {/* News Intel monitor (964,490) purple */}
            <g filter="url(#hqGS)"><rect x="918" y="461" width="92" height="58" rx="2" fill="#0a0f15" stroke="#a78bfa30" strokeWidth="1"/><rect x="924" y="466" width="80" height="47" rx="1" fill="#12081e"/><g fill="#a78bfa20">{[470,478,486,494,502].map((y,i)=><rect key={y} x="928" y={y} width={[55,42,50,36,48][i]} height="2" rx="1"/>)}</g></g>
            <rect x="911" y="515" width="110" height="11" rx="1" fill="#0a1520" stroke="#1a2840" strokeWidth="0.8"/>
            {/* Contrarian monitor (655,709) orange */}
            <g filter="url(#hqGS)"><rect x="609" y="680" width="92" height="58" rx="2" fill="#0a0f15" stroke="#fb923c30" strokeWidth="1"/><rect x="615" y="685" width="80" height="47" rx="1" fill="#1a0d07"/><g fill="#fb923c20">{[689,697,705,713,721].map((y,i)=><rect key={y} x="619" y={y} width={[50,38,45,32,42][i]} height="2" rx="1"/>)}</g></g>
            <rect x="602" y="734" width="110" height="11" rx="1" fill="#0a1520" stroke="#1a2840" strokeWidth="0.8"/>
            {/* Execution monitor (1115,789) amber */}
            <g filter="url(#hqGS)"><rect x="1069" y="760" width="92" height="58" rx="2" fill="#0a0f15" stroke="#fbbf2430" strokeWidth="1"/><rect x="1075" y="765" width="80" height="47" rx="1" fill="#1a1007"/><g fill="#fbbf2420">{[769,777,785,793,801].map((y,i)=><rect key={y} x="1079" y={y} width={[55,40,50,35,48][i]} height="2" rx="1"/>)}</g></g>
            <rect x="1062" y="814" width="110" height="11" rx="1" fill="#0a1520" stroke="#1a2840" strokeWidth="0.8"/>
            {/* Master CMO monitor (1234,513) blue - larger */}
            <g filter="url(#hqGS)"><rect x="1168" y="466" width="134" height="94" rx="3" fill="#080f1e" stroke="#60a5fa40" strokeWidth="1.5"/><rect x="1176" y="473" width="118" height="80" rx="2" fill="#060c1a"/><g fill="#60a5fa22">{[481,491,501,511,521,531,541].map((y,i)=><rect key={y} x="1182" y={y} width={[80,60,75,50,70,55,65][i]} height="3" rx="1.5"/>)}</g><polyline points="1182,542 1200,531 1222,536 1244,521 1262,526 1282,511" fill="none" stroke="#60a5fa30" strokeWidth="1.5"/></g>
            <rect x="1161" y="556" width="148" height="13" rx="2" fill="#0a1020" stroke="#1a2840" strokeWidth="1"/>
          </svg>

          {/* Scanline CRT overlay */}
          <div style={{
            position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
            backgroundImage:"repeating-linear-gradient(0deg,rgba(0,0,0,0.18) 0px,rgba(0,0,0,0.18) 1px,transparent 1px,transparent 4px)",
          }} />

          {/* Bottom gradient  -  removes black gap, seals canvas to result card */}
          <div style={{
            position:"absolute", left:0, right:0, bottom:0, height:"32%",
            background:"linear-gradient(to bottom, transparent 0%, #07090f 100%)",
            pointerEvents:"none", zIndex:2,
          }} />

          {/* EXPIRED floor dim — covers image + pins at 60% dark veil */}
          {isExpired && (
            <div style={{
              position:"absolute", inset:0, zIndex:3,
              background:"rgba(7,9,15,0.60)",
              pointerEvents:"none",
              transition:"opacity 0.45s ease",
            }} />
          )}

          {/* Header bar — LEFT: brand+session  RIGHT: bias+confidence */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, zIndex:10,
            background:"linear-gradient(180deg, rgba(6,13,26,0.90) 0%, transparent 100%)",
            padding:"8px 12px",
            display:"flex", justifyContent:"space-between", alignItems:"center",
            gap:8, pointerEvents:"none",
          }}>
            {/* LEFT: brand + session pill */}
            <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
              <span style={{ color:"#22d3ee", fontSize:9, letterSpacing:"0.12em", fontFamily:"var(--font-geist-mono), monospace", whiteSpace:"nowrap" }}>
                TRADEX · FLOOR
              </span>
              <span style={{
                fontSize:7, letterSpacing:"0.12em", padding:"1px 5px", borderRadius:99,
                border:`1px solid ${session.color}55`, color:session.color,
                background:session.color+"18", fontFamily:"var(--font-geist-mono), monospace",
                display:"flex", alignItems:"center", gap:3, flexShrink:0,
              }}>
                <span style={{ width:4, height:4, borderRadius:"50%", background:session.color, display:"inline-block", boxShadow:`0 0 4px ${session.color}` }} />
                {session.label}
              </span>
            </div>
            {/* RIGHT: bias state + confidence OR inactive badge */}
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <span style={{ color:biasColor, fontSize:11, fontWeight:700, letterSpacing:"0.14em", fontFamily:"var(--font-geist-mono), monospace", whiteSpace:"nowrap" }}>
                {biasLabel}
              </span>
              {isExpired ? (
                <span style={{
                  fontSize:7, letterSpacing:"0.12em", padding:"1px 6px", borderRadius:99,
                  border:"1px solid #2e3d4d", color:"#3d4e5e",
                  background:"#0d151e", fontFamily:"var(--font-geist-mono), monospace",
                }}>INACTIVE</span>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ background:"#0a1e3a", borderRadius:2, overflow:"hidden", width:44, height:3 }}>
                    <div style={{ width:`${conf}%`, height:"100%", background:biasColor }} />
                  </div>
                  <span style={{ color:biasColor, fontSize:8, fontFamily:"var(--font-geist-mono), monospace" }}>{conf}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Agent pins */}
          {PINS.map(pin => {
            const pinSC = sc(pin.stateKey);
            const pinState = states[pin.stateKey] ?? "idle";
            const isIdle = pinState === "idle";
            const isSelected = activeId === pin.id;
            const isActive = visualFocusId === pin.stateKey || isSelected;
            const isAlert = pinState === "blocked" || pinState === "alert";
            const accent = pinSC.accent;

            return (
              <div
                key={pin.id}
                onClick={() => {
                  const next = isSelected ? null : pin.id;
                  setActiveId(next);
                  onSelectAgentChange?.(next ? pin.stateKey : null);
                }}
                onMouseEnter={() => {
                  setHoveredId(pin.stateKey);
                  onHoverAgentChange?.(pin.stateKey);
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  onHoverAgentChange?.(null);
                }}
                style={{
                  position:"absolute",
                  left:`${pin.px}%`,
                  top:`${pin.py}%`,
                  transform:"translate(-50%,-50%)",
                  cursor: isExpired ? "default" : "pointer",
                  zIndex:100,
                  width:72,
                  height:72,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  pointerEvents:"all",
                  touchAction:"manipulation",
                  WebkitTapHighlightColor:"transparent",
                  opacity: isExpired ? 0.35 : 1,
                  transition:"opacity 0.45s ease",
                }}
              >
                {/* Outer pulse ring */}
                <div style={{
                  position:"absolute",
                  top:"50%", left:"50%",
                  transform:"translate(-50%,-50%)",
                  width: isActive ? 40 : 28,
                  height: isActive ? 40 : 28,
                  borderRadius:"50%",
                  border:`2px solid ${accent}`,
                  opacity: isIdle ? 0.35 : isActive ? 1 : 0.7,
                  transition:"width 0.2s, height 0.2s, box-shadow 0.2s, opacity 0.2s",
                  boxShadow: isActive ? `0 0 22px ${accent}` : isIdle ? `0 0 6px ${accent}55` : `0 0 10px ${accent}77`,
                  animation: isActive ? "none" : isAlert ? "hqAlert 1.1s ease-in-out infinite" : "hqPulse 2.2s ease-in-out infinite",
                  pointerEvents:"none",
                }} />

              {/* Second pulse ring  -  layered glow depth */}
              {!isActive && (
                <div style={{
                  position:"absolute",
                  top:"50%", left:"50%",
                  width:28, height:28,
                  borderRadius:"50%",
                  border:`1px solid ${accent}`,
                  pointerEvents:"none",
                  animation: isAlert
                    ? "hqAlert 1.1s ease-in-out infinite 0.25s"
                    : "hqPulse2 2.2s ease-in-out infinite 0.6s",
                }} />
              )}

              {/* Center dot */}
              <div style={{
                width:11, height:11,
                borderRadius:"50%",
                background:"#07090f",
                border:`2.5px solid ${accent}`,
                position:"relative",
                zIndex:2,
                transform: isActive ? "scale(1.35)" : "scale(1)",
                boxShadow: isActive ? `0 0 14px ${accent}` : "none",
                transition:"transform 0.18s, box-shadow 0.18s",
              }}>
                <div style={{
                  position:"absolute", inset:3,
                  borderRadius:"50%",
                  background:accent,
                  opacity: isIdle ? 0.3 : 0.9,
                }} />
              </div>

              {/* Master crown */}
              {pin.isMaster && (
                <div style={{
                  position:"absolute",
                  bottom:"calc(100% + 2px)",
                  left:"50%",
                  transform:"translateX(-50%)",
                  color:accent,
                  fontSize:10,
                  opacity: isActive ? 1 : 0.5,
                  textShadow:`0 0 8px ${accent}`,
                  pointerEvents:"none",
                  fontFamily:"var(--font-geist-mono), monospace",
                }}>★</div>
              )}

              {/* Tooltip */}
              <div style={{
                position:"absolute",
                bottom:"calc(100% + 10px)",
                left:"50%",
                transform:"translateX(-50%)",
                whiteSpace:"nowrap",
                fontSize:8,
                letterSpacing:"0.14em",
                padding:"3px 8px",
                borderRadius:2,
                border:`1px solid ${accent}`,
                color:accent,
                background:"#040608ee",
                opacity: isActive || hoveredId === pin.stateKey ? 1 : 0,
                pointerEvents:"none",
                transition:"opacity 0.15s",
                fontFamily:"var(--font-geist-mono), monospace",
              }}>
                {pin.isMaster ? "★ " : ""}{pin.label}
              </div>

              {/* Active halo glow on image */}
              {isActive && (
                <div style={{
                  position:"absolute",
                  top:"50%", left:"50%",
                  transform:"translate(-50%,-50%)",
                  width:90, height:90,
                  borderRadius:"50%",
                  background:`radial-gradient(circle, ${accent} 0%, transparent 70%)`,
                  opacity:0.12,
                  pointerEvents:"none",
                }} />
              )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DETAIL PANEL  -  fades in when an agent is clicked ── */}
      {activePinData && activeSC && (
        <div className="hq-card-enter" style={{
          borderTop:`1px solid ${agentExpiredOverride ? "#2a3a4a" : activeSC.accent}44`,
          padding:"12px 16px 16px",
          background:"#07090f",
        }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
            <span style={{ color: agentExpiredOverride ? "#3d4e5e" : activeSC.accent, fontSize:14, fontWeight:700, letterSpacing:"0.18em", fontFamily:"var(--font-geist-mono), monospace" }}>
              {activePinData.isMaster ? "★ " : ""}{activePinData.label}
            </span>
            <span style={{
              fontSize:8, letterSpacing:"0.12em", padding:"2px 7px", borderRadius:2,
              border: agentExpiredOverride ? "1px solid #2e3d4d" : `1px solid ${activeSC.accent}`,
              color: agentExpiredOverride ? "#3d4e5e" : activeSC.accent,
              background: agentExpiredOverride ? "#151e28" : activeSC.accent+"18",
              fontFamily:"var(--font-geist-mono), monospace",
            }}>
              {agentExpiredOverride ? "STANDBY" : activeSC.badge}
            </span>
            <span style={{ color:"#445566", fontSize:8, fontFamily:"var(--font-geist-mono), monospace", letterSpacing:"0.1em", marginLeft:"auto" }}>
              {activePinData.role}
            </span>
          </div>

          {/* Body */}
          <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
            {/* Left: description + price tags + progress */}
            <div style={{ flex:1, minWidth:0 }}>
              <div
                className="scrollbar-none"
                style={{ maxHeight:"35vh", overflowY:"auto", marginBottom: showPrices||showProgress ? 10 : 0 }}
              >
                {getAgentReasons(activePinData.stateKey, data).map((reason, i) => {
                  const pc = getConsolePrefixAndColor(reason);
                  return (
                    <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start", fontFamily:"var(--font-geist-mono), monospace", fontSize:9, marginTop: i > 0 ? 4 : 0 }}>
                      <span style={{ color:pc.color, whiteSpace:"nowrap", fontWeight:700, flexShrink:0 }}>{pc.prefix}</span>
                      <span style={{ color:"#7a8fa0", lineHeight:1.55 }}>{reason}</span>
                    </div>
                  );
                })}
              </div>

              {/* Color-coded price tags */}
              {showPrices && tradePlan && (
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom: showProgress ? 10 : 0 }}>
                  <span style={{ fontSize:9, padding:"3px 8px", borderRadius:2, border:"1px solid #ffffff22", color:"#aab4c0", fontFamily:"var(--font-geist-mono), monospace", letterSpacing:"0.1em" }}>
                    ENTRY {tradePlan.entry.toFixed(tradePlan.entry > 100 ? 2 : 4)}
                  </span>
                  <span style={{ fontSize:9, padding:"3px 8px", borderRadius:2, border:"1px solid #ff446644", color:"#ff7788", fontFamily:"var(--font-geist-mono), monospace", letterSpacing:"0.1em", background:"#ff00001a" }}>
                    SL {tradePlan.stopLoss.toFixed(tradePlan.stopLoss > 100 ? 2 : 4)}
                  </span>
                  <span style={{ fontSize:9, padding:"3px 8px", borderRadius:2, border:"1px solid #00ff9c44", color:"#00dd88", fontFamily:"var(--font-geist-mono), monospace", letterSpacing:"0.1em", background:"#00ff9c0f" }}>
                    TP1 {tradePlan.tp1.toFixed(tradePlan.tp1 > 100 ? 2 : 4)}
                  </span>
                  {tradePlan.tp2 && (
                    <span style={{ fontSize:9, padding:"3px 8px", borderRadius:2, border:"1px solid #00ff9c33", color:"#00bb77", fontFamily:"var(--font-geist-mono), monospace", letterSpacing:"0.1em", background:"#00ff9c08" }}>
                      TP2 {tradePlan.tp2.toFixed(tradePlan.tp2 > 100 ? 2 : 4)}
                    </span>
                  )}
                </div>
              )}

              {/* Status progression bar */}
              {showProgress && (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {agentExpiredOverride && (
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ flex:1, height:1, background:"#1e2d3d" }} />
                      <span style={{ fontSize:7, color:"#2e3d4d", fontFamily:"var(--font-geist-mono), monospace", letterSpacing:"0.18em", whiteSpace:"nowrap" }}>◌ TERMINATED</span>
                      <div style={{ flex:1, height:1, background:"#1e2d3d" }} />
                    </div>
                  )}
                  <div style={{ display:"flex", alignItems:"center" }}>
                  {progressSteps.map((step, i) => {
                    const done   = !agentExpiredOverride && i < progressStep;
                    const active = !agentExpiredOverride && i === progressStep;
                    const stepColor = done || active ? activeSC.accent : "#1e2d3d";
                    return (
                      <React.Fragment key={step}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <div style={{
                            width:8, height:8, borderRadius:"50%",
                            background: done||active ? activeSC.accent : "#0a1525",
                            border:`1px solid ${stepColor}`,
                            boxShadow: active ? `0 0 8px ${activeSC.accent}` : "none",
                            transition:"all 0.3s",
                          }} />
                          <span style={{ fontSize:7, color: active ? activeSC.accent : done ? activeSC.accent+"aa" : "#1e2d3d", fontFamily:"var(--font-geist-mono), monospace", letterSpacing:"0.1em", whiteSpace:"nowrap" }}>
                            {step}
                          </span>
                        </div>
                        {i < progressSteps.length - 1 && (
                          <div style={{ flex:1, height:1, background: done ? activeSC.accent+"66" : "#0a1525", minWidth:16, maxWidth:40, margin:"0 4px", marginBottom:14 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: animated confidence arc */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flexShrink:0 }}>
              <ConfidenceArc value={agentExpiredOverride ? 0 : confVal} color={agentExpiredOverride ? "#2a3a4a" : activeSC.accent} />
              <span style={{ fontSize:7, color:"#2a3a4a", letterSpacing:"0.15em", fontFamily:"var(--font-geist-mono), monospace" }}>
                {agentExpiredOverride ? "INACTIVE" : "CONFIDENCE"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
