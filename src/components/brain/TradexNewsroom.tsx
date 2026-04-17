"use client";

import React, { useState, useEffect, useCallback } from "react";

// ─── Hooks ────────────────────────────────────────────────────────────────────
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
  const [b, setB] = useState<number[]>(() => Array.from({ length: n }, () => lo + Math.random() * (hi - lo)));
  useEffect(() => {
    const t = setInterval(() => setB(p => p.map(v => Math.max(lo, Math.min(hi, v + (Math.random() - 0.48) * 18)))), ms);
    return () => clearInterval(t);
  }, [n, lo, hi, ms]);
  return b;
}

// ─── Types & Data ─────────────────────────────────────────────────────────────
type AgentState = "bullish"|"bearish"|"alert"|"valid"|"blocked"|"armed"|"no-trade"|"idle";
const SC: Record<AgentState,{glow:string;screen:string}> = {
  bullish:    {glow:"#10b981",screen:"#031a0c"},
  bearish:    {glow:"#ef4444",screen:"#1a0303"},
  alert:      {glow:"#f59e0b",screen:"#1a0d00"},
  valid:      {glow:"#10b981",screen:"#031a0c"},
  blocked:    {glow:"#ef4444",screen:"#1a0303"},
  armed:      {glow:"#22d3ee",screen:"#021420"},
  "no-trade": {glow:"#22d3ee",screen:"#021420"},
  idle:       {glow:"#818cf8",screen:"#080c1e"},
};
interface Agent { id:string; label:string; role:string; state:AgentState; hair:string; skin:string; suit:string; accent:string; }
const AGENTS: Agent[] = [
  {id:"trend",      label:"TREND",      role:"BULLISH",   state:"bullish",  hair:"#fbbf24",skin:"#f0a070",suit:"#0e3060",accent:"#10b981"},
  {id:"master",     label:"MASTER",     role:"NO TRADE",  state:"no-trade", hair:"#e2e8f0",skin:"#e8c898",suit:"#080e20",accent:"#22d3ee"},
  {id:"risk",       label:"RISK GATE",  role:"VALID",     state:"valid",    hair:"#34d399",skin:"#c07858",suit:"#040e0a",accent:"#10b981"},
  {id:"smc",        label:"PR.ACTION",  role:"ALERT",     state:"alert",    hair:"#a78bfa",skin:"#d09060",suit:"#1e0e48",accent:"#f59e0b"},
  {id:"news",       label:"NEWS",       role:"MONITOR",   state:"idle",     hair:"#60a5fa",skin:"#9b7050",suit:"#061428",accent:"#3b82f6"},
  {id:"contrarian", label:"CONTRARIAN", role:"MONITOR",   state:"idle",     hair:"#f87171",skin:"#e0a870",suit:"#180806",accent:"#f97316"},
  {id:"execution",  label:"EXECUTION",  role:"STANDBY",   state:"armed",    hair:"#22d3ee",skin:"#c89060",suit:"#07101c",accent:"#22d3ee"},
];

// ─── 3D CSS Helpers ───────────────────────────────────────────────────────────
const P3D: React.CSSProperties = { transformStyle: "preserve-3d" };
const px = (n:number) => `${n}px`;

// Desk cube dimensions (world units)
const DW = 94;   // width
const DD = 68;   // depth
const DH = 40;   // height

