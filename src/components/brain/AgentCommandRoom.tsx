"use client";

import React, { useState, useEffect, useRef } from "react";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─── State system ─────────────────────────────────────────────────────────────
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

function getAgentDesc(key: string, data: AgentRunResult | null): string {
  if (!data) return "Awaiting analysis data...";
  const { agents } = data;
  switch (key) {
    case "trend":      return agents.trend.reasons.join(" · ") || "No trend reasons available.";
    case "smc":        return agents.smc.reasons.join(" · ") || "No price action reasons available.";
    case "news":       return agents.news.reasons.join(" · ") || "No news data.";
    case "master":     return [...(agents.master.supports ?? []), ...(agents.master.noTradeReason ? [agents.master.noTradeReason] : [])].join(" · ") || "No consensus data.";
    case "risk":       return agents.risk.reasons.join(" · ") || "No risk reasons available.";
    case "contrarian": return agents.contrarian.failureReasons.join(" · ") || agents.contrarian.alternativeScenario || "No counter-signals detected.";
    case "execution":  return agents.execution.hasSetup ? [agents.execution.triggerCondition, ...agents.execution.managementNotes].filter(Boolean).join(" · ") : "No valid setup found. Waiting for entry conditions.";
    default:           return "No data available.";
  }
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
        <span style={{ color, fontSize:15, fontWeight:700, fontFamily:"ui-monospace,monospace", lineHeight:1 }}>{value}</span>
        <span style={{ color:"#3a4a5a", fontSize:7, fontFamily:"ui-monospace,monospace" }}>%</span>
      </div>
    </div>
  );
}

// ─── Floor layout config ──────────────────────────────────────────────────────
interface AgentConfig {
  id: string;
  stateKey: string;
  label: string;
  role: string;
  isMaster?: boolean;
}

const TOP_ROW: AgentConfig[] = [
  { id:"riskrate",   stateKey:"risk",       label:"RISK GATE",  role:"Risk Management"     },
  { id:"trend",      stateKey:"trend",      label:"TREND",      role:"Macro Bias Analyst"  },
  { id:"priceaction",stateKey:"smc",        label:"PR. ACTION", role:"Price Action Analyst"},
  { id:"newsintel",  stateKey:"news",       label:"NEWS INTEL", role:"Fundamentals"        },
];
const BOTTOM_ROW: AgentConfig[] = [
  { id:"contrarian", stateKey:"contrarian", label:"CONTRARIAN", role:"Counter-Signal"      },
  { id:"execution",  stateKey:"execution",  label:"EXECUTION",  role:"Entry Timing Agent"  },
];
const MASTER_CFG: AgentConfig = {
  id:"mastercmo", stateKey:"master", label:"MASTER CMO", role:"Chief Market Officer", isMaster:true,
};

// ─── Monitor screen sub-component ────────────────────────────────────────────
function MonitorScreen({
  accent, screen, badge, flex = 1, height = 34,
}: { accent: string; screen: string; badge: string; flex?: number; height?: number }) {
  return (
    <div style={{
      flex, height,
      background: screen,
      border: `1px solid ${accent}88`,
      borderRadius: 2,
      position: "relative",
      overflow: "hidden",
      boxShadow: `0 0 8px ${accent}22 inset, 0 0 4px ${accent}33`,
    }}>
      {/* Scanline overlay */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(0deg,rgba(0,0,0,0.18) 0px,rgba(0,0,0,0.18) 1px,transparent 1px,transparent 3px)",
      }} />
      {/* Screen glare */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:"40%", pointerEvents:"none",
        background:`linear-gradient(180deg, ${accent}08 0%, transparent 100%)`,
      }} />
      <div style={{
        position:"absolute", inset:0,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <span style={{ color:accent, fontSize:7, fontFamily:"ui-monospace,monospace", letterSpacing:"0.1em", fontWeight:700 }}>
          {badge}
        </span>
      </div>
    </div>
  );
}

