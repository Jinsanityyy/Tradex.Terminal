"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  let token = sessionStorage.getItem("tradex_session_token");
  if (!token) {
    token = `sx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("tradex_session_token", token);
  }
  return token;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/")) return "Safari";
  if (ua.includes("OPR/")) return "Opera";
  return "Other";
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Linux")) return "Linux";
  return "Other";
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":                      "Overview",
  "/dashboard/pnl-calendar":         "PnL Calendar",
  "/dashboard/trump-monitor":        "Trump Monitor",
  "/dashboard/economic-calendar":    "Economic Calendar",
  "/dashboard/ai-briefing":          "AI Briefing",
  "/dashboard/market-bias":          "Market Bias",
  "/dashboard/news-flow":            "News Flow",
  "/dashboard/catalysts":            "Catalysts",
  "/dashboard/asset-matrix":         "Asset Matrix",
  "/dashboard/session-intelligence": "Session Intelligence",
  "/dashboard/settings":             "Settings",
};

async function track(type: string, payload: Record<string, unknown>) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
  } catch {
    // Silent — never break the app
  }
}

// ── Main Hook ──────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const pathname = usePathname();
  const sessionStarted = useRef(false);
  const sessionStart   = useRef<number>(Date.now());
  const pageViewId     = useRef<string | null>(null);
  const pageEntered    = useRef<number>(Date.now());
  const scrollDepth    = useRef(0);

  // ── Track scroll depth ─────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const el  = document.documentElement;
      const pct = Math.round((window.scrollY / (el.scrollHeight - el.clientHeight || 1)) * 100);
      if (pct > scrollDepth.current) scrollDepth.current = pct;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Start session once on mount ────────────────────────────────────
  useEffect(() => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    sessionStart.current = Date.now();

    const token = getSessionToken();

    track("session_start", {
      sessionToken: token,
      device:       getDeviceType(),
      browser:      getBrowser(),
      os:           getOS(),
      timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer:     document.referrer || null,
    });

    // End session on tab close / navigate away
    const handleEnd = () => {
      const sec = Math.round((Date.now() - sessionStart.current) / 1000);
      navigator.sendBeacon(
        "/api/analytics/track",
        JSON.stringify({ type: "session_end", payload: { sessionToken: token, durationSec: sec } })
      );
    };
    window.addEventListener("beforeunload", handleEnd);
    return () => window.removeEventListener("beforeunload", handleEnd);
  }, []);

  // ── Track page view on route change ───────────────────────────────
  useEffect(() => {
    const token = getSessionToken();
    const title = PAGE_TITLES[pathname] ?? pathname.split("/").pop() ?? "Unknown";

    // End previous page view
    if (pageViewId.current) {
      const sec     = Math.round((Date.now() - pageEntered.current) / 1000);
      const bounce  = sec < 10;
      track("pageview_end", {
        pageViewId:   pageViewId.current,
        durationSec:  sec,
        scrollDepth:  scrollDepth.current,
        isBounce:     bounce,
      });
    }

    // Reset for new page
    pageEntered.current  = Date.now();
    scrollDepth.current  = 0;
    pageViewId.current   = null;

    // Start new page view
    track("pageview_start", { sessionToken: token, page: pathname, pageTitle: title })
      .then(); // fire and forget

    // Capture returned pageViewId asynchronously
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pageview_start", payload: { sessionToken: token, page: pathname, pageTitle: title } }),
    })
      .then(r => r.json())
      .then(d => { if (d.pageViewId) pageViewId.current = d.pageViewId; })
      .catch(() => {});
  }, [pathname]);

  // ── Event tracker (exposed to components) ─────────────────────────
  const trackEvent = useCallback((
    eventName: string,
    eventType: "click" | "feature_use" | "tab_switch" | "sync" | "connect" | "other" = "click",
    properties: Record<string, unknown> = {}
  ) => {
    const token = getSessionToken();
    track("event", {
      sessionToken: token,
      page:         pathname,
      eventType,
      eventName,
      properties,
    });
  }, [pathname]);

  return { trackEvent };
}
