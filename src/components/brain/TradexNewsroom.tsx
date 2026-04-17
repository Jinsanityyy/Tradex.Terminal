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

type FXRow = { price: string; pct: string; up: boolean; live: boolean };

// Maps our display keys to API symbols
const SYM_MAP: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD",
  USDJPY: "USD/JPY",
  XAGUSD: "XAG/USD",
  NZDUSD: "NZD/USD",
};

const EMPTY_ROW: FXRow = { price:"—", pct:"—", up:true, live:false };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useLivePrices(_agentData: any) {
  const [rows, setRows] = useState<Record<string, FXRow>>(() =>
    Object.fromEntries(Object.keys(SYM_MAP).map(k => [k, EMPTY_ROW]))
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/market/quotes", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json() as { data: Array<{ symbol:string; price:number; changePercent:number }> };
        if (!Array.isArray(json.data)) return;

        // Build reverse lookup: "XAU/USD" → "XAUUSD"
        const reverseMap = Object.fromEntries(
          Object.entries(SYM_MAP).map(([k, v]) => [v, k])
        );

        setRows(prev => {
          const next = { ...prev };
          for (const item of json.data) {
            const key = reverseMap[item.symbol];
            if (!key) continue;
            const pct = item.changePercent ?? 0;
            const isJpy = key === "USDJPY";
            const isBtc = key === "BTCUSD";
            const priceStr = isBtc
              ? item.price.toLocaleString("en-US", { maximumFractionDigits: 0 })
              : isJpy
              ? item.price.toFixed(2)
              : item.price < 100
              ? item.price.toFixed(4)
              : item.price.toFixed(2);
            next[key] = {
              price: priceStr,
              pct: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
              up: pct >= 0,
              live: true,
            };
          }
          return next;
        });
      } catch { /* silent */ }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return rows;
}

// ─── Agent definitions ────────────────────────────────────────────────────────
type AgentState = "bullish"|"bearish"|"alert"|"valid"|"blocked"|"armed"|"no-trade"|"idle";
const STATE_COLOR: Record<AgentState, string> = {
  bullish:"#10b981", bearish:"#ef4444", alert:"#f59e0b", valid:"#10b981",
  blocked:"#ef4444", armed:"#22d3ee", "no-trade":"#22d3ee", idle:"#818cf8",
};

interface Agent {
  id:string; label:string; role:string; state:AgentState;
  hair:string; skin:string; suit:string; accent:string;
}

const AGENTS: Agent[] = [
  {id:"trend",      label:"TREND",      role:"BULLISH",  state:"bullish",  hair:"#fbbf24",skin:"#f0a070",suit:"#0e3060",accent:"#10b981"},
  {id:"smc",        label:"PR.ACTION",  role:"ALERT",    state:"alert",    hair:"#a78bfa",skin:"#d09060",suit:"#1e0e48",accent:"#f59e0b"},
  {id:"master",     label:"MASTER",     role:"NO TRADE", state:"no-trade", hair:"#e2e8f0",skin:"#e8c898",suit:"#080e20",accent:"#22d3ee"},
  {id:"risk",       label:"RISK GATE",  role:"VALID",    state:"valid",    hair:"#34d399",skin:"#c07858",suit:"#0a1e12",accent:"#10b981"},
  {id:"contrarian", label:"CONTRARIAN", role:"MONITOR",  state:"idle",     hair:"#f87171",skin:"#e0a870",suit:"#1a0a06",accent:"#f97316"},
  {id:"news",       label:"NEWS",       role:"MONITOR",  state:"idle",     hair:"#60a5fa",skin:"#9b7050",suit:"#06101e",accent:"#3b82f6"},
  {id:"execution",  label:"EXECUTION",  role:"STANDBY",  state:"armed",    hair:"#22d3ee",skin:"#c89060",suit:"#06101c",accent:"#22d3ee"},
];

