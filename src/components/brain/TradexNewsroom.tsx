"use client";

/**
 * TradexNewsroom — CSS 3D Isometric Command Center Diorama
 * FF7/JRPG style: rotateX+rotateZ iso world, 3-face desk cubes,
 * billboard character sprites, glowing monitors, back wall, server racks.
 */

import React, { useState, useEffect, useCallback } from "react";

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useBlink(ms = 750) {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setInterval(() => setOn(v => !v), ms); return () => clearInterval(t); }, [ms]);
  return on;
}
function useClock() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setD(new Date()), 1000); return () => clearInterval(t); }, []);
  return d;
}
function useAnimatedBars(n: number, lo = 14, hi = 88, ms = 1100) {
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: n }, () => lo + Math.random() * (hi - lo)));
  useEffect(() => {
    const t = setInterval(() => setBars(p => p.map(v => Math.max(lo, Math.min(hi, v + (Math.random() - 0.48) * 18)))), ms);
    return () => clearInterval(t);
  }, [n, lo, hi, ms]);
  return bars;
}
function useTick(fps = 25) {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN(v => v + 1), 1000 / fps); return () => clearInterval(t); }, [fps]);
  return n;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentState = "bullish"|"bearish"|"alert"|"valid"|"blocked"|"armed"|"no-trade"|"idle";
interface AgentDef {
  id: string; label: string; role: string; state: AgentState;
  hair: string; skin: string; suit: string; accent: string; isMaster?: boolean;
}
interface StationDef {
  agentId: string;
  // Position on the flat floor (before iso transform)
  // X = left-right, Y = front(large)–back(small)
  x: number; y: number;
  platformH?: number; // extra elevation (for master platform)
}

const SC: Record<AgentState,{glow:string;screen:string}> = {
  bullish:    {glow:"#10b981",screen:"#031a10"},
  bearish:    {glow:"#ef4444",screen:"#300a0a"},
  alert:      {glow:"#f59e0b",screen:"#2e1002"},
  valid:      {glow:"#10b981",screen:"#031a10"},
  blocked:    {glow:"#ef4444",screen:"#300a0a"},
  armed:      {glow:"#22d3ee",screen:"#031628"},
  "no-trade": {glow:"#22d3ee",screen:"#031628"},
  idle:       {glow:"#6366f1",screen:"#0c0e1e"},
};

const AGENTS: Record<string,AgentDef> = {
  trend:      {id:"trend",      label:"TREND",      role:"BULLISH",  state:"bullish",  hair:"#f5c518",skin:"#e8a870",suit:"#0e2a52",accent:"#10b981"},
  smc:        {id:"smc",        label:"PR.ACTION",  role:"ALERT",    state:"alert",    hair:"#7c3aed",skin:"#c89060",suit:"#160c38",accent:"#f59e0b"},
  master:     {id:"master",     label:"MASTER",     role:"NO TRADE", state:"no-trade", hair:"#c8d8ec",skin:"#dfc898",suit:"#060e20",accent:"#22d3ee",isMaster:true},
  risk:       {id:"risk",       label:"RISK GATE",  role:"VALID",    state:"valid",    hair:"#059669",skin:"#b87058",suit:"#040d08",accent:"#10b981"},
  contrarian: {id:"contrarian", label:"CONTRARIAN", role:"MONITOR",  state:"idle",     hair:"#b91c1c",skin:"#e0a870",suit:"#130604",accent:"#f97316"},
  news:       {id:"news",       label:"NEWS",       role:"MONITOR",  state:"idle",     hair:"#2d3748",skin:"#8b5e3c",suit:"#081420",accent:"#3b82f6"},
  execution:  {id:"execution",  label:"EXECUTION",  role:"STANDBY",  state:"armed",    hair:"#0f1923",skin:"#c89060",suit:"#07101c",accent:"#22d3ee"},
};

// Layout in the flat 1000×800 floor space
// (Y: 0=back/far, 800=front/close)
const STATIONS: StationDef[] = [
  {agentId:"smc",        x:180, y:110},
  {agentId:"master",     x:460, y: 80, platformH:22},
  {agentId:"risk",       x:740, y:110},
  {agentId:"trend",      x: 40, y:310},
  {agentId:"contrarian", x:880, y:310},
  {agentId:"news",       x:240, y:490},
  {agentId:"execution",  x:640, y:490},
];

// ─── CSS values helpers ───────────────────────────────────────────────────────
const px = (n: number) => `${n}px`;
const preserveStyle: React.CSSProperties = { transformStyle: "preserve-3d" };

