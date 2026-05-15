"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Brain, X, Zap, Loader2, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown,
  Minus, ChevronRight, Users, Scale, TrendingUp as Bull, TrendingDown as Bear,
  Search, Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Asset config ──────────────────────────────────────────────────────────────

const ASSETS = [
  { symbol: "XAUUSD", label: "Gold",    full: "Gold (XAUUSD)" },
  { symbol: "EURUSD", label: "EUR/USD", full: "EUR/USD (DXY Proxy)" },
  { symbol: "USDJPY", label: "USD/JPY", full: "S&P 500 Risk Proxy (USDJPY)" },
  { symbol: "BTCUSD", label: "BTC",     full: "Bitcoin (BTC)" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  bias: {
    direction: "bullish" | "bearish" | "neutral";
    confidence: number;
    summary: string;
  };
  marketPhase: string;
  narrative: string;
  tradeStatus: "TRADE READY" | "WATCHLIST" | "NO TRADE";
  setup: {
    entry: number | null;
    stopLoss: number | null;
    tp1: number | null;
    tp2: number | null;
    rr: number | null;
    liquidityTarget: string;
  } | null;
  noTradeReason: string | null;
  executionGuidance: {
    waitFor: string;
    confirms: string;
    invalidates: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function biasColor(dir: "bullish" | "bearish" | "neutral") {
  if (dir === "bullish") return "#00C896";
  if (dir === "bearish") return "#FF4D4F";
  return "#8B949E";
}

function BiasIcon({ dir }: { dir: "bullish" | "bearish" | "neutral" }) {
  if (dir === "bullish") return <TrendingUp  className="h-4 w-4" style={{ color: "#00C896" }} />;
  if (dir === "bearish") return <TrendingDown className="h-4 w-4" style={{ color: "#FF4D4F" }} />;
  return <Minus className="h-4 w-4" style={{ color: "#8B949E" }} />;
}

function TradeStatusBadge({ status }: { status: "TRADE READY" | "WATCHLIST" | "NO TRADE" }) {
  const cfg = {
    "TRADE READY": { icon: CheckCircle2, color: "#00C896", bg: "#00C89615", border: "#00C89630", label: "TRADE READY" },
    "WATCHLIST":   { icon: Clock,        color: "#F59E0B", bg: "#F59E0B15", border: "#F59E0B30", label: "WATCHLIST" },
    "NO TRADE":    { icon: XCircle,      color: "#FF4D4F", bg: "#FF4D4F15", border: "#FF4D4F30", label: "NO TRADE" },
  }[status];
  const Icon = cfg.icon;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-widest font-semibold mb-2"
      style={{ color: "#8B949E" }}>
      {children}
    </p>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-[10px]" style={{ color: "#8B949E" }}>{label}</span>
      <span className="text-[12px] font-mono font-semibold" style={{ color: color ?? "#E6EDF3" }}>
        {value}
      </span>
    </div>
  );
}

function GuidanceRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2.5 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-[9px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: "#8B949E" }}>{label}</p>
        <p className="text-[11px] leading-relaxed" style={{ color: "#E6EDF3" }}>{value}</p>
      </div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton() {
  const pulse = "animate-pulse rounded" as const;
  return (
    <div className="space-y-4">
      <div className={cn(pulse, "h-16 w-full")} style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className={cn(pulse, "h-6 w-2/3")}  style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="space-y-2">
        <div className={cn(pulse, "h-4 w-full")} style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className={cn(pulse, "h-4 w-5/6")} style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className={cn(pulse, "h-4 w-4/6")} style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className={cn(pulse, "h-20 w-full")} style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="space-y-2">
        <div className={cn(pulse, "h-12 w-full")} style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className={cn(pulse, "h-12 w-full")} style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className={cn(pulse, "h-12 w-full")} style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
    </div>
  );
}

// ── Debate types ──────────────────────────────────────────────────────────────

interface DebateResult {
  researcher: {
    summary: string;
    keyFindings: string[];
    structurePhase: string;
    macroContext: string;
    riskLevel: string;
  };
  bull: {
    case: string;
    entryZone: string;
    targetLevel: string;
    stopLevel: string;
    confluences: string[];
    conviction: number;
  };
  bear: {
    case: string;
    mainRisk: string;
    entryZone: string | null;
    targetLevel: string | null;
    stopLevel: string | null;
    confluences: string[];
    conviction: number;
  };
  arbitrator: {
    verdict: "TRADE READY" | "WATCHLIST" | "NO TRADE";
    side: "LONG" | "SHORT" | "FLAT";
    reasoning: string;
    winnerArgument: "BULL" | "BEAR" | "NEUTRAL";
    finalEntry: number | null;
    finalStop: number | null;
    finalTP: number | null;
    rr: number | null;
    keyCondition: string | null;
  };
}

// ── Debate UI helpers ─────────────────────────────────────────────────────────

const DEBATE_STAGES = [
  { key: "researcher", label: "Researcher", icon: Search,  color: "#60A5FA", bg: "#60A5FA" },
  { key: "bull",       label: "Bull",       icon: TrendingUp,  color: "#00C896", bg: "#00C896" },
  { key: "bear",       label: "Bear",       icon: TrendingDown, color: "#FF4D4F", bg: "#FF4D4F" },
  { key: "arbitrator", label: "Verdict",    icon: Gavel,    color: "#A78BFA", bg: "#A78BFA" },
] as const;

function AgentCard({
  icon: Icon,
  label,
  color,
  children,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${color}25`, background: `${color}08` }}>
      <div className="flex items-center gap-2 px-3 py-2.5"
        style={{ borderBottom: `1px solid ${color}15`, background: `${color}12` }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="px-3 py-3 space-y-2">{children}</div>
    </div>
  );
}

function DebateStageIndicator({ activeStage }: { activeStage: number }) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {DEBATE_STAGES.map((s, i) => {
        const Icon = s.icon;
        const done    = i < activeStage;
        const current = i === activeStage;
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-all",
                  current && "ring-2 ring-offset-1")}
                style={{
                  background: done || current ? `${s.color}25` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${done || current ? s.color : "rgba(255,255,255,0.1)"}`,
                }}>
                {current
                  ? <Loader2 className="h-3 w-3 animate-spin" style={{ color: s.color }} />
                  : <Icon className="h-3 w-3" style={{ color: done || current ? s.color : "#4A5568" }} />}
              </div>
              <span className="text-[8px] font-semibold"
                style={{ color: done || current ? s.color : "#4A5568" }}>
                {s.label}
              </span>
            </div>
            {i < DEBATE_STAGES.length - 1 && (
              <div className="flex-1 h-px mb-3.5"
                style={{ background: done ? `${DEBATE_STAGES[i + 1].color}40` : "rgba(255,255,255,0.06)" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AIAnalysisPanel() {
  const [open, setOpen]               = useState(false);
  const [asset, setAsset]             = useState("XAUUSD");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [marketData, setMarketData]   = useState<Record<string, any>>({});
  const [dataLoading, setDataLoading] = useState(false);

  // Debate mode
  const [mode, setMode]               = useState<"analysis" | "debate">("analysis");
  const [debating, setDebating]       = useState(false);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [debateError, setDebateError] = useState<string | null>(null);
  const [debateStage, setDebateStage] = useState(-1); // -1 = idle

  // ── Fetch market data from existing endpoints ────────────────────────────
  const fetchMarketData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [klRes, biasRes] = await Promise.all([
        fetch("/api/market/keylevels"),
        fetch("/api/market/bias"),
      ]);
      const kl   = klRes.ok   ? await klRes.json()   : { data: [] };
      const bias = biasRes.ok ? await biasRes.json() : { data: [] };

      // Index key levels by asset symbol
      const klMap: Record<string, any> = {};
      (kl.data ?? []).forEach((d: any) => { klMap[d.asset] = d; });

      // Index bias by display name → map to symbol
      const biasSymMap: Record<string, string> = {
        "Gold (XAUUSD)":               "XAUUSD",
        "EUR/USD (DXY Proxy)":         "EURUSD",
        "S&P 500 Risk Proxy (USDJPY)": "USDJPY",
        "Bitcoin (BTC)":               "BTCUSD",
      };
      const biasMap: Record<string, any> = {};
      (bias.data ?? []).forEach((d: any) => {
        const sym = biasSymMap[d.asset];
        if (sym) biasMap[sym] = d;
      });

      setMarketData({ kl: klMap, bias: biasMap });
    } catch {
      // silent  -  panel can still analyze with partial data
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchMarketData();
  }, [open, fetchMarketData]);

  // Reset results when switching asset or mode
  useEffect(() => {
    setResult(null);
    setError(null);
    setDebateResult(null);
    setDebateError(null);
    setDebateStage(-1);
  }, [asset, mode]);

  // ── Analyze ──────────────────────────────────────────────────────────────
  async function analyze() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const kl   = marketData.kl?.[asset]   ?? {};
      const bias = marketData.bias?.[asset] ?? {};
      const assetInfo = ASSETS.find(a => a.symbol === asset)!;

      const payload = {
        asset,
        display:              assetInfo.full,
        price:                kl.price ?? 0,
        pctChange:            kl.pctChange ?? 0,
        rsi:                  bias.rsi ?? 50,
        high52w:              kl.high52w ?? 0,
        low52w:               kl.low52w  ?? 0,
        htfBias:              kl.htfBias              ?? bias.bias       ?? "neutral",
        htfConfidence:        kl.htfConfidence        ?? bias.confidence ?? 50,
        ltfBias:              kl.bias                 ?? "neutral",
        tradeStatus:          kl.tradeStatus          ?? "NO TRADE",
        alignment:            kl.alignment?.type      ?? "ranging",
        smcContext:           kl.smcContext           ?? "",
        entry:                kl.entry                ?? null,
        stopLoss:             kl.stopLoss             ?? null,
        tp1:                  kl.takeProfit1          ?? null,
        tp2:                  kl.takeProfit2          ?? null,
        rrRatio:              kl.rrRatio              ?? null,
        setupQuality:         kl.setupQuality         ?? "NO TRADE",
        confluences:          kl.confluences          ?? [],
        sessionContext:       kl.sessionContext       ?? "Closed",
        sessionNote:          kl.sessionNote          ?? "",
        liquidityTarget:      kl.liquidityTarget      ?? "",
        supportingFactors:    bias.supportingFactors  ?? [],
        invalidationFactors:  bias.invalidationFactors ?? [],
      };

      const res = await fetch("/api/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.analysis);
    } catch (e: any) {
      setError(e.message || "Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Debate ───────────────────────────────────────────────────────────────
  async function runDebate() {
    if (debating) return;
    setDebating(true);
    setDebateError(null);
    setDebateResult(null);
    setDebateStage(0); // researcher

    try {
      const kl   = marketData.kl?.[asset]   ?? {};
      const bias = marketData.bias?.[asset] ?? {};
      const assetInfo = ASSETS.find(a => a.symbol === asset)!;

      const payload = {
        asset,
        display:              assetInfo.full,
        price:                kl.price ?? 0,
        pctChange:            kl.pctChange ?? 0,
        rsi:                  bias.rsi ?? 50,
        high52w:              kl.high52w ?? 0,
        low52w:               kl.low52w  ?? 0,
        htfBias:              kl.htfBias              ?? bias.bias       ?? "neutral",
        htfConfidence:        kl.htfConfidence        ?? bias.confidence ?? 50,
        ltfBias:              kl.bias                 ?? "neutral",
        tradeStatus:          kl.tradeStatus          ?? "NO TRADE",
        alignment:            kl.alignment?.type      ?? "ranging",
        smcContext:           kl.smcContext           ?? "",
        entry:                kl.entry                ?? null,
        stopLoss:             kl.stopLoss             ?? null,
        tp1:                  kl.takeProfit1          ?? null,
        tp2:                  kl.takeProfit2          ?? null,
        rrRatio:              kl.rrRatio              ?? null,
        setupQuality:         kl.setupQuality         ?? "NO TRADE",
        confluences:          kl.confluences          ?? [],
        sessionContext:       kl.sessionContext       ?? "Closed",
        sessionNote:          kl.sessionNote          ?? "",
        liquidityTarget:      kl.liquidityTarget      ?? "",
        supportingFactors:    bias.supportingFactors  ?? [],
        invalidationFactors:  bias.invalidationFactors ?? [],
      };

      // Simulate progressive stage updates (API runs all 4 in sequence server-side)
      const stageTimer = setInterval(() => {
        setDebateStage(s => (s < 3 ? s + 1 : s));
      }, 4500);

      const res = await fetch("/api/ai/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearInterval(stageTimer);
      setDebateStage(3); // arbitrator done

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDebateResult(data as DebateResult);
    } catch (e: any) {
      setDebateError(e.message || "Debate failed. Try again.");
    } finally {
      setDebating(false);
      setDebateStage(-1);
    }
  }

  // ── Current snapshot for idle state ─────────────────────────────────────
  const kl   = marketData.kl?.[asset]   ?? {};
  const bias = marketData.bias?.[asset] ?? {};
  const currentPrice  = kl.price ?? 0;
  const currentHtf    = kl.htfBias ?? bias.bias ?? "neutral";
  const currentConf   = kl.htfConfidence ?? bias.confidence ?? 50;
  const currentStatus = kl.tradeStatus ?? "NO TRADE";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Backdrop (mobile) ─────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-in drawer ───────────────────────────── */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-[60] flex flex-col transition-transform duration-300 ease-out",
          "w-full sm:w-[400px]",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ background: "hsl(220,18%,6%)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "hsl(220,18%,8%)" }}>
          <Brain className="h-4 w-4 shrink-0" style={{ color: "#A78BFA" }} />
          <span className="text-sm font-bold text-white flex-1">AI Analysis</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "#A78BFA20", color: "#A78BFA", border: "1px solid #A78BFA30" }}>
            BETA
          </span>
          <button onClick={() => setOpen(false)}
            className="rounded-md p-1 text-gray-500 hover:text-white hover:bg-white/10 transition-colors ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="flex shrink-0 px-3 pt-2.5 pb-0 gap-1"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {(["analysis", "debate"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg transition-all",
                mode === m ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
              style={mode === m
                ? { background: "rgba(167,139,250,0.12)", borderBottom: "2px solid #A78BFA" }
                : { borderBottom: "2px solid transparent" }}>
              {m === "analysis" ? <Brain className="h-3 w-3" /> : <Users className="h-3 w-3" />}
              {m === "analysis" ? "Analysis" : "Agent Debate"}
            </button>
          ))}
        </div>

        {/* Asset tabs */}
        <div className="flex shrink-0 px-3 pt-3 pb-2 gap-1.5 flex-wrap"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {ASSETS.map(a => (
            <button
              key={a.symbol}
              onClick={() => setAsset(a.symbol)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                asset === a.symbol
                  ? "text-[#A78BFA]"
                  : "text-gray-500 hover:text-gray-300"
              )}
              style={asset === a.symbol
                ? { background: "#A78BFA20", border: "1px solid #A78BFA40" }
                : { background: "transparent", border: "1px solid transparent" }}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>

          {/* ══════════════ DEBATE MODE ══════════════ */}
          {mode === "debate" && (
            <>
              {/* Context snapshot */}
              {!dataLoading && currentPrice > 0 && (
                <div className="rounded-xl p-3 space-y-1.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: "#8B949E" }}>Live Context</span>
                    <TradeStatusBadge status={currentStatus as any} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <BiasIcon dir={currentHtf as any} />
                    <span className="text-[13px] font-mono font-bold" style={{ color: biasColor(currentHtf as any) }}>
                      {currentHtf.toUpperCase()}
                    </span>
                    <span className="text-[11px]" style={{ color: "#8B949E" }}>
                      {currentConf}% conviction
                    </span>
                    <span className="ml-auto text-[13px] font-mono font-bold" style={{ color: "#E6EDF3" }}>
                      {currentPrice.toLocaleString("en-US", { maximumFractionDigits: asset === "BTCUSD" ? 0 : asset === "XAUUSD" ? 2 : 4 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Start debate button */}
              {!debating && (
                <button
                  onClick={runDebate}
                  disabled={dataLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold transition-all"
                  style={{
                    background: debateResult ? "rgba(167,139,250,0.10)" : "rgba(167,139,250,0.15)",
                    border: "1px solid rgba(167,139,250,0.30)",
                    color: "#A78BFA",
                  }}>
                  {debateResult
                    ? <><RefreshCw className="h-3.5 w-3.5" /> Re-run Debate</>
                    : <><Users className="h-4 w-4" /> Start Agent Debate</>}
                </button>
              )}

              {/* Debate in progress */}
              {debating && (
                <div className="space-y-4">
                  <p className="text-center text-[11px]" style={{ color: "#8B949E" }}>
                    Agents are debating {ASSETS.find(a => a.symbol === asset)?.label}…
                  </p>
                  <DebateStageIndicator activeStage={debateStage} />
                  <div className="space-y-2">
                    {["Researcher analyzing market structure…", "Bull building long case…", "Bear challenging position…", "Risk Manager making final call…"]
                      .slice(0, debateStage + 1)
                      .map((msg, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          {i === debateStage
                            ? <Loader2 className="h-3.5 w-3.5 mt-0.5 animate-spin shrink-0" style={{ color: DEBATE_STAGES[i].color }} />
                            : <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: DEBATE_STAGES[i].color }} />}
                          <span className="text-[11px]" style={{ color: i === debateStage ? "#E6EDF3" : "#8B949E" }}>{msg}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Debate error */}
              {debateError && !debating && (
                <div className="rounded-xl p-3 flex items-start gap-2.5"
                  style={{ background: "#FF4D4F10", border: "1px solid #FF4D4F25" }}>
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#FF4D4F" }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: "#FF4D4F" }}>{debateError}</p>
                </div>
              )}

              {/* Debate idle */}
              {!debating && !debateResult && !debateError && (
                <div className="text-center py-6">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: "#A78BFA" }} />
                  <p className="text-[12px]" style={{ color: "#8B949E" }}>
                    4 AI agents will debate the trade.<br />
                    <span style={{ color: "#A78BFA" }}>Researcher → Bull → Bear → Verdict</span>
                  </p>
                </div>
              )}

              {/* Debate result */}
              {debateResult && !debating && (
                <div className="space-y-3">

                  {/* Researcher */}
                  <AgentCard icon={Search} label="Researcher" color="#60A5FA">
                    <p className="text-[11px] leading-relaxed" style={{ color: "#C9D1D9" }}>
                      {debateResult.researcher.summary}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {debateResult.researcher.keyFindings.map((f, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full"
                          style={{ background: "#60A5FA12", border: "1px solid #60A5FA25", color: "#60A5FA" }}>
                          {f}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[9px]" style={{ color: "#8B949E" }}>Phase: <span style={{ color: "#60A5FA" }}>{debateResult.researcher.structurePhase}</span></span>
                      <span className="text-[9px]" style={{ color: "#8B949E" }}>Risk: <span style={{ color: debateResult.researcher.riskLevel === "High" ? "#FF4D4F" : debateResult.researcher.riskLevel === "Low" ? "#00C896" : "#F59E0B" }}>{debateResult.researcher.riskLevel}</span></span>
                    </div>
                  </AgentCard>

                  {/* Bull */}
                  <AgentCard icon={TrendingUp} label={`Bull (${debateResult.bull.conviction}% conviction)`} color="#00C896">
                    <p className="text-[11px] leading-relaxed" style={{ color: "#C9D1D9" }}>
                      {debateResult.bull.case}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                      <div className="rounded-lg p-1.5 text-center" style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.15)" }}>
                        <p className="text-[8px] uppercase mb-0.5" style={{ color: "#8B949E" }}>Entry</p>
                        <p className="text-[10px] font-mono font-bold" style={{ color: "#00C896" }}>{debateResult.bull.entryZone}</p>
                      </div>
                      <div className="rounded-lg p-1.5 text-center" style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.15)" }}>
                        <p className="text-[8px] uppercase mb-0.5" style={{ color: "#8B949E" }}>Target</p>
                        <p className="text-[10px] font-mono font-bold" style={{ color: "#00C896" }}>{debateResult.bull.targetLevel}</p>
                      </div>
                      <div className="rounded-lg p-1.5 text-center" style={{ background: "rgba(255,77,79,0.08)", border: "1px solid rgba(255,77,79,0.15)" }}>
                        <p className="text-[8px] uppercase mb-0.5" style={{ color: "#8B949E" }}>Stop</p>
                        <p className="text-[10px] font-mono font-bold" style={{ color: "#FF4D4F" }}>{debateResult.bull.stopLevel}</p>
                      </div>
                    </div>
                  </AgentCard>

                  {/* Bear */}
                  <AgentCard icon={TrendingDown} label={`Bear (${debateResult.bear.conviction}% conviction)`} color="#FF4D4F">
                    <p className="text-[11px] leading-relaxed" style={{ color: "#C9D1D9" }}>
                      {debateResult.bear.case}
                    </p>
                    <div className="rounded-lg px-2.5 py-2 mt-1.5"
                      style={{ background: "rgba(255,77,79,0.08)", border: "1px solid rgba(255,77,79,0.15)" }}>
                      <p className="text-[9px] uppercase mb-0.5" style={{ color: "#8B949E" }}>Main Risk</p>
                      <p className="text-[11px]" style={{ color: "#FF4D4F" }}>{debateResult.bear.mainRisk}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {debateResult.bear.confluences.map((f, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full"
                          style={{ background: "#FF4D4F12", border: "1px solid #FF4D4F25", color: "#FF4D4F" }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </AgentCard>

                  {/* Arbitrator verdict */}
                  <AgentCard icon={Gavel} label="Risk Manager Verdict" color="#A78BFA">
                    <div className="flex items-center gap-2 mb-2">
                      <TradeStatusBadge status={debateResult.arbitrator.verdict} />
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: debateResult.arbitrator.side === "LONG" ? "#00C89615" : debateResult.arbitrator.side === "SHORT" ? "#FF4D4F15" : "#8B949E15",
                          color: debateResult.arbitrator.side === "LONG" ? "#00C896" : debateResult.arbitrator.side === "SHORT" ? "#FF4D4F" : "#8B949E",
                        }}>
                        {debateResult.arbitrator.side}
                      </span>
                      <span className="text-[9px] ml-auto" style={{ color: "#8B949E" }}>
                        Winner: <span style={{ color: debateResult.arbitrator.winnerArgument === "BULL" ? "#00C896" : debateResult.arbitrator.winnerArgument === "BEAR" ? "#FF4D4F" : "#8B949E" }}>
                          {debateResult.arbitrator.winnerArgument}
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: "#C9D1D9" }}>
                      {debateResult.arbitrator.reasoning}
                    </p>
                    {debateResult.arbitrator.finalEntry != null && (
                      <div className="grid grid-cols-4 gap-1 mt-2">
                        <div className="rounded-lg p-1.5 text-center" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
                          <p className="text-[8px] mb-0.5" style={{ color: "#8B949E" }}>Entry</p>
                          <p className="text-[10px] font-mono font-bold" style={{ color: "#A78BFA" }}>{debateResult.arbitrator.finalEntry}</p>
                        </div>
                        <div className="rounded-lg p-1.5 text-center" style={{ background: "rgba(255,77,79,0.08)", border: "1px solid rgba(255,77,79,0.2)" }}>
                          <p className="text-[8px] mb-0.5" style={{ color: "#8B949E" }}>SL</p>
                          <p className="text-[10px] font-mono font-bold" style={{ color: "#FF4D4F" }}>{debateResult.arbitrator.finalStop}</p>
                        </div>
                        <div className="rounded-lg p-1.5 text-center" style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.2)" }}>
                          <p className="text-[8px] mb-0.5" style={{ color: "#8B949E" }}>TP</p>
                          <p className="text-[10px] font-mono font-bold" style={{ color: "#00C896" }}>{debateResult.arbitrator.finalTP}</p>
                        </div>
                        <div className="rounded-lg p-1.5 text-center" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
                          <p className="text-[8px] mb-0.5" style={{ color: "#8B949E" }}>R:R</p>
                          <p className="text-[10px] font-mono font-bold" style={{ color: debateResult.arbitrator.rr != null && debateResult.arbitrator.rr >= 2 ? "#00C896" : "#F59E0B" }}>
                            {debateResult.arbitrator.rr != null ? `1:${debateResult.arbitrator.rr}` : " - "}
                          </p>
                        </div>
                      </div>
                    )}
                    {debateResult.arbitrator.keyCondition && (
                      <div className="rounded-lg px-2.5 py-2 mt-2"
                        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                        <p className="text-[9px] uppercase mb-0.5" style={{ color: "#8B949E" }}>Key Condition</p>
                        <p className="text-[11px]" style={{ color: "#F59E0B" }}>{debateResult.arbitrator.keyCondition}</p>
                      </div>
                    )}
                  </AgentCard>

                  <p className="text-[9px] text-center pb-2" style={{ color: "#4A5568" }}>
                    AI debate is for informational purposes only. Not financial advice.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ══════════════ ANALYSIS MODE ══════════════ */}
          {mode === "analysis" && (<>

          {/* ── Context snapshot (always visible) ──── */}
          {!dataLoading && currentPrice > 0 && (
            <div className="rounded-xl p-3 space-y-1.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest" style={{ color: "#8B949E" }}>Live Context</span>
                <TradeStatusBadge status={currentStatus as any} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <BiasIcon dir={currentHtf as any} />
                <span className="text-[13px] font-mono font-bold" style={{ color: biasColor(currentHtf as any) }}>
                  {currentHtf.toUpperCase()}
                </span>
                <span className="text-[11px]" style={{ color: "#8B949E" }}>
                  {currentConf}% conviction
                </span>
                <span className="ml-auto text-[13px] font-mono font-bold" style={{ color: "#E6EDF3" }}>
                  {currentPrice.toLocaleString("en-US", { maximumFractionDigits: asset === "BTCUSD" ? 0 : asset === "XAUUSD" ? 2 : 4 })}
                </span>
              </div>
            </div>
          )}

          {/* ── Analyze button ─────────────────────── */}
          {!loading && (
            <button
              onClick={analyze}
              disabled={dataLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                result ? "py-2.5 text-[12px]" : "py-3 text-[13px]"
              )}
              style={{
                background: result ? "rgba(167,139,250,0.10)" : "rgba(167,139,250,0.15)",
                border: "1px solid rgba(167,139,250,0.30)",
                color: "#A78BFA",
              }}
            >
              {result
                ? <><RefreshCw className="h-3.5 w-3.5" /> Re-analyze {ASSETS.find(a => a.symbol === asset)?.label}</>
                : <><Zap className="h-4 w-4" /> Analyze {ASSETS.find(a => a.symbol === asset)?.label}</>}
            </button>
          )}

          {/* ── Loading ────────────────────────────── */}
          {loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 py-2">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#A78BFA" }} />
                <p className="text-[12px]" style={{ color: "#A78BFA" }}>
                  Analyzing {ASSETS.find(a => a.symbol === asset)?.label} with SMC/ICT framework…
                </p>
              </div>
              <Skeleton />
            </div>
          )}

          {/* ── Error ─────────────────────────────── */}
          {error && !loading && (
            <div className="rounded-xl p-3 flex items-start gap-2.5"
              style={{ background: "#FF4D4F10", border: "1px solid #FF4D4F25" }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#FF4D4F" }} />
              <p className="text-[11px] leading-relaxed" style={{ color: "#FF4D4F" }}>{error}</p>
            </div>
          )}

          {/* ── Idle state ─────────────────────────── */}
          {!loading && !result && !error && (
            <div className="text-center py-8">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: "#A78BFA" }} />
              <p className="text-[12px]" style={{ color: "#8B949E" }}>
                Click Analyze to get a professional<br />SMC/ICT analysis for{" "}
                <span style={{ color: "#A78BFA" }}>{ASSETS.find(a => a.symbol === asset)?.full?.split(" ")[0]}</span>.
              </p>
            </div>
          )}

          {/* ── Result ─────────────────────────────── */}
          {result && !loading && (
            <div className="space-y-4">

              {/* HTF BIAS */}
              <div>
                <SectionLabel>HTF Bias</SectionLabel>
                <div className="rounded-xl p-3.5"
                  style={{
                    background: `${biasColor(result.bias.direction)}10`,
                    border: `1px solid ${biasColor(result.bias.direction)}25`,
                  }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <BiasIcon dir={result.bias.direction} />
                    <span className="text-[15px] font-bold uppercase" style={{ color: biasColor(result.bias.direction) }}>
                      {result.bias.direction}
                    </span>
                    <span className="ml-auto text-[12px] font-mono font-semibold" style={{ color: biasColor(result.bias.direction) }}>
                      {result.bias.confidence}%
                    </span>
                  </div>
                  {/* confidence bar */}
                  <div className="h-1 rounded-full w-full mb-2.5"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${result.bias.confidence}%`,
                        background: biasColor(result.bias.direction),
                      }} />
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#E6EDF3" }}>
                    {result.bias.summary}
                  </p>
                </div>
              </div>

              {/* MARKET PHASE */}
              <div>
                <SectionLabel>Market Phase</SectionLabel>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "#A78BFA15", border: "1px solid #A78BFA30" }}>
                  <ChevronRight className="h-3 w-3" style={{ color: "#A78BFA" }} />
                  <span className="text-[12px] font-semibold" style={{ color: "#A78BFA" }}>
                    {result.marketPhase}
                  </span>
                </div>
              </div>

              {/* NARRATIVE */}
              <div>
                <SectionLabel>Narrative</SectionLabel>
                <div className="rounded-xl p-3.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[12px] leading-[1.7]" style={{ color: "#C9D1D9" }}>
                    {result.narrative}
                  </p>
                </div>
              </div>

              {/* TRADE STATUS */}
              <div>
                <SectionLabel>Trade Status</SectionLabel>
                <div className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3 px-3.5 py-3"
                    style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <TradeStatusBadge status={result.tradeStatus} />
                  </div>

                  {result.tradeStatus !== "NO TRADE" && result.setup ? (
                    <div className="px-3.5 py-2.5 space-y-0.5">
                      {result.setup.entry    != null && <InfoRow label="Entry"     value={String(result.setup.entry)}    />}
                      {result.setup.stopLoss != null && <InfoRow label="Stop Loss" value={String(result.setup.stopLoss)} color="#FF4D4F" />}
                      {result.setup.tp1      != null && <InfoRow label="TP1"       value={String(result.setup.tp1)}      color="#00C896" />}
                      {result.setup.tp2      != null && <InfoRow label="TP2"       value={String(result.setup.tp2)}      color="#00C89680" />}
                      {result.setup.rr       != null && (
                        <InfoRow label="R:R"
                          value={`1:${result.setup.rr}`}
                          color={result.setup.rr >= 2 ? "#00C896" : result.setup.rr >= 1.5 ? "#F59E0B" : "#FF4D4F"} />
                      )}
                      {result.setup.liquidityTarget && (
                        <div className="pt-1.5 pb-0.5">
                          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#8B949E" }}>
                            Liquidity Target
                          </p>
                          <p className="text-[11px] leading-relaxed" style={{ color: "#C9D1D9" }}>
                            {result.setup.liquidityTarget}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    result.noTradeReason && (
                      <div className="px-3.5 py-3">
                        <p className="text-[11px] leading-relaxed" style={{ color: "#8B949E" }}>
                          {result.noTradeReason}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* EXECUTION GUIDANCE */}
              <div>
                <SectionLabel>Execution Guidance</SectionLabel>
                <div className="rounded-xl px-3.5 py-1"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <GuidanceRow
                    icon={<Clock className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />}
                    label="Wait for"
                    value={result.executionGuidance.waitFor}
                  />
                  <GuidanceRow
                    icon={<CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#00C896" }} />}
                    label="Confirms"
                    value={result.executionGuidance.confirms}
                  />
                  <GuidanceRow
                    icon={<XCircle className="h-3.5 w-3.5" style={{ color: "#FF4D4F" }} />}
                    label="Invalidates"
                    value={result.executionGuidance.invalidates}
                  />
                </div>
              </div>

              {/* disclaimer */}
              <p className="text-[9px] text-center pb-2" style={{ color: "#4A5568" }}>
                AI analysis is for informational purposes only. Not financial advice.
              </p>
            </div>
          )}
          </>)}
        </div>
      </div>

      {/* ── Floating trigger button ────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "fixed z-50 h-10 w-10 rounded-full shadow-lg",
          "flex items-center justify-center transition-all hover:scale-105",
          "bottom-[76px] right-5",
        )}
        style={{
          background: open ? "#A78BFA" : "hsl(220,18%,12%)",
          border: `1px solid ${open ? "#A78BFA" : "rgba(167,139,250,0.35)"}`,
          boxShadow: open ? "0 0 18px rgba(167,139,250,0.35)" : "0 4px 12px rgba(0,0,0,0.4)",
        }}
        title="AI Market Analysis"
      >
        {open
          ? <X className="h-4 w-4 text-[#0a0e1a]" />
          : <Brain className="h-4 w-4" style={{ color: "#A78BFA" }} />
        }
      </button>
    </>
  );
}
