"use client";

/**
 * TradexNewsroom — CSS 3D Isometric Command Center
 * Enclosed room: left wall + back wall meet at corner, floor fills viewport.
 * Dense 2-row desk layout, chunky desks with leg recess, neon glow shadows.
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
  const [b, setB] = useState<number[]>(() => Array.from({ length: n }, () => lo + Math.random() * (hi - lo)));
  useEffect(() => {
    const t = setInterval(() => setB(p => p.map(v => Math.max(lo, Math.min(hi, v + (Math.random() - 0.48) * 18)))), ms);
    return () => clearInterval(t);
  }, [n, lo, hi, ms]);
  return b;
}
function useTick(fps = 25) {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN(v => v + 1), 1000 / fps); return () => clearInterval(t); }, [fps]);
  return n;
}

// Live FX + crypto prices from free public APIs, merged with agent snapshot data
type FXRow = { price: string; pct: string; up: boolean; live: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useLivePrices(agentData: any) {
  const [rows, setRows] = useState<Record<string, FXRow>>({
    XAUUSD:{price:"—",pct:"—",up:true,live:false},
    EURUSD:{price:"—",pct:"—",up:true,live:false},
    GBPUSD:{price:"—",pct:"—",up:true,live:false},
    BTCUSD:{price:"—",pct:"—",up:true,live:false},
    USDJPY:{price:"—",pct:"—",up:false,live:false},
    XAGUSD:{price:"—",pct:"—",up:true,live:false},
    NZDUSD:{price:"—",pct:"—",up:true,live:false},
  });

  useEffect(() => {
    async function load() {
      try {
        // Forex: open.er-api.com (free, no key, CORS-ok)
        const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
        if (fxRes.ok) {
          const { rates } = await fxRes.json() as { rates: Record<string,number> };
          setRows(p => ({
            ...p,
            EURUSD:{price:(1/rates.EUR).toFixed(4),pct:"—",up:true,live:true},
            GBPUSD:{price:(1/rates.GBP).toFixed(4),pct:"—",up:true,live:true},
            USDJPY:{price:rates.JPY.toFixed(2),     pct:"—",up:false,live:true},
            NZDUSD:{price:(1/rates.NZD).toFixed(4), pct:"—",up:true,live:true},
            XAGUSD:{price:(1/rates.XAG).toFixed(2), pct:"—",up:true,live:true},
            XAUUSD:{price:(1/rates.XAU).toFixed(2), pct:"—",up:true,live:true},
          }));
        }
      } catch { /* silent */ }
      try {
        // BTC: Binance free ticker
        const btcRes = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT");
        if (btcRes.ok) {
          const btc = await btcRes.json() as { lastPrice:string; priceChangePercent:string };
          const price = parseFloat(btc.lastPrice);
          const pct   = parseFloat(btc.priceChangePercent);
          setRows(p => ({
            ...p,
            BTCUSD:{
              price: price.toLocaleString("en-US",{maximumFractionDigits:0}),
              pct:   `${pct>=0?"+":""}${pct.toFixed(2)}%`,
              up:    pct>=0, live:true,
            },
          }));
        }
      } catch { /* silent */ }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // Override with the real snapshot price from the currently-running agent analysis
  const merged = { ...rows };
  if (agentData?.snapshot) {
    const sym: string  = agentData.snapshot.symbol;
    const cur: number  = agentData.snapshot.price.current;
    const pct: number  = agentData.snapshot.price.changePercent;
    const isJpy        = sym === "USDJPY";
    const isBtc        = sym === "BTCUSD";
    merged[sym] = {
      price: isBtc
        ? cur.toLocaleString("en-US",{maximumFractionDigits:0})
        : isJpy
        ? cur.toFixed(2)
        : cur.toFixed(4),
      pct:  `${pct>=0?"+":""}${pct.toFixed(2)}%`,
      up:   pct>=0,
      live: true,
    };
  }
  return merged;
}

// ─── Types ───────────────────────────────────────────────────────────────────
type AgentState = "bullish"|"bearish"|"alert"|"valid"|"blocked"|"armed"|"no-trade"|"idle";
interface AgentDef { id:string; label:string; role:string; state:AgentState; hair:string; skin:string; suit:string; accent:string; isMaster?:boolean; }
interface StationDef { agentId:string; x:number; y:number; platformH?:number; }

