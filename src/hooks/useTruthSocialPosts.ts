"use client";

import { useEffect, useState } from "react";
import type { TrumpPost } from "@/types";
import { mapTruthSocialStatus } from "@/lib/trump/classify";

const TS_ACCOUNT_ID = "107780257626128497";
const TS_URL = `https://truthsocial.com/api/v1/accounts/${TS_ACCOUNT_ID}/statuses?limit=20&exclude_reblogs=true`;
const CACHE_KEY = "tradex_ts_posts";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

type CachedTS = { posts: TrumpPost[]; ts: number };

// Browser-side fetch — uses the user's own IP (not Vercel's blocked IPs)
export function useTruthSocialPosts() {
  const [posts, setPosts] = useState<TrumpPost[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    // Check session cache first
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

    fetch(TS_URL, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const statuses: {
          id: string;
          created_at: string;
          content: string;
          reblog: unknown | null;
          in_reply_to_id: string | null;
          card?: { title?: string; description?: string } | null;
        }[] = await res.json();

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
