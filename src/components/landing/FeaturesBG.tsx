"use client";

import { useEffect, useRef } from "react";

// ── Line configurations ────────────────────────────────────────────────────────
const LINES = [
  { baseY: 0.12, amp: 0.055, speed: 0.65, seed: 0.0,  opacity: 0.28, width: 1.5, hue: 43 },
  { baseY: 0.24, amp: 0.090, speed: 0.90, seed: 1.3,  opacity: 0.18, width: 1.0, hue: 38 },
  { baseY: 0.35, amp: 0.070, speed: 0.75, seed: 2.6,  opacity: 0.32, width: 2.0, hue: 46 },
  { baseY: 0.48, amp: 0.110, speed: 1.05, seed: 3.8,  opacity: 0.20, width: 1.5, hue: 40 },
  { baseY: 0.60, amp: 0.065, speed: 0.55, seed: 5.1,  opacity: 0.24, width: 1.2, hue: 50 },
  { baseY: 0.72, amp: 0.085, speed: 0.82, seed: 6.4,  opacity: 0.26, width: 1.5, hue: 42 },
  { baseY: 0.83, amp: 0.050, speed: 1.00, seed: 7.6,  opacity: 0.16, width: 1.0, hue: 36 },
  { baseY: 0.93, amp: 0.060, speed: 0.70, seed: 8.9,  opacity: 0.20, width: 1.2, hue: 44 },
];

// Layered sine waves for organic "price action" feel
function waveY(x: number, t: number, seed: number): number {
  return (
    Math.sin(x * 0.011 + t * 0.68 + seed)         * 0.36 +
    Math.sin(x * 0.024 + t * 1.42 + seed * 1.8)   * 0.24 +
    Math.sin(x * 0.006 + t * 0.38 + seed * 0.65)  * 0.30 +
    Math.sin(x * 0.048 + t * 2.10 + seed * 3.2)   * 0.10
  );
}

export function FeaturesBG() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let disposed = false;
    let scrollProg = 0;
    const cleanup = { fn: () => {} };

    // Size canvas to match its container
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  || window.innerWidth;
      canvas.height = rect.height || 600;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // GSAP ScrollTrigger drives scroll progress
    (async () => {
      const { gsap }          = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);

      const st = ScrollTrigger.create({
        trigger: "#features",
        start: "top bottom",
        end:   "bottom top",
        onUpdate: (self) => { scrollProg = self.progress; },
      });

      cleanup.fn = () => {
        st.kill();
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", resize);
      };
    })();

    const t0 = performance.now();
    const STEPS = 220;
    const OVER  = 100;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) return;

      ctx.clearRect(0, 0, W, H);

      const t = (performance.now() - t0) / 1000;
      // Scroll accelerates the wave time — makes lines fast-forward while scrolling
      const ts = t + scrollProg * 14;

      // Global opacity ramps up as section enters view (0→1 over first 25% scroll)
      const globalAlpha = Math.min(scrollProg / 0.25, 1);

      LINES.forEach((ln) => {
        const cy = ln.baseY * H;
        // Lines subtly shift vertically with scroll for parallax depth
        const vShift = (scrollProg - 0.5) * H * 0.07;

        ctx.beginPath();
        for (let i = 0; i <= STEPS; i++) {
          const x = (i / STEPS) * (W + OVER * 2) - OVER;
          const y = cy + vShift + waveY(x, ts * ln.speed, ln.seed) * ln.amp * H;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        const alpha = ln.opacity * globalAlpha * (0.65 + scrollProg * 0.7);
        const clampedAlpha = Math.min(alpha, 0.55);
        ctx.strokeStyle = `hsla(${ln.hue}, 58%, 62%, ${clampedAlpha})`;
        ctx.lineWidth = ln.width;
        ctx.shadowColor = `hsla(${ln.hue}, 60%, 55%, ${clampedAlpha * 0.6})`;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    };

    tick();

    return () => {
      disposed = true;
      cleanup.fn();
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}
