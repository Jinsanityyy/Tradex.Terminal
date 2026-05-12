"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENTS, type AgentDefinition } from "@/lib/constants/agents";

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<AgentDefinition["status"], string> = {
  active:        "bg-emerald-950 border-emerald-500/50 text-emerald-400",
  scanning:      "bg-sky-950/60 border-sky-500/40 text-sky-400",
  gating:        "bg-red-950/60 border-red-500/50 text-red-400",
  adjudicating:  "bg-amber-950/60 border-amber-500/40 text-amber-400",
};

const STATUS_DOT: Record<AgentDefinition["status"], string> = {
  active:        "bg-emerald-400",
  scanning:      "bg-sky-400",
  gating:        "bg-red-400",
  adjudicating:  "bg-amber-400",
};

const TYPE_LABEL: Record<AgentDefinition["type"], string> = {
  "rule-based": "RULE-BASED",
  "llm":        "LLM",
  "hybrid":     "HYBRID",
};

const TYPE_STYLE: Record<AgentDefinition["type"], string> = {
  "rule-based": "text-slate-500 border-slate-700",
  "llm":        "text-violet-400 border-violet-800",
  "hybrid":     "text-amber-400 border-amber-800",
};

function StatusBadge({ status, label }: { status: AgentDefinition["status"]; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded px-2 py-0.5 font-mono text-[9px] tracking-widest ${STATUS_STYLES[status]}`}>
      <motion.span
        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`}
        animate={{ opacity: status === "active" || status === "gating" ? [1, 0.3, 1] : 1 }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {label.toUpperCase()}
    </span>
  );
}

// ─── Output tags ──────────────────────────────────────────────────────────────
function OutputTag({ label }: { label: string }) {
  return (
    <span className="font-mono text-[8.5px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 tracking-wide">
      {label}
    </span>
  );
}