const SC: Record<AgentState,{glow:string;screen:string}> = {
  bullish:    {glow:"#10b981",screen:"#021a0e"},
  bearish:    {glow:"#ef4444",screen:"#2a0808"},
  alert:      {glow:"#f59e0b",screen:"#261202"},
  valid:      {glow:"#10b981",screen:"#021a0e"},
  blocked:    {glow:"#ef4444",screen:"#2a0808"},
  armed:      {glow:"#22d3ee",screen:"#021420"},
  "no-trade": {glow:"#22d3ee",screen:"#021420"},
  idle:       {glow:"#6366f1",screen:"#0a0c1e"},
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

// Dense 2-row layout in 1100×800 floor space
// Back row near Y=50 (wall), front row near Y=260 — tight gap
const STATIONS: StationDef[] = [
  {agentId:"smc",        x:90,  y:55},
  {agentId:"master",     x:420, y:30,  platformH:24}, // center, elevated
  {agentId:"risk",       x:750, y:55},
  // front row — 4 desks
  {agentId:"trend",      x:10,  y:270},
  {agentId:"news",       x:240, y:270},
  {agentId:"execution",  x:540, y:270},
  {agentId:"contrarian", x:820, y:270},
];

const CABLE_COL: Record<string,string> = {trend:"#f59e0b",smc:"#7c3aed",risk:"#10b981",contrarian:"#f97316",news:"#3b82f6",execution:"#22d3ee"};
const p3d: React.CSSProperties = {transformStyle:"preserve-3d"};
const px = (n: number) => `${n}px`;

// ─── Floor ────────────────────────────────────────────────────────────────────
function IsoFloor() {
  return (
    <div style={{
      position:"absolute", left:0, top:0, width:1100, height:800,
      background:"#010508",
      backgroundImage:`linear-gradient(to right,#0c1e3870 1px,transparent 1px),linear-gradient(to bottom,#0c1e3870 1px,transparent 1px)`,
      backgroundSize:"55px 55px",
      transform:"translateZ(0px)",
    }}>
      {/* Central floor glow under master desk */}
      <div style={{position:"absolute",left:"32%",top:"5%",width:"36%",height:"45%",
        background:"radial-gradient(ellipse,rgba(34,211,238,0.055) 0%,transparent 70%)",pointerEvents:"none"}} />
      {/* Floor base glow lines */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:80,
        background:"linear-gradient(to top,rgba(34,211,238,0.03),transparent)",pointerEvents:"none"}} />
    </div>
  );
}

// ─── Left Wall (stands up at X=0) ─────────────────────────────────────────────
function LeftWall({ blink }: { blink:boolean }) {
  return (
    <div style={{
      position:"absolute", left:0, top:0,
      width:420, height:800,        // width=wallH, height=roomDepth
      background:"#030912",
      borderRight:"2px solid #0a1e38",
      transformOrigin:"left",
      transform:"rotateY(90deg)",
      overflow:"hidden",
    }}>
      {/* Panel lines (horizontal) */}
      {[100,200,300,380].map(y=>(
        <div key={y} style={{position:"absolute",left:0,right:0,top:y,height:1,background:"#06111e"}} />
      ))}
      {/* Vertical panel dividers */}
      {[160,320,480,640].map(x=>(
        <div key={x} style={{position:"absolute",top:0,bottom:0,left:x,width:1,background:"#06111e"}} />
      ))}
      {/* Small side monitor cluster at Y≈200 (mid-depth) */}
      {[1,2].map(i=>(
        <div key={i} style={{position:"absolute",left:60+i*140,top:80,width:100,height:70,
          background:"#020810",border:"1px solid #0d2040",borderRadius:2,
          boxShadow:"0 0 10px rgba(34,211,238,0.07)"}}>
          <div style={{margin:3,height:50,background:"#021420",borderRadius:1,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:4,left:0,right:0,textAlign:"center",
              fontFamily:"monospace",fontSize:5,color:"#22d3ee",letterSpacing:1}}>
              {i===1?"SYS.MON":"NET.FLOW"}
            </div>
            {/* Mini bars */}
            <div style={{position:"absolute",bottom:3,left:4,right:4,height:20,display:"flex",alignItems:"flex-end",gap:2}}>
              {[45,72,55,83,61,70].map((v,j)=>(
                <div key={j} style={{flex:1,height:`${v}%`,background:"#22d3ee",opacity:0.6,borderRadius:"1px 1px 0 0"}} />
              ))}
            </div>
          </div>
          {/* LED */}
          <div style={{position:"absolute",bottom:3,right:5,width:4,height:4,borderRadius:"50%",
            background:blink?"#10b981":"#06101a",
            boxShadow:blink?"0 0 4px #10b981":"none"}} />
        </div>
      ))}
      {/* Wall cable conduit strip */}
      <div style={{position:"absolute",top:160,left:0,right:0,height:8,background:"#07111e",
        borderTop:"1px solid #0d2040",borderBottom:"1px solid #0d2040"}} />
      {/* Small LED indicators strip */}
      <div style={{position:"absolute",top:164,left:20,display:"flex",gap:12}}>
        {Array.from({length:28},(_,i)=>(
          <div key={i} style={{width:4,height:4,borderRadius:"50%",
            background:(blink&&i%3===0)?"#10b981":((!blink)&&i%4===0)?"#3b82f6":"#06101a",
            opacity:0.8}} />
        ))}
      </div>
    </div>
  );
}

