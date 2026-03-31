"use client";

import { useState, useEffect } from "react";

function detectMobile(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Capacitor native app (Android/iOS APK)
  try {
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    if (cap?.platform === "android" || cap?.platform === "ios") return true;
  } catch {}

  // 2. User-agent check for mobile browsers
  const ua = navigator.userAgent;
  if (/android|iphone|ipad|ipod|mobile|phone/i.test(ua)) return true;

  // 3. Touch-only device with small screen
  if (window.innerWidth < 768) return true;

  return false;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(detectMobile());

    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobile(detectMobile());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
