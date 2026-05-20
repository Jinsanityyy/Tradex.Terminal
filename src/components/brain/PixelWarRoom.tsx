"use client";

import type { CSSProperties } from "react";
import { useState, useEffect, useRef } from "react";
import styles from "./PixelWarRoom.module.css";

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
    id: "quant", label: "", drawerId: "", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Comet", hairStyle: "Loose", hairColor: "Blonde", shirtColor: "Lavender", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, bodyType: "Woman" },
  },
  {
    id: "exec", label: "EXEC", drawerId: "execution", baseStatus: "TRADE-OK", real: true,
    look: { skin: "Coffee", hairStyle: "Buzzcut", hairColor: "Black", shirtColor: "Navy", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
];

const AGENTS_ROW_B: AgentDef[] = [
  {
    id: "flow", label: "", drawerId: "", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Green", hairStyle: "Mohawk", hairColor: "Orange", shirtColor: "Orange", pantsColor: "Black", shoesColor: "Black", seatFrame: 2, bodyType: "Man" },
  },
  {
    id: "cntr", label: "CNTR", drawerId: "contrarian", baseStatus: "TRADE-OK", real: true,
    look: { skin: "Sienna", hairStyle: "Curly Short", hairColor: "Chestnut", shirtColor: "Purple", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "arbi", label: "", drawerId: "", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Gray", hairStyle: "Curly Short", hairColor: "Platinum", shirtColor: "Sky", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2, bodyType: "Woman" },
  },
  {
    id: "algo", label: "", drawerId: "", baseStatus: "TRADE-OK", real: false,
    look: { skin: "Comet", hairStyle: "Buzzcut", hairColor: "Red", shirtColor: "Leather", pantsColor: "Black", shoesColor: "Black", seatFrame: 2, bodyType: "Man" },
  },
  {
    id: "delta", label: "", drawerId: "", baseStatus: "NO-TRADE", real: false,
    look: { skin: "Green", hairStyle: "Loose", hairColor: "Brown", shirtColor: "Pink", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, bodyType: "Woman" },
  },
  {
    id: "sent", label: "", drawerId: "", baseStatus: "NO-TRADE", real: false,
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

const TICKER =
  "EURUSD 1.08423 ▲ · GBPUSD 1.27341 ▼ · USDJPY 154.821 ▲ · XAUUSD 2318.40 ▲ · " +
  "SPX500 5234.18 ▼ · BTCUSD 67430 ▲ · CRUDE 81.24 ▼ · EDGE SCORE 71 · RISK CLEAR · " +
  "TREND: NEUTRAL · SIGNAL ARMED · MKT-SCAN ACTIVE · DRAWDOWN 0.0% · ";

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

  const handleClick = (agent: AgentDef) => {
    setSelectedId(agent.id);
    onAgentClick?.(agent.drawerId);
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
          <span className={styles.tickerScroll}>{TICKER}{TICKER}</span>
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

  return (
    <button
      type="button"
      className={`${styles.agentPod} ${selected ? styles.podSelected : ""} ${alert && agent.real ? styles.podAlert : ""} ${!agent.real ? styles.podFake : ""}`}
      onClick={agent.real ? onClick : undefined}
      aria-pressed={agent.real ? selected : undefined}
      tabIndex={agent.real ? 0 : -1}
    >
      <div className={styles.stationBody}>
        {live && agent.real && (
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
            {live && agent.real && (
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
            {agent.real && (
              <span className={ok ? styles.lblOk : alert ? styles.lblAlert : styles.lblBad}>
                {agent.label}
              </span>
            )}
            {agent.real && (
              <span className={`${styles.statusLed} ${ok ? styles.ledOk : alert ? styles.ledAlert : styles.ledAmber}`} />
            )}
          </div>
          <div className={styles.monitorNeck} />
          <div className={styles.monitorBase} />
        </div>

        <div className={styles.stationKeyboard} />
      </div>

      <div className={styles.confLabel}>
        {agent.real && live ? `${live.confidence}%` : ""}
      </div>
    </button>
  );
}
