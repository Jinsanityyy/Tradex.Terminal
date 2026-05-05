"use client";

import { useEffect, useState } from "react";
import type { TrumpPost } from "@/types";
import { mapTruthSocialStatus } from "@/lib/trump/classify";

// Uses our own Edge Runtime proxy (/api/market/trump/ts)
// Edge runs on Cloudflare IPs — not blocked by Truth Social like AWS Lambda (Vercel default)
const PROXY_URL = "/api/market/trump/ts";
const CACHE_KEY = "tradex_ts_posts";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

type CachedTS = { posts: TrumpPost[]; ts: number };

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

    setStatus("loading");

    fetch(PROXY_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
        const statuses: {
          id: string;
          created_at: string;
          content: string;
          reblog: unknown | null;
          in_reply_to_id: string | null;
          card?: { title?: string; description?: string } | null;
        }[] = await res.json();

        if (!Array.isArray(statuses)) throw new Error("unexpected response shape");

        const mapped = statuses
          .map(mapTruthSocialStatus)
          .filter((p): p is TrumpPost => p !== null)
          .slice(0, 10);

        setPosts(mapped);
        setStatus("ok");

        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ posts: mapped, ts: Date.now() }));
        } catch {}
      })
      .catch((err) => {
        console.error("[useTruthSocialPosts]", err);
        setStatus("error");
      });
  }, []);

  return { posts, status };
}