// ─── Back Wall ─────────────────────────────────────────────────────────────────
function BackWall({ bars, clock, blink, fxPrices }: {
  bars:number[]; clock:Date; blink:boolean;
  fxPrices: Record<string,FXRow>;
}) {
  const hh=clock.getHours(), mm=clock.getMinutes(), ss=clock.getSeconds();
  const hourDeg=(hh%12)*30+mm*0.5, minDeg=mm*6+ss*0.1, secDeg=ss*6;
  const hand=(deg:number,len:number,w:number,col:string)=>{
    const a=(deg-90)*Math.PI/180;
    return <line x1={50} y1={50} x2={50+Math.cos(a)*len} y2={50+Math.sin(a)*len} stroke={col} strokeWidth={w} strokeLinecap="round"/>;
  };
  const FX_SYMBOLS = ["XAUUSD","EURUSD","GBPUSD","BTCUSD","USDJPY","XAGUSD","NZDUSD"] as const;

  return (
    <div style={{
      position:"absolute", left:0, top:0, width:1100, height:440,
      background:"#030912",
      transformOrigin:"top center",
      transform:"rotateX(-90deg)",
      overflow:"hidden",
    }}>
      {/* Wall base gradient — makes it look attached to floor */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:60,
        background:"linear-gradient(to top,#060e1c,transparent)",pointerEvents:"none"}} />

      {/* Horizontal panel lines across wall */}
      {[80,160,240,320,400].map(y=>(
        <div key={y} style={{position:"absolute",left:0,right:0,top:y,height:1,background:"#06111e"}} />
      ))}

      {/* CEILING LIGHT BARS — attached to top of wall */}
      {[80,230,400,560,730,900,1040].map(cx=>(
        <div key={cx} style={{position:"absolute",top:0,left:cx-38,width:76,height:16,
          background:"#04091a",border:"1px solid #0a1e34",
          borderRadius:"0 0 4px 4px",
          boxShadow:"0 8px 40px rgba(125,211,252,0.14)"}}>
          <div style={{margin:"3px 5px",height:8,
            background:"rgba(125,211,252,0.22)",borderRadius:2}} />
        </div>
      ))}

      {/* LEFT SERVER RACK CLUSTER — attached/built into wall */}
      <div style={{position:"absolute",left:0,top:16,width:90,bottom:0,
        background:"#020810",borderRight:"2px solid #0a1e34"}}>
        <div style={{padding:"4px 2px",display:"flex",flexDirection:"column",gap:1}}>
          {Array.from({length:24},(_,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",height:14,
              background:"#030c18",border:"1px solid #071424",borderRadius:1,margin:"0 2px"}}>
              <div style={{flex:1,height:2,margin:"0 4px",background:"#071424",borderRadius:1}} />
              <div style={{width:5,height:5,borderRadius:"50%",marginRight:3,
                background:(blink&&j%2===0)?(j%3===0?"#10b981":j%3===1?"#3b82f6":"#f59e0b"):"#060e1a",
                boxShadow:(blink&&j%2===0)?`0 0 5px currentColor`:"none"}} />
              <div style={{width:5,height:5,borderRadius:"50%",marginRight:4,
                background:(!blink&&j%3===0)?"#22d3ee":"#060e1a",
                boxShadow:(!blink&&j%3===0)?"0 0 5px #22d3ee":"none"}} />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SERVER RACK CLUSTER */}
      <div style={{position:"absolute",right:0,top:16,width:90,bottom:0,
        background:"#020810",borderLeft:"2px solid #0a1e34"}}>
        <div style={{padding:"4px 2px",display:"flex",flexDirection:"column",gap:1}}>
          {Array.from({length:24},(_,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",height:14,
              background:"#030c18",border:"1px solid #071424",borderRadius:1,margin:"0 2px"}}>
              <div style={{flex:1,height:2,margin:"0 4px",background:"#071424",borderRadius:1}} />
              <div style={{width:5,height:5,borderRadius:"50%",marginRight:3,
                background:(!blink&&j%2===0)?(j%4===0?"#f97316":j%4===1?"#10b981":"#3b82f6"):"#060e1a",
                boxShadow:(!blink&&j%2===0)?`0 0 5px currentColor`:"none"}} />
              <div style={{width:5,height:5,borderRadius:"50%",marginRight:4,
                background:(blink&&j%3===1)?"#f59e0b":"#060e1a",
                boxShadow:(blink&&j%3===1)?"0 0 5px #f59e0b":"none"}} />
            </div>
          ))}
        </div>
      </div>

      {/* FX RATES monitor — built into left section of wall */}
      <div style={{position:"absolute",left:100,top:20,width:220,height:220,
        background:"#010810",border:"1px solid #0d2040",borderRadius:"0 0 4px 4px",
        borderTop:"3px solid #22d3ee",
        boxShadow:"0 0 24px rgba(34,211,238,0.1), inset 0 0 20px rgba(34,211,238,0.02)"}}>
        <div style={{padding:"8px 10px"}}>
          <div style={{fontFamily:"monospace",fontSize:8,color:"#22d3ee",
            letterSpacing:3,marginBottom:5,textAlign:"center",
            textShadow:"0 0 10px #22d3ee"}}>FX RATES</div>
          <div style={{height:1,background:"#0a1e34",marginBottom:5}} />
          {FX_SYMBOLS.map(sym=>{
            const r = fxPrices[sym];
            const col = r?.up ? "#10b981" : "#ef4444";
            return (
              <div key={sym} style={{display:"flex",justifyContent:"space-between",
                fontFamily:"monospace",fontSize:7.5,marginBottom:5,alignItems:"center"}}>
                <span style={{color:"#2a4060",letterSpacing:0.5}}>{sym}</span>
                <span style={{color: r?.live ? "#7a9ab8" : "#334155"}}>{r?.price ?? "—"}</span>
                <span style={{color: r?.live ? col : "#334155",fontWeight:"bold"}}>{r?.pct ?? "—"}</span>
              </div>
            );
          })}
        </div>
        {/* Scanlines */}
        <div style={{position:"absolute",inset:0,borderRadius:"0 0 4px 4px",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.18) 2px,rgba(0,0,0,0.18) 4px)",
          pointerEvents:"none"}} />
      </div>

      {/* MAIN TRADEX DISPLAY — center, large, attached */}
      <div style={{position:"absolute",left:338,top:14,width:510,height:260,
        background:"#010608",
        border:"2px solid #1a3870",
        borderTop:"4px solid #22d3ee",
        borderRadius:"0 0 4px 4px",
        boxShadow:"0 0 60px rgba(34,211,238,0.15), inset 0 0 40px rgba(34,211,238,0.03)"}}>
        {/* Corner brackets */}
        {(["top-left","top-right","bottom-left","bottom-right"] as const).map((pos,i)=>(
          <div key={i} style={{
            position:"absolute",
            top:pos.startsWith("top")?2:undefined,
            bottom:pos.startsWith("bottom")?2:undefined,
            left:pos.endsWith("left")?2:undefined,
            right:pos.endsWith("right")?2:undefined,
            width:16,height:16,
            borderTop:pos.startsWith("top")?"2px solid #22d3ee":undefined,
            borderBottom:pos.startsWith("bottom")?"2px solid #22d3ee":undefined,
            borderLeft:pos.endsWith("left")?"2px solid #22d3ee":undefined,
            borderRight:pos.endsWith("right")?"2px solid #22d3ee":undefined,
          }} />
        ))}
        <div style={{padding:"16px 22px 10px",height:"100%",display:"flex",flexDirection:"column",gap:6}}>
          {/* Title */}
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"monospace",fontSize:22,fontWeight:"bold",color:"#22d3ee",
              letterSpacing:8,textShadow:"0 0 25px #22d3ee, 0 0 60px rgba(34,211,238,0.35)"}}>
              TRADEX
            </div>
            <div style={{fontFamily:"monospace",fontSize:7,color:"#1e4080",letterSpacing:2.5,marginTop:2}}>
              MULTI-AGENT INTELLIGENCE PLATFORM
            </div>
          </div>
          <div style={{height:1,background:"#0d2040"}} />
          {/* Bar chart */}
          <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:5,padding:"0 2px"}}>
            {(["TRND","PA","NEWS","MSTR","RISK","CNTR","EXEC"] as const).map((lbl,i)=>{
              const COLS=["#10b981","#f59e0b","#3b82f6","#22d3ee","#10b981","#f97316","#22d3ee"];
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <div style={{fontFamily:"monospace",fontSize:4.5,color:COLS[i]}}>{Math.round(bars[i])}%</div>
                  <div style={{width:"100%",height:66,background:"#030a14",borderRadius:1,
                    display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
                    <div style={{width:"100%",height:`${bars[i]}%`,background:COLS[i],opacity:0.78,
                      borderRadius:"1px 1px 0 0",transition:"height 1s ease",
                      boxShadow:`0 0 8px ${COLS[i]}77`}} />
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:4.5,color:COLS[i]}}>{lbl}</div>
                </div>
              );
            })}
          </div>
          {/* Status */}
          <div style={{display:"flex",justifyContent:"space-between",
            fontFamily:"monospace",fontSize:6.5,borderTop:"1px solid #0a1e34",paddingTop:4}}>
            <span style={{color:"#10b981",textShadow:"0 0 6px #10b981"}}>● 7 AGENTS ACTIVE</span>
            <span style={{color:"#22d3ee"}}>REAL-TIME CONSENSUS</span>
            <span style={{color:"#1a3a70"}}>v2.4.1</span>
          </div>
        </div>
        {/* Scanlines */}
        <div style={{position:"absolute",inset:0,borderRadius:"0 0 4px 4px",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)",
          pointerEvents:"none"}} />
      </div>

      {/* ANALOG CLOCK — right section, wall-mounted */}
      <div style={{position:"absolute",right:100,top:20,width:120,height:120,
        background:"#010608",border:"2px solid #0d2040",borderTop:"3px solid #22d3ee",
        borderRadius:"0 0 60px 60px",
        boxShadow:"0 0 20px rgba(34,211,238,0.08)"}}>
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="#010508" stroke="#0d2040" strokeWidth="1.2"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#060e1c" strokeWidth="0.6"/>
          {Array.from({length:12},(_,i)=>{
            const a=(i*30-90)*Math.PI/180,maj=i%3===0;
            return <line key={i}
              x1={50+Math.cos(a)*(maj?32:36)} y1={50+Math.sin(a)*(maj?32:36)}
              x2={50+Math.cos(a)*43} y2={50+Math.sin(a)*43}
              stroke={maj?"#22d3ee":"#0d2040"} strokeWidth={maj?2:1}/>;
          })}
          {hand(hourDeg,22,3.5,"#c8d8ec")}
          {hand(minDeg,32,2.2,"#c8d8ec")}
          {hand(secDeg,38,1.1,"#ef4444")}
          <circle cx="50" cy="50" r="3.5" fill="#ef4444"/>
          <circle cx="50" cy="50" r="1.5" fill="#e2e8f0"/>
        </svg>
        <div style={{textAlign:"center",marginTop:-4,
          fontFamily:"monospace",fontSize:7,color:"#22d3ee",
          textShadow:"0 0 8px #22d3ee"}}>
          {`${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`}
        </div>
      </div>

      {/* Wall base trim — where wall meets floor (glowing seam) */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:4,
        background:"linear-gradient(to right,#22d3ee11,#22d3ee44,#22d3ee11)"}} />
    </div>
  );
}