// ─── Sub-agent workstation ────────────────────────────────────────────────────
function SubAgentDesk({
  config, sc, state, isActive, isHovered, confValue, onClick, onMouseEnter, onMouseLeave,
}: {
  config: AgentConfig; sc: SC; state: AgentState;
  isActive: boolean; isHovered: boolean; confValue: number;
  onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const accent = sc.accent;
  const isAlert = state === "blocked" || state === "alert";
  const glow = isActive
    ? `0 0 24px ${accent}55, 0 0 48px ${accent}22`
    : isHovered ? `0 0 14px ${accent}33` : `0 0 4px ${accent}11`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: 148, cursor: "pointer", position: "relative",
        transition: "transform 0.18s",
        transform: isActive ? "translateY(-4px) scale(1.03)" : "translateY(0) scale(1)",
      }}
    >
      {/* ── Name pill (above avatar) ── */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:4,
          background:`${accent}15`,
          border:`1px solid ${accent}55`,
          borderRadius:99,
          padding:"2px 10px",
          boxShadow: isActive ? `0 0 14px ${accent}55` : "none",
          transition:"box-shadow 0.2s",
        }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:accent, boxShadow:`0 0 6px ${accent}` }} />
          <span style={{ color:accent, fontSize:8, fontFamily:"ui-monospace,monospace", letterSpacing:"0.16em", fontWeight:700 }}>
            {config.label}
          </span>
        </div>
      </div>

      {/* ── Agent avatar (sits above/in the desk) ── */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:-8, position:"relative", zIndex:3 }}>
        <div style={{
          width:20, height:20, borderRadius:"50%",
          background:`radial-gradient(circle at 38% 36%, ${accent}dd 0%, ${accent}33 100%)`,
          border:`2px solid ${accent}`,
          boxShadow: isAlert
            ? `0 0 14px ${accent}, 0 0 28px ${accent}66`
            : `0 0 8px ${accent}99, 0 0 16px ${accent}33`,
          animation: isAlert && !isActive ? "agentAlertPulse 1.1s ease-in-out infinite" : "none",
          transition:"box-shadow 0.2s",
        }} />
      </div>

      {/* ── Desk console (z-index 4 — clips lower portion of avatar) ── */}
      <div style={{
        background:"linear-gradient(175deg, #0d1f30 0%, #070e18 100%)",
        border:`1px solid ${accent}`,
        borderTop:`2px solid ${accent}`,
        borderRadius:4,
        padding:"8px 8px 6px",
        position:"relative", zIndex:4,
        boxShadow: glow,
        transition:"box-shadow 0.2s",
      }}>
        {/* Dual monitor array */}
        <div style={{ display:"flex", gap:3, marginBottom:5 }}>
          <MonitorScreen accent={accent} screen={sc.screen} badge={STATE[state].badge} flex={3} height={34} />
          <MonitorScreen accent={accent} screen={sc.screen} badge="···" flex={2} height={34} />
        </div>

        {/* Desk rail */}
        <div style={{
          height:1, marginBottom:5,
          background:`linear-gradient(90deg, transparent, ${accent}55, ${accent}88, ${accent}55, transparent)`,
        }} />

        {/* Confidence bar */}
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ flex:1, height:2, background:"#0a1525", borderRadius:99, overflow:"hidden" }}>
            <div style={{
              width:`${confValue}%`, height:"100%", borderRadius:99,
              background:`linear-gradient(90deg, ${accent}88, ${accent})`,
              transition:"width 0.7s ease",
            }} />
          </div>
          <span style={{ color:accent, fontSize:7, fontFamily:"ui-monospace,monospace", flexShrink:0 }}>{confValue}%</span>
        </div>

        {/* Role label */}
        <div style={{ marginTop:4, textAlign:"center" }}>
          <span style={{ color:"#1e2d3a", fontSize:7, fontFamily:"ui-monospace,monospace", letterSpacing:"0.1em" }}>
            {config.role.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Master CMO workstation (large, centered, seated-behind) ─────────────────
function MasterDesk({
  sc, state, isActive, isHovered, confValue, data, onClick, onMouseEnter, onMouseLeave,
}: {
  sc: SC; state: AgentState; isActive: boolean; isHovered: boolean;
  confValue: number; data: AgentRunResult | null;
  onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const accent = sc.accent;
  const finalBias = data?.agents.master.finalBias ?? "no-trade";
  const biasLabel = finalBias==="bullish" ? "▲ BULLISH" : finalBias==="bearish" ? "▼ BEARISH" : "— NO TRADE";
  const tradePlan = data?.agents.master.tradePlan ?? null;
  const glow = isActive
    ? `0 0 48px ${accent}55, 0 0 96px ${accent}22, 0 0 4px ${accent}88 inset`
    : isHovered ? `0 0 24px ${accent}44, 0 0 48px ${accent}11` : `0 0 12px ${accent}22`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: 310, cursor:"pointer", position:"relative",
        transition:"transform 0.18s",
        transform: isActive ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
      }}
    >
      {/* ── Crown + name pill ── */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:7 }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:6,
          background:`${accent}20`,
          border:`1px solid ${accent}88`,
          borderRadius:99,
          padding:"3px 16px",
          boxShadow:`0 0 20px ${accent}44`,
        }}>
          <span style={{ color:accent, fontSize:9, fontFamily:"ui-monospace,monospace" }}>★</span>
          <span style={{ color:accent, fontSize:10, fontFamily:"ui-monospace,monospace", letterSpacing:"0.2em", fontWeight:700 }}>
            MASTER CMO
          </span>
          <span style={{ color:accent, fontSize:9, fontFamily:"ui-monospace,monospace" }}>★</span>
        </div>
      </div>

      {/* ── Agent body — lower half clips behind desk (z-index 1 < desk z-index 2) ── */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:-20, position:"relative", zIndex:1 }}>
        {/* Torso / shoulders */}
        <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center" }}>
          {/* Head */}
          <div style={{
            width:32, height:32, borderRadius:"50%",
            background:`radial-gradient(circle at 38% 34%, ${accent}ee 0%, ${accent}44 100%)`,
            border:`2.5px solid ${accent}`,
            boxShadow:`0 0 20px ${accent}bb, 0 0 40px ${accent}44`,
            position:"relative",
          }}>
            {/* Inner face glow */}
            <div style={{
              position:"absolute", inset:5, borderRadius:"50%",
              background:`radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
            }} />
          </div>
          {/* Shoulders/upper body — this part clips below the desk edge */}
          <div style={{
            width:54, height:26,
            marginTop:3,
            background:`linear-gradient(180deg, ${accent}33 0%, ${accent}0a 100%)`,
            borderRadius:"8px 8px 0 0",
            border:`1px solid ${accent}44`,
            borderBottom:"none",
          }} />
        </div>
      </div>

      {/* ── Main desk console (z-index 2 — covers lower body) ── */}
      <div style={{
        background:"linear-gradient(175deg, #0f2035 0%, #070e1a 100%)",
        border:`1px solid ${accent}`,
        borderTop:`2px solid ${accent}`,
        borderRadius:6,
        padding:"12px 14px 10px",
        position:"relative", zIndex:2,
        boxShadow: glow,
        transition:"box-shadow 0.2s",
      }}>
        {/* Triple monitor array */}
        <div style={{ display:"flex", gap:4, marginBottom:8 }}>
          <MonitorScreen accent={accent} screen={sc.screen} badge={biasLabel} flex={5} height={44} />
          <MonitorScreen accent={accent} screen={sc.screen} badge={`CONF ${confValue}%`} flex={3} height={44} />
          <MonitorScreen accent={accent} screen={sc.screen} badge="SYS OK" flex={2} height={44} />
        </div>

        {/* Illuminated desk rail */}
        <div style={{
          height:2, marginBottom:8,
          background:`linear-gradient(90deg, transparent, ${accent}66, ${accent}cc, ${accent}66, transparent)`,
          boxShadow:`0 0 8px ${accent}44`,
        }} />

        {/* Confidence bar */}
        <div style={{ marginBottom:7 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
            <span style={{ color:"#1e2d3a", fontSize:7, fontFamily:"ui-monospace,monospace", letterSpacing:"0.12em" }}>
              CONSENSUS CONFIDENCE
            </span>
            <span style={{ color:accent, fontSize:7, fontFamily:"ui-monospace,monospace" }}>{confValue}%</span>
          </div>
          <div style={{ height:3, background:"#0a1525", borderRadius:99, overflow:"hidden" }}>
            <div style={{
              width:`${confValue}%`, height:"100%", borderRadius:99,
              background:`linear-gradient(90deg, ${accent}88, ${accent})`,
              transition:"width 0.8s ease",
              boxShadow:`0 0 6px ${accent}`,
            }} />
          </div>
        </div>

        {/* Trade plan row */}
        {tradePlan && (
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
            {[
              { l:"ENTRY", v:tradePlan.entry.toFixed(tradePlan.entry>100?2:4),         c:"#a0b4c8" },
              { l:"SL",    v:tradePlan.stopLoss.toFixed(tradePlan.stopLoss>100?2:4),   c:"#ff7788" },
              { l:"TP1",   v:tradePlan.tp1.toFixed(tradePlan.tp1>100?2:4),             c:"#00dd88" },
              ...(tradePlan.tp2 ? [{ l:"TP2", v:tradePlan.tp2.toFixed(tradePlan.tp2>100?2:4), c:"#00bb77" }] : []),
            ].map(({ l, v, c }) => (
              <span key={l} style={{
                fontSize:8, padding:"2px 7px", borderRadius:2,
                border:`1px solid ${c}44`, color:c,
                background:`${c}11`, fontFamily:"ui-monospace,monospace",
                letterSpacing:"0.1em",
              }}>
                {l}&nbsp;{v}
              </span>
            ))}
          </div>
        )}

        {/* Footer label */}
        <div style={{ textAlign:"center" }}>
          <span style={{ color:"#192535", fontSize:7, fontFamily:"ui-monospace,monospace", letterSpacing:"0.13em" }}>
            CHIEF MARKET OFFICER · MULTI-AGENT CONSENSUS ENGINE
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Floor connection SVG layer ───────────────────────────────────────────────
// Draws animated dashed data-flow lines from sub-agents to the Master console.
// viewBox is 1000×340 so % positions align with the flex layout.
function FloorConnections({ masterAccent }: { masterAccent: string }) {
  // Approximate center-x of each top-row agent (4 agents, each 148px wide in ~700px container):
  // Col centers (in 1000-unit viewBox): ~125, 290, 500, 710, 875 (with gaps)
  const topY = 20;
  const masterX = 500;
  const masterY = 200;
  const bottomY = 330;

  const topXs   = [125, 295, 505, 675];
  const botXs   = [248, 752];

  return (
    <svg
      viewBox="0 0 1000 340"
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Animated dash */}
        <style>{`
          @keyframes dashMove { to { stroke-dashoffset: -20; } }
          .floor-line { animation: dashMove 1.8s linear infinite; }
        `}</style>
      </defs>

      {/* ── Top row → Master ── */}
      {topXs.map((x, i) => (
        <g key={`top-${i}`}>
          <line
            x1={x} y1={topY} x2={masterX} y2={masterY}
            stroke={masterAccent} strokeWidth="0.8" strokeOpacity="0.12"
          />
          <line
            className="floor-line"
            x1={x} y1={topY} x2={masterX} y2={masterY}
            stroke={masterAccent} strokeWidth="0.8" strokeOpacity="0.35"
            strokeDasharray="5 4"
            filter="url(#lineGlow)"
          />
        </g>
      ))}

      {/* ── Bottom row → Master ── */}
      {botXs.map((x, i) => (
        <g key={`bot-${i}`}>
          <line
            x1={x} y1={bottomY} x2={masterX} y2={masterY}
            stroke={masterAccent} strokeWidth="0.8" strokeOpacity="0.12"
          />
          <line
            className="floor-line"
            x1={x} y1={bottomY} x2={masterX} y2={masterY}
            stroke={masterAccent} strokeWidth="0.8" strokeOpacity="0.35"
            strokeDasharray="5 4"
            style={{ animationDelay:"0.9s" }}
            filter="url(#lineGlow)"
          />
        </g>
      ))}

      {/* ── Node dots ── */}
      {topXs.map((x, i) => (
        <circle key={`tnode-${i}`} cx={x} cy={topY} r="3" fill={masterAccent} opacity="0.45" filter="url(#dotGlow)" />
      ))}
      {botXs.map((x, i) => (
        <circle key={`bnode-${i}`} cx={x} cy={bottomY} r="3" fill={masterAccent} opacity="0.45" filter="url(#dotGlow)" />
      ))}
      <circle cx={masterX} cy={masterY} r="4.5" fill={masterAccent} opacity="0.7" filter="url(#dotGlow)" />

      {/* ── Data grid texture lines (subtle) ── */}
      {[150, 300, 450, 600, 750, 900].map(x => (
        <line key={`vg-${x}`} x1={x} y1={0} x2={x} y2={340} stroke={masterAccent} strokeWidth="0.3" strokeOpacity="0.04" />
      ))}
      {[80, 170, 250].map(y => (
        <line key={`hg-${y}`} x1={0} y1={y} x2={1000} y2={y} stroke={masterAccent} strokeWidth="0.3" strokeOpacity="0.04" />
      ))}

      {/* ── Server rack outlines (decorative) ── */}
      <rect x="16" y="100" width="28" height="120" rx="2"
        fill="none" stroke={masterAccent} strokeWidth="0.6" strokeOpacity="0.12" />
      {[0,1,2,3,4,5].map(i => (
        <rect key={`rack-l-${i}`} x="20" y={104+i*18} width="20" height="12" rx="1"
          fill="none" stroke={masterAccent} strokeWidth="0.4" strokeOpacity="0.18" />
      ))}
      <rect x="956" y="100" width="28" height="120" rx="2"
        fill="none" stroke={masterAccent} strokeWidth="0.6" strokeOpacity="0.12" />
      {[0,1,2,3,4,5].map(i => (
        <rect key={`rack-r-${i}`} x="960" y={104+i*18} width="20" height="12" rx="1"
          fill="none" stroke={masterAccent} strokeWidth="0.4" strokeOpacity="0.18" />
      ))}
    </svg>
  );
}

// ─── AgentCommandRoom ─────────────────────────────────────────────────────────
export function AgentCommandRoom({
  data, loading=false, focusedAgentId, onHoverAgentChange, onSelectAgentChange,
}: {
  data: AgentRunResult|null; loading?: boolean; focusedAgentId?: string|null;
  onHoverAgentChange?: (id: string|null) => void;
  onSelectAgentChange?: (id: string|null) => void;
}) {
  const [activeId,  setActiveId]  = useState<string|null>(null);
  const [hoveredId, setHoveredId] = useState<string|null>(null);
  const [session,   setSession]   = useState(getSession);

  useEffect(() => {
    const t = setInterval(() => setSession(getSession()), 60_000);
    return () => clearInterval(t);
  }, []);

  const states: Record<string,AgentState> = data
    ? deriveStates(data)
    : { trend:"idle", smc:"idle", news:"idle", risk:"idle", contrarian:"idle", master:"analyzing", execution:"idle" };

  const sc = (key: string): SC => STATE[states[key] ?? "idle"];

  const masterSC        = sc("master");
  const conf            = data?.agents.master.confidence ?? 0;
  const finalBias       = data?.agents.master.finalBias ?? "no-trade";
  const biasColor       = finalBias==="bullish"?"#00ff9c":finalBias==="bearish"?"#ff4466":"#ffaa00";
  const biasLabel       = finalBias==="bullish"?"▲ BULLISH":finalBias==="bearish"?"▼ BEARISH":"— NO TRADE";
  const visualFocusId   = hoveredId ?? focusedAgentId ?? activeId;

  // The agent whose detail panel is open (by stateKey)
  const allConfigs = [...TOP_ROW, MASTER_CFG, ...BOTTOM_ROW];
  const activeConfig = allConfigs.find(c => c.id === activeId);
  const activeSC     = activeConfig ? sc(activeConfig.stateKey) : null;
  const activeState  = activeConfig ? (states[activeConfig.stateKey] ?? "idle") : null;
  const confVal      = activeConfig ? getConfidenceValue(activeConfig.stateKey, data) : 0;

  const tradePlan  = data?.agents.master.tradePlan ?? null;
  const showPrices = !!activeConfig && (activeConfig.stateKey==="master"||activeConfig.stateKey==="execution") && !!tradePlan;
  const sigState   = data?.agents.execution?.signalState;
  const showProg   = !!activeConfig && (activeConfig.stateKey==="execution"||activeConfig.stateKey==="master");
  const progStep   = !data ? 0 : sigState==="ARMED" ? 1 : 0;
  const progSteps  = ["ARMED","TRIGGERED","COMPLETE"] as const;

  function handleClick(id: string, stateKey: string) {
    const next = activeId === id ? null : id;
    setActiveId(next);
    onSelectAgentChange?.(next ? stateKey : null);
  }
  function handleEnter(stateKey: string) {
    setHoveredId(stateKey);
    onHoverAgentChange?.(stateKey);
  }
  function handleLeave() {
    setHoveredId(null);
    onHoverAgentChange?.(null);
  }

  return (
    <div
      className="w-full rounded-xl border border-cyan-500/20 overflow-hidden"
      style={{ background:"#07090f" }}
    >
      <style>{`
        @keyframes agentAlertPulse {
          0%,100% { transform:scale(1);    opacity:1; }
          50%      { transform:scale(1.5);  opacity:0.4; }
        }
        @keyframes hqFadeUp {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .hq-card-enter { animation: hqFadeUp 0.26s ease both; }
      `}</style>

      {/* ── Floor header bar ── */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"8px 16px",
        borderBottom:"1px solid rgba(34,211,238,0.08)",
        background:"linear-gradient(90deg, #07090f 0%, #080e18 50%, #07090f 100%)",
      }}>
        <span style={{ color:"#22d3ee", fontSize:9, letterSpacing:"0.16em", fontFamily:"ui-monospace,monospace" }}>
          TRADEX · MULTI-AGENT FLOOR
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Session pill */}
          <span style={{
            fontSize:8, letterSpacing:"0.14em", padding:"2px 8px", borderRadius:99,
            border:`1px solid ${session.color}44`, color:session.color,
            background:`${session.color}14`, fontFamily:"ui-monospace,monospace",
            display:"flex", alignItems:"center", gap:4,
          }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:session.color, display:"inline-block", boxShadow:`0 0 5px ${session.color}` }} />
            {session.label}
          </span>
          {/* Bias label */}
          <span style={{ color:biasColor, fontSize:12, fontWeight:700, letterSpacing:"0.15em", fontFamily:"ui-monospace,monospace" }}>
            {biasLabel}
          </span>
          {/* Conf bar */}
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:64, height:3, background:"#0a1e3a", borderRadius:99, overflow:"hidden" }}>
              <div style={{ width:`${conf}%`, height:"100%", background:biasColor, borderRadius:99, transition:"width 0.8s ease" }} />
            </div>
            <span style={{ color:biasColor, fontSize:9, fontFamily:"ui-monospace,monospace" }}>{conf}%</span>
          </div>
        </div>
      </div>

      {/* ── Trading Floor ── */}
      <div style={{
        padding:"28px 20px 20px",
        position:"relative",
        // Dot-grid background
        backgroundImage:`
          radial-gradient(circle, rgba(34,211,238,0.06) 1px, transparent 1px)
        `,
        backgroundSize:"28px 28px",
      }}>
        {/* Connection lines layer (behind everything) */}
        <div style={{ position:"absolute", inset:0 }}>
          <FloorConnections masterAccent={masterSC.accent} />
        </div>

        {/* ── Top row: 4 sub-agents ── */}
        <div style={{
          display:"flex", justifyContent:"center", gap:16,
          marginBottom:28, flexWrap:"wrap", position:"relative", zIndex:5,
        }}>
          {TOP_ROW.map(cfg => (
            <SubAgentDesk
              key={cfg.id}
              config={cfg}
              sc={sc(cfg.stateKey)}
              state={states[cfg.stateKey] ?? "idle"}
              isActive={activeId === cfg.id}
              isHovered={visualFocusId === cfg.stateKey}
              confValue={getConfidenceValue(cfg.stateKey, data)}
              onClick={() => handleClick(cfg.id, cfg.stateKey)}
              onMouseEnter={() => handleEnter(cfg.stateKey)}
              onMouseLeave={handleLeave}
            />
          ))}
        </div>

        {/* ── Center: Master CMO ── */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:28, position:"relative", zIndex:5 }}>
          <MasterDesk
            sc={masterSC}
            state={states["master"] ?? "analyzing"}
            isActive={activeId === MASTER_CFG.id}
            isHovered={visualFocusId === MASTER_CFG.stateKey}
            confValue={conf}
            data={data}
            onClick={() => handleClick(MASTER_CFG.id, MASTER_CFG.stateKey)}
            onMouseEnter={() => handleEnter(MASTER_CFG.stateKey)}
            onMouseLeave={handleLeave}
          />
        </div>

        {/* ── Bottom row: 2 sub-agents ── */}
        <div style={{
          display:"flex", justifyContent:"center", gap:120,
          flexWrap:"wrap", position:"relative", zIndex:5,
        }}>
          {BOTTOM_ROW.map(cfg => (
            <SubAgentDesk
              key={cfg.id}
              config={cfg}
              sc={sc(cfg.stateKey)}
              state={states[cfg.stateKey] ?? "idle"}
              isActive={activeId === cfg.id}
              isHovered={visualFocusId === cfg.stateKey}
              confValue={getConfidenceValue(cfg.stateKey, data)}
              onClick={() => handleClick(cfg.id, cfg.stateKey)}
              onMouseEnter={() => handleEnter(cfg.stateKey)}
              onMouseLeave={handleLeave}
            />
          ))}
        </div>
      </div>

      {/* ── Detail panel: fades in on click ── */}
      {activeConfig && activeSC && (
        <div className="hq-card-enter" style={{
          borderTop:`1px solid ${activeSC.accent}44`,
          padding:"14px 18px",
          background:"#07090f",
        }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
            <span style={{ color:activeSC.accent, fontSize:14, fontWeight:700, letterSpacing:"0.18em", fontFamily:"ui-monospace,monospace" }}>
              {activeConfig.isMaster ? "★ " : ""}{activeConfig.label}
            </span>
            <span style={{
              fontSize:8, letterSpacing:"0.12em", padding:"2px 7px", borderRadius:2,
              border:`1px solid ${activeSC.accent}`, color:activeSC.accent,
              background:`${activeSC.accent}18`, fontFamily:"ui-monospace,monospace",
            }}>
              {activeSC.badge}
            </span>
            <span style={{ color:"#445566", fontSize:8, fontFamily:"ui-monospace,monospace", letterSpacing:"0.1em", marginLeft:"auto" }}>
              {activeConfig.role.toUpperCase()}
            </span>
          </div>

          {/* Body */}
          <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:"#667788", fontSize:10, lineHeight:1.8, fontFamily:"ui-monospace,monospace", marginBottom: showPrices||showProg ? 10 : 0 }}>
                {getAgentDesc(activeConfig.stateKey, data)}
              </div>

              {/* Trade price tags */}
              {showPrices && tradePlan && (
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom: showProg ? 10 : 0 }}>
                  {[
                    { l:"ENTRY", v:tradePlan.entry.toFixed(tradePlan.entry>100?2:4),         c:"#aab4c0" },
                    { l:"SL",    v:tradePlan.stopLoss.toFixed(tradePlan.stopLoss>100?2:4),   c:"#ff7788" },
                    { l:"TP1",   v:tradePlan.tp1.toFixed(tradePlan.tp1>100?2:4),             c:"#00dd88" },
                    ...(tradePlan.tp2 ? [{ l:"TP2", v:tradePlan.tp2.toFixed(tradePlan.tp2>100?2:4), c:"#00bb77" }] : []),
                  ].map(({ l, v, c }) => (
                    <span key={l} style={{
                      fontSize:9, padding:"3px 8px", borderRadius:2,
                      border:`1px solid ${c}44`, color:c,
                      background:`${c}1a`, fontFamily:"ui-monospace,monospace", letterSpacing:"0.1em",
                    }}>
                      {l} {v}
                    </span>
                  ))}
                </div>
              )}

              {/* Signal progress bar */}
              {showProg && (
                <div style={{ display:"flex", alignItems:"center" }}>
                  {progSteps.map((step, i) => {
                    const done   = i < progStep;
                    const active = i === progStep;
                    const c = done||active ? activeSC.accent : "#1e2d3d";
                    return (
                      <React.Fragment key={step}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <div style={{
                            width:8, height:8, borderRadius:"50%",
                            background: done||active ? activeSC.accent : "#0a1525",
                            border:`1px solid ${c}`,
                            boxShadow: active ? `0 0 8px ${activeSC.accent}` : "none",
                            transition:"all 0.3s",
                          }} />
                          <span style={{ fontSize:7, color: active ? activeSC.accent : done ? `${activeSC.accent}aa` : "#1e2d3d", fontFamily:"ui-monospace,monospace", letterSpacing:"0.1em", whiteSpace:"nowrap" }}>
                            {step}
                          </span>
                        </div>
                        {i < progSteps.length-1 && (
                          <div style={{ flex:1, height:1, background: done ? `${activeSC.accent}66` : "#0a1525", minWidth:16, maxWidth:40, margin:"0 4px", marginBottom:14 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confidence arc */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flexShrink:0 }}>
              <ConfidenceArc value={confVal} color={activeSC.accent} />
              <span style={{ fontSize:7, color:"#2a3a4a", letterSpacing:"0.15em", fontFamily:"ui-monospace,monospace" }}>CONFIDENCE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
