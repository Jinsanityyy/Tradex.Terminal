/**
 * Adapter interface for Truth Social (and future providers like Apify or TweetStream).
 *
 * To swap providers:
 *  1. Implement TruthSocialProvider
 *  2. Pass your implementation to fetchTruthSocialPosts()
 *
 * Currently supported:
 *  - MastodonAPIProvider   -  direct Mastodon-compatible REST API (default)
 *  - ApifyProvider         -  stub; wire up Apify actor URL + token
 *  - TweetStreamProvider   -  stub; wire up TweetStream credentials
 */

export interface RawPost {
  id: string;
  createdAt: string;     // ISO 8601
  text: string;
  url: string;
  isReply: boolean;
  isReblog: boolean;
}

export interface TruthSocialProvider {
  name: string;
  fetchPosts(username: string, limit: number): Promise<RawPost[]>;
}

// ── Default: Mastodon REST API ─────────────────────────────────────────────────
// Works from browser via CORS proxies; blocked on Vercel Lambda (AWS IPs).
// See useTruthSocialPosts.ts for the browser-side fallback cascade.

const TS_ACCOUNT_ID = process.env.TRUTH_SOCIAL_ACCOUNT_ID ?? "107780257626128497";

export const MastodonAPIProvider: TruthSocialProvider = {
  name: "MastodonAPI",
  async fetchPosts(username, limit) {
    const url = `https://truthsocial.com/api/v1/accounts/${TS_ACCOUNT_ID}/statuses?limit=${limit}&exclude_reblogs=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Truth Social HTTP ${res.status}`);
    const statuses: {
      id: string;
      created_at: string;
      content: string;
      reblog: unknown | null;
      in_reply_to_id: string | null;
      url?: string;
    }[] = await res.json();

    return statuses.map((s) => ({
      id: s.id,
      createdAt: s.created_at,
      text: s.content,
      url: s.url ?? `https://truthsocial.com/@${username}/${s.id}`,
      isReply: !!s.in_reply_to_id,
      isReblog: !!s.reblog,
    }));
  },
};

// ── Stub: Apify Actor ──────────────────────────────────────────────────────────
// Set APIFY_TOKEN + APIFY_ACTOR_ID in env to activate.
export const ApifyProvider: TruthSocialProvider = {
  name: "Apify",
  async fetchPosts(username, limit) {
    const token = process.env.APIFY_TOKEN;
    const actorId = process.env.APIFY_ACTOR_ID;
    if (!token || !actorId) throw new Error("Apify: APIFY_TOKEN or APIFY_ACTOR_ID not set");
    // TODO: trigger actor run, poll for results, map to RawPost[]
    throw new Error("ApifyProvider not yet implemented");
  },
};

// ── Stub: TweetStream ──────────────────────────────────────────────────────────
export const TweetStreamProvider: TruthSocialProvider = {
  name: "TweetStream",
  async fetchPosts(_username, _limit) {
    throw new Error("TweetStreamProvider not yet implemented");
  },
};

// ── Active provider selection ──────────────────────────────────────────────────
// Change this to swap providers without touching call sites.
export const activeTruthSocialProvider: TruthSocialProvider = MastodonAPIProvider;
