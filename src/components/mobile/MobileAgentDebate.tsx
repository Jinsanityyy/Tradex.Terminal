"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Search, TrendingUp, TrendingDown, Gavel,
  Loader2, CheckCircle2, XCircle, Clock, RefreshCw,
  AlertTriangle, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ASSETS = [
  { symbol: "XAUUSD", label: "Gold" },
  { symbol: "EURUSD", label: "EUR/USD" },
  { symbol: "USDJPY", label: "USD/JPY" },
  { symbol: "BTCUSD", label: "BTC" },
];

const STAGES = [
  { key: "researcher", label: "Researcher", icon: Search,       color: "#60A5FA", msg: "Analyzing market…" },
  { key: "bull",       label: "Bull",       icon: TrendingUp,   color: "#00C896", msg: "Building long case…" },
  { key: "bear",       label: "Bear",       icon: TrendingDown, color: "#FF4D4F", msg: "Challenging…" },
  { key: "arbitrator", label: "Verdict",    icon: Gavel,        color: "#A78BFA", msg: "Final call…" },
] as const;

const ASSET_FULL: Record<string, string> = {
  XAUUSD: "Gold (XAUUSD)",
  EURUSD: "EUR/USD (DXY Proxy)",
  USDJPY: "S&P 500 Risk Proxy (USDJPY)",
  BTCUSD: "Bitcoin (BTC)",
};

function Badge({ status }: { status: "TRADE READY" | "WATCHLIST" | "NO TRADE" }) {
  const cfg = {
    "TRADE READY": { icon: CheckCircle2, color: "#00C896", bg: "#00C89615", border: "#00C89630" },
    "WATCHLIST":   { icon: Clock,        color: "#F59E0B", bg: "#F59E0B15", border: "#F59E0B30" },
    "NO TRADE":    { icon: XCircle,      color: "#FF4D4F", bg: "#FF4D4F15", border: "#FF4D4F30" },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      <Icon className="h-3 w-3" />{status}
    </span>
  );
}