// ─── Desk Cube (3 CSS 3D faces) ───────────────────────────────────────────────
function DeskCube({
  left, top, w=110, d=72, h=36, platformH=0, glow,
}: {
  left:number; top:number; w?:number; d?:number; h?:number;
  platformH?:number; glow:string;
}) {
  const totalH = h + platformH;
  const topCol   = "#0a1828";
  const frontCol = "#060f1a";
  const sideCol  = "#03070e";
  const border   = `1px solid ${glow}55`;
  const glow8    = `0 0 14px ${glow}22, 0 0 4px ${glow}44`;

  return (
    <div style={{
      ...preserveStyle,
      position:"absolute", left:px(left), top:px(top),
      width:px(w), height:px(d),
    }}>
      {/* PLATFORM (if master) */}
      {platformH > 0 && (
        <>
          <div style={{
            position:"absolute", width:px(w+24), height:px(d+24),
            left:px(-12), top:px(-12),
            background:"#04090e",
            border:`1px solid ${glow}33`,
            transform:`translateZ(0px)`,
          }} />
          <div style={{
            position:"absolute", bottom:0, left:px(-12), width:px(w+24), height:px(platformH),
            background:"#030710", border:`1px solid ${glow}22`,
            transformOrigin:"bottom", transform:"rotateX(-90deg)",
          }} />
          <div style={{
            position:"absolute", top:0, left:px(w+12),
            width:px(platformH), height:px(d+24),
            background:"#020508", border:`1px solid ${glow}18`,
            transformOrigin:"left", transform:"rotateY(90deg)",
          }} />
        </>
      )}

      {/* TOP FACE */}
      <div style={{
        position:"absolute", width:px(w), height:px(d),
        background:topCol, border, boxShadow:glow8,
        transform:`translateZ(${px(totalH)})`,
      }}>
        {/* Surface detail — grid lines */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:`linear-gradient(to right,${glow}12 1px,transparent 1px),linear-gradient(to bottom,${glow}12 1px,transparent 1px)`,
          backgroundSize:"18px 18px",
        }} />
        {/* LED strip on back edge */}
        <div style={{
          position:"absolute", top:2, left:6, right:6, height:3,
          background:glow, opacity:0.5, borderRadius:2,
          boxShadow:`0 0 8px ${glow}`,
        }} />
        {/* Keyboard */}
        <div style={{
          position:"absolute", bottom:8, left:"50%",
          transform:"translateX(-50%)",
          width:48, height:14,
          background:"#04080e", border:`1px solid ${glow}30`,
          borderRadius:2,
        }}>
          {[0,1].map(row=>(
            <div key={row} style={{display:"flex",gap:2,padding:"2px 3px"}}>
              {Array.from({length:6},(_,k)=>(
                <div key={k} style={{width:6,height:4,background:"#07111e",border:`1px solid ${glow}20`,borderRadius:1}} />
              ))}
            </div>
          ))}
        </div>
        {/* Coffee mug */}
        <div style={{
          position:"absolute", top:8, left:8, width:10, height:12,
          background:"#0a1828", border:`1px solid ${glow}30`,
          borderRadius:"2px 2px 3px 3px",
        }}>
          <div style={{width:"100%",height:3,background:glow,opacity:0.25,borderRadius:"1px 1px 0 0"}} />
        </div>
      </div>

      {/* FRONT FACE (at bottom = front of room = closer to viewer) */}
      <div style={{
        position:"absolute", bottom:0, left:0,
        width:px(w), height:px(totalH),
        background:frontCol, border,
        transformOrigin:"bottom", transform:"rotateX(-90deg)",
      }}>
        {/* Front panel LED strip */}
        <div style={{
          position:"absolute", top:4, left:8, right:8, height:2,
          background:glow, opacity:0.45, borderRadius:1,
          boxShadow:`0 0 6px ${glow}`,
        }} />
        {/* Port holes */}
        <div style={{display:"flex",gap:4,position:"absolute",bottom:5,left:8}}>
          {[glow,"#6366f1","#f59e0b"].map((c,i)=>(
            <div key={i} style={{width:5,height:5,borderRadius:"50%",background:c,opacity:0.7,boxShadow:`0 0 4px ${c}`}} />
          ))}
        </div>
      </div>

      {/* RIGHT SIDE FACE */}
      <div style={{
        position:"absolute", top:0, left:px(w),
        width:px(totalH), height:px(d),
        background:sideCol, border:`1px solid ${glow}22`,
        transformOrigin:"left", transform:"rotateY(90deg)",
      }} />
    </div>
  );
}