// ─── Agent Pixel Sprite (Billboard) ──────────────────────────────────────────
function AgentSprite({ agent, deskZ }: { agent: Agent; deskZ: number }) {
  const glow = SC[agent.state].glow;
  const { hair, skin, suit, accent } = agent;
  // sits at center-back of desk top, standing up via billboard transform
  const left = DW * 0.28;
  const top  = DD * 0.08;
  return (
    <div style={{
      ...P3D,
      position: "absolute",
      left: px(left),
      top:  px(top),
      width: 36, height: 60,
      // Billboard: stand up relative to tilted floor
      transform: `translateZ(${px(deskZ + 60)}) rotateX(-90deg) rotateY(0deg) rotateZ(45deg)`,
      transformOrigin: "center bottom",
    }}>
      <svg width="36" height="60" viewBox="0 0 36 60" style={{ overflow:"visible", display:"block" }}>
        {/* Status glow dot */}
        <circle cx="18" cy="3" r="3" fill={glow} style={{ filter:`drop-shadow(0 0 4px ${glow})` }} />
        {/* Hair */}
        <rect x="5" y="7" width="26" height="10" rx="4" fill={hair} />
        <rect x="2" y="9" width="6" height="7" rx="3" fill={hair} />
        <rect x="28" y="9" width="6" height="7" rx="3" fill={hair} />
        <rect x="12" y="3" width="12" height="7" rx="4" fill={hair} />
        {/* Head */}
        <rect x="6" y="13" width="24" height="18" rx="4" fill={skin} />
        {/* Screen glow on face */}
        <rect x="6" y="13" width="24" height="18" rx="4" fill={glow} opacity="0.12" />
        {/* Eyes */}
        <rect x="9"  y="17" width="7" height="5" rx="1.5" fill="#0a0e18" />
        <rect x="20" y="17" width="7" height="5" rx="1.5" fill="#0a0e18" />
        <rect x="10" y="18" width="3" height="2.5" rx="1" fill="white" opacity="0.9" />
        <rect x="21" y="18" width="3" height="2.5" rx="1" fill="white" opacity="0.9" />
        {/* Mouth */}
        <rect x="13" y="26" width="10" height="2.5" rx="1" fill="#8b5050" />
        {/* Neck */}
        <rect x="14" y="30" width="8" height="5" fill={skin} />
        {/* Body */}
        <rect x="4" y="34" width="28" height="20" rx="4" fill={suit} />
        {/* Lapels */}
        <polygon points="4,34 14,34 10,46" fill="rgba(255,255,255,0.09)" />
        <polygon points="32,34 22,34 26,46" fill="rgba(255,255,255,0.07)" />
        {/* Tie */}
        <polygon points="18,35 16,50 18,53 20,50" fill={accent} opacity="0.9" />
        {/* Screen glow on chest */}
        <rect x="4" y="34" width="28" height="20" rx="4" fill={glow} opacity="0.14" />
        {/* Arms */}
        <rect x="-2" y="35" width="7" height="16" rx="3" fill={suit} />
        <rect x="31" y="35" width="7" height="16" rx="3" fill={suit} />
        {/* Hands */}
        <rect x="-2" y="49" width="7" height="7" rx="3" fill={skin} />
        <rect x="31" y="49" width="7" height="7" rx="3" fill={skin} />
        {/* Chair back */}
        <rect x="3" y="53" width="30" height="5" rx="2" fill="#060e1e" stroke="#0e2248" strokeWidth="1" />
      </svg>
      {/* Name label */}
      <div style={{
        position: "absolute", bottom: -18, left: "50%",
        transform: "translateX(-50%)",
        fontFamily:"monospace", fontSize:8, fontWeight:"bold",
        color: glow, letterSpacing:1.5,
        textShadow: `0 0 10px ${glow}, 0 0 4px ${glow}`,
        whiteSpace: "nowrap",
        background: "rgba(2,6,14,0.85)",
        padding: "1px 5px", borderRadius:2,
        border: `1px solid ${glow}44`,
      }}>
        {agent.label}
      </div>
    </div>
  );
}

// ─── Desk Monitor (billboard on desk surface) ─────────────────────────────────
function DeskMonitor({ agent, deskZ, blink, bars }: {
  agent:Agent; deskZ:number; blink:boolean; bars:number[];
}) {
  const { glow, screen } = SC[agent.state];
  const mw = 58, mh = 42;
  return (
    <div style={{
      ...P3D,
      position:"absolute",
      left: px(DW * 0.54),
      top:  px(DD * 0.06),
      width: mw, height: mh,
      // Stand monitor up from desk surface
      transform: `translateZ(${px(deskZ + mh)}) rotateX(-90deg) rotateZ(45deg)`,
      transformOrigin: "center bottom",
    }}>
      {/* Monitor casing */}
      <div style={{
        position:"absolute", inset:0,
        background:"#020810",
        border:`2px solid ${glow}`,
        borderRadius:4,
        boxShadow:`0 0 30px ${glow}88, 0 0 12px ${glow}, 0 0 60px ${glow}44, inset 0 0 14px ${glow}18`,
      }}>
        {/* Scanlines */}
        <div style={{
          position:"absolute",inset:0,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.28) 2px,rgba(0,0,0,0.28) 3px)",
          borderRadius:3, pointerEvents:"none",
        }} />
        {/* Content */}
        <div style={{padding:"4px 5px"}}>
          <div style={{fontFamily:"monospace",fontSize:6,fontWeight:"bold",color:glow,letterSpacing:1,textShadow:`0 0 8px ${glow}`,marginBottom:2}}>{agent.label}</div>
          <div style={{fontFamily:"monospace",fontSize:5,color:glow,opacity:0.6,marginBottom:3}}>{agent.role}</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:1.5,height:18,background:screen,borderRadius:1,padding:"1px 2px"}}>
            {bars.slice(0,5).map((v,i)=>(
              <div key={i} style={{flex:1,height:`${v}%`,background:glow,opacity:0.85,borderRadius:"1px 1px 0 0",boxShadow:`0 0 5px ${glow}`}} />
            ))}
          </div>
        </div>
        {/* LED */}
        <div style={{position:"absolute",bottom:3,right:4,width:5,height:5,borderRadius:"50%",background:blink?glow:"#03060e",boxShadow:blink?`0 0 8px ${glow}`:"none"}} />
        {/* Stand */}
        <div style={{position:"absolute",bottom:-7,left:"50%",transform:"translateX(-50%)",width:10,height:7,background:"#050a14"}} />
      </div>
    </div>
  );
}