function AgentSection({ icon: Icon, label, color, children }: {
  icon: React.ElementType; label: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}20` }}>
      <div className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: `${color}12`, borderBottom: `1px solid ${color}15` }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      <div className="px-3 py-3 space-y-2.5">{children}</div>
    </div>
  );
}

export function MobileAgentDebate() {
  const [asset, setAsset]             = useState("XAUUSD");
  const [debating, setDebating]       = useState(false);
  const [result, setResult]           = useState<any>(null);
  const [error, setError]             = useState<string | null>(null);
  const [stage, setStage]             = useState(-1);
  const [marketData, setMarketData]   = useState<Record<string, any>>({});

  useEffect(() => {
    setResult(null);
    setError(null);
    setStage(-1);
  }, [asset]);

  const fetchData = useCallback(async () => {
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
        "Gold (XAUUSD)": "XAUUSD",
        "EUR/USD (DXY Proxy)": "EURUSD",
        "S&P 500 Risk Proxy (USDJPY)": "USDJPY",
        "Bitcoin (BTC)": "BTCUSD",
      };
      const biasMap: Record<string, any> = {};
      (bias.data ?? []).forEach((d: any) => {
        const sym = biasSymMap[d.asset];
        if (sym) biasMap[sym] = d;
      });

      setMarketData({ kl: klMap, bias: biasMap });
    } catch { /* silent */ }
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

      const payload = {
        asset,
        display:             ASSET_FULL[asset],
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
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Debate failed. Try again.");
    } finally {
      setDebating(false);
      setStage(-1);
    }
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" style={{ color: "#A78BFA" }} />
        <span className="text-[13px] font-bold text-white">Agent Debate</span>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold ml-auto"
          style={{ background: "#A78BFA20", color: "#A78BFA", border: "1px solid #A78BFA30" }}>
          BETA
        </span>
      </div>

      {/* Asset tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ASSETS.map(a => (
          <button key={a.symbol}
            onClick={() => setAsset(a.symbol)}
            disabled={debating}
            className={cn("px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0",
              asset === a.symbol ? "text-white" : "text-gray-500")}
            style={asset === a.symbol
              ? { background: "#A78BFA20", border: "1px solid #A78BFA50" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Start button */}
      <button onClick={debating ? undefined : runDebate} disabled={debating}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold"
        style={{
          background: debating ? "rgba(167,139,250,0.08)" : "rgba(167,139,250,0.18)",
          border: "1px solid rgba(167,139,250,0.40)",
          color: "#A78BFA",
        }}>
        {debating
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Agents are debating…</>
          : result
          ? <><RefreshCw className="h-4 w-4" /> Re-run Debate</>
          : <><Users className="h-4 w-4" /> Start Agent Debate</>}
      </button>

      {/* Stage progress */}
      {debating && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              const done = i < stage;
              const curr = i === stage;
              return (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center"
                      style={{
                        background: done || curr ? `${s.color}20` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${done || curr ? s.color : "rgba(255,255,255,0.1)"}`,
                      }}>
                      {curr
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: s.color }} />
                        : <Icon className="h-3.5 w-3.5" style={{ color: done ? s.color : "#4A5568" }} />}
                    </div>
                    <span className="text-[9px] font-semibold"
                      style={{ color: done || curr ? s.color : "#4A5568" }}>
                      {s.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className="flex-1 h-px mb-4"
                      style={{ background: done ? `${STAGES[i + 1].color}40` : "rgba(255,255,255,0.06)" }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {stage >= 0 && (
            <p className="text-[10px] text-center" style={{ color: "#8B949E" }}>
              {STAGES[stage]?.msg}
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && !debating && (
        <div className="rounded-xl p-3 flex items-start gap-2"
          style={{ background: "#FF4D4F10", border: "1px solid #FF4D4F25" }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#FF4D4F" }} />
          <p className="text-[11px]" style={{ color: "#FF4D4F" }}>{error}</p>
        </div>
      )}

      {/* Idle */}
      {!debating && !result && !error && (
        <div className="text-center py-10">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-15" style={{ color: "#A78BFA" }} />
          <p className="text-[12px]" style={{ color: "#8B949E" }}>
            4 AI agents will argue the trade.<br />
            <span style={{ color: "#A78BFA" }}>Researcher → Bull → Bear → Verdict</span>
          </p>
        </div>
      )}

      {/* Results */}
      {result && !debating && (
        <div className="space-y-3">

          {/* Researcher */}
          <AgentSection icon={Search} label="Researcher" color="#60A5FA">
            <p className="text-[12px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {result.researcher?.summary}
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "#60A5FA15", border: "1px solid #60A5FA30", color: "#60A5FA" }}>
                {result.researcher?.structurePhase}
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: result.researcher?.riskLevel === "High" ? "#FF4D4F15" : result.researcher?.riskLevel === "Low" ? "#00C89615" : "#F59E0B15",
                  color: result.researcher?.riskLevel === "High" ? "#FF4D4F" : result.researcher?.riskLevel === "Low" ? "#00C896" : "#F59E0B",
                  border: "1px solid transparent",
                }}>
                {result.researcher?.riskLevel} Risk
              </span>
            </div>
            <div className="space-y-1">
              {(result.researcher?.keyFindings ?? []).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5">
                  <ChevronRight className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#60A5FA" }} />
                  <span className="text-[10px]" style={{ color: "#C9D1D9" }}>{f}</span>
                </div>
              ))}
            </div>
          </AgentSection>

          {/* Bull */}
          <AgentSection icon={TrendingUp} label={`Bull  -  ${result.bull?.conviction}% conviction`} color="#00C896">
            <p className="text-[12px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {result.bull?.case}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Entry", value: result.bull?.entryZone,   color: "#00C896" },
                { label: "Target", value: result.bull?.targetLevel, color: "#00C896" },
                { label: "Stop",  value: result.bull?.stopLevel,    color: "#FF4D4F" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg p-2 text-center"
                  style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                  <p className="text-[8px] mb-0.5" style={{ color: "#8B949E" }}>{label}</p>
                  <p className="text-[10px] font-mono font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </AgentSection>

          {/* Bear */}
          <AgentSection icon={TrendingDown} label={`Bear  -  ${result.bear?.conviction}% conviction`} color="#FF4D4F">
            <p className="text-[12px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {result.bear?.case}
            </p>
            <div className="rounded-lg px-3 py-2"
              style={{ background: "#FF4D4F10", border: "1px solid #FF4D4F25" }}>
              <p className="text-[9px] uppercase mb-0.5" style={{ color: "#8B949E" }}>Main Risk</p>
              <p className="text-[11px] font-medium" style={{ color: "#FF4D4F" }}>{result.bear?.mainRisk}</p>
            </div>
          </AgentSection>

          {/* Verdict */}
          <AgentSection icon={Gavel} label="Risk Manager  -  Verdict" color="#A78BFA">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge status={result.arbitrator?.verdict} />
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                style={{
                  background: result.arbitrator?.side === "LONG" ? "#00C89618" : result.arbitrator?.side === "SHORT" ? "#FF4D4F18" : "#8B949E18",
                  color: result.arbitrator?.side === "LONG" ? "#00C896" : result.arbitrator?.side === "SHORT" ? "#FF4D4F" : "#8B949E",
                }}>
                {result.arbitrator?.side}
              </span>
              <span className="text-[10px] ml-auto" style={{ color: "#8B949E" }}>
                Winner: <span style={{
                  color: result.arbitrator?.winnerArgument === "BULL" ? "#00C896"
                    : result.arbitrator?.winnerArgument === "BEAR" ? "#FF4D4F" : "#8B949E",
                  fontWeight: 700,
                }}>{result.arbitrator?.winnerArgument}</span>
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "#C9D1D9" }}>
              {result.arbitrator?.reasoning}
            </p>
            {result.arbitrator?.finalEntry != null && (
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Entry", value: String(result.arbitrator.finalEntry), color: "#A78BFA" },
                  { label: "Stop",  value: String(result.arbitrator.finalStop),  color: "#FF4D4F" },
                  { label: "TP",    value: String(result.arbitrator.finalTP),    color: "#00C896" },
                  { label: "R:R",   value: result.arbitrator.rr != null ? `1:${result.arbitrator.rr}` : " - ",
                    color: result.arbitrator.rr != null && result.arbitrator.rr >= 2 ? "#00C896" : "#F59E0B" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg p-2 text-center"
                    style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                    <p className="text-[8px] mb-0.5" style={{ color: "#8B949E" }}>{label}</p>
                    <p className="text-[10px] font-mono font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            )}
            {result.arbitrator?.keyCondition && (
              <div className="rounded-lg px-3 py-2"
                style={{ background: "#F59E0B10", border: "1px solid #F59E0B25" }}>
                <p className="text-[9px] uppercase mb-0.5" style={{ color: "#8B949E" }}>Key Condition</p>
                <p className="text-[11px] font-medium" style={{ color: "#F59E0B" }}>{result.arbitrator.keyCondition}</p>
              </div>
            )}
          </AgentSection>

          <p className="text-[9px] text-center pt-1" style={{ color: "#374151" }}>
            For informational purposes only. Not financial advice.
          </p>
        </div>
      )}
    </div>
  );
}