// ─── Agent card ───────────────────────────────────────────────────────────────
function AgentCard({ agent, index }: { agent: AgentDefinition; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const glowColor = `rgba(${hexToRgb(agent.accentHex)}, 0.12)`;
  const borderColor = hovered
    ? `rgba(${hexToRgb(agent.accentHex)}, 0.5)`
    : agent.isGate
    ? "rgba(239,68,68,0.2)"
    : agent.isMaster
    ? "rgba(14,165,233,0.2)"
    : "rgba(255,255,255,0.06)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4, ease: "easeOut" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => setExpanded((v) => !v)}
      className={`relative rounded-lg border cursor-pointer overflow-hidden transition-colors duration-200 ${
        agent.isMaster ? "md:col-span-3" : ""
      }`}
      style={{
        borderColor,
        background: hovered ? `linear-gradient(135deg, #0a0a0a, ${glowColor})` : "#0a0a0a",
        boxShadow: hovered ? `0 0 24px ${glowColor}` : "none",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${agent.accentHex}40, transparent)` }}
      />

      {/* Agent index watermark */}
      <div className="absolute top-3 right-3 font-mono text-[10px] text-slate-800 font-black select-none">
        A{String(agent.index).padStart(2, "0")}
      </div>

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg"
            style={{ background: `rgba(${hexToRgb(agent.accentHex)}, 0.1)`, border: `1px solid rgba(${hexToRgb(agent.accentHex)}, 0.2)` }}
          >
            {agent.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-white tracking-wide">
                {agent.name}
              </span>
              {agent.isGate && (
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-400 tracking-widest">
                  HARD GATE
                </span>
              )}
              {agent.isMaster && (
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-500/40 text-sky-400 tracking-widest">
                  FINAL ADJUDICATOR
                </span>
              )}
            </div>
            <p className="font-mono text-[9px] text-slate-500 leading-relaxed truncate">
              {agent.role}
            </p>
          </div>
        </div>

        {/* Status + type row */}
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={agent.status} label={agent.statusLabel} />
          <span className={`font-mono text-[9px] border rounded px-1.5 py-0.5 ${TYPE_STYLE[agent.type]}`}>
            {TYPE_LABEL[agent.type]}
          </span>
          {agent.model && (
            <span className="font-mono text-[9px] text-slate-600 tracking-wide ml-auto truncate">
              {agent.model}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="font-sans text-[11px] text-slate-400 leading-relaxed mb-3">
          {agent.description}
        </p>

        {/* Expand toggle */}
        <button
          className="font-mono text-[9px] text-slate-600 hover:text-slate-400 transition-colors tracking-widest"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? "▲ HIDE OUTPUTS" : "▼ SHOW OUTPUTS"}
        </button>

        {/* Expanded: output keys */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-slate-800/60">
                <div className="font-mono text-[8.5px] text-slate-600 tracking-widest mb-2">
                  OUTPUT FIELDS
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agent.outputs.map((o) => (
                    <OutputTag key={o} label={o} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader() {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[10px] tracking-[0.25em] text-slate-500 uppercase">
          Architecture
        </span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
      <h2 className="font-mono text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
        THE 7-AGENT PIPELINE
      </h2>
      <p className="font-sans text-sm text-slate-400 max-w-2xl leading-relaxed">
        Each agent runs its own analysis independently. Phase ordering is strict:
        Risk Gate is sequential (it needs the actual RR from Execution).
        Master sees all outputs{" "}
        <span className="text-slate-300 font-medium">plus the structured inter-agent debate</span>{" "}
        before issuing a verdict.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-5 font-mono text-[9px] tracking-wide">
        {[
          { color: "bg-violet-500", label: "LLM — Claude model" },
          { color: "bg-slate-600", label: "Rule-based — deterministic" },
          { color: "bg-amber-500", label: "Hybrid" },
          { color: "bg-red-500", label: "Hard gate — overrides all signals" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-slate-500">
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Risk gate callout ────────────────────────────────────────────────────────
function RiskGateCallout() {
  const conditions = [
    "Session closed (Closed / after-hours)",
    "Volatility > 2.5% daily move (ATR proxy)",
    "RR ratio < 1:1 (actual from Execution Agent)",
    "5 or more concurrent risk warnings",
    "RSI deeply overbought (>78) or oversold (<22)",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-8 rounded-lg border border-red-500/25 bg-red-950/10 p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="font-mono text-[10px] tracking-widest text-red-400 font-bold">
          AGENT 4 — RISK GATE — SYSTEM OVERRIDE
        </span>
      </div>
      <p className="font-sans text-xs text-slate-400 mb-4 leading-relaxed">
        The Risk Gate is pure rule-based logic with no AI path. It runs{" "}
        <span className="text-slate-300">after</span> the Execution Agent (Phase 2b)
        to receive the actual computed RR ratio. If any hard-block condition fires,
        the gate sets{" "}
        <code className="font-mono text-red-400 text-[10px] bg-red-950/50 px-1 rounded">
          valid = false
        </code>{" "}
        and the Master Agent issues NO TRADE — regardless of what Trend, Price Action,
        or News returned.
      </p>
      <div className="font-mono text-[9px] text-slate-600 tracking-widest mb-2">
        HARD-BLOCK CONDITIONS (ANY ONE FIRES = BLOCKED)
      </div>
      <ul className="space-y-1.5">
        {conditions.map((c, i) => (
          <li key={i} className="flex items-start gap-2 font-mono text-[10px] text-slate-400">
            <span className="text-red-600 mt-0.5 flex-shrink-0">✗</span>
            {c}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ─── Main AgentGrid ───────────────────────────────────────────────────────────
export function AgentGrid() {
  const regularAgents = AGENTS.filter((a) => !a.isMaster);
  const masterAgent   = AGENTS.find((a) => a.isMaster)!;

  return (
    <section id="agents" className="relative bg-black px-6 py-20 md:px-16 lg:px-24">
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

      <div className="max-w-5xl mx-auto">
        <SectionHeader />

        {/* 3-column grid for regular agents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regularAgents.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} />
          ))}
        </div>

        {/* Master agent — full width */}
        <div className="mt-4">
          <AgentCard agent={masterAgent} index={regularAgents.length} />
        </div>

        {/* Risk gate callout */}
        <RiskGateCallout />
      </div>
    </section>
  );
}

// ─── Util ─────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
