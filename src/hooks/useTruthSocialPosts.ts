"use client";

import { useEffect, useState } from "react";
import type { TrumpPost } from "@/types";
import { mapTruthSocialStatus } from "@/lib/trump/classify";

const CACHE_KEY      = "tradex_ts_posts_v2";
const RATE_LIMIT_KEY = "tradex_ts_last_fetch";
const CACHE_TTL      = 5 * 60 * 1000;  // 5 min
const MIN_POLL_MS    = 60 * 1000;       // never hit the API more than once per minute

type TSStatus = "idle" | "loading" | "ok" | "error" | "unconfigured";
type CachedTS = { posts: TrumpPost[]; ts: number };

export function useTruthSocialPosts() {
  const [posts,  setPosts]  = useState<TrumpPost[]>([]);
  const [status, setStatus] = useState<TSStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  function refresh() {
    try { sessionStorage.removeItem(RATE_LIMIT_KEY); } catch {}
    try { sessionStorage.removeItem(CACHE_KEY); } catch {}
    setPosts([]);
    setErrorMsg(null);
    setTick(t => t + 1);
  }

  useEffect(() => {
    // Return cached data immediately if still fresh
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedTS = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL && cached.posts.length > 0) {
          setPosts(cached.posts);
          setStatus("ok");
          return;
        }
      }
    } catch {}

    // Rate-limit guard — don't spam the API on every React mount
    try {
      const last = parseInt(sessionStorage.getItem(RATE_LIMIT_KEY) ?? "0", 10);
      if (Date.now() - last < MIN_POLL_MS) {
        return;
      }
    } catch {}

    setStatus("loading");

    fetch("/api/market/trump/ts", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);

        // Provider not configured
        if (res.status === 503 && body?.configured === false) {
          console.warn("[useTruthSocialPosts] provider not configured:", body?.error);
          setStatus("unconfigured");
          setErrorMsg(body?.error ?? "Truth Social provider not configured.");
          return;
        }

        // Other HTTP error
        if (!res.ok) {
          console.error(`[useTruthSocialPosts] HTTP ${res.status}:`, body?.error ?? body);
          setStatus("error");
          setErrorMsg(body?.error ?? `HTTP ${res.status}`);
          return;
        }

        // Success — body should be an array of Mastodon-like status objects
        if (!Array.isArray(body)) {
          console.error("[useTruthSocialPosts] unexpected response shape:", body);
          setStatus("error");
          setErrorMsg("Unexpected response from provider.");
          return;
        }

        const mapped: TrumpPost[] = body
          .map(mapTruthSocialStatus)
          .filter((p): p is TrumpPost => p !== null)
          .slice(0, 10);

        console.log(`[useTruthSocialPosts] got ${mapped.length} posts`);
        setPosts(mapped);
        setStatus(mapped.length > 0 ? "ok" : "error");
        setErrorMsg(mapped.length === 0 ? "Provider returned 0 original posts (all replies/reblogs?)." : null);

        try {
          sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
          if (mapped.length > 0) {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ posts: mapped, ts: Date.now() }));
          }
        } catch {}
      })
      .catch((err) => {
        console.error("[useTruthSocialPosts] fetch failed:", err);
        setStatus("error");
        setErrorMsg(String(err));
      });
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return { posts, status, errorMsg, refresh };
}