// ─── Pixel Character (2D front-facing, seated) ────────────────────────────────
function PixelChar({ agent, scale = 1 }: { agent: Agent; scale?: number }) {
  const sc = STATE_COLOR[agent.state];
  const s = (n: number) => n * scale;
  return (
    <div style={{ position:"relative", width:s(28), height:s(48), flexShrink:0 }}>
      {/* Hair */}
      <div style={{
        position:"absolute", top:0, left:s(3), width:s(22), height:s(10),
        background:agent.hair, borderRadius:`${s(4)}px ${s(4)}px 0 0`,
        boxShadow:`0 0 ${s(6)}px ${agent.hair}88`,
        imageRendering:"pixelated",
      }}>
        {/* Hair side tufts */}
        <div style={{position:"absolute",top:s(2),left:s(-2),width:s(4),height:s(6),background:agent.hair,borderRadius:s(2)}} />
        <div style={{position:"absolute",top:s(2),right:s(-2),width:s(4),height:s(6),background:agent.hair,borderRadius:s(2)}} />
      </div>
      {/* Head */}
      <div style={{
        position:"absolute", top:s(6), left:s(4), width:s(20), height:s(16),
        background:agent.skin, borderRadius:s(3),
        boxShadow:`0 0 ${s(8)}px ${sc}33`,
      }}>
        {/* Eyes */}
        <div style={{position:"absolute",top:s(4),left:s(3),width:s(5),height:s(5),background:"#0a0e18",borderRadius:s(1)}}>
          <div style={{width:s(2),height:s(2),background:"white",opacity:0.9,margin:`${s(0.5)}px 0 0 ${s(1)}px`}} />
        </div>
        <div style={{position:"absolute",top:s(4),right:s(3),width:s(5),height:s(5),background:"#0a0e18",borderRadius:s(1)}}>
          <div style={{width:s(2),height:s(2),background:"white",opacity:0.9,margin:`${s(0.5)}px 0 0 ${s(1)}px`}} />
        </div>
        {/* Mouth */}
        <div style={{position:"absolute",bottom:s(3),left:"50%",transform:"translateX(-50%)",width:s(6),height:s(2),background:"#8b5050",borderRadius:s(1)}} />
        {/* Screen glow on face */}
        <div style={{position:"absolute",inset:0,background:sc,opacity:0.12,borderRadius:s(3)}} />
      </div>
      {/* Neck */}
      <div style={{position:"absolute",top:s(20),left:s(10),width:s(8),height:s(5),background:agent.skin}} />
      {/* Body/suit */}
      <div style={{
        position:"absolute", top:s(24), left:s(2), width:s(24), height:s(18),
        background:agent.suit, borderRadius:`${s(2)}px ${s(2)}px ${s(4)}px ${s(4)}px`,
        boxShadow:`0 0 ${s(10)}px ${sc}22`,
      }}>
        {/* Lapels */}
        <div style={{position:"absolute",top:0,left:0,width:s(8),height:s(12),background:"rgba(255,255,255,0.08)",borderRadius:`0 0 ${s(4)}px 0`}} />
        <div style={{position:"absolute",top:0,right:0,width:s(8),height:s(12),background:"rgba(255,255,255,0.06)",borderRadius:`0 0 0 ${s(4)}px`}} />
        {/* Tie/badge */}
        <div style={{position:"absolute",top:s(2),left:"50%",transform:"translateX(-50%)",width:s(5),height:s(10),background:agent.accent,borderRadius:`${s(1)}px ${s(1)}px ${s(3)}px ${s(3)}px`,opacity:0.9,boxShadow:`0 0 ${s(6)}px ${agent.accent}`}} />
      </div>
      {/* Arms */}
      <div style={{position:"absolute",top:s(25),left:s(-3),width:s(6),height:s(14),background:agent.suit,borderRadius:s(2)}} />
      <div style={{position:"absolute",top:s(25),right:s(-3),width:s(6),height:s(14),background:agent.suit,borderRadius:s(2)}} />
      {/* Hands */}
      <div style={{position:"absolute",top:s(37),left:s(-3),width:s(6),height:s(5),background:agent.skin,borderRadius:s(2)}} />
      <div style={{position:"absolute",top:s(37),right:s(-3),width:s(6),height:s(5),background:agent.skin,borderRadius:s(2)}} />
      {/* Status glow dot above head */}
      <div style={{position:"absolute",top:s(-4),left:"50%",transform:"translateX(-50%)",width:s(4),height:s(4),borderRadius:"50%",background:sc,boxShadow:`0 0 ${s(6)}px ${sc}`}} />
    </div>
  );
}

