"use client";
import { useEffect, useRef } from "react";

interface Dot {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number;
  life: number; maxLife: number;
}

function makeDot(w: number, h: number, fromBottom = false): Dot {
  return {
    x: Math.random() * w,
    y: fromBottom ? h + 4 : Math.random() * h,
    vx: (Math.random() - 0.5) * 0.035,
    vy: -(Math.random() * 0.04 + 0.012),
    r: Math.random() * 1.1 + 0.35,
    a: Math.random() * 0.16 + 0.04,
    life: fromBottom ? 0 : Math.random() * 600,
    maxLife: 600 + Math.random() * 500,
  };
}

export function TradingChartBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
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

    const N = 28;
    const dots: Dot[] = Array.from({ length: N }, () =>
      makeDot(window.innerWidth, window.innerHeight)
    );

    let lastTs = performance.now();

    function frame(ts: number) {
      if (!ctx || !canvas) return;
      const dt = Math.min(ts - lastTs, 50);
      lastTs = ts;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const d of dots) {
        d.x    += d.vx * dt;
        d.y    += d.vy * dt;
        d.life += dt * 0.035;

        if (d.life >= d.maxLife || d.y < -8) {
          Object.assign(d, makeDot(canvas.width, canvas.height, true));
          continue;
        }

        // Smooth fade-in / fade-out envelope
        const t    = d.life / d.maxLife;
        const fade = t < 0.12 ? t / 0.12 : t > 0.82 ? (1 - t) / 0.18 : 1;
        const alpha = (d.a * fade).toFixed(3);

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,200,83,${alpha})`;
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
    <>
      {/* ── Layer 1: CSS grid ──────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── Layer 2: Aurora blobs (CSS-animated, GPU) ─────────── */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
        <div className="__aurora __au1" />
        <div className="__aurora __au2" />
        <div className="__aurora __au3" />
      </div>

      {/* ── Layer 3: Particle canvas ───────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 0 }}
      />

      <style>{`
        .__aurora {
          position: absolute;
          border-radius: 50%;
          will-change: transform;
        }
        .__au1 {
          top: -22%; left: -10%;
          width: 680px; height: 680px;
          background: radial-gradient(circle, rgba(0,200,83,0.09) 0%, transparent 65%);
          filter: blur(88px);
          animation: __au1 22s ease-in-out infinite;
        }
        .__au2 {
          bottom: -20%; right: -10%;
          width: 580px; height: 580px;
          background: radial-gradient(circle, rgba(0,160,95,0.07) 0%, transparent 65%);
          filter: blur(100px);
          animation: __au2 28s ease-in-out infinite;
          animation-delay: -11s;
        }
        .__au3 {
          top: 32%; left: 36%;
          width: 440px; height: 440px;
          background: radial-gradient(circle, rgba(0,200,83,0.04) 0%, transparent 65%);
          filter: blur(110px);
          animation: __au3 36s ease-in-out infinite;
          animation-delay: -20s;
        }
        @keyframes __au1 {
          0%,100% { transform: translate(0,0)    scale(1);    }
          30%     { transform: translate(4%,7%)   scale(1.04); }
          65%     { transform: translate(-2%,3%)  scale(0.97); }
        }
        @keyframes __au2 {
          0%,100% { transform: translate(0,0)    scale(1);    }
          35%     { transform: translate(-5%,-6%) scale(1.06); }
          70%     { transform: translate(3%,-3%)  scale(0.94); }
        }
        @keyframes __au3 {
          0%,100% { transform: translate(0,0)    scale(1);    opacity: 0.65; }
          50%     { transform: translate(-5%,4%)  scale(1.09); opacity: 1;    }
        }
      `}</style>
    </>
  );
}
