"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
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
  left: number;
  top: number;
  baseStatus: StationStatus;
  seatedLook: OperatorLook;
};

type StationLive = { status: StationStatus; signal: SignalDir; confidence: number };

// ─── Floor config ─────────────────────────────────────────────────────────────

const STATION_BLUEPRINTS: StationBlueprint[] = [
  {
    id: "trend", label: "TREND", left: 9, top: 5, baseStatus: "NO-TRADE",
    seatedLook: { skin: "Ivory", hairStyle: "Parted Short", hairColor: "Brown", shirtColor: "Forest", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2, scale: 1.0 },
  },
  {
    id: "pract", label: "PR.ACT", left: 30, top: 5, baseStatus: "NO-TRADE",
    seatedLook: { skin: "Gold", hairStyle: "Messy", hairColor: "Black", shirtColor: "Gray", pantsColor: "Black", shoesColor: "Black", seatFrame: 2, scale: 1.0 },
  },
  {
    id: "news", label: "NEWS", left: 57, top: 5, baseStatus: "TRADE-OK",
    seatedLook: { skin: "Dove", hairStyle: "Plain", hairColor: "White", shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, scale: 1.0 },
  },
  {
    id: "risk", label: "RISK", left: 83, top: 5, baseStatus: "NO-TRADE",
    seatedLook: { skin: "Copper", hairStyle: "Swoop", hairColor: "Black", shirtColor: "Maroon", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, scale: 1.0 },
  },
  {
    id: "exec", label: "EXEC", left: 19, top: 55, baseStatus: "NO-TRADE",
    seatedLook: { skin: "Coffee", hairStyle: "Buzzcut", hairColor: "Black", shirtColor: "Navy", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, scale: 1.0 },
  },
  {
    id: "cntr", label: "CNTR", left: 73, top: 55, baseStatus: "TRADE-OK",
    seatedLook: { skin: "Sienna", hairStyle: "Curly Short", hairColor: "Chestnut", shirtColor: "Purple", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2, scale: 1.0 },
  },
];

const CENTRAL_LOOK: OperatorLook = {
  skin: "Ivory", hairStyle: "Loose", hairColor: "Chestnut",
  shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black",
  seatFrame: 2, scale: 1.0,
};

const FLOOR_WIRES: CSSProperties[] = [
  { left: "10%", top: "27%", width: "19%" },
  { left: "31%", top: "27%", width: "25%" },
  { left: "58%", top: "27%", width: "24%" },
  { left: "20%", top: "63%", width: "28%" },
  { left: "51%", top: "63%", width: "21%" },
];

const FLOOR_DROPS: CSSProperties[] = [
  { left: "19%", top: "27%", height: "36%" },
  { left: "50%", top: "27%", height: "36%" },
  { left: "73%", top: "27%", height: "36%" },
];

// ─── Real-data helpers ────────────────────────────────────────────────────────

const swrFetch = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(r.status.toString()); return r.json(); });

function biasToSignal(b: DirectionalBias | undefined): SignalDir {
  return b === "bullish" ? "L" : b === "bearish" ? "S" : "—";
}
function biasToStatus(b: DirectionalBias | undefined, c: number): StationStatus {
  if (!b || b === "neutral") return "NO-TRADE";
  return c < 40 ? "ALERT" : "TRADE-OK";
}
function gradeToConf(g: RiskGrade | undefined): number {
  return g ? ({ A: 88, B: 72, C: 55, D: 38, F: 20 } as Record<RiskGrade, number>)[g] : 50;
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
        : ag.execution.signalState === "NO_TRADE" ? "NO-TRADE" : "ALERT",
      signal: ag.execution.direction === "long" ? "L"
        : ag.execution.direction === "short" ? "S" : "—",
      confidence: Math.min(95, ag.execution.confluenceCount * 10),
    },
    cntr: {
      status: ag.contrarian.challengesBias ? "ALERT" : "NO-TRADE",
      signal: ag.contrarian.challengesBias
        ? (ag.trend.bias === "bullish" ? "S" : "L") : "—",
      confidence: ag.contrarian.trapConfidence,
    },
  };
}

function buildTicker(quotes: AssetSnapshot[]): string {
  if (!quotes.length) return "TRDX://ENGINE ACTIVE · MKT-SCAN RUNNING · LOADING PRICES... · ";
  return (
    quotes.map(q => {
      const dir = q.changePercent > 0 ? "▲" : q.changePercent < 0 ? "▼" : "·";
      const p = q.price < 10 ? q.price.toFixed(5) : q.price < 1000 ? q.price.toFixed(3) : Math.round(q.price).toString();
      return `${q.symbol} ${p} ${dir}`;
    }).join(" · ") + " · "
  );
}

// ─── Sprite helpers ───────────────────────────────────────────────────────────

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

// ─── Station-to-drawer mapping ────────────────────────────────────────────────

