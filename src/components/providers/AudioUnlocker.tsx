"use client";

import { useEffect } from "react";
import { unlockAudio, playAppOpen } from "@/lib/sounds";

function isWelcomeToneEnabled(): boolean {
  try {
    const saved = localStorage.getItem("tradex_settings");
    if (!saved) return true;
    const parsed = JSON.parse(saved);
    return parsed.welcomeTone !== false;
  } catch { return true; }
}

export function AudioUnlocker() {
  useEffect(() => {
    let played = false;

    const unlock = () => {
      unlockAudio();

      if (!played) {
        played = true;
        // Prevent DashboardLayout from double-playing on the same session
        sessionStorage.setItem("tradex-opened", "1");
        if (isWelcomeToneEnabled()) playAppOpen();
      }
    };

    // touchstart fires before click on mobile — catching it means we unlock
    // on the very first finger-down, giving the most possible time for the
    // audio load before the user lifts their finger and tap completes.
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("click",      unlock, { once: true });

    return () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click",      unlock);
    };
  }, []);

  return null;
}
