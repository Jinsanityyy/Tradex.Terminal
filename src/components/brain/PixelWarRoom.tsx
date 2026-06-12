"use client";

import type { CSSProperties } from "react";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import styles from "./PixelWarRoom.module.css";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuotes } from "@/hooks/useMarketData";
import type { AgentRunResult, DirectionalBias, RiskGrade, SignalState } from "@/lib/agents/schemas";
import type { AssetSnapshot } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type OperatorLook = {
  skin: string;
  hairStyle: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  shoesColor: string;
  seatFrame: 0 | 1 | 2 | 3;
  scale?: number;
  bodyType?: "Androgynous" | "Man" | "Woman";
};

type AgentStatus = "TRADE-OK" | "NO-TRADE" | "ALERT";
type SignalDir = "L" | "S" | "—";
type LogTone = "ok" | "warn" | "alert" | "dim";

type AgentDef = {
  id: string;
  label: string;
  role?: string;
  detail?: string;
  look: OperatorLook;
  baseStatus: AgentStatus;
  drawerId: string;
  real: boolean;
};

type AgentLiveState = {
  status: AgentStatus;
  confidence: number;
  signal: SignalDir;
  bars: number[];
};

type MasterState = {
  bias: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number;
  edgeScore: number;
  drawdown: number;
  agreeing: number;
};

type HeatCell = 0 | 1 | 2 | 3 | 4;
type LogLine = { time: string; text: string; tone: LogTone };

// ─── Agent definitions ────────────────────────────────────────────────────────

