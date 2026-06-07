"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hide on touch devices
    if (window.matchMedia("(hover: none)").matches) return;

    const dot  = dotRef.current!;
    const ring = ringRef.current!;

    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 });

    let mx = 0, my = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      gsap.to(dot,  { x: mx, y: my, duration: 0.08, ease: "none", opacity: 1 });
      gsap.to(ring, { x: mx, y: my, duration: 0.22, ease: "power2.out", opacity: 1 });
    };

    const onEnter = () => {
      gsap.to(dot,  { scale: 0, duration: 0.2, ease: "power2.out" });
      gsap.to(ring, { scale: 1.8, borderColor: "rgba(201,168,85,0.9)", duration: 0.22, ease: "power2.out" });
    };

    const onLeave = () => {
      gsap.to(dot,  { scale: 1, duration: 0.2, ease: "power2.out" });
      gsap.to(ring, { scale: 1, borderColor: "rgba(201,168,85,0.45)", duration: 0.22, ease: "power2.out" });
    };

    const onMouseDown = () => {
      gsap.to(ring, { scale: 0.85, duration: 0.12, ease: "power2.out" });
    };

    const onMouseUp = () => {
      gsap.to(ring, { scale: 1, duration: 0.18, ease: "power2.out" });
    };

    const interactiveSelector = "a, button, [role='button'], input, label, select, textarea, [data-cursor]";

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);

    const attach = () => {
      document.querySelectorAll<HTMLElement>(interactiveSelector).forEach(el => {
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
      });
    };

    attach();

    // Re-attach on DOM changes
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed z-[9998] rounded-full"
        style={{
          width: 6,
          height: 6,
          background: "#C9A855",
          top: 0,
          left: 0,
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed z-[9997] rounded-full"
        style={{
          width: 32,
          height: 32,
          border: "1.5px solid rgba(201,168,85,0.45)",
          top: 0,
          left: 0,
        }}
      />
    </>
  );
}
