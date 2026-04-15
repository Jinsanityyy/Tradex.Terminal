"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, TrendingUp, TrendingDown, Gavel, Users,
  Loader2, CheckCircle2, RefreshCw, AlertTriangle,
  XCircle, Clock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Assets ────────────────────────────────────────────────────────────────────

const ASSETS = [
  { symbol: "XAUUSD", label: "Gold",    full: "Gold (XAUUSD)" },
  { symbol: "EURUSD", label: "EUR/USD", full: "EUR/USD (DXY Proxy)" },
  { symbol: "USDJPY", label: "USD/JPY", full: "S&P 500 Risk Proxy (USDJPY)" },
  { symbol: "BTCUSD", label: "BTC",     full: "Bitcoin (BTC)" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES = [
  { key: "researcher", label: "Researcher",    icon: Search,      color: "#60A5FA", msg: "Analyzing market structure…" },
  { key: "bull",       label: "Bull",          icon: TrendingUp,  color: "#00C896", msg: "Building long case…" },
  { key: "bear",       label: "Bear",          icon: TrendingDown,color: "#FF4D4F", msg: "Challenging position…" },
  { key: "arbitrator", label: "Risk Manager",  icon: Gavel,       color: "#A78BFA", msg: "Making final call…" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function TradeStatusBadge({ status }: { status: "TRADE READY" | "WATCHLIST" | "NO TRADE" }) {
  const cfg = {
    "TRADE READY": { icon: CheckCircle2, color: "#00C896", bg: "#00C89615", border: "#00C89630" },
    "WATCHLIST":   { icon: Clock,        color: "#F59E0B", bg: "#F59E0B15", border: "#F59E0B30" },
    "NO TRADE":    { icon: XCircle,      color: "#FF4D4F", bg: "#FF4D4F15", border: "#FF4D4F30" },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <Icon className="h-3.5 w-3.5" /> {status}
    </span>
  );
}

function AgentCard({ icon: Icon, label, color, children }: {
  icon: React.ElementType; label: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${color}25`, background: `${color}06` }}>
      <div className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: `1px solid ${color}18`, background: `${color}10` }}>
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      <div className="px-4 py-4 space-y-3">{children}</div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg p-2.5 text-center flex-1"
      style={{ background: `${color ?? "#8B949E"}10`, border: `1px solid ${color ?? "#8B949E"}20` }}>
      <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#8B949E" }}>{label}</p>
      <p className="text-[12px] font-mono font-bold" style={{ color: color ?? "#E6EDF3" }}>{value}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentDebatePage() {
  const [asset, setAsset]               = useState("XAUUSD");
  const [debating, setDebating]         = useState(false);
  const [result, setResult]             = useState<DebateResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [stage, setStage]               = useState(-1);
  const [marketData, setMarketData]     = useState<Record<string, any>>({});
  const [dataLoading, setDataLoading]   = useState(false);

  // Reset on asset change
  useEffect(() => {
    setResult(null);
    setError(null);
    setStage(-1);
  }, [asset]);

  // Fetch market context
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [klRes, biasRes] = await Promise.all([
        fetch("/api/market/keylevels"),
        fetch("/api/market/bias"),
      ]);
      const kl   = klRes.ok   ? await klRes.json()   : { data: [] };
      const bias = biasRes.ok ? await biasRes.json() : { data: [] };

      const klMap: Record<string, any> = {};
      (kl.data ?? []).forEach((d: any) => { klMap[d.asset] = d; });

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
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function runDebate() {
    if (debating) return;
    setDebating(true);
    setError(null);
    setResult(null);
    setStage(0);

    try {
      const kl   = marketData.kl?.[asset]   ?? {};
      const bias = marketData.bias?.[asset] ?? {};
      const assetInfo = ASSETS.find(a => a.symbol === asset)!;

      const payload = {
        asset,
        display:             assetInfo.full,
        price:               kl.price ?? 0,
        pctChange:           kl.pctChange ?? 0,
        rsi:                 bias.rsi ?? 50,
        high52w:             kl.high52w ?? 0,
        low52w:              kl.low52w  ?? 0,
        htfBias:             kl.htfBias            ?? bias.bias       ?? "neutral",
        htfConfidence:       kl.htfConfidence      ?? bias.confidence ?? 50,
        ltfBias:             kl.bias               ?? "neutral",
        tradeStatus:         kl.tradeStatus        ?? "NO TRADE",
        alignment:           kl.alignment?.type    ?? "ranging",
        smcContext:          kl.smcContext         ?? "",
        entry:               kl.entry              ?? null,
        stopLoss:            kl.stopLoss           ?? null,
        tp1:                 kl.takeProfit1        ?? null,
        tp2:                 kl.takeProfit2        ?? null,
        rrRatio:             kl.rrRatio            ?? null,
        setupQuality:        kl.setupQuality       ?? "NO TRADE",
        confluences:         kl.confluences        ?? [],
        sessionContext:      kl.sessionContext     ?? "Closed",
        sessionNote:         kl.sessionNote        ?? "",
        liquidityTarget:     kl.liquidityTarget    ?? "",
        supportingFactors:   bias.supportingFactors   ?? [],
        invalidationFactors: bias.invalidationFactors ?? [],
      };

      // Advance stage indicator while API runs
      const timer = setInterval(() => {
        setStage(s => (s < 3 ? s + 1 : s));
      }, 4500);

      const res = await fetch("/api/ai/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearInterval(timer);
      setStage(3);

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as DebateResult);
    } catch (e: any) {
      setError(e.message || "Debate failed. Try again.");
    } finally {
      setDebating(false);
      setStage(-1);
    }
  }

  const kl            = marketData.kl?.[asset]   ?? {};
  const bias          = marketData.bias?.[asset] ?? {};
  const currentPrice  = kl.price ?? 0;
  const currentStatus = kl.tradeStatus ?? "NO TRADE";

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8" style={{ background: "hsl(220,18%,5%)" }}>

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Users className="h-5 w-5" style={{ color: "#A78BFA" }} />
          <h1 className="text-xl font-bold text-white">Agent Debate</h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "#A78BFA20", color: "#A78BFA", border: "1px solid #A78BFA30" }}>
            BETA
          </span>
        </div>
        <p className="text-[13px]" style={{ color: "#8B949E" }}>
          4 AI agents argue every trade before a verdict is reached — Researcher → Bull → Bear → Risk Manager
        </p>
      </div>

      {/* ── Asset selector + Run button ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {ASSETS.map(a => (
            <button key={a.symbol} onClick={() => setAsset(a.symbol)}
              disabled={debating}
              className={cn("px-4 py-2 rounded-lg text-[12px] font-semibold transition-all",
                asset === a.symbol ? "text-white" : "text-gray-500 hover:text-gray-300")}
              style={asset === a.symbol
                ? { background: "#A78BFA20", border: "1px solid #A78BFA50" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {a.label}
            </button>
          ))}
        </div>
        <button
          onClick={debating ? undefined : runDebate}
          disabled={debating || dataLoading}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all"
          style={{
            background: debating ? "rgba(167,139,250,0.08)" : "rgba(167,139,250,0.18)",
            border: "1px solid rgba(167,139,250,0.40)",
            color: "#A78BFA",
            opacity: dataLoading ? 0.5 : 1,
          }}>
          {debating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Debating…</>
            : result
            ? <><RefreshCw className="h-4 w-4" /> Re-run Debate</>
            : <><Users className="h-4 w-4" /> Start Debate</>}
        </button>
      </div>

      {/* ── Live context strip ── */}
      {currentPrice > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "#8B949E" }}>Live</span>
          <span className="text-[14px] font-mono font-bold text-white">
            {currentPrice.toLocaleString("en-US", { maximumFractionDigits: asset === "BTCUSD" ? 0 : asset === "XAUUSD" ? 2 : 4 })}
          </span>
          <TradeStatusBadge status={currentStatus as any} />
        </div>
      )}

      {/* ── Progress tracker (while debating) ── */}
      {debating && (
        <div className="rounded-xl p-5 mb-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[12px] text-center mb-5" style={{ color: "#8B949E" }}>
            Agents are debating {ASSETS.find(a => a.symbol === asset)?.label}…
          </p>
          <div className="flex items-center gap-2">
            {STAGES.map((s, i) => {
              const done    = i < stage;
              const current = i === stage;
              const Icon    = s.icon;
              return (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center"
                      style={{
                        background: done || current ? `${s.color}20` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${done || current ? s.color : "rgba(255,255,255,0.1)"}`,
                      }}>
                      {current
                        ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: s.color }} />
                        : <Icon className="h-4 w-4" style={{ color: done ? s.color : "#4A5568" }} />}
                    </div>
                    <span className="text-[10px] font-semibold"
                      style={{ color: done || current ? s.color : "#4A5568" }}>
                      {s.label}
                    </span>
                    {current && (
                      <span className="text-[9px]" style={{ color: "#8B949E" }}>{s.msg}</span>
                    )}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className="flex-1 h-px mb-6"
                      style={{ background: done ? `${STAGES[i + 1].color}40` : "rgba(255,255,255,0.06)" }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && !debating && (
        <div className="rounded-xl p-4 flex items-start gap-3 mb-6"
          style={{ background: "#FF4D4F10", border: "1px solid #FF4D4F25" }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#FF4D4F" }} />
          <p className="text-[12px]" style={{ color: "#FF4D4F" }}>{error}</p>
        </div>
      )}

      {/* ── Idle state ── */}
      {!debating && !result && !error && (
        <div className="flex flex-col items-center justify-center py-20"
          style={{ color: "#4A5568" }}>
          <Users className="h-14 w-14 mb-4 opacity-20" style={{ color: "#A78BFA" }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: "#8B949E" }}>No debate running</p>
          <p className="text-[12px]" style={{ color: "#4A5568" }}>
            Select an asset and click Start Debate
          </p>
        </div>
      )}

      {/* ── Results ── */}
      {result && !debating && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Researcher */}
          <AgentCard icon={Search} label="Researcher — Objective Analysis" color="#60A5FA">
            <p className="text-[13px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {result.researcher.summary}
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "#60A5FA15", border: "1px solid #60A5FA30", color: "#60A5FA" }}>
                {result.researcher.structurePhase}
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                style={{
                  background: result.researcher.riskLevel === "High" ? "#FF4D4F15" : result.researcher.riskLevel === "Low" ? "#00C89615" : "#F59E0B15",
                  border: `1px solid ${result.researcher.riskLevel === "High" ? "#FF4D4F30" : result.researcher.riskLevel === "Low" ? "#00C89630" : "#F59E0B30"}`,
                  color: result.researcher.riskLevel === "High" ? "#FF4D4F" : result.researcher.riskLevel === "Low" ? "#00C896" : "#F59E0B",
                }}>
                {result.researcher.riskLevel} Risk
              </span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "#8B949E" }}>
              {result.researcher.macroContext}
            </p>
            <div className="space-y-1.5 pt-1">
              {result.researcher.keyFindings.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#60A5FA" }} />
                  <span className="text-[11px]" style={{ color: "#C9D1D9" }}>{f}</span>
                </div>
              ))}
            </div>
          </AgentCard>

          {/* Bull */}
          <AgentCard icon={TrendingUp} label={`Bull Advocate — ${result.bull.conviction}% Conviction`} color="#00C896">
            <p className="text-[13px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {result.bull.case}
            </p>
            <div className="flex gap-2">
              <StatBox label="Entry Zone" value={result.bull.entryZone} color="#00C896" />
              <StatBox label="Target"     value={result.bull.targetLevel} color="#00C896" />
              <StatBox label="Stop"       value={result.bull.stopLevel}   color="#FF4D4F" />
            </div>
            <div className="space-y-1.5 pt-1">
              {result.bull.confluences.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#00C896" }} />
                  <span className="text-[11px]" style={{ color: "#C9D1D9" }}>{c}</span>
                </div>
              ))}
            </div>
          </AgentCard>

          {/* Bear */}
          <AgentCard icon={TrendingDown} label={`Bear Advocate — ${result.bear.conviction}% Conviction`} color="#FF4D4F">
            <p className="text-[13px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {result.bear.case}
            </p>
            <div className="rounded-lg px-3 py-2.5"
              style={{ background: "#FF4D4F10", border: "1px solid #FF4D4F25" }}>
              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#8B949E" }}>Main Risk to Bull Case</p>
              <p className="text-[12px] font-medium" style={{ color: "#FF4D4F" }}>{result.bear.mainRisk}</p>
            </div>
            <div className="space-y-1.5 pt-1">
              {result.bear.confluences.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#FF4D4F" }} />
                  <span className="text-[11px]" style={{ color: "#C9D1D9" }}>{c}</span>
                </div>
              ))}
            </div>
          </AgentCard>

          {/* Arbitrator */}
          <AgentCard icon={Gavel} label="Risk Manager — Final Verdict" color="#A78BFA">
            <div className="flex items-center gap-2 flex-wrap">
              <TradeStatusBadge status={result.arbitrator.verdict} />
              <span className="text-[12px] font-bold px-3 py-1 rounded-lg"
                style={{
                  background: result.arbitrator.side === "LONG" ? "#00C89618" : result.arbitrator.side === "SHORT" ? "#FF4D4F18" : "#8B949E18",
                  color: result.arbitrator.side === "LONG" ? "#00C896" : result.arbitrator.side === "SHORT" ? "#FF4D4F" : "#8B949E",
                }}>
                {result.arbitrator.side}
              </span>
              <span className="text-[11px] ml-auto" style={{ color: "#8B949E" }}>
                Winner: <span style={{
                  color: result.arbitrator.winnerArgument === "BULL" ? "#00C896"
                    : result.arbitrator.winnerArgument === "BEAR" ? "#FF4D4F" : "#8B949E",
                  fontWeight: 700,
                }}>{result.arbitrator.winnerArgument}</span>
              </span>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {result.arbitrator.reasoning}
            </p>
            {result.arbitrator.finalEntry != null && (
              <div className="flex gap-2">
                <StatBox label="Entry" value={String(result.arbitrator.finalEntry)} color="#A78BFA" />
                <StatBox label="Stop"  value={String(result.arbitrator.finalStop)}  color="#FF4D4F" />
                <StatBox label="TP"    value={String(result.arbitrator.finalTP)}    color="#00C896" />
                <StatBox label="R:R"
                  value={result.arbitrator.rr != null ? `1:${result.arbitrator.rr}` : "—"}
                  color={result.arbitrator.rr != null && result.arbitrator.rr >= 2 ? "#00C896" : "#F59E0B"} />
              </div>
            )}
            {result.arbitrator.keyCondition && (
              <div className="rounded-lg px-3 py-2.5"
                style={{ background: "#F59E0B10", border: "1px solid #F59E0B25" }}>
                <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#8B949E" }}>Key Condition Before Entry</p>
                <p className="text-[12px] font-medium" style={{ color: "#F59E0B" }}>{result.arbitrator.keyCondition}</p>
              </div>
            )}
          </AgentCard>

        </div>
      )}

      {result && !debating && (
        <p className="text-[10px] text-center mt-6" style={{ color: "#374151" }}>
          AI agent debate is for informational purposes only. Not financial advice.
        </p>
      )}
    </div>
  );
}
