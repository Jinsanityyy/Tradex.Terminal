"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  targetAlpha: number;
  blinkSpeed: number;
  life: number;
  maxLife: number;
}

function spawn(w: number, h: number): Particle {
  const maxLife = 800 + Math.random() * 1200;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.025,
    vy: -(Math.random() * 0.022 + 0.006),
    r: Math.random() * 1.2 + 0.8,           // 0.8 – 2px radius
    alpha: 0,
    targetAlpha: Math.random() * 0.22 + 0.06, // 6 – 28% max
    blinkSpeed: 0.0003 + Math.random() * 0.0004,
    life: Math.random() * maxLife,            // stagger start
    maxLife,
  };
}

export function AmbientParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Very low density — ~1 particle per 22 000px²
    const count = Math.min(30, Math.floor((window.innerWidth * window.innerHeight) / 22000));
    const particles: Particle[] = Array.from({ length: count }, () =>
      spawn(window.innerWidth, window.innerHeight)
    );

    let last = performance.now();

    function frame(ts: number) {
      if (!ctx || !canvas) return;
      const dt = Math.min(ts - last, 50);
      last = ts;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.life += dt;

        // Respawn when life expires or drifts offscreen
        if (p.life > p.maxLife || p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
          Object.assign(p, spawn(canvas.width, canvas.height));
          p.life = 0;
          p.y    = canvas.height + 4;  // re-enter from bottom
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Smooth fade envelope
        const progress = p.life / p.maxLife;
        const envelope =
          progress < 0.10 ? progress / 0.10 :
          progress > 0.85 ? (1 - progress) / 0.15 : 1;

        // Slow twinkle on top of envelope
        p.alpha = p.targetAlpha * envelope *
          (0.75 + 0.25 * Math.sin(p.life * p.blinkSpeed * Math.PI * 2));

        if (p.alpha <= 0.005) continue;

        // Soft glow: large faint halo + crisp core
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        grd.addColorStop(0,   `rgba(95,199,122,${(p.alpha * 0.9).toFixed(3)})`);
        grd.addColorStop(0.35,`rgba(95,199,122,${(p.alpha * 0.4).toFixed(3)})`);
        grd.addColorStop(1,   `rgba(95,199,122,0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Crisp center dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(110,231,183,${(p.alpha * 1.1).toFixed(3)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
