"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Newspaper, Radio, Zap, MessageSquare, TrendingUp, Bell, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useNotifications, type Notif } from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";

// ─── Severity → accent ───────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  high:   "#ef4444",
  medium: "#f97316",
  low:    "#eab308",
};

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CFG = {
  news:   { icon: <Newspaper className="h-3 w-3" />, label: "NEWS",      base: "#ef4444", baseRgb: "239,68,68"  },
  trump:  { icon: <Radio      className="h-3 w-3" />, label: "POLITICAL", base: "#f59e0b", baseRgb: "245,158,11" },
  agent:  { icon: <Zap        className="h-3 w-3" />, label: "SIGNAL",    base: "#22c55e", baseRgb: "34,197,94"  },
  chat:   { icon: <MessageSquare className="h-3 w-3" />, label: "MESSAGE", base: "#a78bfa", baseRgb: "167,139,250" },
  signal: { icon: <TrendingUp className="h-3 w-3" />, label: "SIGNAL",    base: "#38bdf8", baseRgb: "56,189,248" },
} as const;

function getCfg(type: string) {
  return TYPE_CFG[type as keyof typeof TYPE_CFG] ?? TYPE_CFG.agent;
}

function resolveAccent(notif: Notif): string {
  if (notif.severity) return SEVERITY_COLOR[notif.severity] ?? getCfg(notif.type).base;
  return getCfg(notif.type).base;
}

// ─── Time ago ────────────────────────────────────────────────────────────────

function formatAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function useTimeAgo(ts: number) {
  const [ago, setAgo] = useState(() => formatAgo(ts));
  useEffect(() => {
    const id = setInterval(() => setAgo(formatAgo(ts)), 10_000);
    return () => clearInterval(id);
  }, [ts]);
  return ago;
}

// ─── Number highlighter ───────────────────────────────────────────────────────
// Wraps standalone numbers, percentages, and R-values in monospace spans.

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\b\d+\.?\d*[%R]?\b)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\d/.test(part) ? (
          <span key={i} style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace", color: "rgba(255,255,255,0.65)" }}>
            {part}
          </span>
        ) : part
      )}
    </>
  );
}

// ─── Pulse keyframes (injected once) ─────────────────────────────────────────

