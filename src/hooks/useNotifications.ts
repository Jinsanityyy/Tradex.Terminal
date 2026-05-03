"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCatalysts, useTrumpPosts } from "./useMarketData";
import { createClient } from "@/lib/supabase/client";

export const CUSTOM_NOTIFICATION_EVENT = "tradex-custom-notification";

export type NotifType = "news" | "trump" | "chat" | "agent";

export interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: number;
}

type NotifCallback = (n: Notif) => void;

const SEEN_CATALYSTS_KEY = "tradex_seen_catalysts";
const SEEN_TRUMP_KEY = "tradex_seen_trump";

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
          title: "🔴 High Impact News",
          body: c.title,
          timestamp: Date.now(),
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
          title: "🚨 Trump Post",
          body: p.content.slice(0, 100) + (p.content.length > 100 ? "…" : ""),
          timestamp: Date.now(),
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
          title: `💬 ${msg.display_name || "Trader"}`,
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
