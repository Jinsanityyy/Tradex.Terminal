"use client";

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
        const btcRes = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT");
        if (btcRes.ok) {
          const btc = await btcRes.json() as { lastPrice:string; priceChangePercent:string };
          const price = parseFloat(btc.lastPrice);
          const pct   = parseFloat(btc.priceChangePercent);
          setRows(p => ({...p, BTCUSD:{
            price: price.toLocaleString("en-US",{maximumFractionDigits:0}),
            pct:   `${pct>=0?"+":""}${pct.toFixed(2)}%`,
            up: pct>=0, live:true,
          }}));
        }
      } catch { /* silent */ }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const merged = { ...rows };
  if (agentData?.snapshot) {
    const sym: string = agentData.snapshot.symbol;
    const cur: number = agentData.snapshot.price.current;
    const pct: number = agentData.snapshot.price.changePercent;
    merged[sym] = {
      price: sym==="BTCUSD"
        ? cur.toLocaleString("en-US",{maximumFractionDigits:0})
        : sym==="USDJPY" ? cur.toFixed(2) : cur.toFixed(4),
      pct: `${pct>=0?"+":""}${pct.toFixed(2)}%`,
      up: pct>=0, live:true,
    };
  }
  return merged;
}

// ─── Types ───────────────────────────────────────────────────────────────────
type AgentState = "bullish"|"bearish"|"alert"|"valid"|"blocked"|"armed"|"no-trade"|"idle";
interface AgentDef { id:string; label:string; role:string; state:AgentState; hair:string; skin:string; suit:string; accent:string; isMaster?:boolean; }
interface StationDef { agentId:string; x:number; y:number; platformH?:number; }

const SC: Record<AgentState,{glow:string;screen:string;dim:string}> = {
  bullish:    {glow:"#10b981",screen:"#031a0c",dim:"#064d24"},
  bearish:    {glow:"#ef4444",screen:"#1a0303",dim:"#5a1010"},
  alert:      {glow:"#f59e0b",screen:"#1a0d00",dim:"#5a3300"},
  valid:      {glow:"#10b981",screen:"#031a0c",dim:"#064d24"},
  blocked:    {glow:"#ef4444",screen:"#1a0303",dim:"#5a1010"},
  armed:      {glow:"#22d3ee",screen:"#021420",dim:"#0a4060"},
  "no-trade": {glow:"#22d3ee",screen:"#021420",dim:"#0a4060"},
  idle:       {glow:"#818cf8",screen:"#080c1e",dim:"#1e2060"},
};

const AGENTS: Record<string,AgentDef> = {
  trend:      {id:"trend",      label:"TREND",      role:"BULLISH",  state:"bullish",  hair:"#fbbf24",skin:"#f0a070",suit:"#0e3060",accent:"#10b981"},
  smc:        {id:"smc",        label:"PR.ACTION",  role:"ALERT",    state:"alert",    hair:"#a78bfa",skin:"#d09060",suit:"#1e0e48",accent:"#f59e0b"},
  master:     {id:"master",     label:"MASTER",     role:"NO TRADE", state:"no-trade", hair:"#e2e8f0",skin:"#e8c898",suit:"#080e20",accent:"#22d3ee",isMaster:true},
  risk:       {id:"risk",       label:"RISK GATE",  role:"VALID",    state:"valid",    hair:"#34d399",skin:"#c07858",suit:"#040e0a",accent:"#10b981"},
  contrarian: {id:"contrarian", label:"CONTRARIAN", role:"MONITOR",  state:"idle",     hair:"#f87171",skin:"#e0a870",suit:"#180806",accent:"#f97316"},
  news:       {id:"news",       label:"NEWS",       role:"MONITOR",  state:"idle",     hair:"#60a5fa",skin:"#9b7050",suit:"#061428",accent:"#3b82f6"},
  execution:  {id:"execution",  label:"EXECUTION",  role:"STANDBY",  state:"armed",    hair:"#22d3ee",skin:"#c89060",suit:"#07101c",accent:"#22d3ee"},
};

// row 0 = back (near wall), row 1 = front
const STATIONS: StationDef[] = [
  {agentId:"smc",        x:80,  y:50},
  {agentId:"master",     x:420, y:20,  platformH:28},
  {agentId:"risk",       x:750, y:50},
  {agentId:"trend",      x:20,  y:280},
  {agentId:"news",       x:250, y:280},
  {agentId:"execution",  x:530, y:280},
  {agentId:"contrarian", x:810, y:280},
];

const CABLE_COL: Record<string,string> = {
  trend:"#fbbf24",smc:"#a78bfa",risk:"#34d399",
  contrarian:"#f97316",news:"#60a5fa",execution:"#22d3ee",
};
const p3d: React.CSSProperties = {transformStyle:"preserve-3d"};
const px = (n: number) => `${n}px`;

