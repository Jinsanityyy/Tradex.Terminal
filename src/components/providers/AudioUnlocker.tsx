"use client";

import { useEffect } from "react";
import { unlockAudio, playAppOpen } from "@/lib/audio";

export function AudioUnlocker() {
  useEffect(() => {
    let played = false;

    const unlock = () => {
      unlockAudio();
      if (!played) {
        played = true;
        // Play app-open chime on the first user interaction after launch
        setTimeout(() => playAppOpen(), 200);
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
