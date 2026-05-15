"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCatalysts, useTrumpPosts } from "./useMarketData";
import { createClient } from "@/lib/supabase/client";

export const CUSTOM_NOTIFICATION_EVENT = "tradex-custom-notification";

export type NotifType = "news" | "trump" | "chat" | "agent" | "signal";

export interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: number;
  severity?: "high" | "medium" | "low";
  chartLink?: string;
}

type NotifCallback = (n: Notif) => void;

const SEEN_CATALYSTS_KEY  = "tradex_seen_catalysts";
const SEEN_TRUMP_KEY      = "tradex_seen_trump";
const SEEN_SIGNAL_KEY     = "tradex_seen_signal_notifs";

function getSeenIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markSeen(key: string, ids: string[]) {
  try {
    const existing = getSeenIds(key);
    ids.forEach(id => existing.add(id));
    // Keep last 100 only
    const arr = [...existing].slice(-100);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

export function useNotifications(onNotif: NotifCallback) {
  const { catalysts } = useCatalysts(300_000); // poll every 5 min not 60s
  const { posts } = useTrumpPosts(300_000);    // poll every 5 min
  const onNotifRef = useRef(onNotif);
  const initializedRef = useRef(false);
  onNotifRef.current = onNotif;

  // Catalyst notifications
  useEffect(() => {
    if (!catalysts?.length) return;
    const seen = getSeenIds(SEEN_CATALYSTS_KEY);
    const newHigh = catalysts.filter(c =>
      c.importance === "high" &&
      c.id &&
      !seen.has(c.id)
    );
    if (initializedRef.current && newHigh.length > 0) {
      newHigh.forEach(c => {
        onNotifRef.current({
          id: crypto.randomUUID(),
          type: "news",
          title: "High Impact Event",
          body: c.title,
          timestamp: Date.now(),
          severity: "high",
          chartLink: "/dashboard/economic-calendar",
        });
      });
    }
    markSeen(SEEN_CATALYSTS_KEY, newHigh.map(c => c.id!));
    initializedRef.current = true;
  }, [catalysts]);

  // Trump post notifications
  const trumpInitRef = useRef(false);
  useEffect(() => {
    if (!posts?.length) return;
    const seen = getSeenIds(SEEN_TRUMP_KEY);
    const newPosts = posts.filter(p => p.id && !seen.has(p.id));
    if (trumpInitRef.current && newPosts.length > 0) {
      newPosts.slice(0, 2).forEach(p => {
        onNotifRef.current({
          id: crypto.randomUUID(),
          type: "trump",
          title: "Trump Post",
          body: p.content.slice(0, 100) + (p.content.length > 100 ? "…" : ""),
          timestamp: Date.now(),
          severity: "high",
          chartLink: "/dashboard/trump-monitor",
        });
      });
    }
    markSeen(SEEN_TRUMP_KEY, newPosts.map(p => p.id!));
    trumpInitRef.current = true;
  }, [posts]);

  // Chat notifications via Supabase realtime
  const chatInitRef = useRef(false);
  useEffect(() => {
    const sb = createClient();
    if (!sb) return;

    let myUserId: string | null = null;
    sb.auth.getUser().then(({ data }) => {
      myUserId = data.user?.id ?? null;
    });

    // Wait a moment before listening to avoid notifying on mount
    const timer = setTimeout(() => {
      chatInitRef.current = true;
    }, 3000);

    const channel = sb
      .channel("notif-messages", { config: { broadcast: { self: false } } })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        if (!chatInitRef.current) return;
        const msg = payload.new as { user_id: string; display_name: string; content: string };
        if (msg.user_id === myUserId) return;
        onNotifRef.current({
          id: crypto.randomUUID(),
          type: "chat",
          title: msg.display_name || "Trader",
          body: msg.content.slice(0, 100),
          timestamp: Date.now(),
        });
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      sb.removeChannel(channel);
    };
  }, []);

  // Signal notifications via Supabase Realtime (status changes + entry zone)
  const signalInitRef = useRef(false);
  useEffect(() => {
    const sb = createClient();
    if (!sb) return;

    const timer = setTimeout(() => { signalInitRef.current = true; }, 3000);

    const channel = sb
      .channel("notif-signals")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "signals" }, (payload) => {
        if (!signalInitRef.current) return;
        const row = payload.new as Record<string, unknown>;
        const seen = getSeenIds(SEEN_SIGNAL_KEY);
        const sym = (row.symbol_display ?? row.symbol) as string;
        const dir = (row.direction as string) ?? "";
        const pnlR = row.pnl_r as number | null;

        // Entry zone alert
        if (row.entry_zone_notified === true) {
          const notifId = `entry_${row.id}`;
          if (!seen.has(notifId)) {
            markSeen(SEEN_SIGNAL_KEY, [notifId]);
            onNotifRef.current({
              id: crypto.randomUUID(),
              type: "signal",
              title: `Entry Zone Reached`,
              body: `${sym} — ${dir.toUpperCase()} entry at ${row.entry_price}. Setup valid.`,
              timestamp: Date.now(),
            });
          }
        }

        // Status resolution alerts
        const status = row.status as string;
        if (status && status !== "open") {
          const notifId = `status_${row.id}_${status}`;
          if (!seen.has(notifId)) {
            markSeen(SEEN_SIGNAL_KEY, [notifId]);
            const rStr = pnlR != null ? `${pnlR >= 0 ? "+" : ""}${pnlR}R` : "";
            const msgs: Record<string, { title: string; body: string }> = {
              win_tp1:     { title: `TP1 Hit`, body: `${sym} ${dir.toUpperCase()} — ${rStr}` },
              win_tp2:     { title: `TP2 Hit`, body: `${sym} ${dir.toUpperCase()} — ${rStr}` },
              loss_sl:     { title: `Stop Loss Hit`, body: `${sym} ${dir.toUpperCase()} — -1R` },
              invalidated: { title: `Setup Invalidated`, body: `${sym} ${dir.toUpperCase()} — price moved beyond setup range` },
              expired:     { title: `Signal Expired`, body: `${sym} ${dir.toUpperCase()} — no resolution after 24h` },
            };
            const msg = msgs[status];
            if (msg) {
              onNotifRef.current({
                id: crypto.randomUUID(),
                type: "signal",
                ...msg,
                timestamp: Date.now(),
              });
            }
          }
        }
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      sb.removeChannel(channel);
    };
  }, []);

  // Custom dashboard notifications
  useEffect(() => {
    const handleCustomNotification = (event: Event) => {
      const customEvent = event as CustomEvent<Notif | undefined>;
      if (!customEvent.detail) return;
      onNotifRef.current(customEvent.detail);
    };

    window.addEventListener(CUSTOM_NOTIFICATION_EVENT, handleCustomNotification as EventListener);
    return () => {
      window.removeEventListener(CUSTOM_NOTIFICATION_EVENT, handleCustomNotification as EventListener);
    };
  }, []);
}