// ─── 3D Desk Box ──────────────────────────────────────────────────────────────
function DeskBox({ agent, blink, bars, wx, wy, elevated=false }: {
  agent:Agent; blink:boolean; bars:number[];
  wx:number; wy:number; elevated?:boolean;
}) {
  const { glow } = SC[agent.state];
  const platformH = elevated ? 20 : 0;
  const totalH = DH + platformH;

  return (
    <div style={{ ...P3D, position:"absolute", left:wx, top:wy, width:DW, height:DD }}>

      {/* ── MASTER ELEVATED PLATFORM ── */}
      {elevated && <>
        <div style={{
          position:"absolute", left:-14, top:-14, width:DW+28, height:DD+28,
          background:"#050a1c", border:`2px solid ${glow}55`,
          boxShadow:`0 0 40px ${glow}33`,
          transform:`translateZ(${px(platformH)})`,
        }} />
        {/* Platform front face */}
        <div style={{
          position:"absolute", bottom:-14, left:-14, width:DW+28, height:platformH,
          background:"#040818", border:`1px solid ${glow}33`,
          transformOrigin:"bottom", transform:"rotateX(-90deg)",
        }} />
        {/* Platform right face */}
        <div style={{
          position:"absolute", top:-14, left:DW+14, width:platformH, height:DD+28,
          background:"#030614", border:`1px solid ${glow}22`,
          transformOrigin:"left", transform:"rotateY(90deg)",
        }} />
      </>}

      {/* ── TOP FACE ── */}
      <div style={{
        position:"absolute", width:DW, height:DD,
        background:`linear-gradient(135deg,#0d2040,#071428)`,
        border:`2px solid ${glow}88`,
        boxShadow:`0 0 30px ${glow}55, inset 0 0 16px ${glow}18`,
        transform:`translateZ(${px(totalH)})`,
      }}>
        {/* Surface grid */}
        <div style={{
          position:"absolute",inset:0,
          backgroundImage:`linear-gradient(to right,${glow}28 1px,transparent 1px),linear-gradient(to bottom,${glow}28 1px,transparent 1px)`,
          backgroundSize:"22px 22px",
        }} />
        {/* LED strip at back */}
        <div style={{position:"absolute",top:3,left:5,right:5,height:4,background:glow,opacity:0.85,borderRadius:2,boxShadow:`0 0 18px ${glow},0 0 40px ${glow}66`}} />
        {/* Keyboard */}
        <div style={{position:"absolute",bottom:7,left:"50%",transform:"translateX(-50%)",width:50,height:15,background:"#03070e",border:`1px solid ${glow}55`,borderRadius:2}}>
          {[0,1].map(row=>(
            <div key={row} style={{display:"flex",gap:1,padding:"1.5px 2px",marginTop:row===0?1.5:0}}>
              {Array.from({length:7},(_,k)=>(
                <div key={k} style={{flex:1,height:5,background:"#070e18",border:`1px solid ${glow}33`,borderRadius:0.5}} />
              ))}
            </div>
          ))}
        </div>
        {/* Coffee cup */}
        <div style={{position:"absolute",top:7,left:6,width:10,height:13,background:"#09162a",border:`1.5px solid ${glow}55`,borderRadius:"3px 3px 4px 4px"}}>
          <div style={{height:3,background:glow,opacity:0.5,borderRadius:"1px 1px 0 0"}} />
          <div style={{position:"absolute",right:-4,top:2,width:4,height:6,borderRadius:"0 3px 3px 0",border:`1.5px solid ${glow}44`,borderLeft:"none"}} />
        </div>
        {/* Notes */}
        <div style={{position:"absolute",top:8,right:6,width:16,height:12,background:"#060c1a",border:`1px solid ${glow}28`,borderRadius:1}}>
          {[2,5,8].map(y=>(<div key={y} style={{position:"absolute",top:y,left:2,right:2,height:0.8,background:`${glow}44`}} />))}
        </div>
      </div>

      {/* ── FRONT FACE ── */}
      <div style={{
        position:"absolute", bottom:0, left:0, width:DW, height:totalH,
        background:`linear-gradient(to bottom,#0c1e3a,#060c1e)`,
        border:`2px solid ${glow}55`,
        transformOrigin:"bottom", transform:"rotateX(-90deg)",
      }}>
        <div style={{position:"absolute",top:4,left:7,right:7,height:3,background:glow,opacity:0.75,borderRadius:1,boxShadow:`0 0 12px ${glow}`}} />
        {/* Leg cavity */}
        <div style={{position:"absolute",bottom:4,left:"8%",width:"84%",height:totalH*0.45,background:"#010408",borderRadius:"3px 3px 0 0",border:`1px solid ${glow}22`}} />
        {/* Port cluster */}
        <div style={{position:"absolute",bottom:9,left:7,display:"flex",gap:4}}>
          {[glow,"#818cf8","#fbbf24","#f87171"].map((c,i)=>(
            <div key={i} style={{width:7,height:7,borderRadius:"50%",background:c,opacity:0.9,boxShadow:`0 0 8px ${c}`}} />
          ))}
        </div>
        {/* Power panel */}
        <div style={{position:"absolute",bottom:9,right:7,width:22,height:13,background:"#030810",border:`1px solid ${glow}44`,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 7px #10b981"}} />
          <div style={{width:5,height:5,borderRadius:"50%",background:"#3b82f6",boxShadow:"0 0 7px #3b82f6"}} />
        </div>
      </div>

      {/* ── RIGHT SIDE FACE ── */}
      <div style={{
        position:"absolute", top:0, left:px(DW), width:totalH, height:DD,
        background:`linear-gradient(to right,#080e1e,#040810)`,
        border:`2px solid ${glow}40`,
        transformOrigin:"left", transform:"rotateY(90deg)",
      }}>
        {[10,22,34].map(y=>(
          <div key={y} style={{position:"absolute",top:y,left:6,right:6,height:3,background:`${glow}30`,borderRadius:1}} />
        ))}
        <div style={{position:"absolute",top:5,right:6,width:7,height:7,borderRadius:"50%",background:glow,opacity:0.7,boxShadow:`0 0 10px ${glow}`}} />
      </div>

      {/* ── MONITOR (billboard) ── */}
      <DeskMonitor agent={agent} deskZ={totalH} blink={blink} bars={bars} />

      {/* ── AGENT SPRITE (billboard) ── */}
      <AgentSprite agent={agent} deskZ={totalH} />
    </div>
  );
}

// ─── Analog Clock ─────────────────────────────────────────────────────────────
function AnalogClock({ clock, x, y }: { clock:Date; x:number; y:number }) {
  const hh=clock.getHours(), mm=clock.getMinutes(), ss=clock.getSeconds();
  const hand=(deg:number,len:number,w:number,col:string)=>{
    const a=(deg-90)*Math.PI/180;
    return <line x1={50} y1={50} x2={50+Math.cos(a)*len} y2={50+Math.sin(a)*len} stroke={col} strokeWidth={w} strokeLinecap="round"/>;
  };
  return (
    <div style={{
      position:"absolute", left:x, top:y, width:88, height:88,
      background:"#030810", border:"2px solid rgba(34,211,238,0.5)",
      borderRadius:"50%", boxShadow:"0 0 30px rgba(34,211,238,0.3), 0 0 60px rgba(34,211,238,0.1)",
    }}>
      <svg width="88" height="88" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="#020810" stroke="rgba(34,211,238,0.25)" strokeWidth="1.5"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth="0.8"/>
        {Array.from({length:12},(_,i)=>{
          const a=(i*30-90)*Math.PI/180, maj=i%3===0;
          return <line key={i} x1={50+Math.cos(a)*(maj?30:35)} y1={50+Math.sin(a)*(maj?30:35)} x2={50+Math.cos(a)*43} y2={50+Math.sin(a)*43} stroke={maj?"#22d3ee":"rgba(34,211,238,0.3)"} strokeWidth={maj?2.5:1.2}/>;
        })}
        {hand((hh%12)*30+mm*0.5, 22, 3.5,"#c8d8ec")}
        {hand(mm*6+ss*0.1, 32, 2.2,"#e2e8f0")}
        {hand(ss*6, 38, 1.2,"#ef4444")}
        <circle cx="50" cy="50" r="4" fill="#ef4444"/>
        <circle cx="50" cy="50" r="2" fill="#fff"/>
      </svg>
    </div>
  );
}

// ─── Back Wall ────────────────────────────────────────────────────────────────
function BackWall({ bars, clock, blink }: { bars:number[]; clock:Date; blink:boolean }) {
  const hh=clock.getHours(), mm=clock.getMinutes(), ss=clock.getSeconds();
  return (
    <div style={{
      ...P3D,
      position:"absolute", left:0, top:0, width:900, height:380,
      background:"linear-gradient(to bottom,#060e20,#040b18)",
      borderRight:"2px solid rgba(34,211,238,0.3)",
      borderBottom:"3px solid rgba(34,211,238,0.5)",
      transformOrigin:"top center",
      transform:"rotateX(-90deg)",
      overflow:"hidden",
    }}>
      {/* Wall panel lines */}
      {[80,160,240,320].map(y=>(<div key={y} style={{position:"absolute",left:0,right:0,top:y,height:1,background:"rgba(34,211,238,0.1)"}} />))}
      {[150,300,450,600,750].map(x=>(<div key={x} style={{position:"absolute",top:0,bottom:0,left:x,width:1,background:"rgba(34,211,238,0.06)"}} />))}

      {/* Top glow strip */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:5,background:"linear-gradient(to right,rgba(34,211,238,0.6),rgba(99,102,241,0.4),rgba(34,211,238,0.6))",boxShadow:"0 0 20px rgba(34,211,238,0.5)"}} />

      {/* Ceiling light bars */}
      {[80,220,380,560,720,880].map(cx=>(
        <div key={cx} style={{position:"absolute",top:0,left:cx-42,width:84,height:18,background:"#040918",border:"1px solid rgba(125,211,252,0.4)",borderRadius:"0 0 6px 6px",boxShadow:"0 10px 50px rgba(125,211,252,0.35)"}}>
          <div style={{margin:"2px 6px",height:10,background:"rgba(125,211,252,0.6)",borderRadius:2,boxShadow:"0 0 14px rgba(125,211,252,0.9)"}} />
        </div>
      ))}

      {/* LEFT SERVER RACK */}
      <div style={{position:"absolute",left:0,top:18,width:90,bottom:0,background:"#030c1c",borderRight:"2px solid rgba(34,211,238,0.3)"}}>
        <div style={{padding:"4px 3px",display:"flex",flexDirection:"column",gap:2}}>
          {Array.from({length:20},(_,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",height:14,background:"#040c1c",border:"1px solid rgba(34,211,238,0.1)",borderRadius:1,margin:"0 2px"}}>
              <div style={{flex:1,height:2,margin:"0 4px",background:"rgba(34,211,238,0.12)",borderRadius:1}} />
              <div style={{width:5,height:5,borderRadius:"50%",marginRight:3,background:(blink&&j%2===0)?(j%3===0?"#10b981":j%3===1?"#3b82f6":"#f59e0b"):"#060f1a",boxShadow:(blink&&j%2===0)?"0 0 6px currentColor":"none"}} />
              <div style={{width:5,height:5,borderRadius:"50%",marginRight:3,background:(!blink&&j%3===0)?"#22d3ee":"#060f1a",boxShadow:(!blink&&j%3===0)?"0 0 6px #22d3ee":"none"}} />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SERVER RACK */}
      <div style={{position:"absolute",right:0,top:18,width:90,bottom:0,background:"#030c1c",borderLeft:"2px solid rgba(99,102,241,0.3)"}}>
        <div style={{padding:"4px 3px",display:"flex",flexDirection:"column",gap:2}}>
          {Array.from({length:20},(_,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",height:14,background:"#040c1c",border:"1px solid rgba(99,102,241,0.1)",borderRadius:1,margin:"0 2px"}}>
              <div style={{flex:1,height:2,margin:"0 4px",background:"rgba(99,102,241,0.12)",borderRadius:1}} />
              <div style={{width:5,height:5,borderRadius:"50%",marginRight:3,background:(!blink&&j%2===0)?(j%4===0?"#f97316":j%4===1?"#10b981":"#818cf8"):"#060f1a",boxShadow:(!blink&&j%2===0)?"0 0 6px currentColor":"none"}} />
              <div style={{width:5,height:5,borderRadius:"50%",marginRight:3,background:(blink&&j%3===1)?"#f59e0b":"#060f1a",boxShadow:(blink&&j%3===1)?"0 0 6px #f59e0b":"none"}} />
            </div>
          ))}
        </div>
      </div>

      {/* MAIN TRADEX SCREEN */}
      <div style={{position:"absolute",left:140,top:16,width:478,height:252,background:"#030810",border:"2px solid rgba(34,211,238,0.6)",borderTop:"4px solid #22d3ee",borderRadius:"0 0 6px 6px",boxShadow:"0 0 80px rgba(34,211,238,0.3),0 0 160px rgba(34,211,238,0.15),inset 0 0 40px rgba(34,211,238,0.04)"}}>
        {/* Corner brackets */}
        {(["tl","tr","bl","br"] as const).map(c=>(
          <div key={c} style={{position:"absolute",top:c[0]==="t"?4:undefined,bottom:c[0]==="b"?4:undefined,left:c[1]==="l"?4:undefined,right:c[1]==="r"?4:undefined,width:18,height:18,borderTop:c[0]==="t"?"2px solid #22d3ee":undefined,borderBottom:c[0]==="b"?"2px solid #22d3ee":undefined,borderLeft:c[1]==="l"?"2px solid #22d3ee":undefined,borderRight:c[1]==="r"?"2px solid #22d3ee":undefined}} />
        ))}
        {/* Scanlines */}
        <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)",pointerEvents:"none"}} />
        <div style={{padding:"12px 20px 8px",height:"100%",display:"flex",flexDirection:"column",gap:5}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"monospace",fontSize:26,fontWeight:"bold",color:"#22d3ee",letterSpacing:10,textShadow:"0 0 40px #22d3ee,0 0 100px rgba(34,211,238,0.4)"}}>TRADEX</div>
            <div style={{fontFamily:"monospace",fontSize:7,color:"rgba(34,211,238,0.4)",letterSpacing:3,marginTop:2}}>MULTI-AGENT INTELLIGENCE PLATFORM</div>
          </div>
          <div style={{height:1,background:"rgba(34,211,238,0.18)"}} />
          <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:5,padding:"0 4px"}}>
            {(["TRND","PA","NEWS","MSTR","RISK","CNTR","EXEC"] as const).map((lbl,i)=>{
              const COLS=["#34d399","#fbbf24","#60a5fa","#22d3ee","#34d399","#fb923c","#22d3ee"];
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <div style={{fontFamily:"monospace",fontSize:5.5,color:COLS[i],textShadow:`0 0 6px ${COLS[i]}`}}>{Math.round(bars[i]||50)}%</div>
                  <div style={{width:"100%",height:74,background:"#03091a",borderRadius:1,display:"flex",alignItems:"flex-end",overflow:"hidden",border:`1px solid ${COLS[i]}22`}}>
                    <div style={{width:"100%",height:`${bars[i]||50}%`,background:COLS[i],opacity:0.85,borderRadius:"1px 1px 0 0",transition:"height 1s ease",boxShadow:`0 0 12px ${COLS[i]},0 0 4px ${COLS[i]}`}} />
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:5.5,color:COLS[i]}}>{lbl}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"monospace",fontSize:7,borderTop:"1px solid rgba(34,211,238,0.15)",paddingTop:4}}>
            <span style={{color:"#34d399",textShadow:"0 0 8px #34d399"}}>● 7 AGENTS ACTIVE</span>
            <span style={{color:"rgba(34,211,238,0.7)"}}>REAL-TIME CONSENSUS</span>
            <span style={{color:"rgba(34,211,238,0.3)"}}>v2.4.1</span>
          </div>
        </div>
      </div>

      {/* CLOCK */}
      <AnalogClock clock={clock} x={636} y={20} />

      {/* Clock digital */}
      <div style={{position:"absolute",left:636,top:116,width:88,textAlign:"center",fontFamily:"monospace",fontSize:9,color:"#22d3ee",textShadow:"0 0 10px #22d3ee"}}>
        {`${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`}
      </div>

      {/* Agent status mini-panel */}
      <div style={{position:"absolute",left:636,top:138,right:0,bottom:0,padding:"8px 6px 6px"}}>
        <div style={{fontFamily:"monospace",fontSize:7,color:"rgba(34,211,238,0.4)",letterSpacing:2,marginBottom:6}}>SYS STATUS</div>
        {AGENTS.map(a=>{
          const c=SC[a.state].glow;
          return (
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:blink?c:"#030810",boxShadow:blink?`0 0 6px ${c}`:"none",flexShrink:0}} />
              <span style={{fontFamily:"monospace",fontSize:7,color:c,letterSpacing:0.5}}>{a.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Left Wall ────────────────────────────────────────────────────────────────
function LeftWall({ blink }: { blink:boolean }) {
  return (
    <div style={{
      ...P3D,
      position:"absolute", left:0, top:0, width:380, height:900,
      background:"linear-gradient(to right,#060e1e,#040b18)",
      borderBottom:"2px solid rgba(34,211,238,0.3)",
      borderRight:"3px solid rgba(34,211,238,0.4)",
      transformOrigin:"left center",
      transform:"rotateY(90deg)",
      overflow:"hidden",
    }}>
      {/* Horizontal panel lines */}
      {[80,160,240,310].map(y=>(<div key={y} style={{position:"absolute",left:0,right:0,top:y,height:1,background:"rgba(34,211,238,0.1)"}} />))}
      {[120,240,360,480,600,720].map(x=>(<div key={x} style={{position:"absolute",top:0,bottom:0,left:x,width:1,background:"rgba(34,211,238,0.06)"}} />))}

      {/* Top glow strip */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:5,background:"linear-gradient(to right,rgba(34,211,238,0.5),rgba(99,102,241,0.4))"}} />

      {/* Ceiling light bars */}
      {[80,240,400,580,740].map(cx=>(
        <div key={cx} style={{position:"absolute",top:0,left:cx-38,width:76,height:16,background:"#040918",border:"1px solid rgba(125,211,252,0.35)",borderRadius:"0 0 5px 5px",boxShadow:"0 8px 40px rgba(125,211,252,0.25)"}}>
          <div style={{margin:"2px 5px",height:9,background:"rgba(125,211,252,0.5)",borderRadius:2,boxShadow:"0 0 12px rgba(125,211,252,0.8)"}} />
        </div>
      ))}

      {/* Side monitors */}
      {[1,2].map(i=>(
        <div key={i} style={{position:"absolute",left:100+i*140,top:58,width:110,height:84,background:"#04091a",border:"1px solid rgba(34,211,238,0.4)",borderRadius:3,boxShadow:"0 0 24px rgba(34,211,238,0.2),inset 0 0 12px rgba(34,211,238,0.05)"}}>
          <div style={{margin:4,height:58,background:"#021828",borderRadius:2,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:5,left:0,right:0,textAlign:"center",fontFamily:"monospace",fontSize:6,color:"#22d3ee",letterSpacing:1,textShadow:"0 0 8px #22d3ee"}}>{i===1?"SYS.MON":"NET.FLOW"}</div>
            <div style={{position:"absolute",bottom:5,left:4,right:4,height:26,display:"flex",alignItems:"flex-end",gap:2.5}}>
              {[45,72,55,83,61,70,48].map((v,j)=>(
                <div key={j} style={{flex:1,height:`${v}%`,background:"#22d3ee",opacity:0.75,borderRadius:"1px 1px 0 0",boxShadow:"0 0 4px #22d3ee"}} />
              ))}
            </div>
          </div>
          <div style={{position:"absolute",bottom:5,right:6,width:6,height:6,borderRadius:"50%",background:blink?"#10b981":"#04101a",boxShadow:blink?"0 0 8px #10b981":"none"}} />
        </div>
      ))}

      {/* Cable conduit strip */}
      <div style={{position:"absolute",top:158,left:0,right:0,height:10,background:"#060e1c",borderTop:"1px solid rgba(34,211,238,0.25)",borderBottom:"1px solid rgba(34,211,238,0.25)"}} />
      {/* LED strip */}
      <div style={{position:"absolute",top:162,left:20,display:"flex",gap:9}}>
        {Array.from({length:30},(_,i)=>(
          <div key={i} style={{width:5,height:5,borderRadius:"50%",background:(blink&&i%3===0)?"#10b981":((!blink)&&i%4===0)?"#3b82f6":"#061018",boxShadow:(blink&&i%3===0)?"0 0 6px #10b981":((!blink)&&i%4===0)?"0 0 6px #3b82f6":"none",opacity:0.9}} />
        ))}
      </div>
    </div>
  );
}

// ─── Floor ────────────────────────────────────────────────────────────────────
function IsoFloor({ tick }: { tick:number }) {
  // Cable connections between desks
  const cables = [
    {x1:340+20,y1:280+34, x2:475+20,y2:245+34, col:"#fbbf24"},
    {x1:475+20,y1:245+34, x2:610+20,y2:280+34, col:"#34d399"},
    {x1:475+20,y1:245+34, x2:260+20,y2:395+34, col:"#a78bfa"},
    {x1:475+20,y1:245+34, x2:380+20,y2:420+34, col:"#60a5fa"},
    {x1:475+20,y1:245+34, x2:515+20,y2:420+34, col:"#f97316"},
    {x1:475+20,y1:245+34, x2:645+20,y2:395+34, col:"#22d3ee"},
  ];
  const off = (tick*2)%20;
  return (
    <div style={{position:"absolute",left:0,top:0,width:900,height:900,background:"#040f20"}}>
      {/* Grid */}
      <div style={{position:"absolute",inset:0,backgroundImage:["linear-gradient(to right,rgba(34,211,238,0.15) 1px,transparent 1px)","linear-gradient(to bottom,rgba(34,211,238,0.15) 1px,transparent 1px)"].join(","),backgroundSize:"55px 55px"}} />
      {/* Ambient glow */}
      <div style={{position:"absolute",left:"25%",top:"15%",width:"50%",height:"50%",background:"radial-gradient(ellipse,rgba(34,211,238,0.08) 0%,transparent 70%)",pointerEvents:"none"}} />
      {/* Floor edge strip */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:5,background:"rgba(34,211,238,0.15)",boxShadow:"0 0 20px rgba(34,211,238,0.3)"}} />
      {/* Cables */}
      <svg style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",overflow:"visible"}} >
        {cables.map((c,i)=>(
          <g key={i}>
            <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={c.col} strokeWidth={8} opacity={0.07} />
            <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={c.col} strokeWidth={2.5} strokeDasharray="8 5" strokeDashoffset={-off} style={{filter:`drop-shadow(0 0 5px ${c.col})`}} />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Blue Light Cones ─────────────────────────────────────────────────────────
function LightCones() {
  const cones = [{x:340,y:300,c:"rgba(34,211,238,0.18)"},{x:490,y:260,c:"rgba(99,102,241,0.16)"},{x:420,y:400,c:"rgba(34,211,238,0.14)"}];
  return (
    <>
      {cones.map((cone,i)=>(
        <div key={i} style={{
          position:"absolute", left:cone.x-60, top:cone.y-40,
          width:120, height:220,
          background:`linear-gradient(to bottom, ${cone.c}, transparent)`,
          clipPath:"polygon(50% 0%, 0% 100%, 100% 100%)",
          pointerEvents:"none",
          transform:`translateZ(280px)`,
          transformStyle:"preserve-3d",
        }} />
      ))}
    </>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
function NavBar({ running, onRun, blink }: { running:boolean; onRun:()=>void; blink:boolean }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 18px",background:"linear-gradient(to right,#020810,#030c18,#020810)",borderBottom:"1px solid rgba(34,211,238,0.25)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{display:"flex",gap:6}}>
          {(["#ef4444","#f59e0b","#10b981"] as const).map((c,i)=>(
            <div key={i} style={{width:11,height:11,borderRadius:"50%",background:c,opacity:0.9,boxShadow:`0 0 8px ${c}88`}} />
          ))}
        </div>
        <span style={{fontFamily:"monospace",fontSize:12,color:"#22d3ee",letterSpacing:5,fontWeight:"bold",textShadow:"0 0 20px rgba(34,211,238,0.8)"}}>TRADEX NEWSROOM</span>
        <span style={{fontFamily:"monospace",fontSize:8,color:"rgba(34,211,238,0.35)",letterSpacing:2}}>AI OPS CENTER</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        {/* Agent status dots */}
        <div style={{display:"flex",gap:10}}>
          {AGENTS.map(a=>{
            const c=SC[a.state].glow;
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:blink?c:"#061018",boxShadow:blink?`0 0 7px ${c}`:"none",transition:"all 0.3s"}} />
                <span style={{fontFamily:"monospace",fontSize:7,color:c,letterSpacing:0.5,textShadow:`0 0 6px ${c}88`}}>{a.label}</span>
              </div>
            );
          })}
        </div>
        <button onClick={onRun} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 16px",borderRadius:4,cursor:"pointer",background:running?"#041c10":"#020a1a",border:`1px solid ${running?"#10b981":"rgba(34,211,238,0.5)"}`,fontFamily:"monospace",fontSize:9,fontWeight:"bold",letterSpacing:1.5,color:running?"#10b981":"#22d3ee",boxShadow:running?"0 0 16px rgba(16,185,129,0.4)":"0 0 12px rgba(34,211,238,0.2)"}}>
          <span style={{width:7,height:7,borderRadius:"50%",display:"inline-block",background:running?"#10b981":"#22d3ee",boxShadow:running?"0 0 8px #10b981":"0 0 6px #22d3ee"}} />
          {running?"RUNNING…":"RUN PIPELINE"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);
  const [tick,    setTick   ] = useState(0);
  const blink  = useBlink(700);
  const clock  = useClock();
  const bars   = useAnimatedBars(8, 20, 92, 1050);
  const handleRun = useCallback(()=>{setRunning(true);setTimeout(()=>setRunning(false),4200);},[]);
  useEffect(()=>{ const t=setInterval(()=>setTick(v=>v+1),40); return()=>clearInterval(t); },[]);

  // Desk layout — Back row + Front row, tightly clustered
  const BACK_ROW = [
    {agent:AGENTS[0], wx:330, wy:280, elevated:false},   // TREND
    {agent:AGENTS[1], wx:470, wy:245, elevated:true },   // MASTER (elevated)
    {agent:AGENTS[2], wx:610, wy:280, elevated:false},   // RISK GATE
  ];
  const FRONT_ROW = [
    {agent:AGENTS[3], wx:255, wy:392},  // PR.ACTION
    {agent:AGENTS[4], wx:380, wy:418},  // NEWS
    {agent:AGENTS[5], wx:510, wy:418},  // CONTRARIAN
    {agent:AGENTS[6], wx:638, wy:392},  // EXECUTION
  ];

  return (
    <div style={{position:"relative",background:"#020810",border:"1px solid rgba(34,211,238,0.2)",borderRadius:12,overflow:"hidden",userSelect:"none"}}>
      <NavBar running={running} onRun={handleRun} blink={blink} />

      {/* ── SCENE CONTAINER ── */}
      <div style={{position:"relative",height:560,background:"#020810",overflow:"hidden"}}>

        {/* CRT scanlines */}
        <div style={{position:"absolute",inset:0,zIndex:50,pointerEvents:"none",backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.18) 3px,rgba(0,0,0,0.18) 4px)"}} />

        {/* Vignette */}
        <div style={{position:"absolute",inset:0,zIndex:49,pointerEvents:"none",background:"radial-gradient(ellipse 90% 88% at 48% 52%,transparent 38%,rgba(2,8,16,0.9) 100%)"}} />

        {/* ── 3D WORLD ── */}
        <div style={{
          ...P3D,
          position:"absolute",
          left:"50%", top:"62%",
          marginLeft:-450, marginTop:-450,
          width:900, height:900,
          transform:"perspective(1200px) rotateX(60deg) rotateZ(-45deg) scale(0.7)",
          transformOrigin:"450px 450px",
        }}>
          <IsoFloor tick={tick} />
          <BackWall bars={bars} clock={clock} blink={blink} />
          <LeftWall blink={blink} />
          <LightCones />

          {BACK_ROW.map(({agent,wx,wy,elevated})=>(
            <DeskBox key={agent.id} agent={agent} blink={blink} bars={bars} wx={wx} wy={wy} elevated={elevated} />
          ))}
          {FRONT_ROW.map(({agent,wx,wy})=>(
            <DeskBox key={agent.id} agent={agent} blink={blink} bars={bars} wx={wx} wy={wy} />
          ))}
        </div>
      </div>

      {/* Footer interpretation */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 18px",background:"linear-gradient(to right,#020810,#030c18,#020810)",borderTop:"1px solid rgba(34,211,238,0.2)"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {([["🟢","Bullish/Valid"],["🟡","Alert"],["🔵","Armed/No-Trade"],["🟣","Monitoring"]] as const).map(([ic,lbl])=>(
            <span key={lbl} style={{fontFamily:"monospace",fontSize:7,color:"rgba(34,211,238,0.45)"}}>{ic} {lbl}</span>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:"monospace",fontSize:8,color:"#34d399",letterSpacing:1,textShadow:"0 0 8px #34d399"}}>● LIVE</span>
          <span style={{fontFamily:"monospace",fontSize:8,color:"rgba(34,211,238,0.3)"}}>{clock.toLocaleTimeString("en-US",{hour12:false})}</span>
        </div>
      </div>
    </div>
  );
}
