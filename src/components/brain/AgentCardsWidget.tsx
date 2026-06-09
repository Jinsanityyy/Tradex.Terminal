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
import { useThemePersonality } from "@/lib/themePersonality";

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
  if (v == null || isNaN(v)) return "—";
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

const TONE_VARS: Record<Tone, { borderTopColor: string; color: string; barBg: string }> = {
  green:  { borderTopColor: "var(--t-bullish)", color: "var(--t-bullish)", barBg: "var(--t-bullish)" },
  red:    { borderTopColor: "var(--t-bearish)", color: "var(--t-bearish)", barBg: "var(--t-bearish)" },
  yellow: { borderTopColor: "var(--t-accent)",  color: "var(--t-accent)",  barBg: "var(--t-accent)"  },
  gray:   { borderTopColor: "var(--t-muted)",   color: "var(--t-muted)",   barBg: "var(--t-muted)"   },
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
            ? "border-[var(--t-border)] bg-[var(--t-card-2)] text-[var(--t-text)]"
            : "border-[var(--t-border)] text-[var(--t-muted)] hover:text-[var(--t-text)]"
        )}
      >
        <SlidersHorizontal className="h-2.5 w-2.5" />
        Agents
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border p-2 shadow-2xl backdrop-blur"
          style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-card)" }}
        >
          <p className="mb-1.5 px-1 text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--t-muted)]">
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
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10px] transition-colors hover:bg-[var(--t-card-2)]"
                >
                  <span
                    className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px]"
                    style={
                      checked
                        ? { borderColor: "color-mix(in srgb, var(--t-bullish) 50%, transparent)", backgroundColor: "color-mix(in srgb, var(--t-bullish) 20%, transparent)", color: "var(--t-bullish)" }
                        : { borderColor: "var(--t-border)", color: "transparent" }
                    }
                  >
                    ✓
                  </span>
                  <span style={{ color: checked ? "var(--t-text)" : "var(--t-muted)" }}>
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-1 border-t pt-1.5" style={{ borderColor: "var(--t-border)" }}>
            <button
              type="button"
              onClick={() => {
                const next = new Set(ALL_AGENT_IDS);
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
                onChange(next);
              }}
              className="flex-1 rounded px-1 py-1 text-[9px] transition-colors hover:bg-[var(--t-card-2)] text-[var(--t-muted)] hover:text-[var(--t-text)]"
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
              className="flex-1 rounded px-1 py-1 text-[9px] transition-colors hover:bg-[var(--t-card-2)] text-[var(--t-muted)] hover:text-[var(--t-text)]"
            >
              Master only
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card sub-components ──────────────────────────────────────────────────────

type DiagTag = { k: string; v: string };

// Strict 2×2 metadata grid — always renders exactly 4 slots with "—" placeholders
function DiagGrid({ tags }: { tags: DiagTag[] }) {
  const slots: DiagTag[] = Array.from({ length: 4 }, (_, i) => tags[i] ?? { k: "—", v: "—" });
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-1.5" style={{ borderColor: "var(--t-border)" }}>
      {slots.map((t, i) => (
        <div key={i} className="min-w-0">
          <div className="truncate font-mono text-[7px] uppercase tracking-widest" style={{ color: "var(--t-text-muted2)" }}>{t.k}</div>
          <div className="truncate font-mono text-[9px] font-semibold" style={{ color: "var(--t-muted)" }}>{t.v}</div>
        </div>
      ))}
    </div>
  );
}

