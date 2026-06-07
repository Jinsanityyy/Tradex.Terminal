"use client";

import { useEffect, useRef } from "react";

const LINES = [
  { baseY: 0.10, amp: 0.055, speed: 0.65, seed: 0.0,  opacity: 0.35, width: 1.5, hue: 43 },
  { baseY: 0.22, amp: 0.090, speed: 0.90, seed: 1.3,  opacity: 0.22, width: 1.0, hue: 38 },
  { baseY: 0.34, amp: 0.070, speed: 0.75, seed: 2.6,  opacity: 0.40, width: 2.0, hue: 46 },
  { baseY: 0.46, amp: 0.110, speed: 1.05, seed: 3.8,  opacity: 0.28, width: 1.5, hue: 40 },
  { baseY: 0.58, amp: 0.065, speed: 0.55, seed: 5.1,  opacity: 0.30, width: 1.2, hue: 50 },
  { baseY: 0.70, amp: 0.085, speed: 0.82, seed: 6.4,  opacity: 0.32, width: 1.5, hue: 42 },
  { baseY: 0.81, amp: 0.050, speed: 1.00, seed: 7.6,  opacity: 0.22, width: 1.0, hue: 36 },
  { baseY: 0.92, amp: 0.060, speed: 0.70, seed: 8.9,  opacity: 0.25, width: 1.2, hue: 44 },
];

function waveY(x: number, t: number, seed: number): number {
  return (
    Math.sin(x * 0.011 + t * 0.68 + seed)        * 0.36 +
    Math.sin(x * 0.024 + t * 1.42 + seed * 1.8)  * 0.24 +
    Math.sin(x * 0.006 + t * 0.38 + seed * 0.65) * 0.30 +
    Math.sin(x * 0.048 + t * 2.10 + seed * 3.2)  * 0.10
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
    let scrollProg = 0.3; // start partially visible
    const cleanup = { fn: () => {} };

    // Use ResizeObserver so canvas always matches parent size
    const ro = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width  = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    });
    const parent = canvas.parentElement;
    if (parent) {
      ro.observe(parent);
      canvas.width  = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    }

    // GSAP ScrollTrigger for scroll reactivity
    (async () => {
      const { gsap }          = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);

      const st = ScrollTrigger.create({
        trigger: "#features",
        start:   "top bottom",
        end:     "bottom top",
        onUpdate: (self) => { scrollProg = 0.3 + self.progress * 0.7; },
      });

      cleanup.fn = () => { st.kill(); };
    })();

    const t0   = performance.now();
    const OVER = 80;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) return;

      ctx.clearRect(0, 0, W, H);

      const t  = (performance.now() - t0) / 1000;
      const ts = t + scrollProg * 10; // scroll speeds up time

      LINES.forEach((ln) => {
        const cy     = ln.baseY * H;
        const vShift = (scrollProg - 0.5) * H * 0.06;

        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
          const x = (i / 200) * (W + OVER * 2) - OVER;
          const y = cy + vShift + waveY(x, ts * ln.speed, ln.seed) * ln.amp * H;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        const alpha = Math.min(ln.opacity * scrollProg * 1.4, 0.6);
        ctx.strokeStyle = `hsla(${ln.hue}, 60%, 62%, ${alpha})`;
        ctx.lineWidth   = ln.width;
        ctx.shadowColor = `hsla(${ln.hue}, 60%, 55%, ${alpha * 0.5})`;
        ctx.shadowBlur  = 12;
        ctx.stroke();
        ctx.shadowBlur  = 0;
      });
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      cleanup.fn();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden
    />
  );
}