const AGENTS_ROW_A: AgentDef[] = [
  {
    id: "risk", label: "RISK", drawerId: "risk", baseStatus: "ALERT", real: true,
    role: "Guard Rail",
    detail: "Protect position size until conflicting desks settle down.",
    look: { skin: "Copper", hairStyle: "Swoop", hairColor: "Black", shirtColor: "Maroon", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "trend", label: "TREND", drawerId: "trend", baseStatus: "NO-TRADE", real: true,
    role: "Macro Scout",
    detail: "Higher-timeframe structure is aligned with the active swing.",
    look: { skin: "Ivory", hairStyle: "Parted Short", hairColor: "Brown", shirtColor: "Forest", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "pract", label: "PR.ACT", drawerId: "smc", baseStatus: "TRADE-OK", real: true,
    role: "Tape Reader",
    detail: "Micro trigger is still dirty. Wait for a cleaner reaction.",
    look: { skin: "Gold", hairStyle: "Messy", hairColor: "Black", shirtColor: "Gray", pantsColor: "Black", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "news", label: "NEWS", drawerId: "news", baseStatus: "TRADE-OK", real: true,
    role: "Catalyst Watch",
    detail: "Headline flow is stable and no fresh surprise is in play.",
    look: { skin: "Dove", hairStyle: "Plain", hairColor: "White", shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "quant", label: "", drawerId: "trend", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Comet", hairStyle: "Loose", hairColor: "Blonde", shirtColor: "Lavender", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, bodyType: "Woman" },
  },
  {
    id: "exec", label: "EXEC", drawerId: "execution", baseStatus: "TRADE-OK", real: true,
    role: "Entry Pilot",
    detail: "Wait until the trigger desk confirms the entry lane.",
    look: { skin: "Coffee", hairStyle: "Buzzcut", hairColor: "Black", shirtColor: "Navy", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
];

const AGENTS_ROW_B: AgentDef[] = [
  {
    id: "flow", label: "", drawerId: "execution", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Green", hairStyle: "Mohawk", hairColor: "Orange", shirtColor: "Orange", pantsColor: "Black", shoesColor: "Black", seatFrame: 2, bodyType: "Man" },
  },
  {
    id: "cntr", label: "CNTR", drawerId: "contrarian", baseStatus: "TRADE-OK", real: true,
    role: "Contrarian Desk",
    detail: "Crowding risk is low enough for a controlled fade if needed.",
    look: { skin: "Sienna", hairStyle: "Curly Short", hairColor: "Chestnut", shirtColor: "Purple", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "arbi", label: "", drawerId: "smc", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Gray", hairStyle: "Curly Short", hairColor: "Platinum", shirtColor: "Sky", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2, bodyType: "Woman" },
  },
  {
    id: "algo", label: "", drawerId: "trend", baseStatus: "TRADE-OK", real: false,
    look: { skin: "Comet", hairStyle: "Buzzcut", hairColor: "Red", shirtColor: "Leather", pantsColor: "Black", shoesColor: "Black", seatFrame: 2, bodyType: "Man" },
  },
  {
    id: "delta", label: "", drawerId: "risk", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Green", hairStyle: "Loose", hairColor: "Brown", shirtColor: "Pink", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, bodyType: "Woman" },
  },
  {
    id: "sent", label: "", drawerId: "news", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Gray", hairStyle: "Mohawk", hairColor: "White", shirtColor: "Walnut", pantsColor: "Black", shoesColor: "Black", seatFrame: 2, bodyType: "Man" },
  },
];

const ALL_AGENTS = [...AGENTS_ROW_A, ...AGENTS_ROW_B];
const REAL_AGENTS = ALL_AGENTS.filter(a => a.real);

const MASTER_LOOK: OperatorLook = {
  skin: "Ivory", hairStyle: "Loose", hairColor: "Chestnut",
  shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black",
  seatFrame: 2,
};

// ─── Ticker ───────────────────────────────────────────────────────────────────

const FALLBACK_TICKER =
  "EURUSD — · GBPUSD — · USDJPY — · XAUUSD — · BTCUSD — · ETHUSD — · USOIL — · ";

function buildTicker(quotes: AssetSnapshot[]): string {
  if (!quotes.length) return FALLBACK_TICKER;
  return (
    quotes.map(q => {
      const dir = q.changePercent > 0 ? "▲" : q.changePercent < 0 ? "▼" : "·";
      const p = q.price;
      const fmt = p < 10 ? p.toFixed(5) : p < 1000 ? p.toFixed(3) : Math.round(p).toString();
      return `${q.symbol} ${fmt} ${dir}`;
    }).join(" · ") + " · "
  );
}

// ─── Sprite helpers ───────────────────────────────────────────────────────────

function enc(p: string) { return encodeURI(p); }
function baseUrl(skin: string, bodyType = "Androgynous") {
  return enc(`/lpc-sitting-kit/Bases/${bodyType}/Recolors/${skin}/Sitting - Chair.png`);
}
function clothesUrl(item: "Longsleeved Shirt" | "Pants" | "Shoes", color: string, bodyType = "Androgynous") {
  return enc(`/lpc-sitting-kit/Clothes/${bodyType}/Recolors/${color}/${item} - Sitting (Chair).png`);
}
function hairUrl(style: string, color: string) {
  return enc(`/lpc-sitting-kit/Hair/${style}/Recolors/${color}/Sitting (Chair).png`);
}
function layerStyle(url: string, frame: number, scale = 1): CSSProperties {
  return {
    "--seat-image": `url("${url}")`,
    "--seat-width": `${64 * scale}px`,
    "--seat-height": `${64 * scale}px`,
    "--seat-sheet-width": `${64 * scale}px`,
    "--seat-sheet-height": `${256 * scale}px`,
    "--seat-frame-y": `${-64 * frame * scale}px`,
  } as CSSProperties;
}

function SeatedOperator({ look, className }: { look: OperatorLook; className?: string }) {
  const scale = look.scale ?? 1;
  const bt = look.bodyType ?? "Androgynous";
  const layers = [
    baseUrl(look.skin, bt),
    clothesUrl("Shoes", look.shoesColor, bt),
    clothesUrl("Pants", look.pantsColor, bt),
    clothesUrl("Longsleeved Shirt", look.shirtColor, bt),
    hairUrl(look.hairStyle, look.hairColor),
  ];
  return (
    <div
      className={`${styles.seatedActor} ${className ?? ""}`}
      style={{ "--seat-actor-width": `${64 * scale}px`, "--seat-actor-height": `${64 * scale}px` } as CSSProperties}
      aria-hidden="true"
    >
      {layers.map((url, i) => (
        <span key={i} className={styles.seatedLayer} style={layerStyle(url, look.seatFrame, scale)} />
      ))}
    </div>
  );
}

// ─── Wall clocks ──────────────────────────────────────────────────────────────

function clockFor(tz: string, now: Date): string {
  try {
    return now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  } catch {
    return "--:--";
  }
}

// ─── Pixel world map (GLOBAL OVERLAYS) ────────────────────────────────────────
// Coarse 40×14 land bitmask rendered as 1×1 SVG rects — stylized, crisp pixels.

const WORLD_MAP = [
  "                                        ",
  "  ## ####         ######  ########  #   ",
  " ##########      #####################  ",
  "  ########        ###################   ",
  "   ######          ######  #########    ",
  "    ####           ######   ### ###     ",
  "     ##    #      #######     # ##      ",
  "          ###    ########    ###        ",
  "         #####   ########     #         ",
  "         ######   #######        ##     ",
  "          #####    #####         ####   ",
  "           ###      ###          ####   ",
  "           ##        #            ##    ",
  "                                        ",
];

const MAP_CITIES = [
  { id: "NYC", col: 9,  row: 4, session: "New York" },
  { id: "LDN", col: 20, row: 3, session: "London" },
  { id: "MNL", col: 33, row: 6, session: "Asia" },
] as const;

function PixelWorldMap({ activeSession }: { activeSession: string }) {
  return (
    <svg
      viewBox="0 0 40 14"
      className={styles.worldMap}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {WORLD_MAP.flatMap((rowStr, y) =>
        rowStr.split("").map((ch, x) =>
          ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} className={styles.mapLand} /> : null
        )
      )}
      {MAP_CITIES.map(c => {
        const active = c.session === activeSession;
        return (
          <g key={c.id}>
            {active && <circle cx={c.col + 0.5} cy={c.row + 0.5} r={1.6} className={styles.mapPing} />}
            <rect
              x={c.col} y={c.row} width={1} height={1}
              className={active ? styles.mapCityActive : styles.mapCity}
            />
          </g>
        );
      })}
    </svg>
  );
}

const USER_LOOK: OperatorLook = {
  skin: "Ivory", hairStyle: "Messy", hairColor: "Chestnut",
  shirtColor: "Navy", pantsColor: "Black", shoesColor: "Black",
  seatFrame: 2,
};

// ─── Per-agent overview ───────────────────────────────────────────────────────

type AgentOverview = { label: string; role: string; state: string; detail: string; confidence: number; tone: "ok"|"warn"|"bad"|"dim" };

function getAgentOverview(id: string, runData: AgentRunResult | undefined): AgentOverview | null {
  if (!runData) return null;
  const ag = runData.agents;
  const fmt = (s: string | undefined) => (s ?? "NEUTRAL").replace(/[-_]/g, " ").toUpperCase();
  const biasTone = (b: string | undefined): AgentOverview["tone"] =>
    b === "bullish" || b === "valid" ? "ok" : b === "bearish" || b === "blocked" ? "bad" : b === "no-trade" ? "warn" : "dim";
  switch (id) {
    case "risk":  return { label: "RISK",   role: "GUARD RAIL",     state: ag.risk.valid ? "VALID" : "BLOCKED",              detail: ag.risk.reasons?.[0] ?? "—",                                          confidence: gradeToConf(ag.risk.grade),                        tone: ag.risk.valid ? "ok" : "bad" };
    case "trend": return { label: "TREND",  role: "MACRO SCOUT",    state: fmt(ag.trend.bias),                                detail: ag.trend.reasons?.[0] ?? ag.trend.marketPhase ?? "—",                 confidence: ag.trend.confidence,                               tone: biasTone(ag.trend.bias) };
    case "pract": return { label: "PR.ACT", role: "TAPE READER",    state: fmt(ag.smc.bias),                                  detail: ag.smc.reasons?.[0] ?? ag.smc.setupType ?? "—",                       confidence: ag.smc.confidence,                                 tone: biasTone(ag.smc.bias) };
    case "news":  return { label: "NEWS",   role: "CATALYST WATCH", state: fmt(ag.news.impact),                               detail: ag.news.dominantCatalyst ?? ag.news.reasons?.[0] ?? "—",              confidence: ag.news.confidence,                                tone: biasTone(ag.news.impact) };
    case "exec":  return { label: "EXEC",   role: "ENTRY PILOT",    state: ag.execution.signalState,                          detail: ag.execution.signalStateReason ?? ag.execution.triggerCondition ?? "—", confidence: Math.min(95, ag.execution.confluenceCount * 10), tone: ag.execution.direction === "long" ? "ok" : ag.execution.direction === "short" ? "bad" : "warn" };
    case "cntr":  return { label: "CNTR",   role: "CONTRARIAN",     state: ag.contrarian.challengesBias ? "ALERT" : "CLEAR",  detail: ag.contrarian.alternativeScenario ?? ag.contrarian.failureReasons?.[0] ?? "—", confidence: ag.contrarian.trapConfidence, tone: ag.contrarian.challengesBias ? "bad" : "dim" };
    default: return null;
  }
}

// ─── Real-data mappers ────────────────────────────────────────────────────────

const swrFetch = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); });

function biasToSignal(b: DirectionalBias | undefined): SignalDir {
  return b === "bullish" ? "L" : b === "bearish" ? "S" : "—";
}
function biasToStatus(b: DirectionalBias | undefined, conf: number): AgentStatus {
  if (!b || b === "neutral") return "NO-TRADE";
  return conf < 40 ? "ALERT" : "TRADE-OK";
}
function gradeToConf(g: RiskGrade | undefined): number {
  return g ? ({ A: 88, B: 72, C: 55, D: 38, F: 20 } as Record<RiskGrade, number>)[g] : 50;
}
function execSignalToStatus(s: SignalState): AgentStatus {
  if (s === "ARMED") return "TRADE-OK";
  if (s === "NO_TRADE" || s === "EXPIRED") return "NO-TRADE";
  return "ALERT";
}

function mapRunToStates(data: AgentRunResult, rndFn: (lo: number, hi: number) => number): Record<string, AgentLiveState> {
  const { agents: ag } = data;
  const mkBars = (c: number) => Array.from({ length: 5 }, () => Math.max(1, Math.min(8, Math.round((c / 100) * 8 + rndFn(-1, 1)))));
  const riskConf = gradeToConf(ag.risk.grade);
  const execConf = Math.min(95, ag.execution.confluenceCount * 10);
  return {
    risk:  { status: ag.risk.valid ? "TRADE-OK" : "ALERT", confidence: riskConf, signal: ag.risk.valid ? "—" : "S", bars: mkBars(riskConf) },
    trend: { status: biasToStatus(ag.trend.bias, ag.trend.confidence), confidence: ag.trend.confidence, signal: biasToSignal(ag.trend.bias), bars: mkBars(ag.trend.confidence) },
    pract: { status: ag.smc.setupPresent ? biasToStatus(ag.smc.bias, ag.smc.confidence) : "NO-TRADE", confidence: ag.smc.confidence, signal: biasToSignal(ag.smc.bias), bars: mkBars(ag.smc.confidence) },
    news:  { status: ag.news.riskScore > 70 ? "ALERT" : biasToStatus(ag.news.impact, ag.news.confidence), confidence: ag.news.confidence, signal: biasToSignal(ag.news.impact), bars: mkBars(ag.news.confidence) },
    exec:  { status: execSignalToStatus(ag.execution.signalState), confidence: execConf, signal: ag.execution.direction === "long" ? "L" : ag.execution.direction === "short" ? "S" : "—", bars: mkBars(execConf) },
    cntr:  { status: ag.contrarian.challengesBias ? "ALERT" : "NO-TRADE", confidence: ag.contrarian.trapConfidence, signal: ag.contrarian.challengesBias ? (ag.trend.bias === "bullish" ? "S" : "L") : "—", bars: mkBars(ag.contrarian.trapConfidence) },
  };
}

function mapRunToMaster(data: AgentRunResult): MasterState {
  const m = data.agents.master;
  const bias: MasterState["bias"] = m.finalBias === "bullish" ? "LONG" : m.finalBias === "bearish" ? "SHORT" : "NEUTRAL";
  const agreeing = m.agentConsensus.filter(a => bias === "LONG" ? a.weightedScore > 0 : bias === "SHORT" ? a.weightedScore < 0 : Math.abs(a.weightedScore) < 20).length;
  return { bias, confidence: m.confidence, edgeScore: Math.round(Math.abs(m.consensusScore)), drawdown: 0, agreeing };
}

// ─── Chaos engine ─────────────────────────────────────────────────────────────

function rnd(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function makeAgentState(): AgentLiveState {
  return {
    status: pick(["TRADE-OK", "NO-TRADE", "ALERT"] as const),
    confidence: Math.round(rnd(30, 95)),
    signal: pick(["L", "S", "—"] as const),
    bars: Array.from({ length: 5 }, () => Math.round(rnd(1, 8))),
  };
}

function makeHeatRow(cols: number): HeatCell[] {
  return Array.from({ length: cols }, () => Math.floor(rnd(0, 5)) as HeatCell);
}

const LOG_FNS: Array<(label: string, sig: SignalDir) => string> = [
  (a, s) => `${a}: SIG ${s === "L" ? "LONG" : s === "S" ? "SHORT" : "FLAT"}`,
  () => `RISK: POS SIZE ${rnd(0.05, 0.5).toFixed(2)}L APPROVED`,
  () => `EXEC: FILL @ ${(1.0800 + rnd(0, 0.012)).toFixed(5)}`,
  () => `MASTER: EDGE ${Math.round(rnd(55, 90))} — CLEAR`,
  () => `CNTR: DIVERGENCE DETECTED — CAUTION`,
  () => `NEWS: IMPACT ${pick(["LOW", "MED", "HIGH"] as const)} · PRICED`,
  () => `FLOW: IMBALANCE ${pick(["+", "-"] as const)}${Math.round(rnd(10, 60))}%`,
  () => `ALGO: PATTERN LOCK — CONFIRM ENTRY`,
  () => `QUANT: STAT-ARB SPREAD ${rnd(0.1, 1.2).toFixed(2)}σ`,
];

// ─── Main component ───────────────────────────────────────────────────────────

export function PixelWarRoom({ onAgentClick }: { onAgentClick?: (agentId: string) => void }) {
  const { settings } = useSettings();
  const { quotes } = useQuotes(30_000);
  const { data: runData } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${settings.selectedSymbol}&timeframe=H1`,
    swrFetch,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  );

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string>(REAL_AGENTS[0]?.id ?? "risk");
  const [masterSelected, setMasterSelected] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<string, AgentLiveState>>({});
  const [masterState, setMasterState] = useState<MasterState | null>(null);
  const [heatmap, setHeatmap] = useState<HeatCell[][]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [mounted, setMounted] = useState(false);
  // Wall clocks tick every 30s; rendered only after mount to avoid SSR mismatch
  const [clockNow, setClockNow] = useState(() => new Date());
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setInterval(() => setClockNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // Initialize state once on mount — no random interval to avoid constant flickering
  useEffect(() => {
    const states: Record<string, AgentLiveState> = {};
    ALL_AGENTS.forEach(a => { states[a.id] = makeAgentState(); });
    const ls = Object.values(states).filter(s => s.signal === "L").length;
    const ss = Object.values(states).filter(s => s.signal === "S").length;

    setAgentStates(states);
    setMasterState({
      bias: ls > ss + 2 ? "LONG" : ss > ls + 2 ? "SHORT" : "NEUTRAL",
      confidence: Math.round(Object.values(states).reduce((s, a) => s + a.confidence, 0) / ALL_AGENTS.length),
      edgeScore: Math.round(rnd(55, 88)),
      drawdown: parseFloat(rnd(0, 2.5).toFixed(2)),
      agreeing: Math.max(ls, ss),
    });
    setHeatmap(Array.from({ length: 8 }, () => makeHeatRow(24)));
    setLog([
      { time: "09:31", text: "WAR ROOM ONLINE — ALL STATIONS ARMED", tone: "ok" },
      { time: "09:31", text: "RISK MONITOR ACTIVE — DRAWDOWN 0.0%", tone: "dim" },
      { time: "09:32", text: "MASTER: EDGE CALIBRATED — READY", tone: "dim" },
    ]);
    setMounted(true);
  }, []);

  // Auto-cycle selection through the 7 real agents every 3s
  useEffect(() => {
    const t = window.setInterval(() => {
      setSelectedIdx(i => {
        const next = (i + 1) % REAL_AGENTS.length;
        setSelectedId(REAL_AGENTS[next]?.id ?? REAL_AGENTS[0]!.id);
        return next;
      });
    }, 3_000);
    return () => window.clearInterval(t);
  }, []);

  // Live "computing" jitter — monitor bars drift every few seconds so the desks
  // visibly process data between real SWR refreshes. Confidence/status stay real.
  useEffect(() => {
    const t = window.setInterval(() => {
      setAgentStates(prev => {
        const next: Record<string, AgentLiveState> = {};
        for (const [id, s] of Object.entries(prev)) {
          next[id] = { ...s, bars: s.bars.map(b => Math.max(1, Math.min(8, b + Math.round(rnd(-1.4, 1.4))))) };
        }
        return next;
      });
    }, 2_800);
    return () => window.clearInterval(t);
  }, []);

  // Sync real agent data when SWR result arrives
  useEffect(() => {
    if (!runData) return;
    setAgentStates(prev => ({ ...prev, ...mapRunToStates(runData, rnd) }));
    setMasterState(mapRunToMaster(runData));
  }, [runData]);

  const tickerText = buildTicker(quotes);

  // Active session drives the room ambience (NY bright, Asia dim/cool, Closed dark)
  const utcH = clockNow.getUTCHours();
  const activeSessionName = runData?.snapshot?.indicators?.session
    ?? (utcH < 8 ? "Asia" : utcH < 13 ? "London" : utcH < 21 ? "New York" : "Closed");
  const sessionFloorClass =
    activeSessionName === "New York" ? styles.floorNY :
    activeSessionName === "London"   ? styles.floorLondon :
    activeSessionName === "Asia"     ? styles.floorAsia :
    styles.floorClosed;

  const selectedAgent = REAL_AGENTS.find(a => a.id === selectedId) ?? REAL_AGENTS[0]!;
  const selectedLive = agentStates[selectedAgent.id];
  const agentOverview = getAgentOverview(selectedAgent.id, runData);

  const handleClick = (agent: AgentDef) => {
    setMasterSelected(false);
    if (!agent.real) return;
    const idx = REAL_AGENTS.findIndex(a => a.id === agent.id);
    if (idx >= 0) { setSelectedIdx(idx); setSelectedId(agent.id); }
    if (agent.drawerId) onAgentClick?.(agent.drawerId);
  };

  return (
    <div className={styles.warRoom}>

      {/* ── Header bar ── */}
      <div className={styles.topBar}>
        <span className={styles.topBarId}>TRDX://WAR-ROOM</span>
        <div className={styles.topBarLights} aria-hidden="true">
          <span className={styles.lightRed} />
          <span className={styles.lightAmber} />
          <span className={styles.lightGreen} />
        </div>
      </div>

      {/* ── Ticker tape ── */}
      <div className={styles.tickerRail}>
        <div className={styles.tickerTrack}>
          <span className={styles.tickerScroll}>{tickerText}{tickerText}</span>
        </div>
      </div>

      {/* ── Command tier: MASTER + readout ── */}
      <div className={styles.commandTier}>
        <button type="button" className={styles.masterPod} onClick={() => { setMasterSelected(true); onAgentClick?.("master"); }}>
          <div className={`${styles.masterBody} ${styles.animV1}`}>
            <div className={styles.masterSpriteWrap}>
              <SeatedOperator look={MASTER_LOOK} />
            </div>
            <div className={styles.masterMonitorGroup}>
              <div className={`${styles.monitorBezel} ${styles.masterBezel}`}>
                <div className={styles.monitorScreen} />
                <span className={styles.masterLabel}>MASTER</span>
                <span className={`${styles.statusLed} ${styles.ledTeal}`} />
              </div>
              <div className={styles.monitorNeck} />
              <div className={styles.masterBase} />
            </div>
            <div className={styles.stationKeyboard} />
          </div>
        </button>

        <div className={styles.masterReadout}>
          {agentOverview && !masterSelected ? (
            /* ── Cycling floor-agent overview (live data) ── */
            <>
              <div className={styles.agentOverviewId}>{agentOverview.label}</div>
              <div className={styles.agentOverviewRole}>{agentOverview.role}</div>
              <div className={`${styles.agentOverviewState} ${agentOverview.tone === "ok" ? styles.statOk : agentOverview.tone === "bad" ? styles.statDanger : agentOverview.tone === "warn" ? styles.statWarn : ""}`}>
                {agentOverview.state}
              </div>
              <div className={styles.agentOverviewDetail}>{agentOverview.detail}</div>
              <div className={styles.statsRow}>
                <div className={styles.statCell}>
                  <span className={styles.statLabel}>CONF</span>
                  <span className={styles.statValue}>{agentOverview.confidence}%</span>
                </div>
              </div>
              <div className={styles.confBarWrap}>
                <div className={`${styles.confBar} ${agentOverview.tone === "ok" ? styles.confBarOk : styles.confBarBad}`} style={{ width: `${agentOverview.confidence}%` }} />
              </div>
            </>
          ) : runData ? (
            /* ── Master consensus (API loaded, no specific agent overview) ── */
            (() => {
              const m = runData.agents.master;
              const bias = m.finalBias === "bullish" ? "LONG" : m.finalBias === "bearish" ? "SHORT" : "NO-TRADE";
              const tone = m.finalBias === "bullish" ? styles.statOk : m.finalBias === "bearish" ? styles.statDanger : styles.statWarn;
              const detail = m.supports?.[0] ?? m.noTradeReason ?? m.strategyMatch ?? "Awaiting consensus...";
              const score = `${m.consensusScore >= 0 ? "+" : ""}${m.consensusScore.toFixed(1)}`;
              const agreeing = m.agentConsensus?.filter(a => m.finalBias === "bullish" ? a.weightedScore > 0 : m.finalBias === "bearish" ? a.weightedScore < 0 : Math.abs(a.weightedScore) < 20).length ?? 0;
              return (
                <>
                  <div className={styles.agentOverviewId}>MASTER</div>
                  <div className={styles.agentOverviewRole}>CHIEF MKT OFFICER</div>
                  <div className={`${styles.agentOverviewState} ${tone}`}>{bias}</div>
                  <div className={styles.agentOverviewDetail}>{detail}</div>
                  <div className={styles.statsRow}>
                    <div className={styles.statCell}><span className={styles.statLabel}>CONF</span><span className={styles.statValue}>{m.confidence}%</span></div>
                    <div className={styles.statCell}><span className={styles.statLabel}>SCORE</span><span className={styles.statValue}>{score}</span></div>
                    <div className={styles.statCell}><span className={styles.statLabel}>AGREE</span><span className={styles.statValue}>{agreeing}/6</span></div>
                  </div>
                  <div className={styles.confBarWrap}>
                    <div className={`${styles.confBar} ${m.finalBias === "bullish" ? styles.confBarOk : styles.confBarBad}`} style={{ width: `${m.confidence}%` }} />
                  </div>
                </>
              );
            })()
          ) : (
            /* ── Init fallback before API loads ── */
            <>
              <div className={styles.agentOverviewId}>{selectedAgent.label}</div>
              <div className={styles.agentOverviewRole}>{selectedAgent.role ?? "—"}</div>
              {selectedLive ? (
                <>
                  <div className={`${styles.agentOverviewState} ${selectedLive.status === "TRADE-OK" ? styles.statOk : selectedLive.status === "ALERT" ? styles.statDanger : styles.statWarn}`}>
                    {selectedLive.status === "TRADE-OK" ? "ACTIVE" : selectedLive.status === "ALERT" ? "ALERT" : "STANDBY"}
                  </div>
                  <div className={styles.agentOverviewDetail}>{selectedAgent.detail}</div>
                  <div className={styles.statsRow}>
                    <div className={styles.statCell}><span className={styles.statLabel}>CONF</span><span className={styles.statValue}>{selectedLive.confidence}%</span></div>
                    <div className={styles.statCell}><span className={styles.statLabel}>SIG</span><span className={`${styles.statValue} ${selectedLive.signal === "L" ? styles.statOk : selectedLive.signal === "S" ? styles.statDanger : ""}`}>{selectedLive.signal}</span></div>
                  </div>
                  <div className={styles.confBarWrap}>
                    <div className={`${styles.confBar} ${selectedLive.status === "TRADE-OK" ? styles.confBarOk : styles.confBarBad}`} style={{ width: `${selectedLive.confidence}%` }} />
                  </div>
                </>
              ) : (
                <div className={styles.agentOverviewDetail}>{selectedAgent.detail ?? "Initializing..."}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Floor tier ── */}
      <div className={`${styles.floorTier} ${sessionFloorClass}`}>
        {/* Ceiling — industrial light bars over the room */}
        <div className={styles.ceiling} aria-hidden="true">
          <span className={styles.ceilLight} />
          <span className={styles.ceilLight} />
          <span className={styles.ceilLight} />
        </div>

        {/* Command wall — overview tiles, live trade alert, global overlays map */}
        <div className={styles.cmdBoard} aria-hidden="true">
          <div className={styles.serverRack}>
            <span className={styles.rackSlot} />
            <span className={styles.rackSlot} />
            <span className={styles.rackSlot} />
            <span className={styles.rackSlot} />
          </div>

          <div className={styles.cmdLeft}>
            <div className={styles.cmdHeader}>
              <span>COMMAND OVERVIEW</span>
              <span className={styles.wallBoardLive}>● LIVE</span>
            </div>
            <div className={styles.cmdTiles}>
              <div className={styles.cmdTile}>
                <div className={styles.cmdTileTitle}>CONSENSUS</div>
                <div className={styles.cmdBars}>
                  {(runData?.agents.master.agentConsensus?.slice(0, 6).map(a => a.weightedScore) ?? [4, -2, 6, 3, -1, 5]).map((v, i) => (
                    <span
                      key={i}
                      className={v >= 0 ? styles.cmdBarUp : styles.cmdBarDown}
                      style={{ height: `${Math.max(3, Math.min(14, 3 + Math.abs(v) * 0.8))}px` }}
                    />
                  ))}
                </div>
                <div className={styles.cmdTileValue}>
                  {runData
                    ? `${runData.agents.master.finalBias === "bullish" ? "LONG" : runData.agents.master.finalBias === "bearish" ? "SHORT" : "NO-TRADE"} · ${runData.agents.master.confidence}%`
                    : "SYNCING…"}
                </div>
              </div>

              <div className={styles.cmdTile}>
                <div className={styles.cmdTileTitle}>RISK EXPOSURE</div>
                <div className={styles.cmdGauge}>
                  {[0, 1, 2, 3, 4].map(i => {
                    const gradeIdx = runData ? "ABCDF".indexOf(runData.agents.risk.grade) : 2;
                    return <span key={i} className={`${styles.gaugeSeg} ${i <= gradeIdx ? styles.gaugeSegOn : ""}`} />;
                  })}
                </div>
                <div className={styles.cmdTileValue}>
                  {runData ? `GRADE ${runData.agents.risk.grade} · MAX ${runData.agents.risk.maxRiskPercent}%` : "—"}
                </div>
              </div>

              <div className={styles.cmdTile}>
                <div className={styles.cmdTileTitle}>BOT STATUS</div>
                <div className={styles.cmdStatusList}>
                  <span className={styles.statOk}>{Object.values(agentStates).filter(s => s.status === "TRADE-OK").length} ACTIVE</span>
                  <span className={styles.statWarn}>{Object.values(agentStates).filter(s => s.status === "NO-TRADE").length} WAITING</span>
                  <span className={styles.statDanger}>{Object.values(agentStates).filter(s => s.status === "ALERT").length} ALERT</span>
                </div>
              </div>
            </div>

            <div className={styles.cmdAlert}>
              <span className={styles.cmdAlertTitle}>LIVE TRADE ALERT: ENTRY PILOT</span>
              <p className={styles.cmdAlertBody}>
                {runData
                  ? `[${runData.agents.execution.signalState}] ${runData.agents.execution.signalStateReason ?? runData.agents.master.noTradeReason ?? "Standing by — monitoring for setup."}`
                  : "Standing by — command link syncing…"}
              </p>
            </div>
          </div>

          <div className={styles.cmdRight}>
            <div className={styles.cmdHeader}><span>GLOBAL OVERLAYS</span></div>
            <PixelWorldMap activeSession={activeSessionName} />
            <div className={styles.mapClocks}>
              {([["MNL", "Asia/Manila"], ["LDN", "Europe/London"], ["NYC", "America/New_York"]] as const).map(([city, tz]) => (
                <div key={city} className={styles.clockRow}>
                  <span className={styles.clockCity}>{city}</span>
                  <span className={styles.clockTime}>{mounted ? clockFor(tz, clockNow) : "--:--"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.floorLabel}>
          <span className={styles.floorSlash}>///</span>
          TRADING FLOOR
          <span className={styles.floorSlash}>///</span>
        </div>

        {/* Side wall dressing — chart frames, extinguisher, AC vents */}
        <div className={styles.sideDecor} aria-hidden="true">
          <div className={styles.sideCol}>
            <div className={styles.wallFrame}>
              <span className={styles.frameBarUp} />
              <span className={styles.frameBarDown} />
              <span className={styles.frameBarUp} />
              <span className={styles.frameBarUp} />
            </div>
            <div className={styles.extinguisher} />
            <div className={styles.wallVent} />
          </div>
          <div className={`${styles.sideCol} ${styles.sideColRight}`}>
            <div className={styles.wallVent} />
            <div className={styles.wallFrame}>
              <span className={styles.frameBarDown} />
              <span className={styles.frameBarUp} />
              <span className={styles.frameBarDown} />
              <span className={styles.frameBarDown} />
            </div>
            <div className={styles.wallFrame}>
              <span className={styles.frameBarUp} />
              <span className={styles.frameBarUp} />
              <span className={styles.frameBarDown} />
              <span className={styles.frameBarUp} />
            </div>
          </div>
        </div>

        {/* Execution zone — taped-off floor area */}
        <div className={styles.zone}>
          <span className={styles.zoneTag}>EXECUTION TEAM</span>
          <div className={styles.floorRow}>
            {AGENTS_ROW_A.map((agent, i) => (
              <AgentPod
                key={agent.id}
                agent={agent}
                live={mounted ? agentStates[agent.id] : undefined}
                selected={selectedId === agent.id}
                variant={i % 4}
                onClick={() => handleClick(agent)}
              />
            ))}
          </div>
        </div>

        {/* Research zone */}
        <div className={styles.zone}>
          <span className={styles.zoneTag}>RESEARCH TEAM</span>
          <div className={styles.floorRow}>
            {AGENTS_ROW_B.map((agent, i) => (
              <AgentPod
                key={agent.id}
                agent={agent}
                live={mounted ? agentStates[agent.id] : undefined}
                selected={selectedId === agent.id}
                variant={(i + 2) % 4}
                onClick={() => handleClick(agent)}
              />
            ))}
          </div>
        </div>

        {/* Floor furniture + system log + user desk */}
        <div className={styles.floorProps} aria-hidden="true">
          <div className={styles.propGroup}>
            <div className={styles.sysLog}>
              SYSTEM LOG
              <span className={styles.sysDot} />
              <span className={styles.sysDot} />
              <span className={styles.sysDot} />
              <span className={styles.sysDot} />
            </div>
            <div className={styles.fileCabinet}>
              <span className={styles.cabinetDrawer} />
              <span className={styles.cabinetDrawer} />
              <span className={styles.cabinetDrawer} />
            </div>
            <div className={styles.plant}>
              <span className={styles.plantLeaves} />
              <span className={styles.plantPot} />
            </div>
            <div className={styles.waterCooler}>
              <span className={styles.coolerBottle} />
              <span className={styles.coolerBody} />
            </div>
          </div>
          <div className={styles.propGroup}>
            <div className={styles.printer}>
              <span className={styles.printerPaper} />
            </div>
            <div className={styles.trashBin} />
            <div className={styles.coffeeMachine}>
              <span className={styles.coffeeSteam} />
            </div>
            <div className={styles.plant}>
              <span className={styles.plantLeaves} />
              <span className={styles.plantPot} />
            </div>
            <div className={styles.userDesk}>
              <div className={styles.userDeskSprite}>
                <SeatedOperator look={USER_LOOK} />
              </div>
              <div className={styles.userDeskBase} />
              <div className={styles.userPanel}>
                <span className={styles.userPanelTitle}>USER PROFILE</span>
                <span className={styles.userPanelSub}>OPERATOR · <span className={styles.statOk}>ACTIVE</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

// ─── Agent Pod ────────────────────────────────────────────────────────────────

function AgentPod({
  agent, live, selected, variant, onClick,
}: {
  agent: AgentDef;
  live: AgentLiveState | undefined;
  selected: boolean;
  variant: number;
  onClick: () => void;
}) {
  const status = live?.status ?? agent.baseStatus;
  const ok = status === "TRADE-OK";
  const alert = status === "ALERT";
  const animClass = styles[`animV${variant % 4}`] ?? "";

  const inner = (
    <>
      <div className={styles.stationBody}>
        {live && agent.real && live.signal !== "—" && (
          <span className={`${styles.sigBadge} ${live.signal === "L" ? styles.sigL : styles.sigS}`} aria-hidden="true">
            {live.signal}
          </span>
        )}
        {live && agent.real && live.signal !== "—" && (
          <span className={`${styles.sigBubble} ${live.signal === "L" ? styles.sigBubbleL : styles.sigBubbleS}`} aria-hidden="true">
            {live.signal === "L" ? "▲" : "▼"}
          </span>
        )}
        <div className={styles.spriteWrap}>
          <SeatedOperator look={agent.look} />
        </div>

        <div className={styles.monitorGroup}>
          <div className={`${styles.monitorBezel} ${ok ? styles.monOk : alert ? styles.monAlert : styles.monBad}`}>
            <div className={styles.monitorScreen} />
            {live && (
              <div className={styles.miniBars}>
                {live.bars.map((h, i) => (
                  <span
                    key={i}
                    className={`${styles.miniBar} ${ok ? styles.barOk : styles.barBad}`}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            )}
            {agent.label && (
              <span className={ok ? styles.lblOk : alert ? styles.lblAlert : styles.lblBad}>
                {agent.label}
              </span>
            )}
            <span className={`${styles.statusLed} ${ok ? styles.ledOk : alert ? styles.ledAlert : styles.ledAmber}`} />
          </div>
          <div className={styles.monitorNeck} />
          <div className={styles.monitorBase} />
        </div>

        <div className={styles.stationKeyboard} />
      </div>

      <div className={styles.confLabel}>
        {live && agent.real ? `${live.confidence}%` : ""}
      </div>
    </>
  );

  // Non-real agents are decorative — not interactive
  if (!agent.real) {
    return (
      <div className={`${styles.agentPod} ${animClass}`} aria-hidden="true">
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.agentPod} ${animClass} ${selected ? styles.podSelected : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {inner}
    </button>
  );
}
