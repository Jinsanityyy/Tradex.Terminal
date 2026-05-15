"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X, Newspaper, AlertTriangle, Zap, MessageSquare, Bell } from "lucide-react";
import { useNotifications, type Notif } from "@/hooks/useNotifications";

// ─── Per-type config ──────────────────────────────────────────────────────────

const TYPE_CFG = {
  news: {
    icon: <Newspaper className="h-5 w-5" />,
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    border: "border-red-500/50",
    bar: "bg-red-500",
    glow: "0 0 40px rgba(239,68,68,0.18)",
    label: "NEWS ALERT",
    labelColor: "text-red-400",
  },
  trump: {
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    border: "border-amber-500/50",
    bar: "bg-amber-500",
    glow: "0 0 40px rgba(245,158,11,0.18)",
    label: "TRUMP ALERT",
    labelColor: "text-amber-400",
  },
  agent: {
    icon: <Zap className="h-5 w-5" />,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/50",
    bar: "bg-emerald-500",
    glow: "0 0 40px rgba(16,185,129,0.18)",
    label: "SIGNAL ALERT",
    labelColor: "text-emerald-400",
  },
  chat: {
    icon: <MessageSquare className="h-5 w-5" />,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    border: "border-violet-500/50",
    bar: "bg-violet-500",
    glow: "0 0 40px rgba(139,92,246,0.18)",
    label: "CHAT",
    labelColor: "text-violet-400",
  },
} as const;

function getTypeCfg(type: string) {
  return TYPE_CFG[type as keyof typeof TYPE_CFG] ?? TYPE_CFG.agent;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationToast() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const addNotif = useCallback((n: Notif) => {
    setNotifs(prev => [n, ...prev].slice(0, 6));
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

  function dismiss(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  function dismissAll() {
    setNotifs([]);
  }

  if (!mounted || notifs.length === 0) return null;

  return createPortal(
    <>
      {/* Backdrop — click to clear all */}
      <div
        className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm"
        onClick={dismissAll}
      />

      {/* Centered stack */}
      <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[420px] flex flex-col gap-2.5">

          {/* Stack header */}
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                {notifs.length} Alert{notifs.length > 1 ? "s" : ""}
              </span>
            </div>
            {notifs.length > 1 && (
              <button
                onClick={dismissAll}
                className="text-[10px] font-medium text-zinc-600 hover:text-zinc-200 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Notification cards */}
          {notifs.map((n, i) => (
            <NotifCard
              key={n.id}
              notif={n}
              primary={i === 0}
              onDismiss={() => dismiss(n.id)}
            />
          ))}

          {/* Tap-backdrop hint */}
          <p className="text-center text-[9px] text-zinc-700 mt-1 select-none">
            Tap outside to clear all
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function NotifCard({
  notif,
  primary,
  onDismiss,
}: {
  notif: Notif;
  primary: boolean;
  onDismiss: () => void;
}) {
  const cfg = getTypeCfg(notif.type);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-[#0f0f11]",
        "animate-in slide-in-from-bottom-3 fade-in duration-250",
        cfg.border,
        primary ? "shadow-2xl" : "opacity-80"
      )}
      style={primary ? { boxShadow: cfg.glow } : undefined}
    >
      {/* Top accent bar */}
      <div className={cn("absolute top-0 inset-x-0 h-[3px]", cfg.bar)} />

      <div className="px-5 pt-5 pb-4">
        {/* Label row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", cfg.iconBg, cfg.iconColor)}>
              {cfg.icon}
            </div>
            <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", cfg.labelColor)}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-zinc-700">
              {new Date(notif.timestamp).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </span>
            <button
              onClick={onDismiss}
              className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.07] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <p className={cn(
          "font-bold leading-snug mb-1.5",
          primary ? "text-[15px] text-white" : "text-[13px] text-zinc-200"
        )}>
          {notif.title}
        </p>

        {/* Body */}
        <p className={cn(
          "leading-relaxed",
          primary ? "text-[12px] text-zinc-300" : "text-[11px] text-zinc-500"
        )}>
          {notif.body}
        </p>
      </div>
    </div>
  );
}
