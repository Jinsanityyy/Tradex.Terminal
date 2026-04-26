"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useNotifications, type Notif } from "@/hooks/useNotifications";

export function NotificationToast() {
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const addNotif = useCallback((n: Notif) => {
    setNotifs(prev => [n, ...prev].slice(0, 3)); // max 3 at once
    // Request browser notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(n.title, { body: n.body, icon: "/icon-192.png" });
    }
  }, []);

  useNotifications(addNotif);

  // Request permission on mount
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
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[320px] w-full">
      {notifs.map(n => (
        <NotifCard key={n.id} notif={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  );
}

function NotifCard({ notif, onDismiss }: { notif: Notif; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const borderColor = notif.type === "news"
    ? "border-red-500/40"
    : notif.type === "trump"
    ? "border-amber-500/40"
    : "border-[hsl(var(--primary))]/40";

  const glowColor = notif.type === "news"
    ? "shadow-red-500/10"
    : notif.type === "trump"
    ? "shadow-amber-500/10"
    : "shadow-[hsl(var(--primary))]/10";

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border bg-[hsl(var(--card))] px-4 py-3 shadow-xl",
      borderColor, glowColor,
      "animate-in slide-in-from-right-4 fade-in duration-300"
    )}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-zinc-100 mb-0.5">{notif.title}</p>
        <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">{notif.body}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 text-zinc-600 hover:text-zinc-300 mt-0.5">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
