"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X, Zap } from "lucide-react";
import { useNotifications, type Notif } from "@/hooks/useNotifications";
import { useSettings } from "@/contexts/SettingsContext";
import { playEntryAlarm } from "@/lib/entryAlarm";

export function NotificationToast() {
  const { settings } = useSettings();
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const addNotif = useCallback((n: Notif) => {
    setNotifs(prev => [n, ...prev].slice(0, 4)); // max 4; entry alerts get their own slot

    if (n.type === "entry" && settings.notifications.alertSound) {
      playEntryAlarm();
    }

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(n.title, { body: n.body, icon: "/icon-192.png" });
    }
  }, [settings.notifications.alertSound]);

  useNotifications(addNotif);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function dismiss(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  if (notifs.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[340px] w-full">
      {notifs.map(n => (
        <NotifCard key={n.id} notif={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  );
}

function NotifCard({ notif, onDismiss }: { notif: Notif; onDismiss: () => void }) {
  const isEntry = notif.type === "entry";

  // Entry alerts stay for 20s; others dismiss at 6s
  useEffect(() => {
    const t = setTimeout(onDismiss, isEntry ? 20_000 : 6_000);
    return () => clearTimeout(t);
  }, [onDismiss, isEntry]);

  const borderColor = isEntry
    ? "border-emerald-500/60"
    : notif.type === "news"
    ? "border-red-500/40"
    : notif.type === "trump"
    ? "border-amber-500/40"
    : "border-[hsl(var(--primary))]/40";

  const glowColor = isEntry
    ? "shadow-emerald-500/20"
    : notif.type === "news"
    ? "shadow-red-500/10"
    : notif.type === "trump"
    ? "shadow-amber-500/10"
    : "shadow-[hsl(var(--primary))]/10";

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border bg-[hsl(var(--card))] px-4 py-3 shadow-xl",
      borderColor, glowColor,
      "animate-in slide-in-from-right-4 fade-in duration-300",
      isEntry && "ring-1 ring-emerald-500/30"
    )}>
      {isEntry && (
        <div className="shrink-0 mt-0.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </div>
      )}
      {!isEntry && <Zap className="hidden" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {isEntry && (
            <span className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ENTRY ALERT
            </span>
          )}
          <p className={cn(
            "text-[11px] font-bold",
            isEntry ? "text-emerald-300" : "text-zinc-100"
          )}>
            {notif.title}
          </p>
        </div>
        <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">{notif.body}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 text-zinc-600 hover:text-zinc-300 mt-0.5">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