// ─── Character Sprite (billboard – counter-rotated to face viewer) ────────────
function CharSprite({
  left, top, deskH, platformH=0, agent,
}: {
  left:number; top:number; deskH:number; platformH?:number; agent:AgentDef;
}) {
  const { hair, skin, suit, accent } = agent;
  const sc = SC[agent.state];
  const totalZ = deskH + platformH + 4; // sit just above desk surface

  // counter-rotation undoes rotateX(55deg) rotateZ(-45deg) of the world
  const billboard = "rotateZ(45deg) rotateX(-55deg)";

  return (
    <div style={{
      ...preserveStyle,
      position:"absolute",
      left:px(left + 30), top:px(top + 14),
      width:36, height:52,
      transform:`translateZ(${px(totalZ)}) ${billboard}`,
    }}>
      {/* Chair back */}
      <div style={{position:"absolute",top:14,left:2,width:32,height:34,background:"#07111e",border:"1px solid #0d2040",borderRadius:3}} />
      <div style={{position:"absolute",top:16,left:4,width:28,height:24,background:"#040c16",borderRadius:2}} />

      {/* Body */}
      <div style={{position:"absolute",top:24,left:8,width:20,height:22,background:suit,borderRadius:2}}>
        {/* Lapels */}
        <div style={{position:"absolute",top:0,left:0,width:7,height:12,background:"rgba(255,255,255,0.08)",borderRadius:"2px 0 0 0"}} />
        <div style={{position:"absolute",top:0,right:0,width:7,height:12,background:"rgba(255,255,255,0.06)",borderRadius:"0 2px 0 0"}} />
        {/* Accent badge */}
        <div style={{position:"absolute",top:2,left:"50%",transform:"translateX(-50%)",width:6,height:2,background:accent,borderRadius:1,boxShadow:`0 0 4px ${accent}`}} />
      </div>

      {/* Arms */}
      <div style={{position:"absolute",top:26,left:2,width:7,height:14,background:suit,borderRadius:2}} />
      <div style={{position:"absolute",top:26,right:2,width:7,height:14,background:suit,borderRadius:2}} />
      {/* Hands */}
      <div style={{position:"absolute",top:38,left:2,width:7,height:5,background:skin,borderRadius:2}} />
      <div style={{position:"absolute",top:38,right:2,width:7,height:5,background:skin,borderRadius:2}} />

      {/* Neck */}
      <div style={{position:"absolute",top:18,left:14,width:8,height:7,background:skin,borderRadius:2}} />

      {/* Head */}
      <div style={{position:"absolute",top:6,left:10,width:16,height:14,background:skin,borderRadius:3}}>
        {/* Eyes */}
        <div style={{position:"absolute",top:5,left:2,width:4,height:4,background:"#05090e",borderRadius:1}}>
          <div style={{width:1.5,height:1.5,background:"white",borderRadius:"50%",margin:"0.5px 0 0 0.5px"}} />
        </div>
        <div style={{position:"absolute",top:5,right:2,width:4,height:4,background:"#05090e",borderRadius:1}}>
          <div style={{width:1.5,height:1.5,background:"white",borderRadius:"50%",margin:"0.5px 0 0 0.5px"}} />
        </div>
        {/* Monitor glow on face */}
        <div style={{position:"absolute",inset:0,background:sc.glow,opacity:0.08,borderRadius:3}} />
      </div>

      {/* Hair */}
      <div style={{position:"absolute",top:2,left:9,width:18,height:9,background:hair,borderRadius:"4px 4px 1px 1px"}}>
        {/* Side tufts */}
        <div style={{position:"absolute",top:2,left:-2,width:4,height:7,background:hair,borderRadius:2}} />
        <div style={{position:"absolute",top:2,right:-2,width:4,height:7,background:hair,borderRadius:2}} />
        {/* Top spike */}
        <div style={{position:"absolute",top:-3,left:"50%",transform:"translateX(-50%)",width:8,height:5,background:hair,borderRadius:"3px 3px 0 0"}} />
      </div>
    </div>
  );
}

