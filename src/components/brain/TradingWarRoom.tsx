"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./TradingWarRoom.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Candle = { o: number; c: number; h: number; l: number };
type Level  = { price: number; qty: number };
type LedState = "green" | "amber" | "red" | "off";
type WS = {
  id: string; label: string; sub: string;
  baseStatus: "ok" | "warn" | "alert";
  candles: Candle[]; bids: Level[]; asks: Level[];
  signal: number; // –100..100
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rnd    = (a: number, b: number) => a + Math.random() * (b - a);
const rndInt = (a: number, b: number) => Math.floor(rnd(a, b));

function mkCandle(prev?: Candle): Candle {
  const o = prev ? prev.c : rnd(95, 105);
  const c = Math.max(10, o + rnd(-2.5, 2.5));
  return { o, c, h: Math.max(o, c) + rnd(0, 1.2), l: Math.min(o, c) - rnd(0, 1.2) };
}
function mkCandles(n = 20): Candle[] {
  const a: Candle[] = [];
  for (let i = 0; i < n; i++) a.push(mkCandle(a[i - 1]));
  return a;
}
function mkBook(mid: number) {
  return {
    bids: Array.from({ length: 8 }, (_, i) => ({ price: mid - (i + 1) * 0.25, qty: rndInt(20, 600) })),
    asks: Array.from({ length: 8 }, (_, i) => ({ price: mid + (i + 1) * 0.25, qty: rndInt(20, 600) })),
  };
}

// ─── Static config ────────────────────────────────────────────────────────────
const TICKER_SYMBOLS = [
  "AAPL▲2.14%", "BTC▼1.52%", "ETH▲3.21%", "EURUSD▲0.83%", "NVDA▼0.74%",
  "SPY▼0.31%",  "TSLA▼2.14%","GOLD▲0.54%","NQ▲1.22%",    "CL▼2.41%",
  "MSFT▲1.05%", "VIX▲8.12%", "SOL▲5.34%", "DXY▼0.22%",   "GBPUSD▲0.12%",
  "AMD▲4.21%",  "QQQ▲0.88%", "IWM▼1.14%", "USDJPY▼0.34%","ZB▲0.12%",
];

const WS_CFG: Array<Pick<WS, "id"|"label"|"sub"|"baseStatus">> = [
  { id:"trend", label:"TREND",  sub:"Trend Engine",   baseStatus:"warn"  },
  { id:"pract", label:"PR.ACT", sub:"Price Action",   baseStatus:"ok"    },
  { id:"news",  label:"NEWS",   sub:"Sentiment NLP",  baseStatus:"ok"    },
  { id:"risk",  label:"RISK",   sub:"Risk Monitor",   baseStatus:"alert" },
  { id:"exec",  label:"EXEC",   sub:"Execution Eng",  baseStatus:"ok"    },
  { id:"cntr",  label:"CNTR",   sub:"Contrarian",     baseStatus:"ok"    },
  { id:"quant", label:"QUANT",  sub:"Quant Models",   baseStatus:"warn"  },
  { id:"flow",  label:"FLOW",   sub:"Order Flow",     baseStatus:"ok"    },
  { id:"arbi",  label:"ARBI",   sub:"Arbitrage",      baseStatus:"ok"    },
  { id:"delta", label:"DELTA",  sub:"Delta Hedge",    baseStatus:"warn"  },
  { id:"gamma", label:"GAMMA",  sub:"Gamma Exp",      baseStatus:"ok"    },
  { id:"algo",  label:"ALGO",   sub:"Algo Signal",    baseStatus:"ok"    },
];

const HEAT_LABELS = [
  "AAPL","MSFT","NVDA","AMZN","META","GOOG","TSLA","BRK",
  "JPM","V","JNJ","WMT","MA","PG","HD","BAC",
  "XOM","CVX","ABBV","MRK","KO","PEP","PFE","AVGO",
];

const DRAWER_MAP: Record<string, string> = {
  trend:"trend", pract:"smc", news:"news",
  risk:"risk",   exec:"execution", cntr:"contrarian",
  quant:"quant", flow:"flow",  arbi:"arbi",
  delta:"delta", gamma:"gamma", algo:"algo",
};

const CMD_BARS = [
  { label:"BULL",  col:"#00ff41" },
  { label:"BEAR",  col:"#ff0040" },
  { label:"EDGE",  col:"#ffaa00" },
  { label:"RISK",  col:"#ff6020" },
  { label:"CONF",  col:"#00ccff" },
  { label:"VOL",   col:"#cc00ff" },
];

function initWS(): WS[] {
  return WS_CFG.map(cfg => {
    const candles = mkCandles(20);
    const { bids, asks } = mkBook(candles[candles.length - 1].c);
    return { ...cfg, candles, bids, asks, signal: rnd(-80, 80) };
  });
}

function initLights(n: number): LedState[] {
  const opts: LedState[] = ["green","green","green","green","amber","red","off"];
  return Array.from({ length: n }, () => opts[rndInt(0, opts.length)]);
}

function mkExecLine(): string {
  const syms  = ["AAPL","BTC","NQ","SPY","ETH","NVDA","TSLA","SOL","XOM","JPM"];
  const sides = ["BUY ","SELL"];
  const stati = ["  OK","FILL","PART"," [!]"];
  const now   = new Date();
  const ts    = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => n.toString().padStart(2,"0")).join(":")
    + "." + now.getMilliseconds().toString().padStart(3,"0");
  return `${ts}  ${sides[rndInt(0,2)]} ${syms[rndInt(0,syms.length)].padEnd(4)} x${rndInt(1,500).toString().padStart(3)} @${rnd(10,500).toFixed(2).padStart(7)}  ${stati[rndInt(0,4)]}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CandleChart({ candles, w = 68, h = 24 }: { candles: Candle[]; w?: number; h?: number }) {
  const shown = candles.slice(-14);
  const maxH  = Math.max(...shown.map(c => c.h));
  const minL  = Math.min(...shown.map(c => c.l));
  const rng   = maxH - minL || 1;
  const sc    = (v: number) => ((v - minL) / rng) * h;
  const cw    = Math.max(2, Math.floor((w - shown.length) / shown.length));

  return (
    <div style={{ width: w, height: h, position:"relative", overflow:"hidden", display:"flex", alignItems:"flex-end", gap:1, flexShrink:0 }}>
      {shown.map((c, i) => {
        const bull   = c.c >= c.o;
        const col    = bull ? "#00ff41" : "#ff0040";
        const bodyBot = sc(Math.min(c.o, c.c));
        const bodyH  = Math.max(1, Math.abs(sc(c.c) - sc(c.o)));
        return (
          <div key={i} style={{ position:"relative", width:cw, height:h, flexShrink:0 }}>
            <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", width:1, top:h-sc(c.h), bottom:sc(c.l), background:col, opacity:0.5 }} />
            <div style={{ position:"absolute", left:0, right:0, bottom:bodyBot, height:bodyH, background:col }} />
          </div>
        );
      })}
    </div>
  );
}

function SignalBar({ signal }: { signal: number }) {
  const col  = signal >= 0 ? "#00ff41" : "#ff0040";
  const from = signal >= 0 ? "50%" : `${(signal + 100) / 2}%`;
  const wPct = `${Math.abs(signal) / 2}%`;
  return (
    <div style={{ height:3, background:"#0a0a14", border:"1px solid #1a1a2e", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", left:from, width:wPct, height:"100%", background:col, opacity:0.85 }} />
      <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:"#282840" }} />
    </div>
  );
}

function MiniBook({ bids, asks }: { bids: Level[]; asks: Level[] }) {
  const maxQ  = Math.max(...bids.map(b => b.qty), ...asks.map(a => a.qty));
  const show  = 4;
  const rowSt = (col: string): CSSProperties => ({
    display:"flex", justifyContent:"space-between", color:col,
    position:"relative", overflow:"hidden", lineHeight:"1.5",
  });
  const barSt = (pct: number, col: string): CSSProperties => ({
    position:"absolute", right:0, top:0, bottom:0,
    width:`${pct}%`, background:col,
  });
  return (
    <div style={{ fontSize:5, fontFamily:"monospace" }}>
      {asks.slice(0,show).reverse().map((a,i) => (
        <div key={i} style={rowSt("#ff0040")}>
          <div style={barSt((a.qty/maxQ)*100, "rgba(255,0,64,0.12)")} />
          <span>{a.price.toFixed(2)}</span><span>{a.qty}</span>
        </div>
      ))}
      <div style={{ height:1, background:"#1e1e34", margin:"1px 0" }} />
      {bids.slice(0,show).map((b,i) => (
        <div key={i} style={rowSt("#00ff41")}>
          <div style={barSt((b.qty/maxQ)*100, "rgba(0,255,65,0.10)")} />
          <span>{b.price.toFixed(2)}</span><span>{b.qty}</span>
        </div>
      ))}
    </div>
  );
}

function WorkStation({ ws, hasAlert, onClick, selected }: {
  ws: WS; hasAlert: boolean; onClick: () => void; selected: boolean;
}) {
  const last  = ws.candles[ws.candles.length - 1];
  const bull  = last.c >= last.o;
  const dotCls = hasAlert ? styles.statusDotAlert : ws.baseStatus === "warn" ? styles.statusDotWarn : styles.statusDotOk;
  const borderCls = selected ? styles.wsSelected : hasAlert ? styles.wsAlert : ws.baseStatus === "warn" ? styles.wsWarn : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={borderCls}
      style={{
        background: selected ? "rgba(0,255,65,0.03)" : "#050508",
        border:"1px solid #1a1a2e",
        padding:"4px 5px",
        cursor:"pointer",
        color:"inherit",
        textAlign:"left",
        position:"relative",
        overflow:"hidden",
        transition:"border-color 120ms",
        flexShrink:0,
      }}
    >
      <div className={styles.scanline} />

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2, position:"relative", zIndex:1 }}>
        <span style={{ fontSize:6.5, fontWeight:700, letterSpacing:"0.1em", color: hasAlert?"#ff0040": ws.baseStatus==="warn"?"#ffaa00":"#00ff41" }}>
          {ws.label}
        </span>
        <div style={{ display:"flex", gap:2, alignItems:"center" }}>
          {hasAlert && <span className={styles.alertBang} style={{ fontSize:6, fontWeight:800 }}>!</span>}
          <div className={dotCls} style={{ width:4, height:4, flexShrink:0 }} />
        </div>
      </div>

      {/* Candle chart */}
      <div style={{ position:"relative", zIndex:1 }}>
        <CandleChart candles={ws.candles} w={68} h={22} />
      </div>

      {/* Price row */}
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:1, position:"relative", zIndex:1 }}>
        <span style={{ fontSize:5.5, fontWeight:700, color: bull?"#00ff41":"#ff0040" }}>
          {last.c.toFixed(2)}
        </span>
        <span style={{ fontSize:4.5, color: bull?"#007a20":"#7a0020" }}>
          {bull?"▲":"▼"}{Math.abs(last.c - last.o).toFixed(2)}
        </span>
      </div>

      {/* Signal bar */}
      <div style={{ marginTop:1, position:"relative", zIndex:1 }}>
        <SignalBar signal={ws.signal} />
      </div>

      {/* Order book */}
      <div style={{ marginTop:2, position:"relative", zIndex:1 }}>
        <MiniBook bids={ws.bids} asks={ws.asks} />
      </div>

      {/* Sub label */}
      <div style={{ fontSize:4, color:"#30304a", marginTop:2, letterSpacing:"0.04em", position:"relative", zIndex:1 }}>
        {ws.sub}
      </div>
    </button>
  );
}

function TickerBand({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ height:18, background:"#030305", borderTop:"1px solid #141428", borderBottom:"1px solid #141428", overflow:"hidden", position:"relative" }}>
      <div className={reverse ? styles.tickerReverse : styles.tickerScroll}
        style={{ display:"flex", whiteSpace:"nowrap", position:"absolute", top:0, left:0 }}>
        {doubled.map((t, i) => (
          <span key={i} style={{
            display:"inline-block", padding:"0 10px",
            fontSize:7, fontFamily:"monospace", lineHeight:"18px", letterSpacing:"0.06em",
            color: t.includes("▲") ? "#00aa2a" : "#aa0020",
          }}>
            {t} <span style={{ color:"#1a1a30" }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ServerRack({ lights }: { lights: LedState[] }) {
  const ledCls: Record<LedState, string> = {
    green: styles.ledGreen,
    amber: styles.ledAmber,
    red:   styles.ledRed,
    off:   styles.ledOff,
  };
  return (
    <div style={{ width:46, background:"#030305", border:"1px solid #141428", padding:"3px 4px", display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
      <div style={{ fontSize:4, color:"#1a1a30", letterSpacing:"0.05em", marginBottom:1 }}>SRV-RACK</div>
      {lights.map((l, i) => (
        <div key={i} style={{ height:7, background:"#07070e", border:"1px solid #111120", display:"flex", alignItems:"center", paddingLeft:3, gap:3 }}>
          <div className={ledCls[l]} style={{ width:3, height:3, flexShrink:0 }} />
          <div style={{ flex:1, height:1, background:"#0f0f20", opacity:0.6 }} />
          <div style={{ width:7, height:3, background:"#0d0d1a", border:"1px solid #1a1a28", flexShrink:0, marginRight:2 }} />
        </div>
      ))}
    </div>
  );
}

function HeatCell({ value }: { value: number }) {
  const bull  = value >= 0;
  const alpha = 0.06 + (Math.abs(value) / 100) * 0.58;
  return (
    <div style={{
      height:10,
      background: bull ? `rgba(0,255,65,${alpha})` : `rgba(255,0,64,${alpha})`,
      border: `1px solid ${bull ? "rgba(0,255,65,0.08)" : "rgba(255,0,64,0.08)"}`,
      transition:"background 280ms",
    }} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TradingWarRoom({ onAgentClick }: { onAgentClick?: (id: string) => void }) {
  const [workstations, setWorkstations] = useState<WS[]>([]);
  const [heatmap,      setHeatmap]      = useState<number[]>([]);
  const [lights,       setLights]       = useState<LedState[]>([]);
  const [alerts,       setAlerts]       = useState<Set<string>>(new Set());
  const [execLog,      setExecLog]      = useState<string[]>([]);
  const [cmdBars,      setCmdBars]      = useState<number[]>([]);
  const [selectedId,   setSelectedId]   = useState("risk");
  const [mounted,      setMounted]      = useState(false);

  // Client-only initialization (avoids SSR hydration mismatch)
  useEffect(() => {
    setWorkstations(initWS());
    setHeatmap(Array.from({ length: 192 }, () => rnd(-100, 100)));
    setLights(initLights(16));
    setAlerts(new Set(["risk"]));
    setCmdBars(CMD_BARS.map(() => rnd(20, 90)));
    setExecLog([
      `${new Date().toTimeString().slice(0,8)}.000  BUY  AAPL x200  @189.43   OK`,
      `${new Date().toTimeString().slice(0,8)}.000  SELL TSLA x50   @248.50   OK`,
      `${new Date().toTimeString().slice(0,8)}.000  BUY  NQ   x5    @16842  FILL`,
      `${new Date().toTimeString().slice(0,8)}.000  RISK GATE TRIGGERED       [!]`,
      `${new Date().toTimeString().slice(0,8)}.000  BUY  ETH  x2    @2340     OK`,
    ]);
    setMounted(true);
  }, []);

  // Market chaos engine
  useEffect(() => {
    if (!mounted) return;
    const iv = setInterval(() => {
      // Update workstation candles + books
      setWorkstations(prev => prev.map(ws => {
        const c = mkCandle(ws.candles[ws.candles.length - 1]);
        const { bids, asks } = mkBook(c.c);
        return { ...ws, candles:[...ws.candles.slice(-19), c], bids, asks, signal: Math.max(-100, Math.min(100, ws.signal + rnd(-12,12))) };
      }));

      // Partial heatmap updates
      setHeatmap(prev => {
        const next = [...prev];
        const count = rndInt(4, 14);
        for (let i = 0; i < count; i++) {
          const idx = rndInt(0, next.length);
          next[idx] = Math.max(-100, Math.min(100, next[idx] + rnd(-40, 40)));
        }
        return next;
      });

      // Random alert toggle
      if (Math.random() < 0.07) {
        setAlerts(prev => {
          const id = WS_CFG[rndInt(0, WS_CFG.length)].id;
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
      }

      // Flicker a server light
      if (Math.random() < 0.28) {
        setLights(prev => {
          const next = [...prev];
          const i = rndInt(0, next.length);
          const opts: LedState[] = ["green","green","green","amber","red","off"];
          next[i] = opts[rndInt(0, opts.length)];
          return next;
        });
      }

      // Command bar flicker
      setCmdBars(prev => prev.map(v => Math.max(5, Math.min(98, v + rnd(-8, 8)))));

      // Exec log entry
      if (Math.random() < 0.45) {
        setExecLog(prev => [mkExecLine(), ...prev.slice(0, 9)]);
      }
    }, 380);
    return () => clearInterval(iv);
  }, [mounted]);

  const handleClick = (id: string) => {
    setSelectedId(id);
    onAgentClick?.(DRAWER_MAP[id] ?? id);
  };

  // Split workstations: risk + exec go to command tier, rest to grid
  const riskWS   = workstations.find(w => w.id === "risk");
  const execWS   = workstations.find(w => w.id === "exec");
  const gridWS   = workstations.filter(w => w.id !== "risk" && w.id !== "exec");

  return (
    <div style={{ background:"#0a0a0c", fontFamily:"'JetBrains Mono','Fira Code','Courier New',monospace", color:"#b0c4b1", position:"relative", overflow:"hidden" }}>
      <div className={styles.gridOverlay} />

      {/* ── Top ticker ──────────────────────────────────────────────── */}
      <TickerBand items={TICKER_SYMBOLS} />

      <div style={{ padding:"5px 6px", display:"flex", flexDirection:"column", gap:5 }}>

        {/* ── TIER 1: Command Row ───────────────────────────────────── */}
        <div style={{ display:"flex", gap:5, alignItems:"stretch" }}>

          {/* Risk pod */}
          {riskWS && (
            <WorkStation ws={riskWS} hasAlert={alerts.has("risk")} onClick={() => handleClick("risk")} selected={selectedId==="risk"} />
          )}

          {/* Command banner */}
          <div style={{ flex:1, background:"#050508", border:"1px solid #141428", padding:"4px 8px", position:"relative", overflow:"hidden" }}>
            <div className={styles.scanline} />
            <div style={{ fontSize:5.5, letterSpacing:"0.22em", color:"#1e1e38", marginBottom:4, position:"relative", zIndex:1 }}>
              TRDX://WAR-ROOM · COMMAND DECK
            </div>

            {/* Market bars */}
            <div style={{ display:"flex", gap:4, position:"relative", zIndex:1 }}>
              {CMD_BARS.map((cfg, i) => (
                <div key={cfg.label} style={{ flex:1 }}>
                  <div style={{ fontSize:4, color:"#282848", marginBottom:1 }}>{cfg.label}</div>
                  <div style={{ height:5, background:"#0a0a14", border:"1px solid #141428" }}>
                    <div style={{ height:"100%", width:`${cmdBars[i] ?? 50}%`, background:cfg.col, transition:"width 300ms" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Mini ticker strip */}
            <div style={{ marginTop:4, display:"flex", flexWrap:"wrap", gap:"0 8px", position:"relative", zIndex:1 }}>
              {TICKER_SYMBOLS.slice(0,10).map(t => (
                <span key={t} style={{ fontSize:4.5, fontFamily:"monospace", color: t.includes("▲")?"#006620":"#660020", letterSpacing:"0.04em" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Exec pod */}
          {execWS && (
            <WorkStation ws={execWS} hasAlert={alerts.has("exec")} onClick={() => handleClick("exec")} selected={selectedId==="exec"} />
          )}
        </div>

        {/* ── TIER 2: Workstation Grid ──────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(72px, 1fr))", gap:4 }}>
          {gridWS.map(ws => (
            <WorkStation
              key={ws.id}
              ws={ws}
              hasAlert={alerts.has(ws.id)}
              onClick={() => handleClick(ws.id)}
              selected={selectedId === ws.id}
            />
          ))}
        </div>

        {/* ── TIER 3: Server Racks + Trading Pit ───────────────────── */}
        <div style={{ display:"flex", gap:5, alignItems:"flex-start" }}>

          {/* Left rack */}
          <ServerRack lights={lights.slice(0, 16)} />

          {/* Trading Pit */}
          <div style={{ flex:1, background:"#050508", border:"1px solid #141428", padding:"4px 6px", overflow:"hidden" }}>
            <div style={{ fontSize:5, letterSpacing:"0.2em", color:"#1e1e38", marginBottom:3 }}>
              THE PIT · LIVE MARKET HEATMAP
            </div>

            {/* Heatmap — 24 cols × 8 rows */}
            {heatmap.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(24, 1fr)", gap:1, marginBottom:2 }}>
                {heatmap.map((v, i) => <HeatCell key={i} value={v} />)}
              </div>
            )}

            {/* Column labels */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(24, 1fr)", gap:1, marginBottom:4 }}>
              {HEAT_LABELS.map((l, i) => (
                <div key={i} style={{ fontSize:3.5, color:"#1e1e36", textAlign:"center", overflow:"hidden", lineHeight:1 }}>{l}</div>
              ))}
            </div>

            {/* Execution log */}
            <div style={{ borderTop:"1px solid #141428", paddingTop:3 }}>
              <div style={{ fontSize:4.5, letterSpacing:"0.14em", color:"#1e1e38", marginBottom:2 }}>EXEC · LIVE LOG</div>
              {execLog.map((line, i) => (
                <div key={i} style={{
                  fontSize:5,
                  fontFamily:"monospace",
                  color: line.includes("[!]") ? "#cc0030" : line.includes("FILL") ? "#aa7700" : "#303050",
                  marginBottom:1,
                  opacity: Math.max(0.25, 1 - i * 0.08),
                  letterSpacing:"0.02em",
                }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Right rack */}
          <ServerRack lights={[...lights].reverse().slice(0, 16)} />
        </div>

      </div>

      {/* ── Bottom ticker ────────────────────────────────────────────── */}
      <TickerBand items={[...TICKER_SYMBOLS].reverse()} reverse />
    </div>
  );
}