// ─── Floor ────────────────────────────────────────────────────────────────────
function IsoFloor() {
  return (
    <div style={{
      position:"absolute", left:0, top:0, width:1100, height:800,
      background:"#040f20",
      backgroundImage:[
        `linear-gradient(to right, rgba(34,211,238,0.18) 1px, transparent 1px)`,
        `linear-gradient(to bottom, rgba(34,211,238,0.18) 1px, transparent 1px)`,
      ].join(","),
      backgroundSize:"55px 55px",
      transform:"translateZ(0px)",
      boxShadow:"inset 0 0 120px rgba(34,211,238,0.06)",
    }}>
      {/* Bright central glow under master */}
      <div style={{position:"absolute",left:"28%",top:"0%",width:"44%",height:"50%",
        background:"radial-gradient(ellipse,rgba(34,211,238,0.12) 0%,transparent 70%)",
        pointerEvents:"none"}} />
      {/* Front row glow */}
      <div style={{position:"absolute",left:"0%",top:"50%",width:"100%",height:"50%",
        background:"radial-gradient(ellipse 80% 50% at 50% 60%,rgba(99,102,241,0.07) 0%,transparent 70%)",
        pointerEvents:"none"}} />
      {/* Floor edge strip glow */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:6,
        background:"rgba(34,211,238,0.15)",boxShadow:"0 0 20px rgba(34,211,238,0.3)"}} />
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:6,
        background:"rgba(99,102,241,0.15)"}} />
    </div>
  );
}

// ─── Left Wall ────────────────────────────────────────────────────────────────
function LeftWall({ blink }: { blink:boolean }) {
  return (
    <div style={{
      position:"absolute", left:0, top:0,
      width:420, height:800,
      background:"linear-gradient(to right,#060e1e,#040b18)",
      borderRight:"2px solid rgba(34,211,238,0.35)",
      transformOrigin:"left",
      transform:"rotateY(90deg)",
      overflow:"hidden",
    }}>
      {/* Horizontal panel lines */}
      {[100,200,300,380].map(y=>(
        <div key={y} style={{position:"absolute",left:0,right:0,top:y,height:1,
          background:"rgba(34,211,238,0.12)"}} />
      ))}
      {/* Vertical dividers */}
      {[160,320,480,640].map(x=>(
        <div key={x} style={{position:"absolute",top:0,bottom:0,left:x,width:1,
          background:"rgba(34,211,238,0.08)"}} />
      ))}
      {/* Side monitors */}
      {[1,2].map(i=>(
        <div key={i} style={{position:"absolute",left:60+i*140,top:60,width:110,height:80,
          background:"#04091a",border:"1px solid rgba(34,211,238,0.4)",borderRadius:3,
          boxShadow:"0 0 20px rgba(34,211,238,0.2), inset 0 0 12px rgba(34,211,238,0.05)"}}>
          <div style={{margin:4,height:54,background:"#021828",borderRadius:2,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:4,left:0,right:0,textAlign:"center",
              fontFamily:"monospace",fontSize:6,color:"#22d3ee",letterSpacing:1,
              textShadow:"0 0 8px #22d3ee"}}>
              {i===1?"SYS.MON":"NET.FLOW"}
            </div>
            <div style={{position:"absolute",bottom:4,left:4,right:4,height:24,
              display:"flex",alignItems:"flex-end",gap:2.5}}>
              {[45,72,55,83,61,70].map((v,j)=>(
                <div key={j} style={{flex:1,height:`${v}%`,background:"#22d3ee",opacity:0.75,
                  borderRadius:"1px 1px 0 0",boxShadow:"0 0 4px #22d3ee"}} />
              ))}
            </div>
          </div>
          <div style={{position:"absolute",bottom:4,right:6,width:6,height:6,borderRadius:"50%",
            background:blink?"#10b981":"#04101a",
            boxShadow:blink?"0 0 8px #10b981":"none"}} />
        </div>
      ))}
      {/* Cable conduit strip */}
      <div style={{position:"absolute",top:160,left:0,right:0,height:10,
        background:"#060e1c",
        borderTop:"1px solid rgba(34,211,238,0.3)",
        borderBottom:"1px solid rgba(34,211,238,0.3)"}} />
      {/* LED indicator strip */}
      <div style={{position:"absolute",top:163,left:20,display:"flex",gap:10}}>
        {Array.from({length:30},(_,i)=>(
          <div key={i} style={{width:5,height:5,borderRadius:"50%",
            background:(blink&&i%3===0)?"#10b981":((!blink)&&i%4===0)?"#3b82f6":"#061018",
            boxShadow:(blink&&i%3===0)?"0 0 6px #10b981":((!blink)&&i%4===0)?"0 0 6px #3b82f6":"none",
            opacity:0.9}} />
        ))}
      </div>
      {/* Top border glow */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:4,
        background:"linear-gradient(to right,rgba(34,211,238,0.5),rgba(99,102,241,0.5))"}} />
    </div>
  );
}

