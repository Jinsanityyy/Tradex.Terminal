"use client";

import type { CSSProperties } from "react";
import { useState, useEffect } from "react";
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
  const [agentStates, setAgentStates] = useState<Record<string, AgentLiveState>>({});
  const [masterState, setMasterState] = useState<MasterState | null>(null);
  const [mounted, setMounted] = useState(false);

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

  // Sync real agent data when SWR result arrives
  useEffect(() => {
    if (!runData) return;
    setAgentStates(prev => ({ ...prev, ...mapRunToStates(runData, rnd) }));
    setMasterState(mapRunToMaster(runData));
  }, [runData]);

  const tickerText = buildTicker(quotes);

  const handleClick = (agent: AgentDef) => {
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
          <div className={styles.confLabel}>
            {masterState ? `${masterState.confidence}%` : ""}
          </div>
        </button>

        <div className={styles.masterReadout}>
          <div className={styles.agentOverviewId}>MASTER</div>
          <div className={styles.agentOverviewRole}>CHIEF MKT OFFICER</div>

          {runData ? (() => {
            const m = runData.agents.master;
            const bias = m.finalBias === "bullish" ? "LONG" : m.finalBias === "bearish" ? "SHORT" : "NO-TRADE";
            const tone = m.finalBias === "bullish" ? styles.statOk : m.finalBias === "bearish" ? styles.statDanger : styles.statWarn;
            const barTone = m.finalBias === "bullish" ? styles.confBarOk : styles.confBarBad;
            const detail = m.supports?.[0] ?? m.noTradeReason ?? m.strategyMatch ?? "Awaiting consensus...";
            const score = `${m.consensusScore >= 0 ? "+" : ""}${m.consensusScore.toFixed(1)}`;
            const agreeing = m.agentConsensus?.filter(a => m.finalBias === "bullish" ? a.weightedScore > 0 : m.finalBias === "bearish" ? a.weightedScore < 0 : Math.abs(a.weightedScore) < 20).length ?? 0;
            return (
              <>
                <div className={`${styles.agentOverviewState} ${tone}`}>{bias}</div>
                <div className={styles.agentOverviewDetail}>{detail}</div>
                <div className={styles.statsRow}>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>CONF</span>
                    <span className={styles.statValue}>{m.confidence}%</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>SCORE</span>
                    <span className={styles.statValue}>{score}</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>AGREE</span>
                    <span className={styles.statValue}>{agreeing}/6</span>
                  </div>
                </div>
                <div className={styles.confBarWrap}>
                  <div className={`${styles.confBar} ${barTone}`} style={{ width: `${m.confidence}%` }} />
                </div>
              </>
            );
          })() : (
            <>
              <div className={styles.agentOverviewDetail}>Awaiting analysis...</div>
              {masterState && (
                <>
                  <div className={styles.statsRow}>
                    <div className={styles.statCell}>
                      <span className={styles.statLabel}>BIAS</span>
                      <span className={`${styles.statValue} ${masterState.bias === "LONG" ? styles.statOk : masterState.bias === "SHORT" ? styles.statDanger : ""}`}>
                        {masterState.bias}
                      </span>
                    </div>
                    <div className={styles.statCell}>
                      <span className={styles.statLabel}>CONF</span>
                      <span className={styles.statValue}>{masterState.confidence}%</span>
                    </div>
                  </div>
                  <div className={styles.confBarWrap}>
                    <div
                      className={`${styles.confBar} ${masterState.bias === "LONG" ? styles.confBarOk : styles.confBarBad}`}
                      style={{ width: `${masterState.confidence}%` }}
                    />
                  </div>
                </>
              )}
            </>
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

  const inner = (
    <>
      <div className={styles.stationBody}>
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
      <div className={styles.agentPod} aria-hidden="true">
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.agentPod} ${selected ? styles.podSelected : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {inner}
    </button>
  );
}