// ─── Monitor on desk ─────────────────────────────────────────────────────────
function DeskMonitor({
  left, top, deskH, platformH=0, agent, blink, bars,
}: {
  left:number; top:number; deskH:number; platformH?:number;
  agent:AgentDef; blink:boolean; bars:number[];
}) {
  const sc = SC[agent.state];
  const totalZ = deskH + platformH + 2;
  // Monitor tilts slightly toward viewer: less counter-rotation on X
  const monitorTilt = "rotateZ(45deg) rotateX(-42deg)";
  const w = agent.isMaster ? 68 : 52;
  const h = agent.isMaster ? 44 : 34;

  return (
    <div style={{
      ...preserveStyle,
      position:"absolute",
      left:px(left + 20), top:px(top + 4),
      width:w, height:h,
      transform:`translateZ(${px(totalZ)}) ${monitorTilt}`,
      background:"#03070e",
      border:`1.5px solid ${sc.glow}`,
      borderRadius:3,
      boxShadow:`0 0 18px ${sc.glow}55, 0 0 6px ${sc.glow}88`,
    }}>
      {/* Screen */}
      <div style={{
        position:"absolute", inset:"2px 2px 7px 2px",
        background:sc.screen, borderRadius:2,
        overflow:"hidden",
      }}>
        {/* Scanlines on screen */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.35) 2px,rgba(0,0,0,0.35) 4px)",
          pointerEvents:"none", zIndex:10,
        }} />
        {/* Agent label */}
        <div style={{
          position:"absolute",top:3,left:0,right:0,textAlign:"center",
          fontFamily:"monospace",fontSize:5,fontWeight:"bold",
          color:sc.glow,letterSpacing:1,
          textShadow:`0 0 6px ${sc.glow}`,
        }}>
          {agent.label}
        </div>
        <div style={{
          position:"absolute",top:9,left:0,right:0,textAlign:"center",
          fontFamily:"monospace",fontSize:4,color:sc.glow,opacity:0.7,
        }}>
          {agent.role}
        </div>
        {/* Bar chart */}
        <div style={{
          position:"absolute",bottom:2,left:3,right:3,height:12,
          display:"flex",alignItems:"flex-end",gap:1,
        }}>
          {bars.slice(0,agent.isMaster?6:4).map((v,i)=>(
            <div key={i} style={{
              flex:1, height:`${v}%`, maxHeight:12,
              background:sc.glow, opacity:0.75, borderRadius:"1px 1px 0 0",
              transition:"height 0.8s ease",
            }} />
          ))}
        </div>
      </div>
      {/* Status LED */}
      <div style={{
        position:"absolute",bottom:2,right:4,
        width:4,height:4,borderRadius:"50%",
        background:blink ? sc.glow : "#06101a",
        boxShadow:blink ? `0 0 6px ${sc.glow}` : "none",
        transition:"background 0.3s",
      }} />
      {/* Stand */}
      <div style={{
        position:"absolute",bottom:-8,left:"50%",
        transform:"translateX(-50%)",
        width:8,height:8,background:"#04080e",
      }} />
    </div>
  );
}

// ─── Data cables on floor ─────────────────────────────────────────────────────
const CABLE_COL: Record<string,string> = {
  trend:"#f59e0b",smc:"#7c3aed",risk:"#10b981",
  contrarian:"#f97316",news:"#3b82f6",execution:"#22d3ee",
};

