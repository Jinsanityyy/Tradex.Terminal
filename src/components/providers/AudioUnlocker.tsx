"use client";

import { useEffect } from "react";
import { unlockAudio, preloadSounds, playAppOpen } from "@/lib/sounds";

export function AudioUnlocker() {
  useEffect(() => {
    let played = false;

    const unlock = () => {
      unlockAudio();
      // Preload MP3 buffers in background immediately after unlock
      preloadSounds().catch(() => {});

      if (!played) {
        played = true;
        // Play app-open sound on first interaction after launch
        setTimeout(() => playAppOpen(), 150);
      }
    };

    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("click", unlock, { once: true });

    return () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  return null;
}