// ─── Back Wall ────────────────────────────────────────────────────────────────
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
      background:"linear-gradient(to bottom, #060e20, #040b18)",
      transformOrigin:"top center",
      transform:"rotateX(-90deg)",
      overflow:"hidden",
    }}>
      {/* Bottom seam glow — attaches wall to floor */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:8,
        background:"linear-gradient(to top,rgba(34,211,238,0.4),transparent)",
        boxShadow:"0 0 30px rgba(34,211,238,0.2)"}} />
      {/* Top border */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:4,
        background:"linear-gradient(to right,rgba(34,211,238,0.6),rgba(99,102,241,0.6))",
        boxShadow:"0 0 20px rgba(34,211,238,0.4)"}} />

      {/* Horizontal panel lines */}
      {[80,160,240,320,400].map(y=>(
        <div key={y} style={{position:"absolute",left:0,right:0,top:y,height:1,
          background:"rgba(34,211,238,0.1)"}} />
      ))}

      {/* CEILING LIGHT BARS */}
      {[80,230,400,560,730,900,1040].map(cx=>(
        <div key={cx} style={{position:"absolute",top:0,left:cx-44,width:88,height:18,
          background:"#040918",border:"1px solid rgba(125,211,252,0.4)",
          borderRadius:"0 0 6px 6px",
          boxShadow:"0 12px 50px rgba(125,211,252,0.3)"}}>
          <div style={{margin:"3px 6px",height:10,
            background:"rgba(125,211,252,0.55)",borderRadius:2,
            boxShadow:"0 0 12px rgba(125,211,252,0.8)"}} />
        </div>
      ))}

      {/* LEFT SERVER RACK */}
      <div style={{position:"absolute",left:0,top:18,width:96,bottom:0,
        background:"#030c1c",
        borderRight:"2px solid rgba(34,211,238,0.35)"}}>
        <div style={{padding:"4px 3px",display:"flex",flexDirection:"column",gap:1.5}}>
          {Array.from({length:22},(_,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",height:15,
              background:"#040c1c",border:"1px solid rgba(34,211,238,0.12)",borderRadius:1,margin:"0 2px"}}>
              <div style={{flex:1,height:2,margin:"0 4px",background:"rgba(34,211,238,0.15)",borderRadius:1}} />
              <div style={{width:6,height:6,borderRadius:"50%",marginRight:3,
                background:(blink&&j%2===0)
                  ? (j%3===0?"#10b981":j%3===1?"#3b82f6":"#f59e0b")
                  : "#060f1a",
                boxShadow:(blink&&j%2===0)?`0 0 6px currentColor`:"none"}} />
              <div style={{width:6,height:6,borderRadius:"50%",marginRight:4,
                background:(!blink&&j%3===0)?"#22d3ee":"#060f1a",
                boxShadow:(!blink&&j%3===0)?"0 0 6px #22d3ee":"none"}} />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SERVER RACK */}
      <div style={{position:"absolute",right:0,top:18,width:96,bottom:0,
        background:"#030c1c",
        borderLeft:"2px solid rgba(99,102,241,0.35)"}}>
        <div style={{padding:"4px 3px",display:"flex",flexDirection:"column",gap:1.5}}>
          {Array.from({length:22},(_,j)=>(
            <div key={j} style={{display:"flex",alignItems:"center",height:15,
              background:"#040c1c",border:"1px solid rgba(99,102,241,0.12)",borderRadius:1,margin:"0 2px"}}>
              <div style={{flex:1,height:2,margin:"0 4px",background:"rgba(99,102,241,0.15)",borderRadius:1}} />
              <div style={{width:6,height:6,borderRadius:"50%",marginRight:3,
                background:(!blink&&j%2===0)
                  ? (j%4===0?"#f97316":j%4===1?"#10b981":"#818cf8")
                  : "#060f1a",
                boxShadow:(!blink&&j%2===0)?`0 0 6px currentColor`:"none"}} />
              <div style={{width:6,height:6,borderRadius:"50%",marginRight:4,
                background:(blink&&j%3===1)?"#f59e0b":"#060f1a",
                boxShadow:(blink&&j%3===1)?"0 0 6px #f59e0b":"none"}} />
            </div>
          ))}
        </div>
      </div>

      {/* FX RATES PANEL */}
      <div style={{position:"absolute",left:104,top:22,width:230,height:230,
        background:"#030a18",border:"1px solid rgba(34,211,238,0.5)",
        borderTop:"3px solid #22d3ee",
        borderRadius:"0 0 6px 6px",
        boxShadow:"0 0 30px rgba(34,211,238,0.25), inset 0 0 20px rgba(34,211,238,0.04)"}}>
        <div style={{padding:"8px 10px"}}>
          <div style={{fontFamily:"monospace",fontSize:9,color:"#22d3ee",
            letterSpacing:3,marginBottom:6,textAlign:"center",fontWeight:"bold",
            textShadow:"0 0 12px #22d3ee"}}>FX LIVE RATES</div>
          <div style={{height:1,background:"rgba(34,211,238,0.3)",marginBottom:6}} />
          {FX_SYMBOLS.map(sym=>{
            const r = fxPrices[sym];
            const up = r?.up ?? true;
            const col = up ? "#34d399" : "#f87171";
            return (
              <div key={sym} style={{display:"flex",justifyContent:"space-between",
                fontFamily:"monospace",fontSize:8,marginBottom:5.5,alignItems:"center"}}>
                <span style={{color:"rgba(34,211,238,0.55)",letterSpacing:0.5,minWidth:52}}>{sym}</span>
                <span style={{color: r?.live ? "#a5c8e8" : "rgba(100,130,160,0.5)",
                  minWidth:54,textAlign:"right"}}>{r?.price ?? "—"}</span>
                <span style={{color: r?.live ? col : "rgba(100,130,160,0.4)",
                  fontWeight:"bold",minWidth:46,textAlign:"right",
                  textShadow: r?.live ? `0 0 8px ${col}` : "none"}}>{r?.pct ?? "—"}</span>
              </div>
            );
          })}
        </div>
        <div style={{position:"absolute",inset:0,borderRadius:"0 0 6px 6px",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)",
          pointerEvents:"none"}} />
      </div>

      {/* MAIN TRADEX DISPLAY */}
      <div style={{position:"absolute",left:342,top:14,width:518,height:270,
        background:"#030810",
        border:"2px solid rgba(34,211,238,0.55)",
        borderTop:"4px solid #22d3ee",
        borderRadius:"0 0 6px 6px",
        boxShadow:"0 0 80px rgba(34,211,238,0.3), inset 0 0 40px rgba(34,211,238,0.04)"}}>
        {/* Corner brackets */}
        {(["top-left","top-right","bottom-left","bottom-right"] as const).map((pos,i)=>(
          <div key={i} style={{
            position:"absolute",
            top:pos.startsWith("top")?3:undefined,
            bottom:pos.startsWith("bottom")?3:undefined,
            left:pos.endsWith("left")?3:undefined,
            right:pos.endsWith("right")?3:undefined,
            width:20,height:20,
            borderTop:pos.startsWith("top")?"2px solid #22d3ee":undefined,
            borderBottom:pos.startsWith("bottom")?"2px solid #22d3ee":undefined,
            borderLeft:pos.endsWith("left")?"2px solid #22d3ee":undefined,
            borderRight:pos.endsWith("right")?"2px solid #22d3ee":undefined,
          }} />
        ))}
        <div style={{padding:"14px 22px 10px",height:"100%",display:"flex",flexDirection:"column",gap:6}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"monospace",fontSize:24,fontWeight:"bold",color:"#22d3ee",
              letterSpacing:8,textShadow:"0 0 30px #22d3ee, 0 0 80px rgba(34,211,238,0.4)"}}>
              TRADEX
            </div>
            <div style={{fontFamily:"monospace",fontSize:7.5,color:"rgba(34,211,238,0.45)",
              letterSpacing:3,marginTop:2}}>
              MULTI-AGENT INTELLIGENCE PLATFORM
            </div>
          </div>
          <div style={{height:1,background:"rgba(34,211,238,0.2)"}} />
          <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:5,padding:"0 2px"}}>
            {(["TRND","PA","NEWS","MSTR","RISK","CNTR","EXEC"] as const).map((lbl,i)=>{
              const COLS=["#34d399","#fbbf24","#60a5fa","#22d3ee","#34d399","#fb923c","#22d3ee"];
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <div style={{fontFamily:"monospace",fontSize:5,color:COLS[i],
                    textShadow:`0 0 6px ${COLS[i]}`}}>{Math.round(bars[i])}%</div>
                  <div style={{width:"100%",height:70,background:"#03091a",borderRadius:1,
                    display:"flex",alignItems:"flex-end",overflow:"hidden",
                    border:`1px solid ${COLS[i]}22`}}>
                    <div style={{width:"100%",height:`${bars[i]}%`,background:COLS[i],opacity:0.85,
                      borderRadius:"1px 1px 0 0",transition:"height 1s ease",
                      boxShadow:`0 0 12px ${COLS[i]}, 0 0 4px ${COLS[i]}`}} />
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:5,color:COLS[i],
                    textShadow:`0 0 6px ${COLS[i]}`}}>{lbl}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",
            fontFamily:"monospace",fontSize:7,
            borderTop:"1px solid rgba(34,211,238,0.15)",paddingTop:4}}>
            <span style={{color:"#34d399",textShadow:"0 0 8px #34d399"}}>● 7 AGENTS ACTIVE</span>
            <span style={{color:"rgba(34,211,238,0.7)"}}>REAL-TIME CONSENSUS</span>
            <span style={{color:"rgba(34,211,238,0.3)"}}>v2.4.1</span>
          </div>
        </div>
        <div style={{position:"absolute",inset:0,borderRadius:"0 0 6px 6px",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)",
          pointerEvents:"none"}} />
      </div>

      {/* ANALOG CLOCK */}
      <div style={{position:"absolute",right:104,top:22,width:130,height:130,
        background:"#030810",border:"2px solid rgba(34,211,238,0.5)",
        borderTop:"3px solid #22d3ee",
        borderRadius:"0 0 65px 65px",
        boxShadow:"0 0 30px rgba(34,211,238,0.2)"}}>
        <svg width="130" height="130" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="#020810" stroke="rgba(34,211,238,0.25)" strokeWidth="1.5"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(34,211,238,0.1)" strokeWidth="0.8"/>
          {Array.from({length:12},(_,i)=>{
            const a=(i*30-90)*Math.PI/180, maj=i%3===0;
            return <line key={i}
              x1={50+Math.cos(a)*(maj?30:35)} y1={50+Math.sin(a)*(maj?30:35)}
              x2={50+Math.cos(a)*43} y2={50+Math.sin(a)*43}
              stroke={maj?"#22d3ee":"rgba(34,211,238,0.3)"} strokeWidth={maj?2.5:1.2}/>;
          })}
          {hand(hourDeg,22,3.5,"#c8d8ec")}
          {hand(minDeg,32,2.2,"#e2e8f0")}
          {hand(secDeg,38,1.2,"#ef4444")}
          <circle cx="50" cy="50" r="4" fill="#ef4444" filter="url(#glow)"/>
          <circle cx="50" cy="50" r="2" fill="#fff"/>
        </svg>
        <div style={{textAlign:"center",marginTop:-6,
          fontFamily:"monospace",fontSize:8,color:"#22d3ee",
          textShadow:"0 0 10px #22d3ee"}}>
          {`${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`}
        </div>
      </div>
    </div>
  );
}