// ─── Desk (2D side-on, items on top) ─────────────────────────────────────────
function Desk2D({
  agent, blink, bars, nameTag = true
}: {
  agent: Agent; blink: boolean; bars: number[]; nameTag?: boolean;
}) {
  const sc = STATE_COLOR[agent.state];
  const isMaster = agent.id === "master";
  const deskW = isMaster ? 140 : 112;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, flexShrink:0 }}>
      {/* Name tag */}
      {nameTag && (
        <div style={{
          fontFamily:"monospace", fontSize:7, fontWeight:"bold",
          color:sc, letterSpacing:1.5, marginBottom:3,
          textShadow:`0 0 8px ${sc}`,
          background:"rgba(2,8,20,0.8)", padding:"2px 6px", borderRadius:2,
          border:`1px solid ${sc}44`,
        }}>
          {agent.label}
        </div>
      )}

      {/* Character + desk assembly */}
      <div style={{ position:"relative", width:deskW, display:"flex", flexDirection:"column", alignItems:"center" }}>
        {/* Character (peeking above desk) */}
        <div style={{ zIndex:2, marginBottom:-4 }}>
          <PixelChar agent={agent} scale={isMaster ? 1.15 : 1} />
        </div>

        {/* Desk top surface */}
        <div style={{
          width:"100%", height:isMaster ? 56 : 48,
          background:`linear-gradient(to bottom,#2a3148,#1e2438)`,
          border:`2px solid ${sc}55`,
          borderBottom:`3px solid ${sc}33`,
          borderRadius:`${isMaster?4:3}px ${isMaster?4:3}px 0 0`,
          position:"relative",
          boxShadow:`0 0 16px ${sc}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
          zIndex:1,
        }}>
          {/* Monitor */}
          <div style={{
            position:"absolute", top:4, left:isMaster?16:12,
            width:isMaster?68:54, height:isMaster?36:30,
            background:"#040a14",
            border:`2px solid ${sc}`,
            borderRadius:3,
            boxShadow:`0 0 16px ${sc}88, 0 0 6px ${sc}, inset 0 0 8px ${sc}11`,
          }}>
            {/* Scanlines */}
            <div style={{
              position:"absolute",inset:0,
              backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.3) 2px,rgba(0,0,0,0.3) 3px)",
              borderRadius:2,pointerEvents:"none",
            }} />
            {/* Screen content */}
            <div style={{padding:"3px 4px"}}>
              <div style={{fontFamily:"monospace",fontSize:5,color:sc,letterSpacing:0.5,marginBottom:2,textShadow:`0 0 6px ${sc}`}}>
                {agent.role}
              </div>
              <div style={{display:"flex",alignItems:"flex-end",gap:1.5,height:isMaster?16:12}}>
                {bars.slice(0, isMaster?5:3).map((v,i)=>(
                  <div key={i} style={{flex:1,height:`${v}%`,background:sc,opacity:0.8,borderRadius:"1px 1px 0 0",boxShadow:`0 0 4px ${sc}`}} />
                ))}
              </div>
            </div>
            {/* LED */}
            <div style={{position:"absolute",bottom:2,right:3,width:4,height:4,borderRadius:"50%",background:blink?sc:"#030810",boxShadow:blink?`0 0 6px ${sc}`:"none"}} />
          </div>

          {/* Keyboard */}
          <div style={{
            position:"absolute", bottom:5, left:isMaster?14:10,
            width:isMaster?42:34, height:11,
            background:"#141c2e", border:`1px solid ${sc}33`,
            borderRadius:2,
          }}>
            {[0,1].map(row=>(
              <div key={row} style={{display:"flex",gap:1,padding:"1px 2px",marginTop:row===0?1:0}}>
                {Array.from({length:7},(_,k)=>(
                  <div key={k} style={{flex:1,height:3.5,background:"#0a1020",border:`1px solid ${sc}22`,borderRadius:0.5}} />
                ))}
              </div>
            ))}
          </div>

          {/* Coffee mug */}
          <div style={{
            position:"absolute", top:6, right:isMaster?10:7,
            width:9, height:12,
            background:"#0e1828", border:`1.5px solid ${sc}55`,
            borderRadius:"2px 2px 3px 3px",
          }}>
            <div style={{height:3,background:sc,opacity:0.45,borderRadius:"1px 1px 0 0"}} />
            {/* Handle */}
            <div style={{position:"absolute",right:-3,top:2,width:3,height:5,borderRadius:"0 2px 2px 0",border:`1.5px solid ${sc}44`,borderLeft:"none"}} />
          </div>

          {/* Papers/books */}
          <div style={{
            position:"absolute", bottom:6, right:isMaster?14:8,
            width:16, height:9,
            background:"#1a2238", border:`1px solid ${sc}22`,
            borderRadius:1,
          }}>
            {[2,4,6].map(y=>(
              <div key={y} style={{position:"absolute",top:y,left:2,right:2,height:0.8,background:`${sc}33`}} />
            ))}
          </div>

          {isMaster && (
            <div style={{
              position:"absolute",bottom:6,left:86,
              width:28,height:22,
              background:"#0a1020",
              border:`1px solid ${sc}44`,
              borderRadius:2,
              overflow:"hidden",
            }}>
              <div style={{fontFamily:"monospace",fontSize:4,color:sc,padding:2,letterSpacing:0.5}}>MASTER</div>
              <div style={{margin:"0 2px",display:"flex",gap:1,height:10,alignItems:"flex-end"}}>
                {[60,80,45,70].map((v,i)=>(
                  <div key={i} style={{flex:1,height:`${v}%`,background:sc,opacity:0.7}} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desk front panel */}
        <div style={{
          width:"100%", height:22,
          background:`linear-gradient(to bottom,#1a2030,#141828)`,
          border:`2px solid ${sc}33`,
          borderTop:"none",
          borderRadius:"0 0 3px 3px",
          position:"relative",
        }}>
          {/* Port dots */}
          <div style={{position:"absolute",bottom:5,left:6,display:"flex",gap:3}}>
            {[sc,"#818cf8","#fbbf24"].map((c,i)=>(
              <div key={i} style={{width:5,height:5,borderRadius:"50%",background:c,opacity:0.8,boxShadow:`0 0 5px ${c}`}} />
            ))}
          </div>
          {/* Power light */}
          <div style={{position:"absolute",bottom:6,right:8,width:5,height:5,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 6px #10b981"}} />
        </div>
      </div>
    </div>
  );
}

// ─── Wall Monitor (large back-wall screens) ───────────────────────────────────
function WallMonitor({
  title, bars, blink, fxRows, type
}: {
  title: string; bars: number[]; blink: boolean;
  fxRows?: Record<string,FXRow>; type:"map"|"fx"|"chart";
}) {
  return (
    <div style={{
      flex:1, height:148,
      background:"#05091a",
      border:"2px solid rgba(34,211,238,0.6)",
      borderTop:"4px solid #22d3ee",
      borderRadius:"0 0 4px 4px",
      position:"relative",
      boxShadow:"0 0 40px rgba(34,211,238,0.2), inset 0 0 20px rgba(34,211,238,0.03)",
      overflow:"hidden",
    }}>
      {/* Scanlines */}
      <div style={{
        position:"absolute",inset:0,zIndex:5,pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.18) 3px,rgba(0,0,0,0.18) 4px)",
      }} />

      {/* Monitor frame shadow top */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:6,background:"linear-gradient(to bottom,rgba(34,211,238,0.15),transparent)",zIndex:4}} />

      {/* HEADER */}
      <div style={{
        padding:"5px 10px 3px",
        borderBottom:"1px solid rgba(34,211,238,0.2)",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        background:"rgba(0,10,28,0.6)",
      }}>
        <span style={{fontFamily:"monospace",fontSize:7,color:"#22d3ee",letterSpacing:2,fontWeight:"bold",textShadow:"0 0 10px #22d3ee"}}>
          ◆ {title}
        </span>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:blink?"#10b981":"#03080e",boxShadow:blink?"0 0 6px #10b981":"none"}} />
          <span style={{fontFamily:"monospace",fontSize:6,color:"rgba(34,211,238,0.4)"}}>LIVE</span>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{padding:"6px 8px",height:"calc(100% - 28px)",overflow:"hidden"}}>
        {type === "map" && (
          <div style={{position:"relative",width:"100%",height:"100%"}}>
            {/* Grid map */}
            <div style={{
              position:"absolute",inset:0,
              backgroundImage:"linear-gradient(to right,rgba(34,211,238,0.12) 1px,transparent 1px),linear-gradient(to bottom,rgba(34,211,238,0.12) 1px,transparent 1px)",
              backgroundSize:"18px 18px",
            }} />
            {/* Map blobs / regions */}
            {[
              {x:"15%",y:"20%",w:"28%",h:"40%",c:"rgba(34,211,238,0.18)"},
              {x:"50%",y:"15%",w:"22%",h:"50%",c:"rgba(16,185,129,0.14)"},
              {x:"75%",y:"30%",w:"18%",h:"35%",c:"rgba(99,102,241,0.14)"},
            ].map((r,i)=>(
              <div key={i} style={{position:"absolute",left:r.x,top:r.y,width:r.w,height:r.h,background:r.c,borderRadius:3}} />
            ))}
            {/* Ping dots */}
            {[{x:"22%",y:"38%",c:"#10b981"},{x:"60%",y:"35%",c:"#22d3ee"},{x:"82%",y:"46%",c:"#f59e0b"}].map((d,i)=>(
              <div key={i} style={{position:"absolute",left:d.x,top:d.y,width:7,height:7,borderRadius:"50%",background:d.c,boxShadow:`0 0 10px ${d.c}`,transform:"translate(-50%,-50%)"}} />
            ))}
            <div style={{position:"absolute",bottom:2,left:4,fontFamily:"monospace",fontSize:6,color:"rgba(34,211,238,0.5)"}}>MARKET MAP • GLOBAL</div>
          </div>
        )}

        {type === "fx" && fxRows && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 8px"}}>
              {(["XAUUSD","EURUSD","GBPUSD","BTCUSD","USDJPY","XAGUSD"] as const).map(sym=>{
                const r = fxRows[sym];
                const col = r?.up ? "#34d399" : "#f87171";
                return (
                  <div key={sym} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:"monospace",fontSize:7,color:"rgba(34,211,238,0.5)",letterSpacing:0.5}}>{sym}</span>
                    <span style={{fontFamily:"monospace",fontSize:7,color:r?.live?col:"rgba(100,130,160,0.4)",fontWeight:"bold",textShadow:r?.live?`0 0 6px ${col}`:"none"}}>
                      {r?.price ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {type === "chart" && (
          <div style={{height:"100%",display:"flex",flexDirection:"column",gap:4}}>
            <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:3}}>
              {(["TRND","PA","NEWS","MSTR","RISK","CNTR","EXEC"] as const).map((lbl,i)=>{
                const COLS=["#34d399","#fbbf24","#60a5fa","#22d3ee","#34d399","#fb923c","#22d3ee"];
                return (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                    <span style={{fontFamily:"monospace",fontSize:5,color:COLS[i],textShadow:`0 0 4px ${COLS[i]}`}}>{Math.round(bars[i]||50)}%</span>
                    <div style={{width:"100%",height:56,background:"#020810",borderRadius:1,display:"flex",alignItems:"flex-end",overflow:"hidden",border:`1px solid ${COLS[i]}22`}}>
                      <div style={{width:"100%",height:`${bars[i]||50}%`,background:COLS[i],opacity:0.85,borderRadius:"1px 1px 0 0",transition:"height 1s ease",boxShadow:`0 0 8px ${COLS[i]}`}} />
                    </div>
                    <span style={{fontFamily:"monospace",fontSize:4.5,color:COLS[i]}}>{lbl}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Corner brackets */}
      {(["tl","tr","bl","br"] as const).map(c=>(
        <div key={c} style={{
          position:"absolute",
          top: c.startsWith("t") ? 4 : undefined,
          bottom: c.startsWith("b") ? 4 : undefined,
          left: c.endsWith("l") ? 4 : undefined,
          right: c.endsWith("r") ? 4 : undefined,
          width:10, height:10,
          borderTop: c.startsWith("t") ? "2px solid #22d3ee" : undefined,
          borderBottom: c.startsWith("b") ? "2px solid #22d3ee" : undefined,
          borderLeft: c.endsWith("l") ? "2px solid #22d3ee" : undefined,
          borderRight: c.endsWith("r") ? "2px solid #22d3ee" : undefined,
          zIndex:6,
        }} />
      ))}
    </div>
  );
}

// ─── Analog Clock ─────────────────────────────────────────────────────────────
function AnalogClock({ clock }: { clock: Date }) {
  const hh=clock.getHours(), mm=clock.getMinutes(), ss=clock.getSeconds();
  const hourDeg=(hh%12)*30+mm*0.5, minDeg=mm*6+ss*0.1, secDeg=ss*6;
  const hand=(deg:number,len:number,w:number,col:string)=>{
    const a=(deg-90)*Math.PI/180;
    return <line x1={36} y1={36} x2={36+Math.cos(a)*len} y2={36+Math.sin(a)*len} stroke={col} strokeWidth={w} strokeLinecap="round"/>;
  };
  return (
    <div style={{
      width:76,height:76,
      background:"#06101e",
      border:"2px solid rgba(34,211,238,0.5)",
      borderRadius:"50%",
      boxShadow:"0 0 20px rgba(34,211,238,0.2)",
      display:"flex",alignItems:"center",justifyContent:"center",
      flexShrink:0,
    }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="34" fill="#03080f" stroke="rgba(34,211,238,0.2)" strokeWidth="1"/>
        {Array.from({length:12},(_,i)=>{
          const a=(i*30-90)*Math.PI/180, maj=i%3===0;
          return <line key={i}
            x1={36+Math.cos(a)*(maj?22:26)} y1={36+Math.sin(a)*(maj?22:26)}
            x2={36+Math.cos(a)*32} y2={36+Math.sin(a)*32}
            stroke={maj?"#22d3ee":"rgba(34,211,238,0.3)"} strokeWidth={maj?2:1}/>;
        })}
        {hand(hourDeg,15,3,"#c8d8ec")}
        {hand(minDeg,22,2,"#e2e8f0")}
        {hand(secDeg,28,1,"#ef4444")}
        <circle cx="36" cy="36" r="3" fill="#ef4444"/>
        <circle cx="36" cy="36" r="1.5" fill="#fff"/>
      </svg>
    </div>
  );
}

// ─── NavBar ────────────────────────────────────────────────────────────────────
function NavBar({ running, onRun, fxPrices }: {
  running:boolean; onRun:()=>void; fxPrices: Record<string,FXRow>;
}) {
  const xau = fxPrices["XAUUSD"];
  const btc = fxPrices["BTCUSD"];
  const eur = fxPrices["EURUSD"];
  const jpy = fxPrices["USDJPY"];
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"8px 18px",
      background:"linear-gradient(to right,#020810,#030c18,#020810)",
      borderBottom:"1px solid rgba(34,211,238,0.25)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{display:"flex",gap:6}}>
          {(["#ef4444","#f59e0b","#10b981"] as const).map((c,i)=>(
            <div key={i} style={{width:11,height:11,borderRadius:"50%",background:c,opacity:0.9,boxShadow:`0 0 8px ${c}88`}} />
          ))}
        </div>
        <span style={{fontFamily:"monospace",fontSize:12,color:"#22d3ee",letterSpacing:5,fontWeight:"bold",textShadow:"0 0 20px rgba(34,211,238,0.8)"}}>
          TRADEX NEWSROOM
        </span>
        <span style={{fontFamily:"monospace",fontSize:8,color:"rgba(34,211,238,0.35)",letterSpacing:2}}>AI OPS CENTER</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{fontFamily:"monospace",fontSize:9,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{color:"rgba(34,211,238,0.5)"}}>XAU</span>
          <span style={{color:xau?.up?"#34d399":"#f87171",fontWeight:"bold",textShadow:xau?.live?(xau?.up?"0 0 8px #34d399":"0 0 8px #f87171"):"none"}}>{xau?.price ?? "—"}</span>
          <span style={{color:"rgba(34,211,238,0.2)"}}>·</span>
          <span style={{color:"rgba(34,211,238,0.5)"}}>BTC</span>
          <span style={{color:btc?.up?"#34d399":"#f87171",fontWeight:"bold",textShadow:btc?.live?(btc?.up?"0 0 8px #34d399":"0 0 8px #f87171"):"none"}}>{btc?.price ?? "—"}</span>
          <span style={{color:"rgba(34,211,238,0.2)"}}>·</span>
          <span style={{color:"rgba(34,211,238,0.5)"}}>EUR</span>
          <span style={{color:eur?.up?"#34d399":"#f87171",fontWeight:"bold"}}>{eur?.price ?? "—"}</span>
          <span style={{color:"rgba(34,211,238,0.2)"}}>·</span>
          <span style={{color:"rgba(34,211,238,0.5)"}}>JPY</span>
          <span style={{color:jpy?.up?"#34d399":"#f87171",fontWeight:"bold"}}>{jpy?.price ?? "—"}</span>
        </div>
        <button onClick={onRun} style={{display:"flex",alignItems:"center",gap:7,
          padding:"5px 16px",borderRadius:4,cursor:"pointer",
          background:running?"#041c10":"#020a1a",
          border:`1px solid ${running?"#10b981":"rgba(34,211,238,0.5)"}`,
          fontFamily:"monospace",fontSize:9,fontWeight:"bold",letterSpacing:1.5,
          color:running?"#10b981":"#22d3ee",
          boxShadow:running?"0 0 16px rgba(16,185,129,0.4)":"0 0 12px rgba(34,211,238,0.2)"}}>
          <span style={{width:7,height:7,borderRadius:"50%",display:"inline-block",
            background:running?"#10b981":"#22d3ee",
            boxShadow:running?"0 0 8px #10b981":"0 0 6px #22d3ee"}} />
          {running?"RUNNING…":"RUN PIPELINE"}
        </button>
      </div>
    </div>
  );
}

// ─── Room Scene ────────────────────────────────────────────────────────────────
function RoomScene({
  blink, clock, bars, fxPrices
}: {
  blink:boolean; clock:Date; bars:number[]; fxPrices:Record<string,FXRow>;
}) {
  return (
    <div style={{
      position:"relative", width:"100%", height:420,
      background:"#0d1220",
      overflow:"hidden",
      fontFamily:"monospace",
    }}>
      {/* CRT scanlines overlay */}
      <div style={{
        position:"absolute",inset:0,zIndex:50,pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)",
      }} />

      {/* Vignette */}
      <div style={{
        position:"absolute",inset:0,zIndex:49,pointerEvents:"none",
        background:"radial-gradient(ellipse 95% 90% at 50% 50%,transparent 55%,rgba(2,6,14,0.75) 100%)",
      }} />

      {/* ── CEILING ─────────────────────────────────────────────────── */}
      <div style={{
        position:"absolute",top:0,left:0,right:0,height:18,
        background:"linear-gradient(to bottom,#141a28,#0f1420)",
        borderBottom:"2px solid rgba(34,211,238,0.12)",
      }}>
        {/* Ceiling fluorescent lights */}
        {[120,300,520,720,920].map(x=>(
          <div key={x} style={{
            position:"absolute",top:0,left:x,width:100,height:14,
            background:"#08111e",
            border:"1px solid rgba(160,210,255,0.3)",
            borderRadius:"0 0 4px 4px",
          }}>
            <div style={{
              margin:"2px 4px",height:8,
              background:`rgba(160,210,255,${blink&&x===300?0.85:0.6})`,
              borderRadius:2,
              boxShadow:`0 0 14px rgba(160,210,255,0.6), 0 8px 24px rgba(160,210,255,0.18)`,
            }} />
          </div>
        ))}
      </div>

      {/* ── BACK WALL ───────────────────────────────────────────────── */}
      <div style={{
        position:"absolute",top:18,left:0,right:0,height:200,
        background:"linear-gradient(to bottom,#111828,#0d1420)",
        borderBottom:"3px solid rgba(34,211,238,0.15)",
      }}>
        {/* Wall panel lines */}
        {[60,120,160].map(y=>(
          <div key={y} style={{position:"absolute",left:0,right:0,top:y,height:1,background:"rgba(34,211,238,0.06)"}} />
        ))}

        {/* Top wall trim */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"rgba(34,211,238,0.2)"}} />

        {/* Wall content: monitors + branding */}
        <div style={{position:"absolute",top:10,left:16,right:16,bottom:14,display:"flex",gap:10,alignItems:"stretch"}}>

          {/* LEFT MONITOR — Market Map */}
          <WallMonitor title="MARKET INTELLIGENCE" bars={bars} blink={blink} type="map" />

          {/* CENTER MONITOR — TRADEX branding + agent chart */}
          <div style={{
            flex:1.4, height:148,
            background:"#03070e",
            border:"2px solid rgba(34,211,238,0.7)",
            borderTop:"4px solid #22d3ee",
            borderRadius:"0 0 4px 4px",
            position:"relative",
            boxShadow:"0 0 60px rgba(34,211,238,0.25), inset 0 0 30px rgba(34,211,238,0.04)",
            overflow:"hidden",
          }}>
            <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.18) 3px,rgba(0,0,0,0.18) 4px)",pointerEvents:"none",zIndex:2}} />
            <div style={{padding:"8px 16px 4px",display:"flex",flexDirection:"column",height:"100%",gap:4,position:"relative",zIndex:1}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:"bold",color:"#22d3ee",letterSpacing:10,textShadow:"0 0 30px #22d3ee, 0 0 60px rgba(34,211,238,0.4)"}}>
                  ◈ TRADEX
                </div>
                <div style={{fontSize:7,color:"rgba(34,211,238,0.4)",letterSpacing:3,marginTop:1}}>
                  MULTI-AGENT INTELLIGENCE PLATFORM
                </div>
              </div>
              <div style={{height:1,background:"rgba(34,211,238,0.18)"}} />
              <WallMonitor title="AGENT CONSENSUS" bars={bars} blink={blink} type="chart" />
            </div>
          </div>

          {/* RIGHT MONITOR — FX Rates */}
          <WallMonitor title="FX LIVE RATES" bars={bars} blink={blink} fxRows={fxPrices} type="fx" />

          {/* Clock + side panel */}
          <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0,justifyContent:"flex-start",paddingTop:4}}>
            <AnalogClock clock={clock} />
            {/* Side status panel */}
            <div style={{
              width:76,
              background:"#040810",
              border:"1px solid rgba(34,211,238,0.35)",
              borderRadius:3,
              padding:"5px 6px",
              flex:1,
            }}>
              <div style={{fontSize:6,color:"rgba(34,211,238,0.5)",letterSpacing:1,marginBottom:4}}>SYS.STATUS</div>
              {[
                {lbl:"AGENTS",val:"7/7",c:"#10b981"},
                {lbl:"FEEDS",val:"LIVE",c:"#10b981"},
                {lbl:"LATENCY",val:"12ms",c:"#22d3ee"},
                {lbl:"RISK",val:"LOW",c:"#34d399"},
              ].map(r=>(
                <div key={r.lbl} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:6,color:"rgba(34,211,238,0.4)"}}>{r.lbl}</span>
                  <span style={{fontSize:6,color:r.c,fontWeight:"bold",textShadow:`0 0 6px ${r.c}`}}>{r.val}</span>
                </div>
              ))}
              <div style={{height:1,background:"rgba(34,211,238,0.12)",margin:"4px 0"}} />
              {/* Mini bar */}
              <div style={{display:"flex",gap:1,height:14,alignItems:"flex-end"}}>
                {[50,70,45,80,60,55].map((v,i)=>(
                  <div key={i} style={{flex:1,height:`${v}%`,background:"#22d3ee",opacity:0.6,boxShadow:"0 0 3px #22d3ee"}} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BACK WALL / FLOOR SEAM ──────────────────────────────────── */}
      <div style={{
        position:"absolute",top:218,left:0,right:0,height:4,
        background:"linear-gradient(to right,rgba(34,211,238,0.3),rgba(99,102,241,0.2),rgba(34,211,238,0.3))",
        boxShadow:"0 0 12px rgba(34,211,238,0.15)",
      }} />

      {/* ── FLOOR ───────────────────────────────────────────────────── */}
      <div style={{
        position:"absolute",top:222,left:0,right:0,bottom:0,
        background:"linear-gradient(to bottom,#0e1624,#0a1018)",
        backgroundImage:"linear-gradient(to right,rgba(34,211,238,0.07) 1px,transparent 1px),linear-gradient(to bottom,rgba(34,211,238,0.07) 1px,transparent 1px)",
        backgroundSize:"44px 28px",
      }} />

      {/* ── BACK ROW DESKS (against wall) ───────────────────────────── */}
      <div style={{
        position:"absolute",top:194,left:0,right:0,
        display:"flex",justifyContent:"center",gap:12,
        paddingLeft:24,paddingRight:24,
        alignItems:"flex-end",
        zIndex:10,
      }}>
        {AGENTS.slice(0, 4).map(agent=>(
          <Desk2D key={agent.id} agent={agent} blink={blink} bars={bars} />
        ))}
      </div>

      {/* ── FRONT ROW DESKS ─────────────────────────────────────────── */}
      <div style={{
        position:"absolute",top:300,left:0,right:0,
        display:"flex",justifyContent:"center",gap:14,
        paddingLeft:60,paddingRight:60,
        alignItems:"flex-end",
        zIndex:20,
      }}>
        {AGENTS.slice(4).map(agent=>(
          <Desk2D key={agent.id} agent={agent} blink={blink} bars={bars} />
        ))}

        {/* Decorative corner plant */}
        <div style={{position:"absolute",right:8,bottom:0,width:28,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
          <div style={{width:16,height:28,position:"relative"}}>
            {[[-4,20,10,"#10b981"],[4,12,9,"#059669"],[0,4,12,"#34d399"],[-6,8,8,"#10b981"],[5,6,10,"#065f46"]].map(([lx,ly,w,c],i)=>(
              <div key={i} style={{position:"absolute",left:`calc(50% + ${lx}px)`,top:ly,width:w,height:14,background:c as string,borderRadius:"50% 50% 20% 20%",transform:"translateX(-50%)",opacity:0.9}} />
            ))}
          </div>
          <div style={{width:18,height:12,background:"#1a2030",border:"2px solid rgba(34,211,238,0.3)",borderRadius:"2px 2px 4px 4px"}} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);
  const blink  = useBlink(700);
  const clock  = useClock();
  const bars   = useAnimatedBars(8, 20, 92, 1050);
  const fxPrices = useLivePrices(_props?.data);
  const handleRun = useCallback(()=>{setRunning(true);setTimeout(()=>setRunning(false),4200);},[]);

  return (
    <div style={{
      position:"relative",
      background:"#020810",
      border:"1px solid rgba(34,211,238,0.2)",
      borderRadius:12,
      overflow:"hidden",
      userSelect:"none",
    }}>
      <NavBar running={running} onRun={handleRun} fxPrices={fxPrices} />
      <RoomScene blink={blink} clock={clock} bars={bars} fxPrices={fxPrices} />

      {/* Footer status bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"7px 18px",
        background:"linear-gradient(to right,#020810,#030c18,#020810)",
        borderTop:"1px solid rgba(34,211,238,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          {AGENTS.map(a=>{
            const sc=STATE_COLOR[a.state];
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",
                  background:blink?sc:"#061018",
                  boxShadow:blink?`0 0 8px ${sc}`:"none",
                  transition:"all 0.3s"}} />
                <span style={{fontFamily:"monospace",fontSize:8,color:sc,letterSpacing:1,textShadow:`0 0 8px ${sc}88`}}>
                  {a.label}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:"monospace",fontSize:8,color:"#34d399",letterSpacing:1,textShadow:"0 0 8px #34d399"}}>● LIVE</span>
          <span style={{fontFamily:"monospace",fontSize:8,color:"rgba(34,211,238,0.3)"}}>
            {clock.toLocaleTimeString("en-US",{hour12:false})}
          </span>
        </div>
      </div>
    </div>
  );
}
