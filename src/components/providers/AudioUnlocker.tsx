"use client";

import { useEffect } from "react";
import { unlockAudio, playAppOpen } from "@/lib/sounds";

export function AudioUnlocker() {
  useEffect(() => {
    let played = false;

    const unlock = () => {
      // 1. Unlock immediately (same gesture tick) — critical for Android WebView
      unlockAudio();

      if (!played) {
        played = true;
        // playAppOpen() now awaits the buffer preload internally — no fixed
        // delay needed. It plays as soon as decodeAudioData finishes.
        playAppOpen();
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