// ─── Floor Cables ─────────────────────────────────────────────────────────────
function FloorCables({ tick }: { tick:number }) {
  const masterStn = STATIONS.find(s=>AGENTS[s.agentId]?.isMaster);
  if (!masterStn) return null;
  const mx = masterStn.x + 62, my = masterStn.y + 40;
  return (
    <svg style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",
      overflow:"visible",transform:"translateZ(1px)",...p3d}}>
      {STATIONS.filter(s=>!AGENTS[s.agentId]?.isMaster).map(stn=>{
        const col=CABLE_COL[stn.agentId]??"#64748b";
        const ax=stn.x+62, ay=stn.y+40;
        const midY=(ay+my)/2+16;
        const d=`M${ax},${ay} L${ax},${midY} L${mx},${midY} L${mx},${my}`;
        const off=(tick*1.8)%16;
        return (
          <g key={stn.agentId}>
            <path d={d} fill="none" stroke={col} strokeWidth={6} opacity={0.07}/>
            <path d={d} fill="none" stroke={col} strokeWidth={2.2}
              strokeDasharray="8 5" strokeDashoffset={-off}
              style={{filter:`drop-shadow(0 0 4px ${col})`}}/>
            <path d={d} fill="none" stroke={col} strokeWidth={0.6} opacity={0.5}/>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Chunky Desk Cube ─────────────────────────────────────────────────────────
const DW=118, DD=78, DH=52; // Desk Width, Depth, Height — chunky!

function DeskCube({ left, top, platformH=0, glow }: { left:number; top:number; platformH?:number; glow:string; }) {
  const totalH = DH + platformH;
  return (
    <div style={{...p3d,position:"absolute",left:px(left),top:px(top),width:px(DW),height:px(DD)}}>
      {/* PLATFORM */}
      {platformH>0 && <>
        <div style={{position:"absolute",left:px(-14),top:px(-14),
          width:px(DW+28),height:px(DD+28),
          background:"#04091a",border:`1px solid ${glow}44`,
          transform:"translateZ(0px)"}} />
        <div style={{position:"absolute",bottom:0,left:px(-14),
          width:px(DW+28),height:px(platformH),
          background:"#030912",border:`1px solid ${glow}28`,
          transformOrigin:"bottom",transform:"rotateX(-90deg)"}} />
        <div style={{position:"absolute",top:0,left:px(DW+14),
          width:px(platformH),height:px(DD+28),
          background:"#020710",border:`1px solid ${glow}20`,
          transformOrigin:"left",transform:"rotateY(90deg)"}} />
      </>}

      {/* TOP FACE */}
      <div style={{position:"absolute",width:px(DW),height:px(DD),
        background:`linear-gradient(135deg,#0c1e38,#07111e)`,
        border:`1px solid ${glow}66`,
        boxShadow:`0 0 20px ${glow}33, inset 0 0 12px ${glow}11`,
        transform:`translateZ(${px(totalH)})`}}>
        {/* Surface grid */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:`linear-gradient(to right,${glow}18 1px,transparent 1px),linear-gradient(to bottom,${glow}18 1px,transparent 1px)`,
          backgroundSize:"20px 20px"}} />
        {/* Glowing LED trim on back edge */}
        <div style={{position:"absolute",top:2,left:5,right:5,height:3,
          background:glow,opacity:0.55,borderRadius:2,
          boxShadow:`0 0 10px ${glow},0 0 20px ${glow}66`}} />
        {/* Monitor glow patch (where monitor will be) */}
        <div style={{position:"absolute",top:4,left:"18%",width:"64%",height:26,
          background:glow,opacity:0.07,borderRadius:2}} />
        {/* Keyboard */}
        <div style={{position:"absolute",bottom:6,left:"50%",transform:"translateX(-50%)",
          width:52,height:16,background:"#03080e",
          border:`1px solid ${glow}33`,borderRadius:2}}>
          {[0,1].map(row=>(
            <div key={row} style={{display:"flex",gap:1.5,padding:"1.5px 3px",marginTop:row===0?1.5:0}}>
              {Array.from({length:7},(_,k)=>(
                <div key={k} style={{flex:1,height:5,
                  background:"#07121e",border:`1px solid ${glow}22`,borderRadius:1}} />
              ))}
            </div>
          ))}
        </div>
        {/* Coffee mug */}
        <div style={{position:"absolute",top:6,left:7,width:11,height:14,
          background:"#0a1a28",border:`1px solid ${glow}40`,borderRadius:"2px 2px 3px 3px"}}>
          <div style={{height:3,background:glow,opacity:0.3,borderRadius:"1px 1px 0 0"}} />
        </div>
        {/* Paper/notes */}
        <div style={{position:"absolute",top:6,right:8,width:16,height:12,
          background:"#060e1a",border:`1px solid ${glow}20`,borderRadius:1}}>
          {[3,6,9].map(y=>(
            <div key={y} style={{position:"absolute",top:y,left:2,right:2,height:1,background:`${glow}22`}} />
          ))}
        </div>
      </div>

      {/* FRONT FACE — tall & chunky */}
      <div style={{position:"absolute",bottom:0,left:0,width:px(DW),height:px(totalH),
        background:`linear-gradient(to bottom,#0a1828,#040c18)`,
        border:`1px solid ${glow}44`,
        transformOrigin:"bottom",transform:"rotateX(-90deg)"}}>
        {/* LED strip at top */}
        <div style={{position:"absolute",top:3,left:6,right:6,height:2.5,
          background:glow,opacity:0.5,borderRadius:1,
          boxShadow:`0 0 8px ${glow}`}} />
        {/* Leg recess / dark cavity */}
        <div style={{position:"absolute",bottom:4,left:"10%",width:"80%",height:totalH*0.42,
          background:"#010407",borderRadius:"2px 2px 0 0",
          border:`1px solid ${glow}18`}} />
        {/* Port cluster */}
        <div style={{position:"absolute",bottom:8,left:6,display:"flex",gap:3}}>
          {[glow,"#6366f1","#f59e0b","#ef4444"].map((c,i)=>(
            <div key={i} style={{width:5,height:5,borderRadius:"50%",background:c,opacity:0.75,
              boxShadow:`0 0 5px ${c}`}} />
          ))}
        </div>
        {/* Power indicator panel */}
        <div style={{position:"absolute",bottom:8,right:6,
          width:18,height:10,background:"#030810",
          border:`1px solid ${glow}33`,borderRadius:1,
          display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
          <div style={{width:4,height:4,borderRadius:"50%",background:"#10b981",
            boxShadow:"0 0 5px #10b981"}} />
          <div style={{width:4,height:4,borderRadius:"50%",background:"#3b82f6",
            boxShadow:"0 0 5px #3b82f6"}} />
        </div>
      </div>

      {/* RIGHT SIDE FACE */}
      <div style={{position:"absolute",top:0,left:px(DW),
        width:px(totalH),height:px(DD),
        background:`linear-gradient(to right,#060e1a,#030810)`,
        border:`1px solid ${glow}30`,
        transformOrigin:"left",transform:"rotateY(90deg)"}}>
        {/* Vent slits */}
        {[15,25,35].map(y=>(
          <div key={y} style={{position:"absolute",top:y,left:6,right:6,height:2,
            background:`${glow}20`,borderRadius:1}} />
        ))}
      </div>

      {/* DROP SHADOW on floor */}
      <div style={{position:"absolute",
        left:px(8),top:px(DD+2),
        width:px(DW+totalH*0.8),height:px(DD*0.6),
        background:`radial-gradient(ellipse,${glow}18 0%,transparent 70%)`,
        transform:"translateZ(-1px) scaleY(0.4)",
        transformOrigin:"top",
        pointerEvents:"none"}} />
    </div>
  );
}

// ─── Character Sprite ─────────────────────────────────────────────────────────
function CharSprite({ left, top, platformH=0, agent }: {
  left:number; top:number; platformH?:number; agent:AgentDef;
}) {
  const { hair, skin, suit, accent } = agent;
  const sc = SC[agent.state];
  const Z = DH + platformH + 6;
  const billboard = "rotateZ(45deg) rotateX(-55deg)";

  return (
    <div style={{...p3d,position:"absolute",
      left:px(left+36),top:px(top+10),
      width:42,height:60,
      transform:`translateZ(${px(Z)}) ${billboard}`}}>
      {/* Chair back */}
      <div style={{position:"absolute",top:16,left:3,width:36,height:38,
        background:"#060f1e",border:"1px solid #0d2040",borderRadius:3}}>
        <div style={{margin:"3px 3px",height:26,background:"#040b16",borderRadius:2}} />
      </div>
      {/* Body — larger */}
      <div style={{position:"absolute",top:26,left:9,width:24,height:26,background:suit,borderRadius:3}}>
        <div style={{position:"absolute",top:0,left:0,width:8,height:14,
          background:"rgba(255,255,255,0.09)",borderRadius:"3px 0 0 0"}} />
        <div style={{position:"absolute",top:0,right:0,width:8,height:14,
          background:"rgba(255,255,255,0.07)",borderRadius:"0 3px 0 0"}} />
        <div style={{position:"absolute",top:3,left:"50%",transform:"translateX(-50%)",
          width:7,height:2.5,background:accent,borderRadius:1,
          boxShadow:`0 0 6px ${accent}`}} />
        {/* Monitor glow on chest */}
        <div style={{position:"absolute",inset:0,background:sc.glow,opacity:0.1,borderRadius:3}} />
      </div>
      {/* Arms */}
      <div style={{position:"absolute",top:28,left:2,width:8,height:16,background:suit,borderRadius:2}} />
      <div style={{position:"absolute",top:28,right:2,width:8,height:16,background:suit,borderRadius:2}} />
      {/* Hands */}
      <div style={{position:"absolute",top:42,left:2,width:8,height:6,background:skin,borderRadius:2}} />
      <div style={{position:"absolute",top:42,right:2,width:8,height:6,background:skin,borderRadius:2}} />
      {/* Neck */}
      <div style={{position:"absolute",top:18,left:16,width:10,height:9,background:skin,borderRadius:2}} />
      {/* Head */}
      <div style={{position:"absolute",top:6,left:11,width:20,height:16,background:skin,borderRadius:4}}>
        {/* Eyes */}
        <div style={{position:"absolute",top:5,left:3,width:5,height:5,background:"#050912",borderRadius:1}}>
          <div style={{width:2,height:2,background:"white",opacity:0.9,margin:"0.5px 0 0 1px",borderRadius:"50%"}} />
        </div>
        <div style={{position:"absolute",top:5,right:3,width:5,height:5,background:"#050912",borderRadius:1}}>
          <div style={{width:2,height:2,background:"white",opacity:0.9,margin:"0.5px 0 0 1px",borderRadius:"50%"}} />
        </div>
        {/* Monitor glow on face */}
        <div style={{position:"absolute",inset:0,background:sc.glow,opacity:0.14,borderRadius:4}} />
      </div>
      {/* Hair — large + spiky */}
      <div style={{position:"absolute",top:2,left:10,width:22,height:10,background:hair,
        borderRadius:"5px 5px 1px 1px"}}>
        <div style={{position:"absolute",top:-4,left:-2,width:6,height:8,background:hair,borderRadius:3}} />
        <div style={{position:"absolute",top:-4,right:-2,width:6,height:8,background:hair,borderRadius:3}} />
        <div style={{position:"absolute",top:-6,left:"50%",transform:"translateX(-50%)",
          width:9,height:7,background:hair,borderRadius:"4px 4px 0 0"}} />
      </div>
    </div>
  );
}

// ─── Monitor ──────────────────────────────────────────────────────────────────
function DeskMonitor({ left, top, platformH=0, agent, blink, bars }: {
  left:number; top:number; platformH?:number;
  agent:AgentDef; blink:boolean; bars:number[];
}) {
  const sc = SC[agent.state];
  const Z = DH + platformH + 2;
  const tilt = "rotateZ(45deg) rotateX(-40deg)";
  const mw = agent.isMaster ? 76 : 58;
  const mh = agent.isMaster ? 50 : 40;

  return (
    <div style={{...p3d,position:"absolute",
      left:px(left+20),top:px(top+2),
      width:mw,height:mh,
      transform:`translateZ(${px(Z)}) ${tilt}`,
      background:"#020810",
      border:`1.5px solid ${sc.glow}`,
      borderRadius:3,
      boxShadow:`0 0 24px ${sc.glow}66, 0 0 8px ${sc.glow}99, inset 0 0 12px ${sc.glow}11`}}>
      {/* Screen */}
      <div style={{position:"absolute",inset:"2px 2px 8px",
        background:sc.screen,borderRadius:2,overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.3) 2px,rgba(0,0,0,0.3) 4px)",
          pointerEvents:"none",zIndex:10}} />
        <div style={{position:"absolute",top:3,left:0,right:0,textAlign:"center",
          fontFamily:"monospace",fontSize:5.5,fontWeight:"bold",color:sc.glow,letterSpacing:1,
          textShadow:`0 0 8px ${sc.glow}`}}>
          {agent.label}
        </div>
        <div style={{position:"absolute",top:10,left:0,right:0,textAlign:"center",
          fontFamily:"monospace",fontSize:4.5,color:sc.glow,opacity:0.7}}>
          {agent.role}
        </div>
        {/* Bars */}
        <div style={{position:"absolute",bottom:2,left:3,right:3,height:14,
          display:"flex",alignItems:"flex-end",gap:1.5}}>
          {bars.slice(0,agent.isMaster?6:4).map((v,i)=>(
            <div key={i} style={{flex:1,height:`${v}%`,background:sc.glow,
              opacity:0.75,borderRadius:"1px 1px 0 0",transition:"height 0.9s ease"}} />
          ))}
        </div>
      </div>
      {/* LED */}
      <div style={{position:"absolute",bottom:2,right:4,width:5,height:5,borderRadius:"50%",
        background:blink?sc.glow:"#05090e",
        boxShadow:blink?`0 0 8px ${sc.glow}`:"none",transition:"all 0.3s"}} />
      {/* Stand */}
      <div style={{position:"absolute",bottom:-9,left:"50%",transform:"translateX(-50%)",
        width:9,height:9,background:"#040a12"}} />
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
function NavBar({ running, onRun, fxPrices }: {
  running:boolean; onRun:()=>void;
  fxPrices: Record<string,FXRow>;
}) {
  const xau = fxPrices["XAUUSD"];
  const btc = fxPrices["BTCUSD"];
  const eur = fxPrices["EURUSD"];
  const jpy = fxPrices["USDJPY"];
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"7px 16px",background:"#010407",borderBottom:"1px solid #0a1e34"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{display:"flex",gap:5}}>
          {(["#ef4444","#f59e0b","#10b981"] as const).map((c,i)=>(
            <div key={i} style={{width:10,height:10,borderRadius:"50%",background:c,opacity:0.88}} />
          ))}
        </div>
        <span style={{fontFamily:"monospace",fontSize:11,color:"#22d3ee",letterSpacing:4,fontWeight:"bold",
          textShadow:"0 0 14px rgba(34,211,238,0.65)"}}>
          TRADEX NEWSROOM
        </span>
        <span style={{fontFamily:"monospace",fontSize:8,color:"#1a2e50",letterSpacing:2}}>AI OPS CENTER</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontFamily:"monospace",fontSize:8.5,color:"#182a42"}}>
          XAU <span style={{color:xau?.up?"#10b981":"#ef4444"}}>{xau?.price ?? "—"}</span>{" · "}
          BTC <span style={{color:btc?.up?"#10b981":"#ef4444"}}>{btc?.price ?? "—"}</span>{" · "}
          EUR <span style={{color:eur?.up?"#10b981":"#ef4444"}}>{eur?.price ?? "—"}</span>{" · "}
          JPY <span style={{color:jpy?.up?"#10b981":"#ef4444"}}>{jpy?.price ?? "—"}</span>
        </div>
        <button onClick={onRun} style={{display:"flex",alignItems:"center",gap:6,
          padding:"4px 14px",borderRadius:3,cursor:"pointer",
          background:running?"#041c10":"#010a18",
          border:`1px solid ${running?"#10b981":"#1a3a70"}`,
          fontFamily:"monospace",fontSize:9,fontWeight:"bold",letterSpacing:1,
          color:running?"#10b981":"#22d3ee"}}>
          <span style={{width:6,height:6,borderRadius:"50%",display:"inline-block",
            background:running?"#10b981":"#22d3ee",
            animation:running?"pulse-live 0.7s ease-in-out infinite":"none"}} />
          {running?"RUNNING…":"RUN PIPELINE"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);
  const blink = useBlink(700);
  const clock = useClock();
  const bars  = useAnimatedBars(8, 16, 90, 1050);
  const tick  = useTick(25);
  const fxPrices = useLivePrices(_props?.data);
  const handleRun = useCallback(()=>{setRunning(true);setTimeout(()=>setRunning(false),4200);},[]);

  // screen-space label positions (approximate, tuned for iso view)
  const LABELS: Record<string,[number,number]> = {
    smc:        [196, 208], master:     [360, 156],
    risk:       [514, 208], trend:      [ 98, 348],
    news:       [258, 382], execution:  [404, 406],
    contrarian: [574, 370],
  };

  return (
    <div style={{position:"relative",background:"#010407",
      border:"1px solid #0a1e34",borderRadius:12,overflow:"hidden",userSelect:"none"}}>
      <NavBar running={running} onRun={handleRun} fxPrices={fxPrices} />

      {/* Scene viewport */}
      <div style={{position:"relative",height:560,overflow:"hidden",background:"#010407"}}>

        {/* CRT scanline overlay */}
        <div style={{position:"absolute",inset:0,zIndex:50,pointerEvents:"none",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.22) 3px,rgba(0,0,0,0.22) 4px)"}} />

        {/* Corner vignette */}
        <div style={{position:"absolute",inset:0,zIndex:49,pointerEvents:"none",
          background:"radial-gradient(ellipse 85% 85% at 48% 52%,transparent 45%,rgba(1,4,7,0.9) 100%)"}} />

        {/* ISO WORLD */}
        <div style={{
          position:"absolute",
          left:"50%", top:"60%",
          marginLeft:-550, marginTop:-400,
          width:1100, height:800,
          ...p3d,
          transform:"rotateX(55deg) rotateZ(-45deg) scale(0.64)",
          transformOrigin:"550px 400px",
        }}>
          <IsoFloor />
          <BackWall bars={bars} clock={clock} blink={blink} fxPrices={fxPrices} />
          <LeftWall blink={blink} />
          <FloorCables tick={tick} />

          {STATIONS.map(stn=>{
            const agent = AGENTS[stn.agentId];
            if (!agent) return null;
            const sc = SC[agent.state];
            const pH = stn.platformH ?? 0;
            return (
              <React.Fragment key={stn.agentId}>
                <DeskCube left={stn.x} top={stn.y} platformH={pH} glow={sc.glow} />
                <CharSprite left={stn.x} top={stn.y} platformH={pH} agent={agent} />
                <DeskMonitor left={stn.x} top={stn.y} platformH={pH}
                  agent={agent} blink={blink} bars={bars} />
              </React.Fragment>
            );
          })}
        </div>

        {/* Agent label overlays — screen-space, always readable */}
        {STATIONS.map(stn=>{
          const agent = AGENTS[stn.agentId];
          if (!agent) return null;
          const sc = SC[agent.state];
          const [lx,ly] = LABELS[stn.agentId] ?? [0,0];
          return (
            <div key={stn.agentId} style={{
              position:"absolute",left:lx,top:ly,
              transform:"translateX(-50%)",
              zIndex:30,pointerEvents:"none",textAlign:"center",
            }}>
              <div style={{fontFamily:"monospace",fontSize:7.5,fontWeight:"bold",
                color:sc.glow,letterSpacing:1.5,
                textShadow:`0 0 10px ${sc.glow}`,
                background:"rgba(1,4,7,0.75)",
                padding:"2px 7px",borderRadius:2,
                border:`1px solid ${sc.glow}44`}}>
                {agent.label}
              </div>
              <div style={{fontFamily:"monospace",fontSize:6,color:sc.glow,
                opacity:0.6,marginTop:1}}>
                {agent.role}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"6px 16px",background:"#010407",borderTop:"1px solid #0a1e34"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          {Object.values(AGENTS).map(a=>{
            const sc=SC[a.state];
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:5,height:5,borderRadius:"50%",
                  background:blink?sc.glow:"#0a1e34",
                  boxShadow:blink?`0 0 7px ${sc.glow}`:"none",
                  transition:"all 0.3s"}} />
                <span style={{fontFamily:"monospace",fontSize:7.5,color:sc.glow,
                  letterSpacing:1,textShadow:`0 0 6px ${sc.glow}77`}}>
                  {a.label}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"monospace",fontSize:7.5,color:"#10b981",letterSpacing:1,
            textShadow:"0 0 6px #10b981"}}>● LIVE</span>
          <span style={{fontFamily:"monospace",fontSize:7.5,color:"#0a1e34"}}>
            {clock.toLocaleTimeString("en-US",{hour12:false})}
          </span>
        </div>
      </div>
    </div>
  );
}
