"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import styles from "./PixelTradingFloor.module.css";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuotes } from "@/hooks/useMarketData";
import type { AgentRunResult, DirectionalBias, RiskGrade } from "@/lib/agents/schemas";
import type { AssetSnapshot } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type StationStatus = "TRADE-OK" | "NO-TRADE" | "ALERT";
type SignalDir = "L" | "S" | "—";

type OperatorLook = {
  skin: string;
  hairStyle: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  shoesColor: string;
  seatFrame: 0 | 1 | 2 | 3;
  scale?: number;
};

type StationBlueprint = {
  id: string;
  label: string;
  analyst: string;
  detail: string;
  left: number;
  top: number;
  score: number;
  status: StationStatus;
  seatedLook: OperatorLook;
};

type StationLive = { status: StationStatus; signal: SignalDir; confidence: number };

// ─── Static floor config ──────────────────────────────────────────────────────

const STATION_BLUEPRINTS: StationBlueprint[] = [
  {
    id: "trend",
    label: "TREND",
    analyst: "Macro Scout",
    detail: "Higher-timeframe structure is aligned with the active swing.",
    left: 8,
    top: 14,
    score: 52,
    status: "NO-TRADE",
    seatedLook: { skin: "Ivory", hairStyle: "Parted Short", hairColor: "Brown", shirtColor: "Forest", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "pract",
    label: "PR.ACT",
    analyst: "Tape Reader",
    detail: "Micro trigger is still dirty. Wait for a cleaner reaction.",
    left: 30,
    top: 14,
    score: 41,
    status: "NO-TRADE",
    seatedLook: { skin: "Gold", hairStyle: "Messy", hairColor: "Black", shirtColor: "Gray", pantsColor: "Black", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "news",
    label: "NEWS",
    analyst: "Catalyst Watch",
    detail: "Headline flow is stable and no fresh surprise is in play.",
    left: 56,
    top: 14,
    score: 64,
    status: "TRADE-OK",
    seatedLook: { skin: "Dove", hairStyle: "Plain", hairColor: "White", shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "risk",
    label: "RISK",
    analyst: "Guard Rail",
    detail: "Protect size until conflicting desks settle down.",
    left: 80,
    top: 14,
    score: 28,
    status: "NO-TRADE",
    seatedLook: { skin: "Copper", hairStyle: "Swoop", hairColor: "Black", shirtColor: "Maroon", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "exec",
    label: "EXEC",
    analyst: "Entry Pilot",
    detail: "Wait until the trigger desk confirms the entry lane.",
    left: 18,
    top: 50,
    score: 36,
    status: "NO-TRADE",
    seatedLook: { skin: "Coffee", hairStyle: "Buzzcut", hairColor: "Black", shirtColor: "Navy", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2 },
  },
  {
    id: "cntr",
    label: "CNTR",
    analyst: "Contrarian Desk",
    detail: "Crowding risk is low enough for a controlled fade if needed.",
    left: 70,
    top: 50,
    score: 57,
    status: "TRADE-OK",
    seatedLook: { skin: "Sienna", hairStyle: "Curly Short", hairColor: "Chestnut", shirtColor: "Purple", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2 },
  },
];

const CENTRAL_LOOK: OperatorLook = {
  skin: "Ivory", hairStyle: "Loose", hairColor: "Chestnut",
  shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black",
  seatFrame: 2, scale: 1.0,
};

const STATION_TO_DRAWER: Record<string, string> = {
  trend: "trend",
  pract: "smc",
  news:  "news",
  risk:  "risk",
  exec:  "execution",
  cntr:  "contrarian",
};

// SVG connection lines from each agent to master center
const CONNECTIONS = [
  { x1: 8,  y1: 14, x2: 44, y2: 58 },
  { x1: 30, y1: 14, x2: 44, y2: 58 },
  { x1: 56, y1: 14, x2: 50, y2: 58 },
  { x1: 80, y1: 14, x2: 56, y2: 58 },
  { x1: 18, y1: 50, x2: 44, y2: 60 },
  { x1: 70, y1: 50, x2: 56, y2: 60 },
];

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function swrFetch(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

function biasToSignal(bias: DirectionalBias): SignalDir {
  if (bias === "bullish") return "L";
  if (bias === "bearish") return "S";
  return "—";
}

function biasToStatus(bias: DirectionalBias, confidence: number): StationStatus {
  if (bias === "neutral" || confidence < 30) return "NO-TRADE";
  return "TRADE-OK";
}

function gradeToConf(grade: RiskGrade): number {
  const map: Record<RiskGrade, number> = { A: 88, B: 72, C: 55, D: 38, F: 20 };
  return map[grade] ?? 50;
}

function deriveStations(data: AgentRunResult): Record<string, StationLive> {
  const { agents: ag } = data;
  return {
    trend: {
      status: biasToStatus(ag.trend.bias, ag.trend.confidence),
      signal: biasToSignal(ag.trend.bias),
      confidence: ag.trend.confidence,
    },
    pract: {
      status: ag.smc.setupPresent ? biasToStatus(ag.smc.bias, ag.smc.confidence) : "NO-TRADE",
      signal: biasToSignal(ag.smc.bias),
      confidence: ag.smc.confidence,
    },
    news: {
      status: ag.news.riskScore > 70 ? "ALERT" : biasToStatus(ag.news.impact, ag.news.confidence),
      signal: biasToSignal(ag.news.impact),
      confidence: ag.news.confidence,
    },
    risk: {
      status: ag.risk.valid ? "TRADE-OK" : "ALERT",
      signal: ag.risk.valid ? "—" : "S",
      confidence: gradeToConf(ag.risk.grade),
    },
    exec: {
      status: ag.execution.signalState === "ARMED" ? "TRADE-OK"
            : ag.execution.signalState === "NO_TRADE" ? "NO-TRADE"
            : "ALERT",
      signal: ag.execution.direction === "long" ? "L"
            : ag.execution.direction === "short" ? "S"
            : "—",
      confidence: Math.min(95, ag.execution.confluenceCount * 10),
    },
    cntr: {
      status: ag.contrarian.challengesBias ? "ALERT" : "NO-TRADE",
      signal: ag.contrarian.challengesBias
        ? (ag.trend.bias === "bullish" ? "S" : "L")
        : "—",
      confidence: ag.contrarian.trapConfidence,
    },
  };
}

function buildTicker(quotes: AssetSnapshot[]): string {
  if (!quotes.length) return "";
  const parts = quotes.map(q => {
    const dir = q.change >= 0 ? "+" : "";
    return `${q.symbol} ${q.price.toFixed(q.price > 100 ? 2 : 4)} ${dir}${q.changePercent.toFixed(2)}%`;
  });
  const line = parts.join("  ·  ");
  return `${line}  ·  ${line}`;
}

// ─── Components ──────────────────────────────────────────────────────────────

function assetUrl(path: string) { return encodeURI(path); }

function seatedBaseUrl(skin: string) {
  return assetUrl(`/lpc-sitting-kit/Bases/Androgynous/Recolors/${skin}/Sitting - Chair.png`);
}
function seatedClothesUrl(item: "Longsleeved Shirt" | "Pants" | "Shoes", color: string) {
  return assetUrl(`/lpc-sitting-kit/Clothes/Androgynous/Recolors/${color}/${item} - Sitting (Chair).png`);
}
function seatedHairUrl(style: string, color: string) {
  return assetUrl(`/lpc-sitting-kit/Hair/${style}/Recolors/${color}/Sitting (Chair).png`);
}
function seatedLayerStyle(imageUrl: string, frame: number, scale = 1): CSSProperties {
  return {
    "--seat-image": `url("${imageUrl}")`,
    "--seat-width": `${64 * scale}px`,
    "--seat-height": `${64 * scale}px`,
    "--seat-sheet-width": `${64 * scale}px`,
    "--seat-sheet-height": `${256 * scale}px`,
    "--seat-frame-y": `${-64 * frame * scale}px`,
  } as CSSProperties;
}

function SeatedOperator({ look, className }: { look: OperatorLook; className?: string }) {
  const scale = look.scale ?? 1;
  const layers = [
    seatedBaseUrl(look.skin),
    seatedClothesUrl("Shoes", look.shoesColor),
    seatedClothesUrl("Pants", look.pantsColor),
    seatedClothesUrl("Longsleeved Shirt", look.shirtColor),
    seatedHairUrl(look.hairStyle, look.hairColor),
  ];
  return (
    <div
      className={`${styles.seatedActor} ${className ?? ""}`}
      style={{ "--seat-actor-width": `${64 * scale}px`, "--seat-actor-height": `${64 * scale}px` } as CSSProperties}
      aria-hidden="true"
    >
      {layers.map((url, i) => (
        <span key={i} className={styles.seatedLayer} style={seatedLayerStyle(url, look.seatFrame, scale)} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PixelTradingFloor({ onAgentClick }: { onAgentClick?: (agentId: string) => void }) {
  const { settings } = useSettings();
  const symbol = settings.selectedSymbol ?? "XAUUSD";

  const { data: runData } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${symbol}&timeframe=H1`,
    swrFetch,
    { dedupingInterval: 300_000, revalidateOnFocus: false }
  );

  const { quotes } = useQuotes(30_000);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [liveMap, setLiveMap] = useState<Record<string, StationLive>>({});
  const [tickerText, setTickerText] = useState("");
  const [masterBias, setMasterBias] = useState<"LONG" | "SHORT" | "WAIT">("WAIT");

  useEffect(() => {
    if (!runData) return;
    const map = deriveStations(runData);
    setLiveMap(map);
    const b = runData.agents.trend.bias;
    setMasterBias(b === "bullish" ? "LONG" : b === "bearish" ? "SHORT" : "WAIT");
  }, [runData]);

  useEffect(() => {
    if (quotes.length) setTickerText(buildTicker(quotes));
  }, [quotes]);

  // Auto-cycle through all stations every 3s
  useEffect(() => {
    const t = window.setInterval(() => {
      setSelectedIdx(i => (i + 1) % STATION_BLUEPRINTS.length);
    }, 3_000);
    return () => window.clearInterval(t);
  }, []);

  const selectedStation = STATION_BLUEPRINTS[selectedIdx] ?? STATION_BLUEPRINTS[0];
  const selectedLive = liveMap[selectedStation.id];

  const liveStatus = selectedLive?.status ?? selectedStation.status;
  const liveSignal = selectedLive?.signal ?? "—";
  const liveConf   = selectedLive?.confidence ?? selectedStation.score;

  const boardScore =
    liveStatus === "TRADE-OK"
      ? liveConf
      : liveStatus === "ALERT"
      ? -Math.abs(liveConf)
      : -Math.abs(82 - selectedStation.score);

  return (
    <main className={styles.root}>
      <div className={styles.sceneFrame}>
        <section className={styles.scene} aria-label="Tradex war-room trading floor">

          {/* ── Header bar ─────────────────────────────────────── */}
          <div className={styles.topHeader}>
            <span>TRDX://WAR-ROOM</span>
            <div className={styles.headerLights} aria-hidden="true">
              <span className={styles.headerRed} />
              <span className={styles.headerAmber} />
              <span className={styles.headerGreen} />
            </div>
          </div>

          {/* ── Floor canvas ───────────────────────────────────── */}
          <div className={styles.upperFloor}>

            {/* Wall display ticker */}
            <div className={styles.wallDisplay} aria-hidden="true">
              {tickerText && (
                <span className={styles.wallTicker}>{tickerText}</span>
              )}
            </div>

            {/* SVG data-flow connections (lowest layer) */}
            <svg className={styles.floorSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {CONNECTIONS.map((c, i) => (
                <g key={i}>
                  <line x1={`${c.x1}%`} y1={`${c.y1}%`} x2={`${c.x2}%`} y2={`${c.y2}%`} className={styles.connLineGlow} />
                  <line x1={`${c.x1}%`} y1={`${c.y1}%`} x2={`${c.x2}%`} y2={`${c.y2}%`} className={styles.connLine} />
                </g>
              ))}
              {/* Node dots at each agent position */}
              {STATION_BLUEPRINTS.map(s => (
                <circle key={s.id} cx={`${s.left}%`} cy={`${s.top}%`} r="0.8" className={styles.connNode} />
              ))}
              <circle cx="50%" cy="60%" r="1.2" className={styles.connNodeMaster} />
            </svg>

            {/* ── Agent stations ─────────────────────────────── */}
            {STATION_BLUEPRINTS.map((station) => {
              const isSelected = selectedStation.id === station.id;
              const live = liveMap[station.id];
              const status = live?.status ?? station.status;
              const signal = live?.signal ?? "—";
              const conf   = live?.confidence ?? station.score;
              const isOk    = status === "TRADE-OK";
              const isAlert = status === "ALERT";
              return (
                <button
                  key={station.id}
                  type="button"
                  className={`${styles.stationPod} ${isSelected ? styles.stationSelected : ""} ${isAlert ? styles.stationAlert : ""}`}
                  style={{ left: `${station.left}%`, top: `${station.top}%` }}
                  onClick={() => {
                    const idx = STATION_BLUEPRINTS.findIndex(s => s.id === station.id);
                    if (idx >= 0) setSelectedIdx(idx);
                    onAgentClick?.(STATION_TO_DRAWER[station.id] ?? station.id);
                  }}
                  aria-pressed={isSelected}
                >
                  {/* Signal direction badge */}
                  <div className={`${styles.sigBadge} ${signal === "L" ? styles.sigL : signal === "S" ? styles.sigS : styles.sigN}`}>
                    {signal}
                  </div>

                  {/* Desk name pill */}
                  <div className={`${styles.stationPill} ${isOk ? styles.pillOk : styles.pillBad}`}>
                    {station.label}
                  </div>

                  {/* Character — rendered FIRST so desk console clips legs */}
                  <SeatedOperator look={station.seatedLook} className={styles.stationSprite} />

                  {/* Desk console */}
                  <div className={`${styles.stationConsole} ${isOk ? styles.consoleOk : styles.consoleBad} ${isSelected ? styles.consoleSelected : ""}`}>
                    <span className={`${styles.monitorSide} ${isAlert ? styles.ledAlert : ""}`} />
                    <span className={`${styles.monitorMain} ${isOk ? styles.monitorMainOk : styles.monitorMainBad} ${isAlert ? styles.monitorAlert : ""}`} />
                    <span className={`${styles.monitorSide} ${isAlert ? styles.ledAlert : ""}`} />
                  </div>

                  {/* Confidence label */}
                  <div className={styles.confLabel}>{conf}%</div>

                  {/* Risk badge */}
                  {station.id === "risk" && (
                    <div className={styles.riskBadge} aria-hidden="true">!</div>
                  )}
                </button>
              );
            })}

            {/* ── Master command station ─────────────────────── */}
            <button
              type="button"
              className={styles.masterDesk}
              onClick={() => onAgentClick?.("master")}
            >
              <div className={styles.masterChair} />
              <SeatedOperator look={CENTRAL_LOOK} className={styles.masterSeatedSprite} />
              <div className={styles.masterConsole}>
                <span className={styles.masterMonitor} />
                <span className={styles.masterMonitorWide} />
                <span className={styles.masterMonitorWide} />
                <span className={styles.masterMonitor} />
              </div>
              <span className={`${styles.masterLabel} ${masterBias === "LONG" ? styles.masterBiasLong : masterBias === "SHORT" ? styles.masterBiasShort : ""}`}>
                MASTER — {masterBias}
              </span>
            </button>

            {/* ── Selected agent info strip (bottom of floor) ── */}
            <div className={styles.infoStrip}>
              <span className={styles.infoLabel}>{selectedStation.label}</span>
              <span className={styles.infoSep}>·</span>
              <span className={styles.infoAnalyst}>{selectedStation.analyst}</span>
              <span className={styles.infoSep}>·</span>
              <span className={`${styles.infoStatus} ${liveStatus === "TRADE-OK" ? styles.infoOk : styles.infoBad}`}>
                {liveStatus}
              </span>
              <span className={styles.infoSep}>·</span>
              <span className={styles.infoScore}>
                {liveSignal !== "—" ? `${liveSignal} ` : ""}CONF {liveConf}%
              </span>
              <span className={styles.infoDetail}>{selectedStation.detail}</span>
            </div>

            <div className={styles.floorWordmark}>TRADING FLOOR</div>
          </div>
        </section>
      </div>
    </main>
  );
}