// ─── Floor Cables ─────────────────────────────────────────────────────────────
function FloorCables({ tick }: { tick:number }) {
  const masterStn = STATIONS.find(s=>AGENTS[s.agentId]?.isMaster);
  if (!masterStn) return null;
  const mx = masterStn.x + 62, my = masterStn.y + 42;
  return (
    <svg style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",
      overflow:"visible",transform:"translateZ(2px)",...p3d}}>
      {STATIONS.filter(s=>!AGENTS[s.agentId]?.isMaster).map(stn=>{
        const col=CABLE_COL[stn.agentId]??"#64748b";
        const ax=stn.x+62, ay=stn.y+42;
        const midY=(ay+my)/2+20;
        const d=`M${ax},${ay} L${ax},${midY} L${mx},${midY} L${mx},${my}`;
        const off=(tick*2)%20;
        return (
          <g key={stn.agentId}>
            <path d={d} fill="none" stroke={col} strokeWidth={8} opacity={0.08}/>
            <path d={d} fill="none" stroke={col} strokeWidth={3}
              strokeDasharray="10 6" strokeDashoffset={-off}
              style={{filter:`drop-shadow(0 0 6px ${col}) drop-shadow(0 0 2px ${col})`}}/>
            <path d={d} fill="none" stroke={col} strokeWidth={0.8} opacity={0.6}/>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Desk Cube ────────────────────────────────────────────────────────────────
const DW=122, DD=80, DH=56;

function DeskCube({ left, top, platformH=0, glow }: {
  left:number; top:number; platformH?:number; glow:string;
}) {
  const totalH = DH + platformH;
  return (
    <div style={{...p3d,position:"absolute",left:px(left),top:px(top),width:px(DW),height:px(DD)}}>
      {/* PLATFORM (master only) */}
      {platformH>0 && <>
        <div style={{position:"absolute",left:px(-16),top:px(-16),
          width:px(DW+32),height:px(DD+32),
          background:"#050a1c",border:`2px solid ${glow}55`,
          transform:"translateZ(0px)",
          boxShadow:`0 0 30px ${glow}33`}} />
        <div style={{position:"absolute",bottom:0,left:px(-16),
          width:px(DW+32),height:px(platformH),
          background:"#040818",border:`1px solid ${glow}33`,
          transformOrigin:"bottom",transform:"rotateX(-90deg)"}} />
        <div style={{position:"absolute",top:0,left:px(DW+16),
          width:px(platformH),height:px(DD+32),
          background:"#030614",border:`1px solid ${glow}22`,
          transformOrigin:"left",transform:"rotateY(90deg)"}} />
      </>}

      {/* TOP FACE */}
      <div style={{position:"absolute",width:px(DW),height:px(DD),
        background:`linear-gradient(135deg,#0d2040 0%,#071428 100%)`,
        border:`2px solid ${glow}88`,
        boxShadow:`0 0 30px ${glow}55, inset 0 0 16px ${glow}18`,
        transform:`translateZ(${px(totalH)})`}}>
        {/* Surface grid */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:`linear-gradient(to right,${glow}28 1px,transparent 1px),linear-gradient(to bottom,${glow}28 1px,transparent 1px)`,
          backgroundSize:"22px 22px"}} />
        {/* Bright back LED trim */}
        <div style={{position:"absolute",top:3,left:6,right:6,height:4,
          background:glow,opacity:0.8,borderRadius:2,
          boxShadow:`0 0 16px ${glow},0 0 32px ${glow}88`}} />
        {/* Monitor base glow */}
        <div style={{position:"absolute",top:5,left:"16%",width:"68%",height:28,
          background:glow,opacity:0.1,borderRadius:2}} />
        {/* Keyboard */}
        <div style={{position:"absolute",bottom:7,left:"50%",transform:"translateX(-50%)",
          width:54,height:17,background:"#03070e",
          border:`1px solid ${glow}55`,borderRadius:2,
          boxShadow:`inset 0 0 6px ${glow}18`}}>
          {[0,1].map(row=>(
            <div key={row} style={{display:"flex",gap:1.5,padding:"2px 3px",marginTop:row===0?1.5:0}}>
              {Array.from({length:8},(_,k)=>(
                <div key={k} style={{flex:1,height:5,background:"#070e18",
                  border:`1px solid ${glow}33`,borderRadius:1}} />
              ))}
            </div>
          ))}
        </div>
        {/* Coffee mug */}
        <div style={{position:"absolute",top:7,left:8,width:12,height:15,
          background:"#09162a",border:`1.5px solid ${glow}55`,borderRadius:"3px 3px 4px 4px"}}>
          <div style={{height:4,background:glow,opacity:0.5,borderRadius:"1px 1px 0 0"}} />
        </div>
        {/* Notes */}
        <div style={{position:"absolute",top:7,right:8,width:17,height:13,
          background:"#060c1a",border:`1px solid ${glow}30`,borderRadius:1}}>
          {[3,6,9].map(y=>(
            <div key={y} style={{position:"absolute",top:y,left:2,right:2,height:1,
              background:`${glow}44`}} />
          ))}
        </div>
      </div>

      {/* FRONT FACE */}
      <div style={{position:"absolute",bottom:0,left:0,width:px(DW),height:px(totalH),
        background:`linear-gradient(to bottom,#0c1e3a,#060c1e)`,
        border:`2px solid ${glow}55`,
        transformOrigin:"bottom",transform:"rotateX(-90deg)"}}>
        <div style={{position:"absolute",top:4,left:7,right:7,height:3,
          background:glow,opacity:0.75,borderRadius:1,
          boxShadow:`0 0 12px ${glow},0 0 4px ${glow}`}} />
        {/* Leg cavity */}
        <div style={{position:"absolute",bottom:4,left:"8%",width:"84%",height:totalH*0.44,
          background:"#010408",borderRadius:"3px 3px 0 0",
          border:`1px solid ${glow}22`}} />
        {/* Port cluster */}
        <div style={{position:"absolute",bottom:9,left:7,display:"flex",gap:4}}>
          {[glow,"#818cf8","#fbbf24","#f87171"].map((c,i)=>(
            <div key={i} style={{width:7,height:7,borderRadius:"50%",background:c,
              opacity:0.9,boxShadow:`0 0 8px ${c}`}} />
          ))}
        </div>
        {/* Power panel */}
        <div style={{position:"absolute",bottom:9,right:7,
          width:20,height:12,background:"#030810",
          border:`1px solid ${glow}44`,borderRadius:2,
          display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#10b981",
            boxShadow:"0 0 7px #10b981"}} />
          <div style={{width:5,height:5,borderRadius:"50%",background:"#3b82f6",
            boxShadow:"0 0 7px #3b82f6"}} />
        </div>
      </div>

      {/* RIGHT SIDE FACE */}
      <div style={{position:"absolute",top:0,left:px(DW),
        width:px(totalH),height:px(DD),
        background:`linear-gradient(to right,#080e1e,#040810)`,
        border:`2px solid ${glow}40`,
        transformOrigin:"left",transform:"rotateY(90deg)"}}>
        {[14,26,38].map(y=>(
          <div key={y} style={{position:"absolute",top:y,left:7,right:7,height:3,
            background:`${glow}30`,borderRadius:1}} />
        ))}
        <div style={{position:"absolute",top:4,right:6,width:7,height:7,borderRadius:"50%",
          background:glow,opacity:0.7,boxShadow:`0 0 10px ${glow}`}} />
      </div>

      {/* DROP SHADOW */}
      <div style={{position:"absolute",
        left:px(6),top:px(DD+4),
        width:px(DW+totalH*0.85),height:px(DD*0.55),
        background:`radial-gradient(ellipse,${glow}22 0%,transparent 70%)`,
        transform:"translateZ(-1px) scaleY(0.35)",
        transformOrigin:"top",pointerEvents:"none"}} />
    </div>
  );
}

// ─── Character Sprite ─────────────────────────────────────────────────────────
function CharSprite({ left, top, platformH=0, agent }: {
  left:number; top:number; platformH?:number; agent:AgentDef;
}) {
  const { hair, skin, suit, accent } = agent;
  const sc = SC[agent.state];
  const Z = DH + platformH + 8;
  const billboard = "rotateZ(45deg) rotateX(-55deg)";

  return (
    <div style={{...p3d,position:"absolute",
      left:px(left+32),top:px(top+8),
      width:46,height:66,
      transform:`translateZ(${px(Z)}) ${billboard}`}}>
      {/* Chair back */}
      <div style={{position:"absolute",top:18,left:2,width:42,height:42,
        background:"#060e1e",border:"1px solid #0e2248",borderRadius:4,
        boxShadow:`inset 0 0 8px rgba(0,0,0,0.5)`}}>
        <div style={{margin:"3px 4px",height:28,background:"#040a16",borderRadius:2}} />
      </div>
      {/* Body */}
      <div style={{position:"absolute",top:28,left:8,width:30,height:28,background:suit,borderRadius:4,
        boxShadow:`0 0 12px ${sc.glow}44`}}>
        {/* Jacket lapels */}
        <div style={{position:"absolute",top:0,left:0,width:10,height:16,
          background:"rgba(255,255,255,0.1)",borderRadius:"4px 0 0 0"}} />
        <div style={{position:"absolute",top:0,right:0,width:10,height:16,
          background:"rgba(255,255,255,0.08)",borderRadius:"0 4px 0 0"}} />
        {/* Tie/badge */}
        <div style={{position:"absolute",top:4,left:"50%",transform:"translateX(-50%)",
          width:8,height:14,background:accent,borderRadius:"1px 1px 3px 3px",opacity:0.9,
          boxShadow:`0 0 8px ${accent}`}} />
        {/* Screen glow on chest */}
        <div style={{position:"absolute",inset:0,background:sc.glow,opacity:0.14,borderRadius:4}} />
      </div>
      {/* Arms */}
      <div style={{position:"absolute",top:30,left:1,width:8,height:18,background:suit,borderRadius:3}} />
      <div style={{position:"absolute",top:30,right:1,width:8,height:18,background:suit,borderRadius:3}} />
      {/* Hands */}
      <div style={{position:"absolute",top:46,left:1,width:8,height:7,background:skin,borderRadius:3}} />
      <div style={{position:"absolute",top:46,right:1,width:8,height:7,background:skin,borderRadius:3}} />
      {/* Neck */}
      <div style={{position:"absolute",top:20,left:16,width:14,height:9,background:skin,borderRadius:2}} />
      {/* Head */}
      <div style={{position:"absolute",top:8,left:10,width:26,height:18,background:skin,borderRadius:5,
        boxShadow:`0 0 10px ${sc.glow}33`}}>
        {/* Eyes */}
        <div style={{position:"absolute",top:5,left:3,width:7,height:6,background:"#04070e",borderRadius:2}}>
          <div style={{width:3,height:3,background:"white",opacity:0.95,margin:"0.5px 0 0 1.5px",borderRadius:"50%"}} />
        </div>
        <div style={{position:"absolute",top:5,right:3,width:7,height:6,background:"#04070e",borderRadius:2}}>
          <div style={{width:3,height:3,background:"white",opacity:0.95,margin:"0.5px 0 0 1.5px",borderRadius:"50%"}} />
        </div>
        {/* Screen glow on face */}
        <div style={{position:"absolute",inset:0,background:sc.glow,opacity:0.18,borderRadius:5}} />
      </div>
      {/* Hair */}
      <div style={{position:"absolute",top:4,left:9,width:28,height:10,background:hair,
        borderRadius:"6px 6px 1px 1px",boxShadow:`0 0 8px ${hair}88`}}>
        <div style={{position:"absolute",top:-5,left:-3,width:8,height:10,background:hair,borderRadius:4}} />
        <div style={{position:"absolute",top:-5,right:-3,width:8,height:10,background:hair,borderRadius:4}} />
        <div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",
          width:10,height:9,background:hair,borderRadius:"5px 5px 0 0"}} />
      </div>
    </div>
  );
}

// ─── Desk Monitor ─────────────────────────────────────────────────────────────
function DeskMonitor({ left, top, platformH=0, agent, blink, bars }: {
  left:number; top:number; platformH?:number;
  agent:AgentDef; blink:boolean; bars:number[];
}) {
  const sc = SC[agent.state];
  const Z = DH + platformH + 4;
  const tilt = "rotateZ(45deg) rotateX(-38deg)";
  const mw = agent.isMaster ? 82 : 62;
  const mh = agent.isMaster ? 54 : 44;

  return (
    <div style={{...p3d,position:"absolute",
      left:px(left+18),top:px(top+2),
      width:mw,height:mh,
      transform:`translateZ(${px(Z)}) ${tilt}`,
      background:"#020810",
      border:`2px solid ${sc.glow}`,
      borderRadius:4,
      boxShadow:`0 0 30px ${sc.glow}88, 0 0 10px ${sc.glow}, inset 0 0 16px ${sc.glow}18`}}>
      {/* Screen area */}
      <div style={{position:"absolute",inset:"2px 2px 10px",
        background:sc.screen,borderRadius:3,overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.25) 2px,rgba(0,0,0,0.25) 4px)",
          pointerEvents:"none",zIndex:10}} />
        <div style={{position:"absolute",top:3,left:0,right:0,textAlign:"center",
          fontFamily:"monospace",fontSize:6,fontWeight:"bold",color:sc.glow,letterSpacing:1.5,
          textShadow:`0 0 10px ${sc.glow}`}}>
          {agent.label}
        </div>
        <div style={{position:"absolute",top:11,left:0,right:0,textAlign:"center",
          fontFamily:"monospace",fontSize:5,color:sc.glow,opacity:0.75}}>
          {agent.role}
        </div>
        {/* Bar chart */}
        <div style={{position:"absolute",bottom:2,left:3,right:3,height:16,
          display:"flex",alignItems:"flex-end",gap:2}}>
          {bars.slice(0,agent.isMaster?6:4).map((v,i)=>(
            <div key={i} style={{flex:1,height:`${v}%`,background:sc.glow,
              opacity:0.85,borderRadius:"1px 1px 0 0",
              boxShadow:`0 0 6px ${sc.glow}`}} />
          ))}
        </div>
      </div>
      {/* LED indicator */}
      <div style={{position:"absolute",bottom:2,right:4,width:6,height:6,borderRadius:"50%",
        background:blink?sc.glow:"#04080e",
        boxShadow:blink?`0 0 10px ${sc.glow},0 0 4px ${sc.glow}`:"none",
        transition:"all 0.3s"}} />
      {/* Stand */}
      <div style={{position:"absolute",bottom:-10,left:"50%",transform:"translateX(-50%)",
        width:10,height:10,background:"#050a14"}} />
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
      padding:"8px 18px",
      background:"linear-gradient(to right,#020810,#030c18,#020810)",
      borderBottom:"1px solid rgba(34,211,238,0.25)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{display:"flex",gap:6}}>
          {(["#ef4444","#f59e0b","#10b981"] as const).map((c,i)=>(
            <div key={i} style={{width:11,height:11,borderRadius:"50%",background:c,opacity:0.9,
              boxShadow:`0 0 8px ${c}88`}} />
          ))}
        </div>
        <span style={{fontFamily:"monospace",fontSize:12,color:"#22d3ee",letterSpacing:5,fontWeight:"bold",
          textShadow:"0 0 20px rgba(34,211,238,0.8)"}}>
          TRADEX NEWSROOM
        </span>
        <span style={{fontFamily:"monospace",fontSize:8,color:"rgba(34,211,238,0.35)",letterSpacing:2}}>AI OPS CENTER</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{fontFamily:"monospace",fontSize:9,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{color:"rgba(34,211,238,0.5)"}}>XAU</span>
          <span style={{color:xau?.up?"#34d399":"#f87171",fontWeight:"bold",
            textShadow:xau?.live?(xau?.up?"0 0 8px #34d399":"0 0 8px #f87171"):"none"}}>
            {xau?.price ?? "—"}
          </span>
          <span style={{color:"rgba(34,211,238,0.2)"}}>·</span>
          <span style={{color:"rgba(34,211,238,0.5)"}}>BTC</span>
          <span style={{color:btc?.up?"#34d399":"#f87171",fontWeight:"bold",
            textShadow:btc?.live?(btc?.up?"0 0 8px #34d399":"0 0 8px #f87171"):"none"}}>
            {btc?.price ?? "—"}
          </span>
          <span style={{color:"rgba(34,211,238,0.2)"}}>·</span>
          <span style={{color:"rgba(34,211,238,0.5)"}}>EUR</span>
          <span style={{color:eur?.up?"#34d399":"#f87171",fontWeight:"bold"}}>
            {eur?.price ?? "—"}
          </span>
          <span style={{color:"rgba(34,211,238,0.2)"}}>·</span>
          <span style={{color:"rgba(34,211,238,0.5)"}}>JPY</span>
          <span style={{color:jpy?.up?"#34d399":"#f87171",fontWeight:"bold"}}>
            {jpy?.price ?? "—"}
          </span>
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

// ─── Main Component ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TradexNewsroom(_props?: { data?: any; loading?: boolean }) {
  const [running, setRunning] = useState(false);
  const blink  = useBlink(700);
  const clock  = useClock();
  const bars   = useAnimatedBars(8, 20, 92, 1050);
  const tick   = useTick(25);
  const fxPrices = useLivePrices(_props?.data);
  const handleRun = useCallback(()=>{setRunning(true);setTimeout(()=>setRunning(false),4200);},[]);

  // Screen-space label positions (tuned for iso view)
  const LABELS: Record<string,[number,number]> = {
    smc:        [200, 210], master:     [368, 158],
    risk:       [520, 210], trend:      [104, 354],
    news:       [262, 386], execution:  [408, 410],
    contrarian: [578, 376],
  };

  return (
    <div style={{position:"relative",
      background:"#020810",
      border:"1px solid rgba(34,211,238,0.2)",
      borderRadius:12,overflow:"hidden",userSelect:"none"}}>

      <NavBar running={running} onRun={handleRun} fxPrices={fxPrices} />

      {/* Scene container */}
      <div style={{position:"relative",height:560,overflow:"hidden",
        background:"#020810"}}>

        {/* CRT scanlines */}
        <div style={{position:"absolute",inset:0,zIndex:50,pointerEvents:"none",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.2) 3px,rgba(0,0,0,0.2) 4px)"}} />

        {/* Vignette */}
        <div style={{position:"absolute",inset:0,zIndex:49,pointerEvents:"none",
          background:"radial-gradient(ellipse 90% 90% at 48% 50%,transparent 40%,rgba(2,8,16,0.88) 100%)"}} />

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
                <DeskCube   left={stn.x} top={stn.y} platformH={pH} glow={sc.glow} />
                <CharSprite left={stn.x} top={stn.y} platformH={pH} agent={agent} />
                <DeskMonitor left={stn.x} top={stn.y} platformH={pH}
                  agent={agent} blink={blink} bars={bars} />
              </React.Fragment>
            );
          })}
        </div>

        {/* Screen-space agent labels */}
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
              <div style={{fontFamily:"monospace",fontSize:8,fontWeight:"bold",
                color:sc.glow,letterSpacing:2,
                textShadow:`0 0 12px ${sc.glow}, 0 0 4px ${sc.glow}`,
                background:"rgba(2,8,16,0.82)",
                padding:"3px 8px",borderRadius:3,
                border:`1px solid ${sc.glow}55`}}>
                {agent.label}
              </div>
              <div style={{fontFamily:"monospace",fontSize:6.5,color:sc.glow,
                opacity:0.65,marginTop:2}}>
                {agent.role}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer status bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"7px 18px",
        background:"linear-gradient(to right,#020810,#030c18,#020810)",
        borderTop:"1px solid rgba(34,211,238,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          {Object.values(AGENTS).map(a=>{
            const sc=SC[a.state];
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",
                  background:blink?sc.glow:"#061018",
                  boxShadow:blink?`0 0 8px ${sc.glow}`:"none",
                  transition:"all 0.3s"}} />
                <span style={{fontFamily:"monospace",fontSize:8,color:sc.glow,
                  letterSpacing:1,textShadow:`0 0 8px ${sc.glow}88`}}>
                  {a.label}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:"monospace",fontSize:8,color:"#34d399",letterSpacing:1,
            textShadow:"0 0 8px #34d399"}}>● LIVE</span>
          <span style={{fontFamily:"monospace",fontSize:8,color:"rgba(34,211,238,0.3)"}}>
            {clock.toLocaleTimeString("en-US",{hour12:false})}
          </span>
        </div>
      </div>
    </div>
  );
}
