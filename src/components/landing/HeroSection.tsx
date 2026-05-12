"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Clock } from "lucide-react";

// ─── Animated grid background ────────────────────────────────────────────────
function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* OLED base */}
      <div className="absolute inset-0 bg-[#000000]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Center radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(14,165,233,0.08),transparent)]" />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff 2px, #ffffff 3px)",
          backgroundSize: "100% 4px",
        }}
      />
    </div>
  );
}

// ─── Blinking cursor ──────────────────────────────────────────────────────────
function Cursor() {
  return (
    <motion.span
      className="inline-block w-[10px] h-[1.1em] bg-sky-400 ml-1 align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
    />
  );
}

// ─── Terminal status bar ──────────────────────────────────────────────────────
function StatusBar() {
  const items = [
    { label: "AGENTS", value: "7 / 7 ONLINE", color: "text-emerald-400" },
    { label: "SESSION", value: "NY 13:00–18:00 UTC", color: "text-sky-400" },
    { label: "STRATEGY", value: "JADE CAP v2", color: "text-amber-400" },
    { label: "CACHE TTL", value: "300s", color: "text-slate-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-widest text-slate-500 border-b border-slate-800 pb-4 mb-10"
    >
      <span className="text-emerald-500 font-bold">● SYSTEM ONLINE</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span className="text-slate-600">{item.label}</span>
          <span className={item.color}>{item.value}</span>
        </span>
      ))}
    </motion.div>
  );
}

// ─── No Sweep Alert Banner ─────────────────────────────────────────────────────
function NoSweepAlert() {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0.95 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: 1.0, duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded border border-red-500/40 bg-red-950/30 px-4 py-3 font-mono"
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />

      <div className="flex items-center gap-3 pl-2">
        {/* Blinking indicator */}
        <motion.div
          className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-[10px] tracking-widest text-red-400 font-bold uppercase">
          SYSTEM CONSTRAINT
        </span>
        <span className="text-slate-600 text-[10px]">|</span>
        <span className="text-[11px] text-red-300">
          <span className="text-red-400 font-bold">NO SWEEP = NO TRADE</span>
          <span className="text-slate-400 ml-2">
            — All 7 agents are idle until a confirmed NY session liquidity sweep is detected.
            Risk Gate, consensus scoring, and execution planning are bypassed entirely.
          </span>
        </span>
      </div>
    </motion.div>
  );
}

// ─── Stat pills ───────────────────────────────────────────────────────────────
function StatPills() {
  const stats = [
    { icon: <Shield className="h-3.5 w-3.5" />, label: "Risk Gate", value: "Hard override — no bypass", color: "border-red-500/30 text-red-400" },
    { icon: <Zap className="h-3.5 w-3.5" />, label: "Signal States", value: "ARMED / PENDING / EXPIRED", color: "border-violet-500/30 text-violet-400" },
    { icon: <Clock className="h-3.5 w-3.5" />, label: "NY Window", value: "13:00 – 18:00 UTC only", color: "border-sky-500/30 text-sky-400" },
  ];

  return (
    <div className="flex flex-wrap gap-3 mt-8">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
          className={`flex items-center gap-2 rounded border px-3 py-2 font-mono text-[10px] tracking-wide ${s.color} bg-black/40`}
        >
          {s.icon}
          <span className="text-slate-500">{s.label}:</span>
          <span>{s.value}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Pipeline mini-diagram ────────────────────────────────────────────────────
function PipelineDiagram() {
  const phases = [
    { label: "P1", desc: "Trend · PA · News", color: "border-sky-500/50 text-sky-400", note: "parallel" },
    { label: "P2a", desc: "Execution · Contrarian", color: "border-violet-500/50 text-violet-400", note: "parallel" },
    { label: "P2b", desc: "Risk Gate", color: "border-red-500/50 text-red-400", note: "sequential" },
    { label: "P3", desc: "Debate", color: "border-slate-500/50 text-slate-400", note: "" },
    { label: "P4", desc: "Master", color: "border-amber-500/50 text-amber-400", note: "verdict" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9, duration: 0.5 }}
      className="mt-10 flex items-center gap-1 flex-wrap"
    >
      {phases.map((p, i) => (
        <div key={p.label} className="flex items-center gap-1">
          <div className={`rounded border px-2.5 py-1.5 font-mono text-[9px] tracking-widest ${p.color} bg-black/50`}>
            <div className="font-bold">{p.label}</div>
            <div className="text-slate-500 mt-0.5">{p.desc}</div>
            {p.note && <div className="text-[8px] mt-0.5 opacity-60">{p.note}</div>}
          </div>
          {i < phases.length - 1 && (
            <svg width="16" height="8" viewBox="0 0 16 8" className="text-slate-700 flex-shrink-0">
              <path d="M0 4 H12 M9 1 L13 4 L9 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      ))}
    </motion.div>
  );
}

// ─── Main HeroSection ─────────────────────────────────────────────────────────
export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 py-16 md:px-16 lg:px-24 overflow-hidden">
      <GridBackground />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        <StatusBar />

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center gap-2 mb-5"
        >
          <span className="font-mono text-[10px] tracking-[0.25em] text-slate-500 uppercase">
            Multi-Agent Intelligence System
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent max-w-32" />
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
          className="font-mono text-4xl md:text-6xl lg:text-7xl font-black leading-none tracking-tight text-white mb-2"
        >
          TRADEX
          <br />
          <span className="text-sky-400">TERMINAL</span>
          <Cursor />
        </motion.h1>

        {/* Sub-heading */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="font-mono text-slate-400 text-sm md:text-base max-w-2xl mt-5 leading-relaxed"
        >
          Seven specialized agents — Trend, Price Action, News, Risk Gate, Execution,
          Contrarian, and Master — run sequentially and in parallel to produce a single,
          structured trade decision.{" "}
          <span className="text-slate-300">
            No sweep detected in the NY session window = the entire pipeline short-circuits.
          </span>
        </motion.p>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.35 }}
          className="flex flex-wrap items-center gap-3 mt-8"
        >
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded bg-sky-500 hover:bg-sky-400 text-black font-mono font-bold text-sm px-5 py-2.5 transition-colors duration-150"
          >
            <Zap className="h-4 w-4" />
            LAUNCH TERMINAL
          </a>
          <a
            href="#agents"
            className="inline-flex items-center gap-2 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 font-mono text-sm px-5 py-2.5 transition-colors duration-150"
          >
            VIEW AGENTS ↓
          </a>
        </motion.div>

        {/* Stat pills */}
        <StatPills />

        {/* No Sweep Alert */}
        <div className="mt-10">
          <NoSweepAlert />
        </div>

        {/* Pipeline diagram */}
        <PipelineDiagram />
      </div>
    </section>
  );
}