function FloorCables({ tick }: { tick:number }) {
  const master = STATIONS.find(s=>AGENTS[s.agentId]?.isMaster);
  if (!master) return null;
  const mx = master.x + 60; // center of master desk
  const my = master.y + 36;

  return (
    <svg style={{
      position:"absolute", left:0, top:0,
      width:"100%", height:"100%",
      overflow:"visible",
      transform:"translateZ(2px)",
      ...preserveStyle,
    }}>
      {STATIONS.filter(s=>!AGENTS[s.agentId]?.isMaster).map(stn=>{
        const col = CABLE_COL[stn.agentId] ?? "#64748b";
        const ax = stn.x + 60, ay = stn.y + 36;
        const midY = (ay + my) / 2;
        const d = `M${ax},${ay} L${ax},${midY} L${mx},${midY} L${mx},${my}`;
        const off = (tick * 2) % 18;
        return (
          <g key={stn.agentId}>
            <path d={d} fill="none" stroke={col} strokeWidth={5} opacity={0.07} />
            <path d={d} fill="none" stroke={col} strokeWidth={2}
              strokeDasharray="8 5" strokeDashoffset={-off}
              style={{filter:`drop-shadow(0 0 3px ${col})`}} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Floor grid ───────────────────────────────────────────────────────────────
function IsoFloor() {
  return (
    <div style={{
      position:"absolute", left:0, top:0,
      width:1000, height:800,
      background:"#02060e",
      backgroundImage:`
        linear-gradient(to right,  #0a1e3860 1px, transparent 1px),
        linear-gradient(to bottom, #0a1e3860 1px, transparent 1px)
      `,
      backgroundSize:"60px 60px",
      transform:"translateZ(0px)",
    }}>
      {/* Floor glow at center */}
      <div style={{
        position:"absolute",
        left:"35%",top:"20%",width:"30%",height:"40%",
        background:"radial-gradient(ellipse, rgba(34,211,238,0.04) 0%, transparent 70%)",
        pointerEvents:"none",
      }} />
    </div>
  );
}

// ─── Back wall ────────────────────────────────────────────────────────────────
function BackWall({ bars, clock, blink }: { bars:number[]; clock:Date; blink:boolean }) {
  const hh = clock.getHours(), mm = clock.getMinutes(), ss = clock.getSeconds();
  const hourDeg = (hh%12)*30 + mm*0.5;
  const minDeg  = mm*6 + ss*0.1;
  const secDeg  = ss*6;
  const hand = (deg:number, len:number, w:number, col:string) => {
    const a = (deg-90)*Math.PI/180;
    return <line x1={50} y1={50} x2={50+Math.cos(a)*len} y2={50+Math.sin(a)*len}
      stroke={col} strokeWidth={w} strokeLinecap="round" />;
  };

  return (
    <div style={{
      position:"absolute",
      left:0, top:0,
      width:1000, height:380,
      background:"#030812",
      borderBottom:"2px solid #0d2040",
      transformOrigin:"top center",
      transform:"rotateX(-90deg)",
      overflow:"hidden",
    }}>
      {/* Wall panel lines */}
      {[200,400,600,800].map(x=>(
        <div key={x} style={{position:"absolute",top:0,bottom:0,left:x,width:1,background:"#07111e"}} />
      ))}

      {/* Ceiling light bars */}
      {[100,300,500,700,900].map(x=>(
        <div key={x} style={{position:"absolute",top:0,left:x-40,width:80,height:14,
          background:"#04090e",border:"1px solid #0a1e34",borderRadius:"0 0 3px 3px",
          boxShadow:"0 6px 30px rgba(125,211,252,0.12)"}}>
          <div style={{margin:"2px 4px",height:8,background:"rgba(125,211,252,0.18)",borderRadius:2}} />
        </div>
      ))}

      {/* Left server racks */}
      {[20,50,80].map((lx,ri)=>(
        <div key={ri} style={{position:"absolute",left:lx,top:20,width:24,height:200,
          background:"#030810",border:"1px solid #0a1828",borderRadius:2}}>
          {Array.from({length:12},(_,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",margin:"1px 2px",height:14,
              background:"#040c18",border:"1px solid #091624",borderRadius:1}}>
              <div style={{marginLeft:"auto",width:4,height:4,borderRadius:"50%",
                background: (blink && j%2===ri%2) ? (j%3===0?"#10b981":j%3===1?"#3b82f6":"#f59e0b") : "#06101a",
                boxShadow: (blink && j%2===ri%2) ? "0 0 4px currentColor" : "none",
                marginRight:3,
              }} />
            </div>
          ))}
        </div>
      ))}

      {/* Right server racks */}
      {[896,926,956].map((lx,ri)=>(
        <div key={ri} style={{position:"absolute",left:lx,top:20,width:24,height:200,
          background:"#030810",border:"1px solid #0a1828",borderRadius:2}}>
          {Array.from({length:12},(_,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",margin:"1px 2px",height:14,
              background:"#040c18",border:"1px solid #091624",borderRadius:1}}>
              <div style={{marginLeft:"auto",width:4,height:4,borderRadius:"50%",
                background: (!blink && j%2===ri%2) ? (j%3===0?"#22d3ee":j%3===1?"#10b981":"#f97316") : "#06101a",
                boxShadow: (!blink && j%2===ri%2) ? "0 0 4px currentColor" : "none",
                marginRight:3,
              }} />
            </div>
          ))}
        </div>
      ))}

      {/* Left monitor — FX Rates */}
      <div style={{position:"absolute",left:120,top:24,width:220,height:200,
        background:"#020810",border:"1px solid #0d2040",borderRadius:3,
        boxShadow:"0 0 20px rgba(34,211,238,0.06)"}}>
        <div style={{padding:"8px 10px"}}>
          <div style={{fontFamily:"monospace",fontSize:8,color:"#22d3ee",letterSpacing:3,marginBottom:6,textAlign:"center",
            textShadow:"0 0 8px #22d3ee"}}>
            FX RATES
          </div>
          <div style={{height:1,background:"#0d2040",marginBottom:6}} />
          {[["XAUUSD","2,341.50","+0.4%","#10b981"],
            ["EURUSD","1.0842",  "+0.1%","#10b981"],
            ["GBPUSD","1.2674",  "−0.2%","#ef4444"],
            ["BTCUSD","67,420",  "+1.8%","#10b981"],
            ["USDJPY","154.32",  "−0.3%","#ef4444"],
            ["XAGUSD","27.44",   "+0.6%","#10b981"],
            ["NZDUSD","0.5924",  "−0.1%","#ef4444"],
          ].map(([pair,price,chg,col],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",
              fontFamily:"monospace",fontSize:7,marginBottom:4}}>
              <span style={{color:"#2a4060"}}>{pair}</span>
              <span style={{color:"#7a98b8"}}>{price}</span>
              <span style={{color:col}}>{chg}</span>
            </div>
          ))}
        </div>
        {/* Corner brackets */}
        {([[120,24],[336,24],[120,220],[336,220]] as [number,number][]).map(([bx,by],i)=>(
          <div key={i} style={{position:"fixed",left:bx,top:by}}>
            <div style={{position:"absolute",width:8,height:1.5,background:"#22d3ee",
              top:0,left:i%2===0?0:undefined,right:i%2===1?0:undefined}} />
            <div style={{position:"absolute",width:1.5,height:8,background:"#22d3ee",
              top:0,left:i%2===0?0:undefined,right:i%2===1?0:undefined}} />
          </div>
        ))}
      </div>

      {/* CENTER MAIN DISPLAY */}
      <div style={{position:"absolute",left:360,top:18,width:480,height:240,
        background:"#010710",border:"2px solid #1d3a70",borderRadius:4,
        boxShadow:"0 0 40px rgba(34,211,238,0.1), inset 0 0 20px rgba(34,211,238,0.03)"}}>
        {/* Corner brackets */}
        {["top-left","top-right","bottom-left","bottom-right"].map((pos,i)=>(
          <div key={i} style={{
            position:"absolute",
            top:pos.startsWith("top")?-1:undefined,
            bottom:pos.startsWith("bottom")?-1:undefined,
            left:pos.endsWith("left")?-1:undefined,
            right:pos.endsWith("right")?-1:undefined,
            width:16,height:16,
            borderTop:pos.startsWith("top")?"2px solid #22d3ee":undefined,
            borderBottom:pos.startsWith("bottom")?"2px solid #22d3ee":undefined,
            borderLeft:pos.endsWith("left")?"2px solid #22d3ee":undefined,
            borderRight:pos.endsWith("right")?"2px solid #22d3ee":undefined,
          }} />
        ))}
        <div style={{padding:"14px 20px",height:"100%",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"monospace",fontSize:20,fontWeight:"bold",
              color:"#22d3ee",letterSpacing:8,
              textShadow:"0 0 20px #22d3ee, 0 0 40px rgba(34,211,238,0.4)"}}>
              TRADEX
            </div>
            <div style={{fontFamily:"monospace",fontSize:7,color:"#1e4080",letterSpacing:2.5,marginTop:3}}>
              MULTI-AGENT INTELLIGENCE PLATFORM
            </div>
          </div>
          <div style={{height:1,background:"#0d2040"}} />
          {/* Bar chart */}
          <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:4,padding:"0 4px"}}>
            {(["TRND","PA","NEWS","MSTR","RISK","CNTR","EXEC"] as string[]).map((lbl,i)=>{
              const cols = ["#10b981","#f59e0b","#3b82f6","#22d3ee","#10b981","#f97316","#22d3ee"];
              const barH = `${bars[i]}%`;
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <div style={{fontFamily:"monospace",fontSize:4.5,color:cols[i]}}>{Math.round(bars[i])}%</div>
                  <div style={{width:"100%",height:60,background:"#030a14",borderRadius:1,display:"flex",alignItems:"flex-end"}}>
                    <div style={{width:"100%",height:barH,background:cols[i],
                      opacity:0.75,borderRadius:"1px 1px 0 0",
                      transition:"height 0.9s ease",
                      boxShadow:`0 0 6px ${cols[i]}66`}} />
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:4.5,color:cols[i]}}>{lbl}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"monospace",fontSize:6}}>
            <span style={{color:"#10b981"}}>● 7 AGENTS ACTIVE</span>
            <span style={{color:"#22d3ee"}}>REAL-TIME CONSENSUS</span>
            <span style={{color:"#1e4080"}}>v2.4.1</span>
          </div>
        </div>
      </div>

      {/* RIGHT DISPLAY — Analog Clock */}
      <div style={{position:"absolute",left:870,top:24,width:110,height:110,
        background:"#010710",border:"1px solid #0d2040",borderRadius:"50%",
        boxShadow:"0 0 20px rgba(34,211,238,0.08)"}}>
        <svg width="110" height="110" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill="#010508" stroke="#0d2040" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#060e1c" strokeWidth="0.5" />
          {Array.from({length:12},(_,i)=>{
            const a=(i*30-90)*Math.PI/180, isMaj=i%3===0;
            return <line key={i}
              x1={50+Math.cos(a)*(isMaj?34:37)} y1={50+Math.sin(a)*(isMaj?34:37)}
              x2={50+Math.cos(a)*44} y2={50+Math.sin(a)*44}
              stroke={isMaj?"#22d3ee":"#0d2040"} strokeWidth={isMaj?2:1} />;
          })}
          {hand(hourDeg, 22, 3, "#c8d8ec")}
          {hand(minDeg, 32, 2, "#c8d8ec")}
          {hand(secDeg, 38, 1, "#ef4444")}
          <circle cx="50" cy="50" r="3" fill="#ef4444" />
          <circle cx="50" cy="50" r="1.5" fill="#e2e8f0" />
        </svg>
      </div>
      <div style={{position:"absolute",left:870,top:140,
        fontFamily:"monospace",fontSize:7,color:"#22d3ee",textAlign:"center",width:110}}>
        {`${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`}
      </div>
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
function NavBar({running,onRun}:{running:boolean;onRun:()=>void}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"8px 16px",background:"#020609",borderBottom:"1px solid #0a1e34"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{display:"flex",gap:6}}>
          {["#ef4444","#f59e0b","#10b981"].map((c,i)=>(
            <div key={i} style={{width:10,height:10,borderRadius:"50%",background:c,opacity:0.85}} />
          ))}
        </div>
        <span style={{fontFamily:"monospace",fontSize:11,color:"#22d3ee",
          letterSpacing:4,fontWeight:"bold",
          textShadow:"0 0 12px rgba(34,211,238,0.6)"}}>
          TRADEX NEWSROOM
        </span>
        <span style={{fontFamily:"monospace",fontSize:8,color:"#1a3050",letterSpacing:2}}>
          AI OPS CENTER
        </span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontFamily:"monospace",fontSize:8,color:"#1e3050"}}>
          XAU <span style={{color:"#10b981"}}>2341.50</span>{" · "}
          BTC <span style={{color:"#10b981"}}>67420</span>{" · "}
          EUR <span style={{color:"#ef4444"}}>1.0842</span>
        </div>
        <button onClick={onRun} style={{
          display:"flex",alignItems:"center",gap:6,
          padding:"4px 14px",borderRadius:3,cursor:"pointer",
          background:running?"#041c10":"#020810",
          border:`1px solid ${running?"#10b981":"#1a3a70"}`,
          fontFamily:"monospace",fontSize:9,fontWeight:"bold",letterSpacing:1,
          color:running?"#10b981":"#22d3ee",
        }}>
          <span style={{width:6,height:6,borderRadius:"50%",display:"inline-block",
            background:running?"#10b981":"#22d3ee",
            animation:running?"pulse-live 0.7s ease-in-out infinite":"none"}} />
          {running?"RUNNING…":"RUN PIPELINE"}
        </button>
      </div>
    </div>
  );
}

