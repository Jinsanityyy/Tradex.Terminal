"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;          // core radius
  baseAlpha: number;  // peak opacity
  twinkleOffset: number;
  twinkleSpeed: number;
  life: number;
  maxLife: number;
  tier: 0 | 1 | 2;   // 0=dim/small  1=mid  2=bright/large
}

const TIERS = [
  { rMin: 1.0, rMax: 1.8,  aMin: 0.28, aMax: 0.42, weight: 0.45 }, // dim
  { rMin: 1.6, rMax: 2.8,  aMin: 0.45, aMax: 0.62, weight: 0.40 }, // mid
  { rMin: 2.4, rMax: 3.8,  aMin: 0.60, aMax: 0.82, weight: 0.15 }, // bright accent
];

function pickTier(): 0 | 1 | 2 {
  const r = Math.random();
  if (r < TIERS[0].weight) return 0;
  if (r < TIERS[0].weight + TIERS[1].weight) return 1;
  return 2;
}

function spawn(w: number, h: number, fromBottom = false): Particle {
  const tier  = pickTier();
  const t     = TIERS[tier];
  const maxLife = 1200 + Math.random() * 1600;
  return {
    x: Math.random() * w,
    y: fromBottom ? h + 6 : Math.random() * h,
    vx: (Math.random() - 0.5) * 0.06,
    vy: -(Math.random() * 0.055 + 0.018),
    r: t.rMin + Math.random() * (t.rMax - t.rMin),
    baseAlpha: t.aMin + Math.random() * (t.aMax - t.aMin),
    twinkleOffset: Math.random() * Math.PI * 2,
    twinkleSpeed:  0.0008 + Math.random() * 0.0012,
    life: fromBottom ? 0 : Math.random() * maxLife,
    maxLife,
    tier,
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

    // ~1 particle per 9 000px², capped at 75
    const count = Math.min(75, Math.floor((window.innerWidth * window.innerHeight) / 9000));
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

        if (p.life > p.maxLife || p.y < -12 || p.x < -12 || p.x > canvas.width + 12) {
          Object.assign(p, spawn(canvas.width, canvas.height, true));
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Fade envelope: soft in over 8%, hold, soft out over 15%
        const progress = p.life / p.maxLife;
        const envelope =
          progress < 0.08 ? progress / 0.08 :
          progress > 0.85 ? (1 - progress) / 0.15 : 1;

        // Gentle twinkle
        const twinkle = 0.82 + 0.18 * Math.sin(p.life * p.twinkleSpeed * Math.PI * 2 + p.twinkleOffset);

        const alpha = p.baseAlpha * envelope * twinkle;
        if (alpha < 0.01) continue;

        // Color: tiers 0/1 use brand green, tier 2 uses lighter teal for accent
        const coreColor  = p.tier === 2 ? `rgba(110,231,183,${alpha.toFixed(3)})`  : `rgba(95,199,122,${alpha.toFixed(3)})`;
        const haloColor0 = p.tier === 2 ? `rgba(110,231,183,${(alpha * 0.45).toFixed(3)})` : `rgba(95,199,122,${(alpha * 0.40).toFixed(3)})`;
        const haloR = p.r * 5.5;

        // Soft halo
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
        grd.addColorStop(0,    haloColor0);
        grd.addColorStop(0.4,  p.tier === 2
          ? `rgba(110,231,183,${(alpha * 0.18).toFixed(3)})`
          : `rgba(95,199,122,${(alpha * 0.15).toFixed(3)})`);
        grd.addColorStop(1,    "rgba(95,199,122,0)");

        ctx.beginPath();
        ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Crisp core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
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
