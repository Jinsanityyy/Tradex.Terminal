"use client";

/**
 * AgentCommandRoom — overlay system on top of a control room background.
 *
 * The ENVIRONMENT is a background image (or CSS atmosphere fallback).
 * The AGENTS are absolutely-positioned overlays: glow ring, mini monitor,
 * status indicator, and animated data-flow lines toward Master Consensus.
 *
 * Drop any pixel-art / cyberpunk room image at /public/control-room.png
 * to replace the CSS fallback.
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { AgentRunResult } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// State system
// ─────────────────────────────────────────────────────────────────────────────

type AgentState =
  | "idle" | "bull" | "bear" | "alert"
  | "approved" | "blocked" | "armed" | "analyzing";

interface SC {
  accent: string;
  glow:   string;   // rgba for box-shadow
  screen: string;   // monitor bg
  badge:  string;
  ring:   string;   // border color
}

const STATE: Record<AgentState, SC> = {
  idle:      { accent:"#1e3a5f", glow:"rgba(30,58,95,0)",     screen:"#020810", badge:"IDLE",       ring:"#1e3a5f" },
  bull:      { accent:"#10b981", glow:"rgba(16,185,129,0.55)", screen:"#010c06", badge:"BULLISH",    ring:"#10b981" },
  bear:      { accent:"#ef4444", glow:"rgba(239,68,68,0.55)",  screen:"#0c0101", badge:"BEARISH",    ring:"#ef4444" },
  alert:     { accent:"#f59e0b", glow:"rgba(245,158,11,0.55)", screen:"#0c0800", badge:"ALERT",      ring:"#f59e0b" },
  approved:  { accent:"#10b981", glow:"rgba(16,185,129,0.55)", screen:"#010c06", badge:"VALID",      ring:"#10b981" },
  blocked:   { accent:"#ef4444", glow:"rgba(239,68,68,0.65)",  screen:"#0c0101", badge:"BLOCKED",    ring:"#ef4444" },
  armed:     { accent:"#22d3ee", glow:"rgba(34,211,238,0.65)", screen:"#010c10", badge:"ARMED",      ring:"#22d3ee" },
  analyzing: { accent:"#3b82f6", glow:"rgba(59,130,246,0.55)", screen:"#01060e", badge:"ANALYZING",  ring:"#3b82f6" },
};

function deriveStates(d: AgentRunResult): Record<string, AgentState> {
  const { agents } = d;
  const bias = agents.master.finalBias;
  return {
    trend:
      agents.trend.bias==="bullish"&&agents.trend.confidence>=52 ? "bull" :
      agents.trend.bias==="bearish"&&agents.trend.confidence>=52 ? "bear" :
      agents.trend.confidence<35 ? "idle" : "alert",
    smc:
      agents.smc.liquiditySweepDetected ? "alert" :
      agents.smc.setupPresent&&agents.smc.bias==="bullish" ? "bull" :
      agents.smc.setupPresent&&agents.smc.bias==="bearish" ? "bear" :
      agents.smc.confidence<35 ? "idle" : "alert",
    news:
      agents.news.riskScore>=65 ? "alert" :
      agents.news.impact==="bullish" ? "bull" :
      agents.news.impact==="bearish" ? "bear" : "idle",
    risk:       agents.risk.valid ? "approved" : "blocked",
    contrarian:
      agents.contrarian.challengesBias&&agents.contrarian.trapConfidence>=60 ? "blocked" :
      agents.contrarian.challengesBias ? "alert" : "idle",
    master:
      bias==="bullish"&&agents.master.confidence>=65 ? "bull" :
      bias==="bearish"&&agents.master.confidence>=65 ? "bear" :
      bias==="no-trade" ? "analyzing" : "alert",
    execution:
      agents.execution.hasSetup&&agents.risk.valid&&bias!=="no-trade" ? "armed" :
      agents.execution.hasSetup ? "alert" : "idle",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent layout — positions as % of the container (x = left, y = top)
// Arranged in a rough arc facing the center master station
// ─────────────────────────────────────────────────────────────────────────────

interface AgentPos {
  id:    string;
  label: string;
  sub:   string;
  x:     number;   // left %
  y:     number;   // top %
  size:  "sm" | "lg";
}

const AGENTS: AgentPos[] = [
  { id:"trend",      label:"TREND",      sub:"AGENT",     x: 7,  y:50, size:"sm" },
  { id:"smc",        label:"PR. ACTION", sub:"AGENT",     x:21,  y:42, size:"sm" },
  { id:"news",       label:"NEWS",       sub:"AGENT",     x:35,  y:54, size:"sm" },
  { id:"master",     label:"MASTER",     sub:"CONSENSUS", x:50,  y:38, size:"lg" },
  { id:"risk",       label:"RISK GATE",  sub:"AGENT",     x:65,  y:50, size:"sm" },
  { id:"contrarian", label:"CONTRARIAN", sub:"AGENT",     x:79,  y:43, size:"sm" },
  { id:"execution",  label:"EXECUTION",  sub:"AGENT",     x:92,  y:54, size:"sm" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mini monitor screen content (SVG, 72 × 48 px usable area)
// ─────────────────────────────────────────────────────────────────────────────

function TrendScreen({ sc, w=72, h=48 }: { sc:SC; w?:number; h?:number }) {
  const c = sc.accent;
  const isBull = sc.badge==="BULLISH";
  const levels = isBull
    ? [h*.76,h*.60,h*.46,h*.32,h*.18]
    : sc.badge==="BEARISH"
    ? [h*.18,h*.32,h*.48,h*.62,h*.76]
    : [h*.45,h*.48,h*.44,h*.46,h*.43];
  return (
    <g>
      {levels.map((ly,i)=>(
        <rect key={i} x={i*(w/5)+2} y={ly} width={w/5-3} height={h-ly}
          fill={c} opacity={0.22+i*.1}/>
      ))}
      <polyline
        points={levels.map((ly,i)=>`${i*(w/5)+w/10},${ly}`).join(" ")}
        fill="none" stroke={c} strokeWidth="1.5" opacity="0.9"
        strokeLinejoin="round" className="pulse-live"/>
      <text x={w-2} y={12} textAnchor="end" fontSize="9" fill={c} fontFamily="monospace">
        {isBull?"▲":sc.badge==="BEARISH"?"▼":"→"}
      </text>
    </g>
  );
}

function PriceActionScreen({ sc, w=72, h=48 }: { sc:SC; w?:number; h?:number }) {
  const c = sc.accent;
  const candles = [
    {o:h*.55,cl:h*.35,hi:h*.28,lo:h*.62,bull:true},
    {o:h*.38,cl:h*.25,hi:h*.20,lo:h*.44,bull:true},
    {o:h*.28,cl:h*.42,hi:h*.24,lo:h*.50,bull:false},
    {o:h*.46,cl:h*.32,hi:h*.26,lo:h*.54,bull:true},
    {o:h*.34,cl:h*.20,hi:h*.14,lo:h*.40,bull:true},
  ];
  const cw = w/6;
  return (
    <g>
      {sc.badge==="ALERT"&&(
        <rect x={0} y={h*.60} width={w} height={2}
          fill={c} opacity="0.7" className="alert-blink"/>
      )}
      {candles.map((cd,i)=>{
        const col = cd.bull?"#10b981":"#ef4444";
        const bx = i*(w/5)+3;
        const by = Math.min(cd.o,cd.cl);
        const bh = Math.max(2,Math.abs(cd.cl-cd.o));
        return (
          <g key={i}>
            <line x1={bx+cw*.4} y1={cd.hi} x2={bx+cw*.4} y2={cd.lo}
              stroke={col} strokeWidth="0.8" opacity="0.75"/>
            <rect x={bx} y={by} width={cw*.8} height={bh}
              fill={col} opacity="0.75"/>
          </g>
        );
      })}
    </g>
  );
}

function NewsScreen({ sc, w=72, h=48 }: { sc:SC; w?:number; h?:number }) {
  const c = sc.accent;
  const isAlert = sc.badge==="ALERT";
  return (
    <g>
      <rect x={0} y={0} width={w} height={h*.12} fill={c} opacity={isAlert?0.2:0.1}/>
      <text x={w/2} y={h*.09} textAnchor="middle"
        fontSize="5.5" fill={c} opacity="0.9" fontFamily="monospace">
        {isAlert?"⚠ IMPACT":"MACRO"}
      </text>
      {[0.20,0.32,0.44,0.56,0.68].map((t,i)=>(
        <rect key={i} x={3} y={h*t-1.5}
          width={[w*.82,w*.60,w*.74,w*.50,w*.68][i]} height={3}
          rx="0.5" fill={c}
          opacity={isAlert&&i<2?0.55:0.22}
          className={isAlert&&i===0?"alert-blink":""}/>
      ))}
      <rect x={3} y={h*.68} width={5} height={4}
        fill={c} className="pulse-live" opacity="0.9"/>
    </g>
  );
}

function RiskScreen({ sc, w=72, h=48 }: { sc:SC; w?:number; h?:number }) {
  const c = sc.accent;
  const isBlocked = sc.badge==="BLOCKED";
  const cx2=w/2, cy2=h*.46;
  const r=Math.min(w,h)*.30;
  const circ=2*Math.PI*r;
  const fill = isBlocked?0.18:0.80;
  return (
    <g>
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c} strokeWidth="2.5" opacity="0.14"/>
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c} strokeWidth="2.5"
        opacity="0.8"
        strokeDasharray={`${circ*fill} ${circ*(1-fill)}`}
        strokeDashoffset={circ*.25} strokeLinecap="square"
        className={isBlocked?"alert-blink":"pulse-live"}/>
      <text x={cx2} y={cy2+5} textAnchor="middle" fontSize="12"
        fill={c} fontFamily="monospace" opacity="0.9"
        className={isBlocked?"alert-blink":""}>
        {isBlocked?"✖":"✔"}
      </text>
    </g>
  );
}

function ContrarianScreen({ sc, w=72, h=48 }: { sc:SC; w?:number; h?:number }) {
  const c = sc.accent;
  const mid=w/2;
  const lPts = [[mid*.1,h*.8],[mid*.3,h*.5],[mid*.5,h*.25]];
  const rPts = [[mid*1.9,h*.2],[mid*1.7,h*.5],[mid*1.5,h*.75]];
  return (
    <g>
      <line x1={mid} y1="2" x2={mid} y2={h-2}
        stroke={c} strokeWidth="0.5" opacity="0.2" strokeDasharray="3 3"/>
      <polyline points={lPts.map(p=>p.join(",")).join(" ")}
        fill="none" stroke={c} strokeWidth="1.8" opacity="0.6"
        strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={rPts.map(p=>p.join(",")).join(" ")}
        fill="none" stroke={c} strokeWidth="1.8" opacity="0.6"
        strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round"/>
      <text x={mid} y={h*.6} textAnchor="middle" fontSize="11"
        fill={c} opacity="0.45" className="pulse-live">⇅</text>
    </g>
  );
}

function MasterScreen({ sc, conf, aligned, total, w=96, h=68 }: {
  sc:SC; conf:number; aligned:number; total:number; w?:number; h?:number;
}) {
  const c = sc.accent;
  const cx2=w/2, cy2=h*.44;
  const r=Math.min(w,h)*.28;
  const spokes=[0,45,90,135,180,225,270,315];
  return (
    <g>
      <circle cx={cx2} cy={cy2} r={r*.95} fill="none" stroke={c}
        strokeWidth="0.8" opacity="0.3" strokeDasharray="4 3"
        className="radar-spin-slow"/>
      {spokes.map((deg,i)=>{
        const rad=deg*Math.PI/180;
        return (
          <line key={i}
            x1={cx2+r*.38*Math.cos(rad)} y1={cy2+r*.38*Math.sin(rad)}
            x2={cx2+r*.75*Math.cos(rad)} y2={cy2+r*.75*Math.sin(rad)}
            stroke={c} strokeWidth="0.7" opacity={0.15+(i%2)*.08}/>
        );
      })}
      <circle cx={cx2} cy={cy2} r={r*.42} fill={c} opacity="0.10"
        className="core-breathe"/>
      <text x={cx2} y={cy2+5} textAnchor="middle"
        fontSize="15" fontWeight="bold" fill={c} opacity=".95" fontFamily="monospace">
        {conf}%
      </text>
      <text x={cx2} y={cy2+16} textAnchor="middle"
        fontSize="7" fill={c} opacity=".55" fontFamily="monospace">
        {aligned}/{total}
      </text>
      <text x={cx2} y={h-2} textAnchor="middle" fontSize="6.5"
        fill={c} opacity=".80" fontFamily="monospace">
        {sc.badge==="BULL"?"▲ BULLISH":sc.badge==="BEAR"?"▼ BEARISH":sc.badge==="ANALYZING"?"SCANNING...":"NO TRADE"}
      </text>
    </g>
  );
}

function ExecutionScreen({ sc, w=72, h=48 }: { sc:SC; w?:number; h?:number }) {
  const c = sc.accent;
  const isArmed = sc.badge==="ARMED";
  const cx2=w/2, cy2=h*.44;
  const r=Math.min(w,h)*.30;
  return (
    <g>
      {[[-r,0,-r*.35,0],[r*.35,0,r,0],[0,-r,0,-r*.35],[0,r*.35,0,r]].map(([x1,y1,x2,y2],i)=>(
        <line key={i}
          x1={cx2+x1} y1={cy2+y1} x2={cx2+x2} y2={cy2+y2}
          stroke={c} strokeWidth={isArmed?1.8:1} opacity="0.8"
          className={isArmed?"pulse-live":""}/>
      ))}
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={c}
        strokeWidth="0.8" opacity="0.35" strokeDasharray="4 4"/>
      <circle cx={cx2} cy={cy2} r={r*.38} fill="none" stroke={c}
        strokeWidth={isArmed?1.8:1} opacity={isArmed?0.9:0.5}
        className={isArmed?"pulse-live":""}/>
      <rect x={cx2-3} y={cy2-3} width={6} height={6}
        fill={c} opacity={isArmed?0.95:0.6}
        className={isArmed?"pulse-live":""}/>
      {isArmed&&[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],i)=>(
        <g key={i}>
          <line x1={cx2+sx*(r*.62)} y1={cy2+sy*(r*.62)}
            x2={cx2+sx*(r*.62+9)}   y2={cy2+sy*(r*.62)}
            stroke={c} strokeWidth="1.8" opacity=".7" strokeLinecap="square"/>
          <line x1={cx2+sx*(r*.62)} y1={cy2+sy*(r*.62)}
            x2={cx2+sx*(r*.62)}     y2={cy2+sy*(r*.62+9)}
            stroke={c} strokeWidth="1.8" opacity=".7" strokeLinecap="square"/>
        </g>
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data-flow connection lines (SVG layer, absolutely fills the container)
// Each agent draws a line toward master
// ─────────────────────────────────────────────────────────────────────────────

function DataFlowLines({
  agents, masterPos, states,
}: {
  agents: AgentPos[];
  masterPos: AgentPos;
  states: Record<string, AgentState>;
}) {
  const master = masterPos;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {agents
        .filter(a => a.id !== "master")
        .map(a => {
          const state = states[a.id] ?? "idle";
          const sc    = STATE[state];
          const isActive = state !== "idle";
          // Direction: left-side agents → master, right-side → master
          const fromMaster = a.x > master.x;
          const x1 = fromMaster ? master.x : a.x;
          const y1 = fromMaster ? master.y : a.y;
          const x2 = fromMaster ? a.x : master.x;
          const y2 = fromMaster ? a.y : master.y;

          // Slightly curved path
          const mx = (x1+x2)/2;
          const my = Math.min(y1,y2) - 4;

          return (
            <g key={a.id}>
              {/* Track */}
              <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                fill="none" stroke="#0e2040" strokeWidth="0.4" opacity="0.6"/>
              {/* Active flow */}
              {isActive && (
                <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none" stroke={sc.accent} strokeWidth="0.35"
                  opacity="0.55" strokeDasharray="2.5 2.5"
                  className={
                    state==="blocked" ? "dash-flow-slow" :
                    state==="armed"   ? "dash-flow-fast" :
                    "dash-flow"
                  }/>
              )}
            </g>
          );
        })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single agent overlay