// ─── Agent label overlays (HTML layer, outside 3D scene) ─────────────────────
// These are positioned using approximate screen coords to label each station
const LABEL_POSITIONS: Record<string,[number,number]> = {
  // Rough screen-space positions after the iso transform
  // Will be adjusted visually
  trend:      [ 52, 360],
  smc:        [190, 224],
  master:     [352, 170],
  risk:       [512, 224],
  contrarian: [632, 360],
  news:       [218, 450],
  execution:  [440, 450],
};

// ─── Main Export ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);
  const blink = useBlink(700);
  const clock = useClock();
  const bars  = useAnimatedBars(8, 16, 90, 1050);
  const tick  = useTick(25);
  const handleRun = useCallback(()=>{ setRunning(true); setTimeout(()=>setRunning(false),4200); },[]);

  const DESK_W = 110, DESK_D = 72, DESK_H = 36;

  return (
    <div style={{
      position:"relative",
      background:"#010407",
      border:"1px solid #0a1e34",
      borderRadius:12,
      overflow:"hidden",
      userSelect:"none",
    }}>
      <NavBar running={running} onRun={handleRun} />

      {/* ── 3D Scene viewport ─────────────────────────────────────── */}
      <div style={{
        position:"relative",
        height:560,
        overflow:"hidden",
        background:"#010407",
      }}>

        {/* Global CRT scanline overlay */}
        <div style={{
          position:"absolute",inset:0,zIndex:40,pointerEvents:"none",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.25) 3px,rgba(0,0,0,0.25) 4px)",
        }} />

        {/* Vignette */}
        <div style={{
          position:"absolute",inset:0,zIndex:39,pointerEvents:"none",
          background:"radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(1,4,7,0.85) 100%)",
        }} />

        {/* ── ISO WORLD ───────────────────────────────────────────── */}
        <div style={{
          position:"absolute",
          left:"50%", top:"54%",
          // Translate so world center (~500,400) appears at viewport center
          marginLeft:-500, marginTop:-400,
          width:1000, height:800,
          ...preserveStyle,
          transform:"rotateX(55deg) rotateZ(-45deg) scale(0.56)",
          transformOrigin:"500px 400px",
        }}>
          {/* Floor */}
          <IsoFloor />

          {/* Back wall */}
          <BackWall bars={bars} clock={clock} blink={blink} />

          {/* Floor cables */}
          <FloorCables tick={tick} />

          {/* Desk stations */}
          {STATIONS.map(stn => {
            const agent = AGENTS[stn.agentId];
            if (!agent) return null;
            const sc = SC[agent.state];
            const pH = stn.platformH ?? 0;
            return (
              <React.Fragment key={stn.agentId}>
                <DeskCube
                  left={stn.x} top={stn.y}
                  w={DESK_W} d={DESK_D} h={DESK_H}
                  platformH={pH}
                  glow={sc.glow}
                />
                <CharSprite
                  left={stn.x} top={stn.y}
                  deskH={DESK_H} platformH={pH}
                  agent={agent}
                />
                <DeskMonitor
                  left={stn.x} top={stn.y}
                  deskH={DESK_H} platformH={pH}
                  agent={agent} blink={blink} bars={bars}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Agent label overlays (screen-space, readable) ─────── */}
        {STATIONS.map(stn=>{
          const agent = AGENTS[stn.agentId];
          if (!agent) return null;
          const sc = SC[agent.state];
          const [lx, ly] = LABEL_POSITIONS[stn.agentId] ?? [0, 0];
          return (
            <div key={stn.agentId} style={{
              position:"absolute",
              left:lx, top:ly,
              transform:"translateX(-50%)",
              zIndex:30, pointerEvents:"none",
              textAlign:"center",
            }}>
              <div style={{
                fontFamily:"monospace",fontSize:7.5,fontWeight:"bold",
                color:sc.glow,letterSpacing:1.5,
                textShadow:`0 0 8px ${sc.glow}`,
                background:"rgba(1,4,7,0.7)",
                padding:"2px 6px",borderRadius:2,
                border:`1px solid ${sc.glow}40`,
              }}>
                {agent.label}
              </div>
              <div style={{
                fontFamily:"monospace",fontSize:6,color:sc.glow,
                opacity:0.65,marginTop:1,
              }}>
                {agent.role}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"6px 16px",
        background:"#020609",borderTop:"1px solid #0a1e34",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          {Object.values(AGENTS).map(a=>{
            const sc = SC[a.state];
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{
                  width:5,height:5,borderRadius:"50%",
                  background:blink?sc.glow:"#0a1e34",
                  boxShadow:blink?`0 0 6px ${sc.glow}`:"none",
                  transition:"background 0.3s,box-shadow 0.3s",
                }} />
                <span style={{fontFamily:"monospace",fontSize:7.5,
                  color:sc.glow,letterSpacing:1,
                  textShadow:`0 0 6px ${sc.glow}88`}}>
                  {a.label}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"monospace",fontSize:7.5,color:"#10b981",letterSpacing:1}}>
            ● LIVE
          </span>
          <span style={{fontFamily:"monospace",fontSize:7.5,color:"#0a1e34"}}>
            {clock.toLocaleTimeString("en-US",{hour12:false})}
          </span>
        </div>
      </div>
    </div>
  );
}