const STATION_TO_DRAWER: Record<string, string> = {
  trend: "trend", pract: "smc", news: "news",
  risk: "risk", exec: "execution", cntr: "contrarian",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function PixelTradingFloor({ onAgentClick }: { onAgentClick?: (agentId: string) => void }) {
  const { settings } = useSettings();
  const { quotes } = useQuotes(30_000);
  const { data: runData } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${settings.selectedSymbol}&timeframe=H1`,
    swrFetch,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  );

  const [selectedId, setSelectedId] = useState("risk");

  const liveStates = runData ? deriveStations(runData) : null;
  const masterFinalBias = runData?.agents.master.finalBias;
  const masterConf = runData?.agents.master.confidence ?? 0;
  const masterLabel = masterConf > 0
    ? (masterFinalBias === "bullish" ? "BULLISH" : masterFinalBias === "bearish" ? "BEARISH" : "NO-TRADE")
    : "MASTER";
  const tickerText = buildTicker(quotes);

  return (
    <main className={styles.root}>
      <div className={styles.sceneFrame}>
        <section className={styles.scene} aria-label="Trading floor">

          <div className={styles.topHeader}>
            <span>TRDX://WAR-ROOM</span>
            <div className={styles.headerLights} aria-hidden="true">
              <span className={styles.headerRed} />
              <span className={styles.headerAmber} />
              <span className={styles.headerGreen} />
            </div>
          </div>

          <div className={styles.upperFloor}>
            {/* Live ticker */}
            <div className={styles.wallDisplay} aria-hidden="true">
              <span className={styles.wallTicker}>{tickerText}{tickerText}</span>
            </div>

            {/* Corner plants */}
            <div className={styles.cornerPlant} style={{ left: "1.5%", top: "8%" }} aria-hidden="true" />
            <div className={styles.cornerPlant} style={{ right: "1.5%", top: "8%" }} aria-hidden="true" />
            <div className={styles.cornerPlantSmall} style={{ left: "1.5%", top: "52%" }} aria-hidden="true" />
            <div className={styles.cornerPlantSmall} style={{ right: "1.5%", top: "52%" }} aria-hidden="true" />

            {FLOOR_WIRES.map((w, i) => <span key={`w${i}`} className={styles.floorWire} style={w} />)}
            {FLOOR_DROPS.map((d, i) => <span key={`d${i}`} className={styles.floorDrop} style={d} />)}

            {STATION_BLUEPRINTS.map((station) => {
              const isSelected = selectedId === station.id;
              const live = liveStates?.[station.id];
              const status = live?.status ?? station.baseStatus;
              const ok = status === "TRADE-OK";
              const alert = status === "ALERT";
              const signal = live?.signal ?? "—";
              const confidence = live?.confidence ?? 0;
              return (
                <button
                  key={station.id}
                  type="button"
                  className={`${styles.stationPod} ${isSelected ? styles.stationSelected : ""} ${alert ? styles.stationAlert : ""}`}
                  style={{ left: `${station.left}%`, top: `${station.top}%` }}
                  onClick={() => { setSelectedId(station.id); onAgentClick?.(STATION_TO_DRAWER[station.id] ?? station.id); }}
                  aria-pressed={isSelected}
                >
                  <div className={`${styles.stationBody} ${isSelected ? styles.stationBodySelected : ""}`}>

                    {/* Signal direction badge */}
                    {live && (
                      <div className={`${styles.sigBadge} ${signal === "L" ? styles.sigL : signal === "S" ? styles.sigS : styles.sigN}`}>
                        {signal}
                      </div>
                    )}

                    <div className={styles.stationKeyboard} aria-hidden="true" />

                    <div className={styles.spriteWrap}>
                      <SeatedOperator look={station.seatedLook} className={styles.stationSprite} />
                    </div>

                    <div className={styles.monitorGroup}>
                      <div className={`${styles.monitorBezel} ${ok ? styles.monitorOk : alert ? styles.monitorAlert : styles.monitorNoTrade}`}>
                        <div className={styles.monitorScreen} />
                        <span className={ok ? styles.monitorLabelOk : alert ? styles.monitorLabelAlert : styles.monitorLabelBad}>
                          {station.label}
                        </span>
                        <span className={`${styles.statusLed} ${ok ? styles.ledOk : alert ? styles.ledAlert : styles.ledNoTrade}`} aria-hidden="true" />
                      </div>
                      <div className={styles.monitorNeck} />
                      <div className={styles.monitorBase} />
                    </div>

                    {station.id === "risk" && alert && (
                      <div className={styles.riskBadge} aria-hidden="true">!</div>
                    )}
                  </div>

                  <div className={styles.confLabel}>
                    {live ? `${confidence}%` : ""}
                  </div>
                </button>
              );
            })}

            {/* ── Master desk ── */}
            <button type="button" className={styles.masterDesk} onClick={() => onAgentClick?.("master")}>
              <div className={styles.stationKeyboard} aria-hidden="true" />
              <div className={styles.masterSpriteWrap}>
                <SeatedOperator look={CENTRAL_LOOK} className={styles.masterSeatedSprite} />
              </div>
              <div className={styles.monitorGroup}>
                <div className={`${styles.monitorBezel} ${styles.masterBezel}`}>
                  <div className={styles.monitorScreen} />
                  <span className={`${styles.masterLabel} ${masterFinalBias === "bullish" ? styles.masterBiasLong : masterFinalBias === "bearish" ? styles.masterBiasShort : ""}`}>
                    {masterLabel}
                  </span>
                  <span className={`${styles.statusLed} ${styles.ledOk} ${styles.masterLed}`} aria-hidden="true" />
                </div>
                <div className={styles.monitorNeck} />
                <div className={styles.monitorBase} />
              </div>
            </button>

            <div className={styles.floorWordmark}>TRADING FLOOR</div>
          </div>

        </section>
      </div>
    </main>
  );
}
