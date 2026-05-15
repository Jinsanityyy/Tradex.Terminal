"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  X, Newspaper, AlertTriangle, Zap, MessageSquare, TrendingUp,
  Radio, Bell,
} from "lucide-react";
import { useNotifications, type Notif } from "@/hooks/useNotifications";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CFG = {
  news: {
    icon: <Newspaper className="h-3.5 w-3.5" />,
    accent: "#ef4444",
    accentDim: "rgba(239,68,68,0.15)",
    label: "NEWS",
    severity: "HIGH",
    severityColor: "#ef4444",
  },
  trump: {
    icon: <Radio className="h-3.5 w-3.5" />,
    accent: "#f59e0b",
    accentDim: "rgba(245,158,11,0.15)",
    label: "POLITICAL",
    severity: "MONITOR",
    severityColor: "#f59e0b",
  },
  agent: {
    icon: <Zap className="h-3.5 w-3.5" />,
    accent: "#22c55e",
    accentDim: "rgba(34,197,94,0.15)",
    label: "SIGNAL",
    severity: "LIVE",
    severityColor: "#22c55e",
  },
  chat: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    accent: "#a78bfa",
    accentDim: "rgba(167,139,250,0.15)",
    label: "MESSAGE",
    severity: "INFO",
    severityColor: "#a78bfa",
  },
  signal: {
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    accent: "#38bdf8",
    accentDim: "rgba(56,189,248,0.15)",
    label: "SIGNAL",
    severity: "UPDATE",
    severityColor: "#38bdf8",
  },
} as const;

function getCfg(type: string) {
  return TYPE_CFG[type as keyof typeof TYPE_CFG] ?? TYPE_CFG.agent;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function NotificationToast() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [mounted, setMounted] = useState(false);

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

  const dismiss = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));
  const dismissAll = () => setNotifs([]);

  if (!mounted || notifs.length === 0) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={dismissAll}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[9995] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 flex flex-col gap-1.5">

          {/* Header bar */}
          <div
            className="flex items-center justify-between px-3 py-1.5 mb-0.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span
                className="text-[10px] font-mono tracking-[0.25em] uppercase"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {notifs.length} ALERT{notifs.length > 1 ? "S" : ""}
              </span>
            </div>
            {notifs.length > 1 && (
              <button
                onClick={dismissAll}
                className="text-[10px] font-mono tracking-wider uppercase transition-colors"
                style={{ color: "rgba(255,255,255,0.2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
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
              onDismiss={() => dismiss(n.id)}
            />
          ))}

          <p
            className="text-center text-[9px] font-mono tracking-[0.3em] uppercase mt-1 select-none"
            style={{ color: "rgba(255,255,255,0.1)" }}
          >
            ESC · TAP OUTSIDE TO DISMISS
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({
  notif, primary, index, onDismiss,
}: {
  notif: Notif;
  primary: boolean;
  index: number;
  onDismiss: () => void;
}) {
  const cfg = getCfg(notif.type);

  const ts = new Date(notif.timestamp);
  const time = ts.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const date = ts.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();

  const scaleVal = 1 - index * 0.018;
  const opacityVal = primary ? 1 : Math.max(0.3, 1 - index * 0.3);

  return (
    <div
      className="relative overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200"
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "4px",
        transform: `scale(${scaleVal})`,
        opacity: opacityVal,
        transformOrigin: "top center",
        boxShadow: primary
          ? `0 2px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)`
          : "none",
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: cfg.accent }}
      />

      {/* Content */}
      <div className="pl-4 pr-3 pt-3 pb-3">

        {/* Row 1 — meta */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            {/* Source icon + label */}
            <div
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm"
              style={{ background: cfg.accentDim }}
            >
              <span style={{ color: cfg.accent }}>{cfg.icon}</span>
              <span
                className="text-[9px] font-mono font-bold tracking-[0.2em]"
                style={{ color: cfg.accent }}
              >
                {cfg.label}
              </span>
            </div>

            {/* Severity badge */}
            <div className="flex items-center gap-1">
              {/* Blinking dot — primary only */}
              {primary && (
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ background: cfg.severityColor }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ background: cfg.severityColor }}
                  />
                </span>
              )}
              <span
                className="text-[9px] font-mono tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                {cfg.severity}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Timestamp */}
            <div className="text-right">
              <span
                className="text-[10px] font-mono block"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {time}
              </span>
              <span
                className="text-[8px] font-mono block"
                style={{ color: "rgba(255,255,255,0.15)" }}
              >
                {date}
              </span>
            </div>

            {/* Close */}
            <button
              onClick={onDismiss}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 18, height: 18,
                color: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 2,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.15)")}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 10 }} />

        {/* Row 2 — title */}
        <p
          className="font-semibold leading-snug mb-1"
          style={{
            fontSize: primary ? 15 : 13,
            color: primary ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)",
            letterSpacing: "-0.01em",
          }}
        >
          {notif.title}
        </p>

        {/* Row 3 — body */}
        {primary && (
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.38)", fontFamily: "inherit" }}
          >
            {notif.body}
          </p>
        )}
      </div>
    </div>
  );
}
