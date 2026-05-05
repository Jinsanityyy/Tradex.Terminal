"use client";

import { useEffect, useState } from "react";
import type { TrumpPost } from "@/types";
import { mapTruthSocialStatus } from "@/lib/trump/classify";

const TS_ACCOUNT_ID = "107780257626128497";
const TS_DIRECT = `https://truthsocial.com/api/v1/accounts/${TS_ACCOUNT_ID}/statuses?limit=20&exclude_reblogs=true`;

const CACHE_KEY = "tradex_ts_posts";
const RATE_LIMIT_KEY = "tradex_ts_last_fetch";
// Respect TRUTH_SOCIAL_POLL_SECONDS (default 30s) but enforce a minimum of 60s browser-side
const POLL_MS = Math.max(
  60_000,
  parseInt(process.env.NEXT_PUBLIC_TRUTH_SOCIAL_POLL_SECONDS ?? "30", 10) * 1000
);
const CACHE_TTL = 5 * 60 * 1000;

type CachedTS = { posts: TrumpPost[]; ts: number };

function parseStatuses(data: unknown): TrumpPost[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(mapTruthSocialStatus)
    .filter((p): p is TrumpPost => p !== null)
    .slice(0, 10);
}

// Cascade: edge proxy → corsproxy.io → allorigins.win
async function fetchTruthSocial(): Promise<TrumpPost[]> {
  // 1. Our Vercel Edge Runtime proxy (Cloudflare network IPs)
  try {
    const res = await fetch("/api/market/trump/ts", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const posts = parseStatuses(data);
      if (posts.length > 0) return posts;
    }
  } catch {}

  // 2. corsproxy.io — public CORS proxy (different IP pool)
  try {
    const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(TS_DIRECT)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const posts = parseStatuses(data);
      if (posts.length > 0) return posts;
    }
  } catch {}

  // 3. allorigins.win raw proxy
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(TS_DIRECT)}`);
    if (res.ok) {
      const data = await res.json();
      const posts = parseStatuses(data);
      if (posts.length > 0) return posts;
    }
  } catch {}

  return [];
}

export function useTruthSocialPosts() {
  const [posts, setPosts] = useState<TrumpPost[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
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

    // Rate-limit: don't hammer TS more often than POLL_MS
    try {
      const last = parseInt(sessionStorage.getItem(RATE_LIMIT_KEY) ?? "0", 10);
      if (Date.now() - last < POLL_MS) {
        setStatus("error");
        return;
      }
    } catch {}

    setStatus("loading");

    fetchTruthSocial()
      .then((mapped) => {
        setPosts(mapped);
        setStatus(mapped.length > 0 ? "ok" : "error");
        try {
          sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
          if (mapped.length > 0) {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ posts: mapped, ts: Date.now() }));
          }
        } catch {}
      })
      .catch(() => setStatus("error"));
  }, []);

  return { posts, status };
}
