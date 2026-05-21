"use client";

import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "TRADE-OK" | "NO-TRADE" | "ALERT";

type AgentBadge = {
  id: string;
  label: string;
  status: AgentStatus;
  signal: "L" | "S" | "—";
};

// ─── Static display data ──────────────────────────────────────────────────────

const AGENT_BADGES: AgentBadge[] = [
  { id: "risk",   label: "RISK",   status: "ALERT",    signal: "S" },
  { id: "trend",  label: "TREND",  status: "TRADE-OK", signal: "L" },
  { id: "pract",  label: "PR.ACT", status: "NO-TRADE", signal: "—" },
  { id: "news",   label: "NEWS",   status: "TRADE-OK", signal: "L" },
  { id: "exec",   label: "EXEC",   status: "NO-TRADE", signal: "—" },
  { id: "cntr",   label: "CNTR",   status: "NO-TRADE", signal: "—" },
  { id: "master", label: "MASTER", status: "TRADE-OK", signal: "L" },
];

const STATUS_CFG: Record<string, { dot: string; text: string; border: string; bg: string }> = {
  "TRADE-OK": { dot: "bg-emerald-400", text: "text-emerald-400", border: "border-emerald-500/35", bg: "bg-emerald-950/60" },
  "NO-TRADE": { dot: "bg-slate-600",   text: "text-slate-500",   border: "border-slate-700/40",   bg: "bg-black/50"       },
  "ALERT":    { dot: "bg-red-400",     text: "text-red-400",     border: "border-red-500/40",     bg: "bg-red-950/60"     },
  "PENDING":  { dot: "bg-amber-400",   text: "text-amber-400",   border: "border-amber-500/35",   bg: "bg-amber-950/60"   },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentStatusBadge({ agent, index }: { agent: AgentBadge; index: number }) {
  const cfg = STATUS_CFG[agent.status] ?? STATUS_CFG["NO-TRADE"];
  const isAlert = agent.status === "ALERT";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.05 * index, duration: 0.3 }}
      className={`relative flex items-center gap-2 rounded border px-2.5 py-1.5 font-mono text-[9px] tracking-widest backdrop-blur-sm ${cfg.bg} ${cfg.border}`}
    >
      {/* Blinking dot */}
      <motion.span
        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}
        animate={isAlert ? { opacity: [1, 0.2, 1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
      />

      {/* Label */}
      <span className="text-slate-500">{agent.label}</span>

      {/* Signal chip */}
      {agent.signal !== "—" && (
        <span className={`font-black text-[8px] ${agent.signal === "L" ? "text-emerald-400" : "text-red-400"}`}>
          {agent.signal}
        </span>
      )}

      {/* Status */}
      <span className={cfg.text}>{agent.status}</span>

      {/* Alert pulse ring */}
      {isAlert && (
        <motion.span
          className="absolute inset-0 rounded border border-red-500/50 pointer-events-none"
          animate={{ opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TradingFloorSection() {
  return (
    <section className="relative w-full overflow-hidden bg-black">

      {/* ── Room image ──────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/pixel-room-v2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 20%",
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
        }}
        aria-hidden="true"
      />

      {/* ── Overlays ────────────────────────────────────────────────────────── */}
      {/* Left + right edge fades */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-60" aria-hidden="true" />
      {/* Top fade from black */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black to-transparent" aria-hidden="true" />
      {/* Bottom fade to black */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" aria-hidden="true" />
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_50%,transparent_40%,rgba(0,0,0,0.55))]" aria-hidden="true" />
      {/* Scanlines */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff 2px, #ffffff 3px)",
          backgroundSize: "100% 4px",
        }}
        aria-hidden="true"
      />
      {/* CRT teal tint */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(77,184,179,0.04),transparent)]" aria-hidden="true" />

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-end min-h-[440px] md:min-h-[520px] px-6 pb-12 pt-16 md:px-16 lg:px-24">

        {/* Top eyebrow */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="absolute top-8 left-0 right-0 flex justify-center"
        >
          <span className="font-mono text-[10px] tracking-[0.3em] text-slate-600 uppercase select-none">
            TRDX://WAR-ROOM · SYSTEM ONLINE
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-700" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase">Live Intelligence</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-700" />
          </div>
          <h2 className="font-mono text-3xl md:text-5xl font-black tracking-tight text-white leading-none">
            TRADING FLOOR
          </h2>
          <p className="mt-3 font-mono text-[11px] text-slate-500 tracking-wide max-w-lg mx-auto">
            7 agents operating in parallel · Real-time signal consensus · NY session liquidity model
          </p>
        </motion.div>

        {/* Agent status strip */}
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-3xl">
          {AGENT_BADGES.map((agent, i) => (
            <AgentStatusBadge key={agent.id} agent={agent} index={i} />
          ))}
        </div>

        {/* Bottom stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 font-mono text-[9px] tracking-[0.2em] text-slate-700"
        >
          <span><span className="text-emerald-600">●</span> 7 AGENTS ONLINE</span>
          <span>JADE CAP v2</span>
          <span>NY SESSION · 13:00–18:00 UTC</span>
          <span>CACHE TTL · 300s</span>
        </motion.div>
      </div>

    </section>
  );
}
