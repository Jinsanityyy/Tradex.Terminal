"use client";

import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh: () => Promise<void>, containerRef: React.RefObject<HTMLElement>) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullDistanceRef = useRef(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const THRESHOLD = 70;

  // Sync latest callback without re-registering listeners
  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      const dist = e.touches[0].clientY - startY.current;
      if (dist > 0) {
        const clamped = Math.min(dist, THRESHOLD * 1.5);
        pullDistanceRef.current = clamped;
        setPullDistance(clamped);
        e.preventDefault();
      }
    }

    async function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      const dist = pullDistanceRef.current;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      if (dist >= THRESHOLD) {
        setRefreshing(true);
        try { await onRefreshRef.current(); } finally { setRefreshing(false); }
      }
    }

    // capture:true — fires before nested components (Globe etc.) so their
    // stopPropagation() calls cannot block the pull gesture
    el.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    el.addEventListener("touchend", onTouchEnd, { capture: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart, { capture: true });
      el.removeEventListener("touchmove", onTouchMove, { capture: true });
      el.removeEventListener("touchend", onTouchEnd, { capture: true });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // register once — onRefresh read via ref, containerRef is stable

  return { refreshing, pullDistance, THRESHOLD };
}
