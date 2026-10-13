"use client";

import { useEffect } from "react";
import { SWRConfig, useSWRConfig } from "swr";
import { isUserActive, onUserReturn } from "@/lib/client/activity";

/** Revalidates every SWR key once when the user comes back from being idle/away. */
function CatchUpOnReturn() {
  const { mutate } = useSWRConfig();
  useEffect(() => onUserReturn(() => { void mutate(() => true); }), [mutate]);
  return null;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        revalidateIfStale: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        // No polling while nobody is looking (hidden tab or 15 min idle);
        // CatchUpOnReturn refreshes everything the moment they're back.
        isPaused: () => !isUserActive(),
      }}
    >
      <CatchUpOnReturn />
      {children}
    </SWRConfig>
  );
}
