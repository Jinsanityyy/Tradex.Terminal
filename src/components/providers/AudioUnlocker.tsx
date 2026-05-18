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
        // 2. Wait 600 ms so the Audio elements have time to load their data,
        //    then play the app-open chime.  600 ms is a safe lower bound even
        //    on slow connections because the files are small MP3s (~50 KB).
        setTimeout(() => playAppOpen(), 600);
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