// ─────────────────────────────────────────────────────────────────────────────

function AgentOverlay({
  agent, state, sc, extraData,
}: {
  agent: AgentPos;
  state: AgentState;
  sc: SC;
  extraData?: { conf:number; aligned:number; total:number };
}) {
  const isIdle  = state === "idle";
  const isAlert = state === "blocked" || state === "alert";
  const isLg    = agent.size === "lg";

  const ringSize  = isLg ? 80  : 52;
  const monW      = isLg ? 104 : 76;
  const monH      = isLg ? 76  : 52;
  const svgW      = isLg ? 96  : 72;
  const svgH      = isLg ? 68  : 48;

  const glowStr = isIdle ? "none"
    : isAlert
    ? `0 0 ${isLg?32:20}px ${sc.glow}, 0 0 ${isLg?56:36}px ${sc.glow.replace("0.5","0.2").replace("0.6","0.25")}`
    : `0 0 ${isLg?24:16}px ${sc.glow}, 0 0 ${isLg?44:28}px ${sc.glow.replace("0.5","0.2").replace("0.6","0.25")}`;

  function screenSVG() {
    const props = { sc, w:svgW, h:svgH };
    switch (agent.id) {
      case "trend":      return <TrendScreen {...props}/>;
      case "smc":        return <PriceActionScreen {...props}/>;
      case "news":       return <NewsScreen {...props}/>;
      case "risk":       return <RiskScreen {...props}/>;
      case "contrarian": return <ContrarianScreen {...props}/>;
      case "execution":  return <ExecutionScreen {...props}/>;
      case "master":     return (
        <MasterScreen {...props} w={svgW} h={svgH}
          conf={extraData?.conf??0}
          aligned={extraData?.aligned??0}
          total={extraData?.total??0}/>
      );
      default: return null;
    }
  }

  return (
    <div
      className="absolute"
      style={{
        left: `${agent.x}%`,
        top:  `${agent.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: isLg ? 20 : 10,
      }}
    >
      {/* ── Mini monitor ── */}
      <div
        className="absolute"
        style={{
          width:  monW,
          height: monH,
          bottom: ringSize / 2 + 2,
          left:   "50%",
          transform: "translateX(-50%)",
          background: sc.screen,
          border: `1px solid ${isIdle ? "#1e3a5f40" : sc.ring + "80"}`,
          boxShadow: isIdle ? "none" : `0 0 8px ${sc.glow.replace("0.5","0.18")}`,
          position: "absolute",
        }}
      >
        {/* CRT scanlines via gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent 2px,
              rgba(255,255,255,0.025) 2px,
              rgba(255,255,255,0.025) 3px
            )`,
          }}
        />
        {/* Screen content */}
        <svg
          width={monW - 6}
          height={monH - 6}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display:"block", margin:"3px" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {screenSVG()}
        </svg>
        {/* Corner LEDs */}
        <span
          className="absolute"
          style={{
            width: 4, height: 4,
            top: 3, left: 3,
            background: sc.accent,
            opacity: isIdle ? 0.15 : 0.8,
          }}
        />
        <span
          className="absolute"
          style={{
            width: 4, height: 4,
            top: 3, right: 3,
            background: sc.accent,
            opacity: isIdle ? 0.15 : 0.8,
          }}
        />
      </div>

      {/* ── Glow ring ── */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width:     ringSize,
          height:    ringSize,
          boxShadow: glowStr,
        }}
      >
        {/* Outer ring */}
        <div
          className={cn("absolute inset-0 rounded-full border", !isIdle && (isAlert ? "alert-blink" : "pulse-live"))}
          style={{
            borderColor: isIdle ? "#1e3a5f50" : sc.ring,
            borderWidth: isLg ? 2 : 1.5,
            opacity: isIdle ? 0.35 : 0.9,
          }}
        />
        {/* Rotating outer ring (master + active non-idle) */}
        {(isLg || !isIdle) && (
          <div
            className={cn("absolute rounded-full border", !isIdle ? "radar-spin-slow" : "")}
            style={{
              inset: isLg ? -8 : -5,
              borderColor: sc.ring,
              borderWidth: "0.5px",
              opacity: isIdle ? 0.1 : 0.3,
              borderStyle: "dashed",
            }}
          />
        )}
        {/* Inner fill */}
        <div
          className={cn("absolute rounded-full", !isIdle && "core-breathe")}
          style={{
            inset: "25%",
            background: isIdle ? "#0a1830" : sc.accent,
            opacity: isIdle ? 0.2 : 0.18,
          }}
        />
        {/* Center dot */}
        <div
          className={cn("rounded-full z-10", !isIdle && "pulse-live")}
          style={{
            width:  isLg ? 10 : 7,
            height: isLg ? 10 : 7,
            background: isIdle ? "#1e3a5f" : sc.accent,
            opacity: isIdle ? 0.3 : 0.95,
            boxShadow: isIdle ? "none" : `0 0 6px ${sc.glow}`,
          }}
        />
      </div>

      {/* ── Floor glow pool ── */}
      {!isIdle && (
        <div
          className="absolute pointer-events-none core-breathe"
          style={{
            width:  isLg ? 120 : 80,
            height: isLg ? 16  : 10,
            bottom: -(isLg ? 10 : 6),
            left:   "50%",
            transform: "translateX(-50%)",
            background: `radial-gradient(ellipse at center, ${sc.accent}35 0%, transparent 70%)`,
          }}
        />
      )}

      {/* ── Label ── */}
      <div
        className="absolute text-center pointer-events-none"
        style={{
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: 6,
          whiteSpace: "nowrap",
        }}
      >
        <div
          className="font-mono font-bold uppercase"
          style={{
            fontSize: isLg ? 10 : 8,
            letterSpacing: "0.14em",
            color: isIdle ? "#1e3a5f" : sc.accent,
            opacity: isIdle ? 0.45 : 1,
          }}
        >
          {agent.label}
        </div>
        <div
          className="font-mono uppercase"
          style={{
            fontSize: 6.5,
            letterSpacing: "0.08em",
            color: sc.accent,
            opacity: isIdle ? 0.2 : 0.5,
          }}
        >
          {agent.sub}
        </div>
        {/* State badge */}
        {!isIdle && (
          <div
            className={cn("font-mono uppercase", isAlert && "alert-blink")}
            style={{
              marginTop: 2,
              fontSize: 6,
              letterSpacing: "0.12em",
              color: sc.accent,
              opacity: 0.8,
            }}
          >
            [{sc.badge}]
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Atmospheric CRT / vignette overlays
// ─────────────────────────────────────────────────────────────────────────────

function AtmosphereOverlay() {
  return (
    <>
      {/* CRT scanline sheet */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0px, transparent 3px,
            rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px
          )`,
          zIndex: 30,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 50%,
              transparent 40%,
              rgba(0,4,12,0.55) 80%,
              rgba(0,2,8,0.85) 100%)
          `,
          zIndex: 31,
        }}
      />
      {/* Top scanline flicker bar (random, CSS only) */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: 1,
          top: "30%",
          background: "rgba(34,211,238,0.04)",
          zIndex: 32,
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentCommandRoomProps {
  data: AgentRunResult | null;
  loading?: boolean;
}

export function AgentCommandRoom({ data, loading=false }: AgentCommandRoomProps) {

  const states: Record<string, AgentState> = data
    ? deriveStates(data)
    : {
        trend:"idle", smc:"idle", news:"idle",
        risk:"idle", contrarian:"idle",
        master:"analyzing", execution:"idle",
      };

  const conf    = data?.agents.master.confidence ?? 0;
  const aligned = data
    ? data.agents.master.agentConsensus.filter(a =>
        data.agents.master.finalBias==="bullish" ? a.weightedScore>0 :
        data.agents.master.finalBias==="bearish" ? a.weightedScore<0 : false
      ).length
    : 0;
  const total = data?.agents.master.agentConsensus.length ?? 0;

  const masterAgent = AGENTS.find(a => a.id === "master")!;

  return (
    <div className="w-full rounded-xl border border-white/[0.05] overflow-hidden">
      {/* ── Title bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#01060e]/90 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] pulse-live" />
          <span className="text-[9px] font-bold text-[#22d3ee] uppercase tracking-[0.22em] font-mono">
            AI Operations Center
          </span>
        </div>
        <div className="flex items-center gap-3">
          {AGENTS.filter(a=>a.id!=="master").map(a => {
            const state  = states[a.id] ?? "idle";
            const color  = STATE[state].accent;
            const active = state !== "idle";
            return (
              <div key={a.id} className="flex items-center gap-1">
                <span
                  className="inline-block"
                  style={{ width:5, height:5, background:color, opacity:active?1:0.2 }}
                />
                <span className="text-[7.5px] font-mono uppercase tracking-wide hidden lg:block"
                  style={{ color, opacity:active?0.75:0.25 }}>
                  {a.label}
                </span>
              </div>
            );
          })}
          {data && (
            <span className="text-[7.5px] font-mono text-zinc-600 ml-2">
              {new Date(data.timestamp).toLocaleTimeString("en-US",
                {hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
            </span>
          )}
        </div>
      </div>

      {/* ── Scene ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          /*
           * BACKGROUND: To use a real pixel-art image, place it at
           *   /public/control-room.png
           * and replace the CSS below with:
           *   backgroundImage: "url('/control-room.png')",
           *   backgroundSize: "cover",
           *   backgroundPosition: "center top",
           *
           * The current CSS is an atmospheric fallback.
           */
          paddingBottom: "38%",  /* aspect ratio ~2.6:1 */
          backgroundImage: `
            radial-gradient(ellipse 100% 55% at 20% -5%, #0d2240 0%, transparent 65%),
            radial-gradient(ellipse 100% 55% at 80% -5%, #0a1e38 0%, transparent 65%),
            radial-gradient(ellipse 60% 40% at 50% 5%,  #0f2848 0%, transparent 55%),
            radial-gradient(ellipse 80% 50% at 50% 110%, #030810 0%, transparent 75%),
            linear-gradient(to bottom, #020d1e 0%, #010a16 45%, #010608 100%)
          `,
        }}
      >
        {/* Data-flow connection lines */}
        <DataFlowLines
          agents={AGENTS}
          masterPos={masterAgent}
          states={states}
        />

        {/* Agent overlays */}
        {AGENTS.map(agent => (
          <AgentOverlay
            key={agent.id}
            agent={agent}
            state={states[agent.id] ?? "idle"}
            sc={STATE[states[agent.id] ?? "idle"]}
            extraData={agent.id==="master" ? { conf, aligned, total } : undefined}
          />
        ))}

        {/* Atmospheric overlays (scanlines, vignette) */}
        <AtmosphereOverlay />

        {/* Bottom HUD strip */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-1.5"
          style={{
            background: "linear-gradient(to top, rgba(0,4,12,0.9), transparent)",
            zIndex: 40,
          }}
        >
          <span className="text-[7px] font-mono text-[#22d3ee] opacity-30 uppercase tracking-[0.3em]">
            TRADEX · MULTI-AGENT ENGINE
          </span>
          <span className="text-[7px] font-mono text-[#22d3ee] opacity-20 uppercase tracking-[0.2em]">
            {data ? "● LIVE" : "○ STANDBY"}
          </span>
        </div>
      </div>
    </div>
  );
}