// Center-anchored consensus gauge with directional fill and glowing marker dot
function ConsensusGauge({ score, tone }: { score: number; tone: Tone }) {
  const vars    = TONE_VARS[tone];
  const pct     = Math.min(50, Math.abs(score) / 2);
  const isBull  = score > 0;
  const markerL = isBull ? 50 + pct : 50 - pct;

  return (
    <div className="border-t pt-1.5" style={{ borderColor: "var(--t-border)" }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[7.5px] uppercase tracking-widest" style={{ color: "var(--t-text-muted2)" }}>Consensus</span>
        <span
          className="font-mono text-[10px] font-black"
          style={{ color: score === 0 ? "var(--t-muted)" : vars.color }}
        >
          {score > 0 ? `+${score.toFixed(0)}` : score.toFixed(0)}
        </span>
      </div>
      <div
        className="relative h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: "linear-gradient(to right,color-mix(in srgb,var(--t-bearish) 22%,transparent) 0%,var(--t-border) 38%,var(--t-border) 62%,color-mix(in srgb,var(--t-bullish) 22%,transparent) 100%)" }}
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2" style={{ background: "var(--t-text-muted2)" }} />
        {score !== 0 && (
          <div
            className="absolute inset-y-0 rounded-full transition-all duration-700"
            style={
              isBull
                ? { left: "50%", width: `${pct}%`, backgroundColor: "var(--t-bullish)" }
                : { right: "50%", width: `${pct}%`, backgroundColor: "var(--t-bearish)" }
            }
          />
        )}
      </div>
      <div className="relative mt-0.5" style={{ height: "7px" }}>
        <div
          className="absolute top-0 h-[7px] w-[7px] -translate-x-1/2 rounded-full border transition-all duration-700"
          style={{
            left: `${markerL}%`,
            borderColor: "var(--t-card)",
            backgroundColor: score === 0 ? "var(--t-muted)" : vars.barBg,
          }}
        />
      </div>
      <div className="flex justify-between text-[7px]" style={{ color: "var(--t-text-muted2)" }}>
        <span>BEAR</span>
        <span>BULL</span>
      </div>
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
  expired,
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
  expired?: boolean;
  onClick?: () => void;
}) {
  const vars = TONE_VARS[tone];
  const { progressBarStyle } = useThemePersonality();
  const isSegmented = progressBarStyle === "segmented";
  const segments = 10;
  const filledCount = Math.round(Math.min(100, confidence) / (100 / segments));

  if (loading) {
    return (
      <div
        className="flex h-full min-h-0 flex-col gap-2.5 border-t-2 px-3 py-3 animate-pulse"
        style={{ borderTopColor: "var(--t-border)", backgroundColor: "var(--t-card)" }}
      >
        <div className="h-2 w-20 rounded" style={{ background: "var(--t-border)" }} />
        <div className="h-4 w-16 rounded" style={{ background: "var(--t-border)" }} />
        <div className="h-[3px] w-full rounded-full" style={{ background: "var(--t-border)" }} />
        <div className="h-2.5 w-full rounded" style={{ background: "var(--t-card-2)" }} />
        <div className="h-2.5 w-2/3 rounded" style={{ background: "var(--t-card-2)" }} />
        <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-1.5" style={{ borderColor: "var(--t-border)" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-0.5">
              <div className="h-1.5 w-8 rounded" style={{ background: "var(--t-border)" }} />
              <div className="h-2 w-12 rounded" style={{ background: "var(--t-card-2)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-t-2 text-left transition-all",
        onClick && "cursor-pointer"
      )}
      style={{
        borderTopColor: vars.borderTopColor,
        backgroundColor: "var(--t-card)",
      }}
    >
      <div className={cn("flex flex-1 flex-col gap-1.5 px-3 py-3", expired && "opacity-[0.55]")}>
        <span className="truncate text-[9px] font-bold uppercase leading-none tracking-[0.14em]" style={{ color: "var(--t-muted)" }}>{name}</span>
        <span className="text-[13px] font-black uppercase leading-none tracking-wide" style={{ color: vars.color }}>{state}</span>
        <div className="flex items-center gap-2">
          {isSegmented ? (
            <div className="flex flex-1 gap-px" style={{ height: "3px" }}>
              {Array.from({ length: segments }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: i < filledCount ? vars.barBg : "var(--t-border)",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-[3px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--t-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, confidence)}%`, backgroundColor: vars.barBg }}
              />
            </div>
          )}
          <span className="w-7 shrink-0 text-right font-mono text-[10px]" style={{ color: "var(--t-muted)" }}>{confidence}%</span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-[10px] leading-snug" style={{ color: "var(--t-muted)" }}>{insight}</span>
          {sub ? <span className="text-[9px]" style={{ color: "var(--t-text-muted2)" }}>{sub}</span> : null}
        </div>
        <DiagGrid tags={tags ?? []} />
      </div>
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
  const vars      = TONE_VARS[tone];
  const { progressBarStyle } = useThemePersonality();
  const isSegmented = progressBarStyle === "segmented";
  const segments = 10;
  const filledCount = Math.round(master.confidence / (100 / segments));

  const masterInsight = finalBias !== "no-trade"
    ? (master.strategyMatch ?? `${finalBias.toUpperCase()} signal confirmed`)
    : (master.noTradeReason ?? "Insufficient consensus to trade");

  const rawScore = master.consensusScore;

  if (loading) {
    return (
      <div
        className="flex h-full min-h-0 flex-col gap-2.5 border-t-2 px-3 py-3 animate-pulse"
        style={{ borderTopColor: "var(--t-border)", backgroundColor: "var(--t-card)" }}
      >
        <div className="h-2 w-20 rounded" style={{ background: "var(--t-border)" }} />
        <div className="h-4 w-16 rounded" style={{ background: "var(--t-border)" }} />
        <div className="h-[3px] w-full rounded-full" style={{ background: "var(--t-border)" }} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-0 w-full flex-col border-t-2 text-left transition-all"
      style={{
        borderTopColor: vars.borderTopColor,
        backgroundColor: "var(--t-card)",
      }}
    >
      <div className="flex flex-1 flex-col gap-1.5 px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--t-muted)" }}>Master Agent</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: vars.color }}>{fmt(finalBias)}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[8px]">
            <span className="uppercase tracking-widest" style={{ color: "var(--t-text-muted2)" }}>Confidence</span>
            <span className="font-mono font-bold" style={{ color: vars.color }}>{master.confidence}%</span>
          </div>
          {isSegmented ? (
            <div className="flex gap-px" style={{ height: "3px" }}>
              {Array.from({ length: segments }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: i < filledCount ? vars.barBg : "var(--t-border)",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-[3px] w-full rounded-full" style={{ backgroundColor: "var(--t-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${master.confidence}%`, backgroundColor: vars.barBg }}
              />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="line-clamp-2 text-[10px] leading-snug" style={{ color: "var(--t-muted)" }}>{masterInsight}</p>
        </div>
        <ConsensusGauge score={rawScore} tone={tone} />
        {execution.hasSetup && execution.entry != null && (
          <div className="grid grid-cols-4 gap-x-2 gap-y-1 border-t pt-1.5" style={{ borderColor: "var(--t-border)" }}>
            {[
              { label: "ENT", value: fmtPrice(execution.entry)    },
              { label: "SL",  value: fmtPrice(execution.stopLoss) },
              { label: "TP1", value: fmtPrice(execution.tp1)      },
              { label: "RR",  value: execution.rrRatio != null ? `${execution.rrRatio.toFixed(1)}:1` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[8px] font-mono" style={{ color: "var(--t-text-muted2)" }}>{label}</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: "var(--t-text)" }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
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

  // Exactly 4 slots per card for the 2×2 DiagGrid
  const trendTags: DiagTag[] = tr ? [
    { k: "PHASE",   v: tr.marketPhase },
    { k: "TF SYNC", v: tfSyncLabel },
    { k: "MA",      v: tr.maAlignment ? "ALIGNED" : "MIXED" },
    { k: "INVL",    v: fmtPrice(tr.invalidationLevel) },
  ] : [];

  const smcTags: DiagTag[] = smc ? [
    { k: "SETUP",  v: smc.setupType },
    { k: "ZONE",   v: smc.premiumDiscount },
    { k: "CHoCH",  v: smc.chochDetected ? "YES" : "NO" },
    { k: "SWEEP",  v: smc.liquiditySweepDetected ? "YES" : "NO" },
  ] : [];

  const newsTags: DiagTag[] = news ? [
    { k: "REGIME",   v: news.regime.toUpperCase() },
    { k: "RISK",     v: `${news.riskScore}/100` },
    { k: "EVENTS",   v: `${news.catalysts.length}` },
    { k: "CHANGERS", v: `${news.biasChangers.length}` },
  ] : [];

  const riskTags: DiagTag[] = risk ? [
    { k: "GRADE",   v: risk.grade },
    { k: "SESSION", v: `${risk.sessionScore}/100` },
    { k: "VOL",     v: `${risk.volatilityScore}/100` },
    { k: "WARNS",   v: `${risk.warnings.length}` },
  ] : [];

  const contrarianTags: DiagTag[] = contrarian ? [
    { k: "TRAP",   v: contrarian.trapType ?? "NONE" },
    { k: "CONF",   v: `${contrarian.trapConfidence}%` },
    { k: "RISK",   v: `${contrarian.riskFactor}%` },
    { k: "OPP LQ", v: fmtPrice(contrarian.oppositeLiquidity) },
  ] : [];

  const execTags: DiagTag[] = execution ? [
    { k: "STATE", v: execution.signalState },
    { k: "ENTRY", v: fmtPrice(execution.entry) },
    { k: "SL",    v: fmtPrice(execution.stopLoss) },
    { k: "RR",    v: execution.rrRatio != null ? `${execution.rrRatio.toFixed(2)}:1` : "—" },
  ] : [];

  const show = (id: AgentId) => visibleAgents.has(id);

  // Row 1: trend, smc, news, risk
  const row1 = (["trend", "smc", "news", "risk"] as const).filter(show);
  // Row 2: contrarian, execution, master
  const row2 = (["contrarian", "execution", "master"] as const).filter(show);

  const noAgents = row1.length === 0 && row2.length === 0;

  return (
    <div className="absolute inset-0 overflow-y-auto">
      {noAgents ? (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm text-zinc-500">No agents selected.</p>
            <p className="mt-1 text-[11px] text-zinc-700">Use the Agents filter to show cards.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-px">
          {/* Row 1 — max 2 cols; grid auto-stretches all cells to the tallest card */}
          {row1.length > 0 && (
            <div className={cn("grid items-stretch gap-px", row1.length < 2 ? "grid-cols-1" : "grid-cols-2")}>
              {row1.map((id, idx) => (
                <div key={id} className={cn("flex flex-col", row1.length === 3 && idx === 2 && "col-span-2")}>
                  {id === "trend" && (
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
                  {id === "smc" && (
                    <AgentCard
                      name="Price Action"
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
                  {id === "news" && (
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
                  {id === "risk" && (
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
              ))}
            </div>
          )}

          {/* Row 2 — max 2 cols; grid auto-stretches all cells to the tallest card */}
          {row2.length > 0 && (
            <div className={cn("grid items-stretch gap-px", row2.length < 2 ? "grid-cols-1" : "grid-cols-2")}>
              {row2.map((id, idx) => (
                <div key={id} className={cn("flex flex-col", row2.length === 3 && idx === 2 && "col-span-2")}>
                  {id === "contrarian" && (
                    <AgentCard
                      name="Contrarian"
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
                  {id === "execution" && (
                    <AgentCard
                      name="Execution"
                      state={execution?.signalState ?? "NO TRADE"}
                      confidence={execConf}
                      insight={execution?.signalStateReason ?? execution?.triggerCondition ?? "Recalculating…"}
                      sub={
                        execution?.hasSetup && execution.direction !== "none"
                          ? `${execution.direction.toUpperCase()}  ·  RR ${execution.rrRatio?.toFixed(2) ?? "—"}:1`
                          : undefined
                      }
                      tone={
                        execution?.direction === "long"    ? "green"  :
                        execution?.direction === "short"   ? "red"    :
                        execution?.signalState === "ARMED" ? "yellow" : "gray"
                      }
                      tags={execTags}
                      expired={execution?.signalState === "EXPIRED"}
                      loading={isLoading && !data}
                      onClick={data ? () => openDrawer("execution") : undefined}
                    />
                  )}
                  {id === "master" && data && (
                    <MasterCard
                      data={data}
                      execConf={execConf}
                      onClick={() => openDrawer("master")}
                      loading={isLoading && !data}
                    />
                  )}
                  {id === "master" && !data && (
                    <AgentCard
                      name="Master Agent"
                      state="—"
                      confidence={0}
                      insight="Recalculating…"
                      tone="gray"
                      loading={isLoading}
                    />
                  )}
                </div>
              ))}
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
