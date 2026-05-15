"use client";

/**
 * AgentCardsWidget  -  compact 7-agent card grid for the dashboard widget.
 * Receives data from the parent page (no independent data fetch).
 * User can choose which agents to show via a filter dropdown in the header.
 */

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";
import type { AgentRunResult } from "@/lib/agents/schemas";
import { BrainOverviewDrawer } from "./BrainOverviewDrawer";

// ─── Config ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "tradex-agent-cards-filter-v1";

const AGENTS = [
  { id: "trend",      label: "Trend Agent",   row: 1 as const },
  { id: "smc",        label: "Price Action",  row: 1 as const },
  { id: "news",       label: "News Agent",    row: 1 as const },
  { id: "risk",       label: "Risk Gate",     row: 1 as const },
  { id: "contrarian", label: "Contrarian",    row: 2 as const },
  { id: "execution",  label: "Execution",     row: 2 as const },
  { id: "master",     label: "Master Agent",  row: 2 as const },
] as const;

export type AgentId = typeof AGENTS[number]["id"];

export const ALL_AGENT_IDS = AGENTS.map((a) => a.id) as AgentId[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tone = "green" | "red" | "yellow" | "gray";

function fmtPrice(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return " - ";
  if (v > 10000) return v.toFixed(0);
  if (v > 100)   return v.toFixed(1);
  if (v > 1)     return v.toFixed(4);
  return v.toFixed(5);
}

function biasTone(bias: string | undefined): Tone {
  if (bias === "bullish" || bias === "valid" || bias === "long")    return "green";
  if (bias === "bearish" || bias === "blocked" || bias === "short") return "red";
  if (bias === "opposing" || bias === "no-trade")                   return "yellow";
  return "gray";
}

const TONE_CLS: Record<Tone, { border: string; text: string; bar: string }> = {
  green:  { border: "border-t-emerald-500/70", text: "text-emerald-400", bar: "bg-emerald-500" },
  red:    { border: "border-t-red-500/70",     text: "text-red-400",     bar: "bg-red-500"     },
  yellow: { border: "border-t-amber-500/70",   text: "text-amber-400",   bar: "bg-amber-500"   },
  gray:   { border: "border-t-zinc-700/40",    text: "text-zinc-400",    bar: "bg-zinc-600"    },
};

function fmt(s: string | undefined): string {
  if (!s) return "NEUTRAL";
  return s.replace(/[-_]/g, " ").toUpperCase();
}

// ─── Filter button (exported for use in headerRight) ─────────────────────────

export function AgentCardsFilterButton({
  visible,
  onChange,
}: {
  visible: Set<AgentId>;
  onChange: (next: Set<AgentId>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function toggle(id: AgentId) {
    const next = new Set(visible);
    if (next.has(id)) {
      if (next.size === 1) return; // keep at least one
      next.delete(id);
    } else {
      next.add(id);
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
    onChange(next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-medium transition-colors",
          open
            ? "border-white/15 bg-white/[0.06] text-zinc-200"
            : "border-white/[0.08] text-zinc-500 hover:border-white/15 hover:text-zinc-200"
        )}
      >
        <SlidersHorizontal className="h-2.5 w-2.5" />
        Agents
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-white/[0.08] bg-[#0b0b0d]/95 p-2 shadow-2xl backdrop-blur">
          <p className="mb-1.5 px-1 text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Show / hide agents
          </p>
          <div className="space-y-0.5">
            {AGENTS.map((a) => {
              const checked = visible.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10px] transition-colors hover:bg-white/[0.05]"
                >
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px]",
                      checked
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                        : "border-white/10 text-transparent"
                    )}
                  >
                    ✓
                  </span>
                  <span className={checked ? "text-zinc-200" : "text-zinc-600"}>
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-1 border-t border-white/[0.06] pt-1.5">
            <button
              type="button"
              onClick={() => {
                const next = new Set(ALL_AGENT_IDS);
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
                onChange(next);
              }}
              className="flex-1 rounded px-1 py-1 text-[9px] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 transition-colors"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new Set<AgentId>(["master"]);
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
                onChange(next);
              }}
              className="flex-1 rounded px-1 py-1 text-[9px] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 transition-colors"
            >
              Master only
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

type DiagTag = { k: string; v: string };

function DiagStrip({ tags }: { tags: DiagTag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1 border-t border-white/4 pt-1 mt-1">
      {tags.map((t) => (
        <span
          key={t.k}
          className="inline-flex items-center gap-0.5 rounded border border-white/6 bg-white/[0.03] px-1 py-0.5 font-mono text-[8px]"
        >
          <span className="text-zinc-700">{t.k}:</span>
          <span className="text-zinc-500">{t.v}</span>
        </span>
      ))}
    </div>
  );
}

function AgentCard({
  name,
  state,
  confidence,
  insight,
  sub,
  tone,
  tags,
  loading,
  onClick,
}: {
  name: string;
  state: string;
  confidence: number;
  insight: string;
  sub?: string;
  tone: Tone;
  tags?: DiagTag[];
  loading?: boolean;
  onClick?: () => void;
}) {
  const cls = TONE_CLS[tone];

  if (loading) {
    return (
      <div className="flex min-h-[140px] flex-col gap-2.5 border-t-2 border-t-zinc-700/30 bg-[hsl(var(--card))] px-3 py-3 animate-pulse">
        <div className="h-2 w-20 rounded bg-white/6" />
        <div className="h-4 w-16 rounded bg-white/5" />
        <div className="h-[3px] w-full rounded-full bg-white/5" />
        <div className="h-2.5 w-full rounded bg-white/[0.03]" />
        <div className="h-2.5 w-2/3 rounded bg-white/[0.025]" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[140px] w-full flex-col gap-2 border-t-2 bg-[hsl(var(--card))] px-3 py-3 text-left transition-all",
        cls.border,
        onClick && "hover:bg-white/[0.04] cursor-pointer"
      )}
    >
      <span className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">{name}</span>
      <span className={cn("text-[13px] font-black uppercase leading-none tracking-wide", cls.text)}>{state}</span>
      <div className="flex items-center gap-2">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div className={cn("h-full rounded-full transition-all duration-500", cls.bar)} style={{ width: `${Math.min(100, confidence)}%` }} />
        </div>
        <span className="w-7 shrink-0 text-right font-mono text-[10px] text-zinc-600">{confidence}%</span>
      </div>
      <span className="line-clamp-2 text-[10px] leading-snug text-zinc-500">{insight}</span>
      {sub ? <span className="text-[9px] text-zinc-700">{sub}</span> : null}
      {tags ? <DiagStrip tags={tags} /> : null}
    </button>
  );
}

// ─── Master card (special layout) ─────────────────────────────────────────────

function MasterCard({
  data,
  execConf,
  onClick,
  loading,
}: {
  data: AgentRunResult;
  execConf: number;
  onClick: () => void;
  loading?: boolean;
}) {
  const master    = data.agents.master;
  const execution = data.agents.execution;
  const finalBias = master.finalBias;
  const tone      = biasTone(finalBias);
  const cls       = TONE_CLS[tone];

  const masterInsight = finalBias !== "no-trade"
    ? (master.strategyMatch ?? `${finalBias.toUpperCase()} signal confirmed`)
    : (master.noTradeReason ?? "Insufficient consensus to trade");

  const rawScore = master.consensusScore;
  const consensusLabel = rawScore > 0 ? `+${rawScore.toFixed(0)}` : rawScore.toFixed(0);

  if (loading) {
    return (
      <div className="flex min-h-[140px] flex-col gap-2.5 border-t-2 border-t-zinc-700/30 bg-[hsl(var(--card))] px-3 py-3 animate-pulse">
        <div className="h-2 w-20 rounded bg-white/6" />
        <div className="h-4 w-16 rounded bg-white/5" />
        <div className="h-[3px] w-full rounded-full bg-white/5" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[140px] w-full flex-col gap-2 border-t-2 bg-[hsl(var(--card))] px-3 py-3 text-left transition-all hover:bg-white/[0.04]",
        cls.border
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">Master Agent</span>
        <span className={cn("text-[9px] font-bold uppercase tracking-[0.1em]", cls.text)}>{fmt(finalBias)}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[8px]">
          <span className="text-zinc-700 uppercase tracking-widest">Confidence</span>
          <span className={cn("font-mono font-bold", cls.text)}>{master.confidence}%</span>
        </div>
        <div className="h-[3px] w-full rounded-full bg-white/5">
          <div className={cn("h-full rounded-full", cls.bar)} style={{ width: `${master.confidence}%` }} />
        </div>
      </div>
      <p className="flex-1 line-clamp-2 text-[10px] leading-snug text-zinc-400">{masterInsight}</p>
      <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
        <span className="text-[9px] text-zinc-700 uppercase tracking-wider">Consensus</span>
        <span className={cn("font-mono text-[12px] font-black", cls.text)}>{consensusLabel}</span>
      </div>
      {execution.hasSetup && execution.entry != null && (
        <div className="grid grid-cols-4 gap-x-2 gap-y-1 border-t border-white/5 pt-1.5">
          {[
            { label: "ENT", value: fmtPrice(execution.entry)    },
            { label: "SL",  value: fmtPrice(execution.stopLoss) },
            { label: "TP1", value: fmtPrice(execution.tp1)      },
            { label: "RR",  value: execution.rrRatio != null ? `${execution.rrRatio.toFixed(1)}:1` : " - " },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[8px] font-mono text-zinc-700">{label}</span>
              <span className="text-[10px] font-mono font-bold text-zinc-300">{value}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentCardsWidget({
  data,
  isLoading,
  visibleAgents,
}: {
  data: AgentRunResult | undefined;
  isLoading: boolean;
  visibleAgents: Set<AgentId>;
}) {
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerAgent, setDrawerAgent] = useState<string | undefined>();

  function openDrawer(id: string) {
    setDrawerAgent(id);
    setDrawerOpen(true);
  }

  const agents     = data?.agents;
  const tr         = agents?.trend;
  const smc        = agents?.smc;
  const news       = agents?.news;
  const risk       = agents?.risk;
  const contrarian = agents?.contrarian;
  const execution  = agents?.execution;

  const execConf = execution?.rrRatio != null
    ? Math.min(90, Math.round(execution.rrRatio * 20))
    : execution?.hasSetup ? 35 : 10;

  // Diagnostic tags
  const tfSyncLabel = tr
    ? ([tr.timeframeBias.M5, tr.timeframeBias.M15, tr.timeframeBias.H1, tr.timeframeBias.H4].every(b => b === tr.bias)
        ? "ALL 4"
        : (() => {
            const match = (["M5","M15","H1","H4"] as const).filter(k => tr.timeframeBias[k] === tr.bias);
            return match.length > 0 ? `${match.join("+")} ONLY` : "MIXED";
          })())
    : " - ";

  const trendTags: DiagTag[] = tr ? [
    { k: "PHASE",    v: tr.marketPhase },
    { k: "MOMENTUM", v: tr.momentumDirection.toUpperCase() },
    { k: "TF SYNC",  v: tfSyncLabel },
    { k: "MA",       v: tr.maAlignment ? "ALIGNED" : "MIXED" },
    { k: "INVL",     v: fmtPrice(tr.invalidationLevel) },
  ] : [];

  const smcTags: DiagTag[] = smc ? [
    { k: "SETUP",  v: smc.setupType },
    { k: "ZONE",   v: smc.premiumDiscount },
    { k: "BOS",    v: smc.bosDetected ? "YES" : "NO" },
    { k: "CHoCH",  v: smc.chochDetected ? "YES" : "NO" },
    { k: "SWEEP",  v: smc.liquiditySweepDetected ? "YES" : "NO" },
    { k: "INVL",   v: fmtPrice(smc.invalidationLevel) },
  ] : [];

  const newsTags: DiagTag[] = news ? [
    { k: "REGIME",   v: news.regime.toUpperCase() },
    { k: "RISK",     v: `${news.riskScore}/100` },
    { k: "EVENTS",   v: `${news.catalysts.length}` },
    { k: "CHANGERS", v: `${news.biasChangers.length}` },
  ] : [];

  const riskTags: DiagTag[] = risk ? [
    { k: "GRADE",    v: risk.grade },
    { k: "MAX RISK", v: `${risk.maxRiskPercent}%` },
    { k: "SESSION",  v: `${risk.sessionScore}/100` },
    { k: "VOL",      v: `${risk.volatilityScore}/100` },
    { k: "WARNS",    v: `${risk.warnings.length}` },
  ] : [];

  const contrarianTags: DiagTag[] = contrarian ? [
    { k: "TRAP",   v: contrarian.trapType ?? "NONE" },
    { k: "RISK",   v: `${contrarian.riskFactor}%` },
    { k: "CONF",   v: `${contrarian.trapConfidence}%` },
    { k: "OPP LQ", v: fmtPrice(contrarian.oppositeLiquidity) },
  ] : [];

  const execTags: DiagTag[] = execution ? [
    { k: "STATE",  v: execution.signalState },
    { k: "ENTRY",  v: fmtPrice(execution.entry) },
    { k: "SL",     v: fmtPrice(execution.stopLoss) },
    { k: "TP1",    v: fmtPrice(execution.tp1) },
    { k: "TP2",    v: fmtPrice(execution.tp2) },
    { k: "RR",     v: execution.rrRatio != null ? `${execution.rrRatio.toFixed(2)}:1` : " - " },
  ] : [];

  const show = (id: AgentId) => visibleAgents.has(id);

  // Row 1: trend, smc, news, risk
  const row1 = (["trend", "smc", "news", "risk"] as const).filter(show);
  // Row 2: contrarian, execution, master
  const row2 = (["contrarian", "execution", "master"] as const).filter(show);

  const noAgents = row1.length === 0 && row2.length === 0;

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      {noAgents ? (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm text-zinc-500">No agents selected.</p>
            <p className="mt-1 text-[11px] text-zinc-700">Use the Agents filter to show cards.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-px">
          {/* Row 1 */}
          {row1.length > 0 && (
            <div className={cn("grid gap-px", ({"1":"grid-cols-1","2":"grid-cols-2","3":"grid-cols-3","4":"grid-cols-4"} as Record<number,string>)[row1.length] ?? "grid-cols-4")}>
              {row1.includes("trend") && (
                <AgentCard
                  name="Trend Agent"
                  state={fmt(tr?.bias)}
                  confidence={tr?.confidence ?? 0}
                  insight={tr?.reasons?.[0] ?? tr?.marketPhase ?? "Recalculating…"}
                  sub={tr?.momentumDirection ? `Momentum ${tr.momentumDirection}` : undefined}
                  tone={biasTone(tr?.bias)}
                  tags={trendTags}
                  loading={isLoading && !data}
                  onClick={data ? () => openDrawer("trend") : undefined}
                />
              )}
              {row1.includes("smc") && (
                <AgentCard
                  name="Price Action Agent"
                  state={fmt(smc?.bias)}
                  confidence={smc?.confidence ?? 0}
                  insight={smc?.reasons?.[0] ?? smc?.setupType ?? "Recalculating…"}
                  sub={smc?.premiumDiscount ? `Zone ${smc.premiumDiscount}` : undefined}
                  tone={biasTone(smc?.bias)}
                  tags={smcTags}
                  loading={isLoading && !data}
                  onClick={data ? () => openDrawer("smc") : undefined}
                />
              )}
              {row1.includes("news") && (
                <AgentCard
                  name="News Agent"
                  state={fmt(news?.impact)}
                  confidence={news?.confidence ?? 0}
                  insight={news?.dominantCatalyst ?? news?.reasons?.[0] ?? "Recalculating…"}
                  sub={news?.riskScore != null ? `Risk ${news.riskScore}/100` : undefined}
                  tone={biasTone(news?.impact)}
                  tags={newsTags}
                  loading={isLoading && !data}
                  onClick={data ? () => openDrawer("news") : undefined}
                />
              )}
              {row1.includes("risk") && (
                <AgentCard
                  name="Risk Gate"
                  state={risk ? (risk.valid ? "VALID" : "BLOCKED") : "NEUTRAL"}
                  confidence={risk?.sessionScore ?? 0}
                  insight={risk?.reasons?.[0] ?? risk?.warnings?.[0] ?? "Recalculating…"}
                  sub={risk ? `Grade ${risk.grade}  -  Max ${risk.maxRiskPercent}% risk` : undefined}
                  tone={risk ? (risk.valid ? "green" : "red") : "gray"}
                  tags={riskTags}
                  loading={isLoading && !data}
                  onClick={data ? () => openDrawer("risk") : undefined}
                />
              )}
            </div>
          )}

          {/* Row 2 */}
          {row2.length > 0 && (
            <div className={cn("grid gap-px", ({"1":"grid-cols-1","2":"grid-cols-2","3":"grid-cols-3"} as Record<number,string>)[row2.length] ?? "grid-cols-3")}>
              {row2.includes("contrarian") && (
                <AgentCard
                  name="Contrarian Agent"
                  state={contrarian?.challengesBias ? "ALERT" : "CLEAR"}
                  confidence={contrarian?.trapConfidence ?? 0}
                  insight={contrarian?.alternativeScenario ?? contrarian?.failureReasons?.[0] ?? "Recalculating…"}
                  sub={contrarian?.trapType ? `Trap: ${contrarian.trapType}` : undefined}
                  tone={contrarian?.challengesBias ? "red" : "gray"}
                  tags={contrarianTags}
                  loading={isLoading && !data}
                  onClick={data ? () => openDrawer("contrarian") : undefined}
                />
              )}
              {row2.includes("execution") && (
                <AgentCard
                  name="Execution Agent"
                  state={execution?.signalState ?? "NO TRADE"}
                  confidence={execConf}
                  insight={execution?.signalStateReason ?? execution?.triggerCondition ?? "Recalculating…"}
                  sub={
                    execution?.hasSetup && execution.direction !== "none"
                      ? `${execution.direction.toUpperCase()}  -  RR ${execution.rrRatio?.toFixed(2) ?? " - "}:1`
                      : undefined
                  }
                  tone={
                    execution?.direction === "long"    ? "green" :
                    execution?.direction === "short"   ? "red"   :
                    execution?.signalState === "ARMED" ? "yellow" : "gray"
                  }
                  tags={execTags}
                  loading={isLoading && !data}
                  onClick={data ? () => openDrawer("execution") : undefined}
                />
              )}
              {row2.includes("master") && data && (
                <MasterCard
                  data={data}
                  execConf={execConf}
                  onClick={() => openDrawer("master")}
                  loading={isLoading && !data}
                />
              )}
              {row2.includes("master") && !data && (
                <AgentCard
                  name="Master Agent"
                  state=" - "
                  confidence={0}
                  insight="Recalculating…"
                  tone="gray"
                  loading={isLoading}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Drawer */}
      {data ? (
        <BrainOverviewDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          data={data}
          highlightAgentId={drawerAgent}
        />
      ) : null}
    </div>
  );
}