const PULSE_STYLE = `
@keyframes accent-pulse {
  0%,100% { opacity:1; box-shadow: 0 0 4px var(--c), 0 0 8px var(--c); }
  50%      { opacity:.6; box-shadow: 0 0 2px var(--c); }
}
@keyframes notif-in {
  from { opacity:0; transform: translateY(-8px) scale(0.98); }
  to   { opacity:1; transform: translateY(0)    scale(1); }
}
`;

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationToast() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { setMounted(true); }, []);

  const addNotif = useCallback((n: Notif) => {
    setNotifs(prev => [n, ...prev].slice(0, 5));
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(n.title, { body: n.body, icon: "/icon-192.png" });
    }
  }, []);

  useNotifications(addNotif);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const dismiss    = useCallback((id: string) => setNotifs(p => p.filter(n => n.id !== id)), []);
  const dismissAll = useCallback(() => { setNotifs([]); setExpanded(new Set()); }, []);

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ESC to dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") dismissAll(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dismissAll]);

  if (!mounted || notifs.length === 0) return null;

  return createPortal(
    <>
      {/* Inject keyframes once */}
      <style>{PULSE_STYLE}</style>

      {/* Backdrop  -  glassmorphism */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{
          background: "rgba(0,4,8,0.6)",
          backdropFilter: "blur(12px) saturate(140%)",
          WebkitBackdropFilter: "blur(12px) saturate(140%)",
        }}
        onClick={dismissAll}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[9995] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 flex flex-col gap-1.5">

          {/* Header */}
          <div className="flex items-center justify-between px-0.5 mb-1">
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3" style={{ color: "rgba(255,255,255,0.25)" }} />
              <span className="text-[9px] font-mono tracking-[0.3em] uppercase"
                style={{ color: "rgba(255,255,255,0.25)" }}>
                {notifs.length} ALERT{notifs.length > 1 ? "S" : ""}
              </span>
            </div>
            {notifs.length > 1 && (
              <button
                onClick={dismissAll}
                className="text-[9px] font-mono tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                CLEAR ALL
              </button>
            )}
          </div>

          {/* Cards */}
          {notifs.map((n, i) => (
            <AlertCard
              key={n.id}
              notif={n}
              primary={i === 0}
              index={i}
              isExpanded={expanded.has(n.id)}
              onDismiss={() => dismiss(n.id)}
              onToggleExpand={() => toggleExpand(n.id)}
            />
          ))}

          {/* Footer hint */}
          <p className="text-center text-[8px] font-mono tracking-[0.35em] uppercase mt-1 select-none"
            style={{ color: "rgba(255,255,255,0.08)" }}>
            ESC · TAP OUTSIDE TO DISMISS
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AlertCard({
  notif, primary, index, isExpanded, onDismiss, onToggleExpand,
}: {
  notif: Notif;
  primary: boolean;
  index: number;
  isExpanded: boolean;
  onDismiss: () => void;
  onToggleExpand: () => void;
}) {
  const cfg    = getCfg(notif.type);
  const accent = resolveAccent(notif);
  const isHigh = notif.severity === "high" || !notif.severity;
  const ago    = useTimeAgo(notif.timestamp);
  const router = useRouter();

  const ts   = new Date(notif.timestamp);
  const time = ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const date = ts.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();

  // Collapsed secondary card
  if (!primary) {
    return (
      <div
        className="overflow-hidden cursor-pointer transition-opacity"
        style={{
          background: "#0a0a0a",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 4,
          transform: `scale(${1 - index * 0.018})`,
          opacity: Math.max(0.3, 1 - index * 0.28),
          transformOrigin: "top center",
        }}
        onClick={onDismiss}
      >
        <div className="flex items-center gap-2.5 pl-3 pr-3 py-2">
          <div className="w-[2px] h-5 rounded-full shrink-0" style={{ background: accent }} />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase shrink-0" style={{ color: accent }}>
            {cfg.label}
          </span>
          <span className="text-[11px] text-white/30 truncate flex-1">{notif.title}</span>
          <span className="text-[9px] font-mono text-white/15 shrink-0">{ago}</span>
          <X className="h-2.5 w-2.5 shrink-0" style={{ color: "rgba(255,255,255,0.15)" }} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(160deg,#0d0d0d 0%,#0a0a0a 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 4,
        boxShadow: `0 4px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.025)`,
        animation: "notif-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
      }}
    >
      {/* Left accent bar  -  pulses on high severity */}
      <div
        style={{
          position: "absolute",
          left: 0, top: 8, bottom: 8,
          width: 3,
          borderRadius: 2,
          background: accent,
          ["--c" as string]: accent,
          animation: isHigh ? "accent-pulse 2.4s ease-in-out infinite" : undefined,
        } as React.CSSProperties}
      />

      <div className="pl-5 pr-4 pt-3.5 pb-3.5">

        {/* Row 1  -  source badge + severity + time + close */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            {/* Source badge */}
            <div
              className="flex items-center gap-1.5 px-1.5 py-[3px]"
              style={{
                background: `rgba(${getCfg(notif.type).baseRgb},0.12)`,
                borderRadius: 2,
              }}
            >
              <span style={{ color: accent }}>{cfg.icon}</span>
              <span className="text-[8px] font-mono font-bold tracking-[0.25em] uppercase" style={{ color: accent }}>
                {cfg.label}
              </span>
            </div>

            {/* Severity dot */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-[5px] w-[5px]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                  style={{ background: accent }} />
                <span className="relative inline-flex rounded-full h-[5px] w-[5px]"
                  style={{ background: accent }} />
              </span>
              <span className="text-[8px] font-mono tracking-[0.2em] uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}>
                {notif.severity?.toUpperCase() ?? "LIVE"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Timestamps */}
            <div className="text-right">
              <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono','Courier New',monospace" }}>
                {time}
              </div>
              <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.15)", fontFamily: "'JetBrains Mono','Courier New',monospace" }}>
                {date} · {ago}
              </div>
            </div>

            {/* Expand toggle */}
            <button
              onClick={onToggleExpand}
              className="flex items-center justify-center transition-colors"
              style={{ width: 18, height: 18, borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)" }}
            >
              {isExpanded
                ? <ChevronUp className="h-2.5 w-2.5" />
                : <ChevronDown className="h-2.5 w-2.5" />}
            </button>

            {/* Close */}
            <button
              onClick={onDismiss}
              className="flex items-center justify-center transition-colors"
              style={{ width: 18, height: 18, borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)" }}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 10 }} />

        {/* Title */}
        <p className="font-semibold leading-snug mb-1.5 tracking-tight"
          style={{ fontSize: 15, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.01em" }}>
          {notif.title}
        </p>

        {/* Body  -  always visible */}
        <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
          <HighlightedText text={notif.body} />
        </p>

        {/* Expanded panel */}
        {isExpanded && (
          <div style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}>
            {/* Metadata row */}
            <div className="flex items-center gap-3 mb-3">
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 2, padding: "3px 8px" }}>
                <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>TYPE</span>
                <span className="text-[10px] font-mono ml-2" style={{ color: "rgba(255,255,255,0.5)" }}>{cfg.label}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 2, padding: "3px 8px" }}>
                <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>SEVERITY</span>
                <span className="text-[10px] font-mono ml-2" style={{ color: accent }}>
                  {notif.severity?.toUpperCase() ?? "HIGH"}
                </span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 2, padding: "3px 8px" }}>
                <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>TIME</span>
                <span className="text-[10px] font-mono ml-2" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono','Courier New',monospace" }}>{time}</span>
              </div>
            </div>

            {/* View chart button */}
            {notif.chartLink && (
              <button
                onClick={() => router.push(notif.chartLink!)}
                className="flex items-center gap-2 w-full py-2 px-3 transition-opacity hover:opacity-80"
                style={{
                  background: `rgba(${getCfg(notif.type).baseRgb},0.08)`,
                  border: `1px solid rgba(${getCfg(notif.type).baseRgb},0.2)`,
                  borderRadius: 3,
                }}
              >
                <ExternalLink className="h-3 w-3" style={{ color: accent }} />
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: accent }}>
                  VIEW IN TERMINAL
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
