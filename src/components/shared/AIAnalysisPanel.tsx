"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Brain, X, Zap, Loader2, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown,
  Minus, ChevronRight,
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

// ── Main panel ────────────────────────────────────────────────────────────────

export function AIAnalysisPanel() {
  const [open, setOpen]               = useState(false);
  const [asset, setAsset]             = useState("XAUUSD");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [marketData, setMarketData]   = useState<Record<string, any>>({});
  const [dataLoading, setDataLoading] = useState(false);

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
      // silent — panel can still analyze with partial data
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchMarketData();
  }, [open, fetchMarketData]);

  // Reset result when switching asset
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [asset]);

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
