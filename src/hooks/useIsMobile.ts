"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "tradex_native";

function detectMobile(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Check URL for ?native=1 (set in capacitor.config.ts)
  //    Store in localStorage so it persists across SPA navigation
  const params = new URLSearchParams(window.location.search);
  if (params.get("native") === "1") {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    return true;
  }

  // 2. localStorage flag (persists after ?native=1 is lost from URL)
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {}

  // 3. Mobile user-agent fallback (for regular mobile browsers)
  if (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)) return true;

  // 4. Narrow screen fallback
  if (window.innerWidth < 768) return true;

  return false;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);

  return isMobile;
}
