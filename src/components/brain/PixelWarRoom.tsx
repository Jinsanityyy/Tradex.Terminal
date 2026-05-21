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
    look: { skin: "Copper", hairStyle: "Swoop", hairColor: "Black", shirtColor: "Maroon", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "trend", label: "TREND", drawerId: "trend", baseStatus: "NO-TRADE", real: true,
    look: { skin: "Ivory", hairStyle: "Parted Short", hairColor: "Brown", shirtColor: "Forest", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "pract", label: "PR.ACT", drawerId: "smc", baseStatus: "TRADE-OK", real: true,
    look: { skin: "Gold", hairStyle: "Messy", hairColor: "Black", shirtColor: "Gray", pantsColor: "Black", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "news", label: "NEWS", drawerId: "news", baseStatus: "TRADE-OK", real: true,
    look: { skin: "Dove", hairStyle: "Plain", hairColor: "White", shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "quant", label: "", drawerId: "trend", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Comet", hairStyle: "Loose", hairColor: "Blonde", shirtColor: "Lavender", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, bodyType: "Woman" },
  },
  {
    id: "exec", label: "EXEC", drawerId: "execution", baseStatus: "TRADE-OK", real: true,
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentStates, setAgentStates] = useState<Record<string, AgentLiveState>>({});
  const [masterState, setMasterState] = useState<MasterState | null>(null);
  const [heatmap, setHeatmap] = useState<HeatCell[][]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [mounted, setMounted] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

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

    const iv = setInterval(() => {
      setAgentStates(prev => {
        const next = { ...prev };
        [...ALL_AGENTS].sort(() => Math.random() - 0.5).slice(0, 3).forEach(a => {
          next[a.id] = makeAgentState();
        });

        const nls = Object.values(next).filter(s => s.signal === "L").length;
        const nss = Object.values(next).filter(s => s.signal === "S").length;
        setMasterState({
          bias: nls > nss + 2 ? "LONG" : nss > nls + 2 ? "SHORT" : "NEUTRAL",
          confidence: Math.round(Object.values(next).reduce((s, a) => s + a.confidence, 0) / ALL_AGENTS.length),
          edgeScore: Math.round(rnd(55, 88)),
          drawdown: parseFloat(rnd(0, 2.5).toFixed(2)),
          agreeing: Math.max(nls, nss),
        });

        setLog(prevLog => {
          const agent = pick(ALL_AGENTS);
          const text = pick(LOG_FNS)(agent.label, next[agent.id]?.signal ?? "—");
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          const tone: LogTone = text.includes("CAUTION") ? "warn" : text.includes("FILL") ? "ok" : "dim";
          return [{ time, text, tone }, ...prevLog.slice(0, 24)];
        });

        return next;
      });

      setHeatmap(prev => {
        const next = [...prev];
        next[Math.floor(Math.random() * next.length)] = makeHeatRow(24);
        return next;
      });
    }, 380);

    return () => clearInterval(iv);
  }, []);

  // Sync real agent data when SWR result arrives
  useEffect(() => {
    if (!runData) return;
    setAgentStates(prev => ({ ...prev, ...mapRunToStates(runData, rnd) }));
    setMasterState(mapRunToMaster(runData));
  }, [runData]);

  const tickerText = buildTicker(quotes);

  const handleClick = (agent: AgentDef) => {
    setSelectedId(agent.id);
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
        <button type="button" className={styles.masterPod} onClick={() => onAgentClick?.("master")}>
          <div className={styles.masterBody}>
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
          <div className={styles.masterTag}>COMMAND</div>
        </button>

        <div className={styles.masterReadout}>
          {masterState ? (
            <>
              <div className={`${styles.biasBadge} ${masterState.bias === "LONG" ? styles.biasLong : masterState.bias === "SHORT" ? styles.biasShort : styles.biasNeutral}`}>
                {masterState.bias}
              </div>
              <div className={styles.statsRow}>
                <div className={styles.statCell}>
                  <span className={styles.statLabel}>CONF</span>
                  <span className={styles.statValue}>{masterState.confidence}%</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statLabel}>EDGE</span>
                  <span className={styles.statValue}>{masterState.edgeScore}</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statLabel}>DD</span>
                  <span className={`${styles.statValue} ${masterState.drawdown > 1.5 ? styles.statDanger : ""}`}>
                    {masterState.drawdown.toFixed(1)}%
                  </span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statLabel}>AGR</span>
                  <span className={styles.statValue}>{masterState.agreeing}/12</span>
                </div>
              </div>
              <div className={styles.agrDots}>
                {Array.from({ length: 12 }, (_, i) => (
                  <span
                    key={i}
                    className={`${styles.agrDot} ${
                      i < masterState.agreeing
                        ? masterState.bias === "LONG" ? styles.dotLong : styles.dotShort
                        : styles.dotOff
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <span className={styles.statLabel}>INITIALIZING...</span>
          )}
        </div>
      </div>

      {/* ── Floor tier ── */}
      <div className={styles.floorTier}>
        <div className={styles.floorLabel}>
          <span className={styles.floorSlash}>///</span>
          TRADING FLOOR
          <span className={styles.floorSlash}>///</span>
        </div>

        <div className={styles.floorRow}>
          {AGENTS_ROW_A.map(agent => (
            <AgentPod
              key={agent.id}
              agent={agent}
              live={mounted ? agentStates[agent.id] : undefined}
              selected={selectedId === agent.id}
              onClick={() => handleClick(agent)}
            />
          ))}
        </div>

        <div className={styles.floorRow}>
          {AGENTS_ROW_B.map(agent => (
            <AgentPod
              key={agent.id}
              agent={agent}
              live={mounted ? agentStates[agent.id] : undefined}
              selected={selectedId === agent.id}
              onClick={() => handleClick(agent)}
            />
          ))}
        </div>
      </div>

      {/* ── Engine tier ── */}
      <div className={styles.engineTier}>
        <div className={styles.heatmapPanel}>
          <div className={styles.panelHeader}>SIGNAL MATRIX</div>
          <div className={styles.heatmapGrid}>
            {heatmap.map((row, ri) =>
              row.map((cell, ci) => (
                <span key={`${ri}-${ci}`} className={`${styles.heatCell} ${styles[`heat${cell}`]}`} />
              ))
            )}
          </div>
        </div>

        <div className={styles.logPanel}>
          <div className={styles.panelHeader}>EXEC LOG</div>
          <div className={styles.logScroll} ref={logRef}>
            {log.map((line, i) => (
              <div key={i} className={`${styles.logLine} ${styles[`tone${line.tone}`]}`}>
                <span className={styles.logTime}>{line.time}</span>
                <span>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Agent Pod ────────────────────────────────────────────────────────────────

function AgentPod({
  agent, live, selected, onClick,
}: {
  agent: AgentDef;
  live: AgentLiveState | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  const status = live?.status ?? agent.baseStatus;
  const ok = status === "TRADE-OK";
  const alert = status === "ALERT";
  const isReal = agent.real;

  return (
    <button
      type="button"
      className={`${styles.agentPod} ${selected ? styles.podSelected : ""} ${isReal && alert ? styles.podAlert : ""}`}
      onClick={isReal ? onClick : undefined}
      aria-pressed={isReal ? selected : undefined}
      tabIndex={isReal ? 0 : -1}
      style={isReal ? undefined : { pointerEvents: "none" } as React.CSSProperties}
    >
      <div className={styles.stationBody}>
        {live && (
          <div className={`${styles.sigBadge} ${live.signal === "L" ? styles.sigL : live.signal === "S" ? styles.sigS : styles.sigN}`}>
            {live.signal}
          </div>
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
        {live ? `${live.confidence}%` : ""}
      </div>
    </button>
  );
}
