"use client";

import { useEffect, useRef, useState } from "react";
import type { TrumpPost } from "@/types";
import { mapTruthSocialStatus } from "@/lib/trump/classify";
import { createClient } from "@/lib/supabase/client";

const CACHE_KEY      = "tradex_ts_posts_v4";
const RATE_LIMIT_KEY = "tradex_ts_last_fetch";
const CACHE_TTL      = 5 * 60 * 1000;  // 5 min
const MIN_POLL_MS    = 60 * 1000;       // never hit the API more than once per minute

const TS_ACCOUNT_ID  = "107780257626128497";
const TS_DIRECT_URL  = `https://truthsocial.com/api/v1/accounts/${TS_ACCOUNT_ID}/statuses?limit=20&exclude_replies=true&exclude_reblogs=true`;

type TSStatus = "idle" | "loading" | "ok" | "error" | "unconfigured";
type CachedTS = { posts: TrumpPost[]; ts: number; source: string };

type TrumpPostRow = {
  id: string;
  content: string;
  created_at: string;
  url: string | null;
  replies_count: number | null;
  reblogs_count: number | null;
  favourites_count: number | null;
};

function rowToTrumpPost(row: TrumpPostRow): TrumpPost | null {
  return mapTruthSocialStatus({
    id: row.id,
    created_at: row.created_at,
    content: row.content,
    reblog: null,
    in_reply_to_id: null,
    url: row.url ?? undefined,
    reblogs_count: row.reblogs_count ?? undefined,
    favourites_count: row.favourites_count ?? undefined,
    replies_count: row.replies_count ?? undefined,
  });
}

// ── Try 1: direct browser fetch ──────────────────────────────────────────────
async function fetchDirect(): Promise<TrumpPost[]> {
  const res = await fetch(TS_DIRECT_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const statuses: Parameters<typeof mapTruthSocialStatus>[0][] = await res.json();
  return statuses
    .map(mapTruthSocialStatus)
    .filter((p): p is TrumpPost => p !== null)
    .slice(0, 10);
}

// ── Try 2: server route (/api/market/trump/ts — CNN archive + fallbacks) ─────
async function fetchViaServer(): Promise<{ posts: TrumpPost[]; error?: string; configured?: boolean }> {
  const res = await fetch("/api/market/trump/ts", { cache: "no-store" });
  const body = await res.json().catch(() => null);

  if (res.status === 503 && body?.configured === false) {
    return { posts: [], error: body?.error, configured: false };
  }
  if (!res.ok) {
    return { posts: [], error: body?.error ?? `HTTP ${res.status}` };
  }
  if (!Array.isArray(body)) {
    return { posts: [], error: "Unexpected server response." };
  }

  const posts: TrumpPost[] = body
    .map(mapTruthSocialStatus)
    .filter((p): p is TrumpPost => p !== null)
    .slice(0, 10);

  return { posts };
}

export function useTruthSocialPosts() {
  const [posts,    setPosts]    = useState<TrumpPost[]>([]);
  const [status,   setStatus]   = useState<TSStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [source,   setSource]   = useState<"direct" | "server" | "realtime" | null>(null);
  const [tick,     setTick]     = useState(0);
  const seenIds = useRef<Set<string>>(new Set());

  function refresh() {
    try { sessionStorage.removeItem(RATE_LIMIT_KEY); } catch {}
    try { sessionStorage.removeItem(CACHE_KEY); } catch {}
    seenIds.current.clear();
    setPosts([]);
    setErrorMsg(null);
    setTick(t => t + 1);
  }

  // ── Supabase Realtime — live inserts from cnn-sync cron ───────────────────
  useEffect(() => {
    const sb = createClient();
    if (!sb) return;

    const channel = sb
      .channel("trump_posts_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trump_posts" },
        (payload) => {
          const row = payload.new as TrumpPostRow;
          const post = rowToTrumpPost(row);
          if (!post) return;
          if (seenIds.current.has(post.id)) return;

          console.log(`[useTruthSocialPosts] realtime INSERT: ${post.id}`);
          seenIds.current.add(post.id);

          setPosts(prev => {
            if (prev.some(p => p.id === post.id)) return prev;
            const next = [post, ...prev].slice(0, 10);
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify({ posts: next, ts: Date.now(), source: "realtime" }));
            } catch {}
            return next;
          });
          setStatus("ok");
          setSource("realtime");
        }
      )
      .subscribe((subStatus) => {
        console.log(`[useTruthSocialPosts] realtime channel: ${subStatus}`);
      });

    return () => { sb.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial fetch on mount / refresh ─────────────────────────────────────
  useEffect(() => {
    // Serve from sessionStorage cache if still fresh
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedTS = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL && cached.posts.length > 0) {
          setPosts(cached.posts);
          setStatus("ok");
          setSource(cached.source as "direct" | "server" | "realtime");
          cached.posts.forEach(p => seenIds.current.add(p.id));
          return;
        }
      }
    } catch {}

    // Rate-limit: don't re-fetch within MIN_POLL_MS
    try {
      const last = parseInt(sessionStorage.getItem(RATE_LIMIT_KEY) ?? "0", 10);
      if (Date.now() - last < MIN_POLL_MS) return;
    } catch {}

    setStatus("loading");

    (async () => {
      // ── Try 1: direct browser fetch (works when Truth Social isn't CF-blocking) ──
      try {
        console.log("[useTruthSocialPosts] trying direct browser fetch…");
        const directPosts = await fetchDirect();
        if (directPosts.length > 0) {
          console.log(`[useTruthSocialPosts] direct OK — ${directPosts.length} posts`);
          directPosts.forEach(p => seenIds.current.add(p.id));
          setPosts(directPosts);
          setStatus("ok");
          setSource("direct");
          setErrorMsg(null);
          try {
            sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ posts: directPosts, ts: Date.now(), source: "direct" }));
          } catch {}
          return;
        }
        console.warn("[useTruthSocialPosts] direct fetch returned 0 posts");
      } catch (err) {
        console.warn("[useTruthSocialPosts] direct fetch failed (CORS/network):", err);
      }

      // ── Try 2: server route (CNN archive → Supabase cache → Apify fallback) ──
      console.log("[useTruthSocialPosts] falling back to server route…");
      try {
        const { posts: serverPosts, error, configured } = await fetchViaServer();

        if (configured === false) {
          setStatus("unconfigured");
          setErrorMsg(error ?? "Truth Social provider not configured.");
          return;
        }
        if (serverPosts.length > 0) {
          console.log(`[useTruthSocialPosts] server OK — ${serverPosts.length} posts`);
          serverPosts.forEach(p => seenIds.current.add(p.id));
          setPosts(serverPosts);
          setStatus("ok");
          setSource("server");
          setErrorMsg(null);
          try {
            sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ posts: serverPosts, ts: Date.now(), source: "server" }));
          } catch {}
          return;
        }

        setStatus("error");
        setErrorMsg(error ?? "No posts returned from any source.");
      } catch (err) {
        console.error("[useTruthSocialPosts] server route failed:", err);
        setStatus("error");
        setErrorMsg(String(err));
      }
    })();
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return { posts, status, errorMsg, source, refresh };
}
