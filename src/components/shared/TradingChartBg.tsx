"use client";
import { useEffect, useRef } from "react";

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

function nextCandle(prev: number): Candle {
  const vol = 3 + Math.random() * 7;
  const change = (Math.random() - 0.48) * vol;
  const open  = prev;
  const close = Math.max(60, Math.min(240, prev + change));
  const high  = Math.max(open, close) + Math.random() * vol * 0.7;
  const low   = Math.min(open, close) - Math.random() * vol * 0.7;
  return { open, close, high, low };
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

    const CANDLE_W = 10;
    const GAP      = 6;
    const STEP     = CANDLE_W + GAP;
    const SPEED    = 0.22; // px/ms — very slow drift

    // Seed candles
    let seedPrice = 130;
    const candles: Candle[] = [];
    const seedCount = Math.ceil(window.innerWidth / STEP) + 20;
    for (let i = 0; i < seedCount; i++) {
      const c = nextCandle(seedPrice);
      candles.push(c);
      seedPrice = c.close;
    }

    let offsetX = 0;
    let lastTs  = performance.now();

    function frame(ts: number) {
      if (!ctx || !canvas) return;

      const dt = Math.min(ts - lastTs, 50);
      lastTs = ts;

      // Advance scroll
      offsetX += SPEED * dt;
      while (offsetX >= STEP) {
        offsetX -= STEP;
        candles.shift();
        candles.push(nextCandle(candles[candles.length - 1].close));
      }

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Price range
      const maxP  = Math.max(...candles.map(c => c.high));
      const minP  = Math.min(...candles.map(c => c.low));
      const range = maxP - minP || 1;

      const padV  = H * 0.15;
      const chartH = H - padV * 2;
      const toY = (p: number) => padV + chartH - ((p - minP) / range) * chartH;

      // ── Horizontal grid ──────────────────────────────────────────
      ctx.strokeStyle = "rgba(255,255,255,0.022)";
      ctx.lineWidth   = 1;
      for (let g = 0; g <= 5; g++) {
        const y = padV + (chartH / 5) * g;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // ── Vertical grid (every ~80px) ───────────────────────────────
      ctx.strokeStyle = "rgba(255,255,255,0.015)";
      for (let x = 0; x < W; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // ── Price line (connect close prices) ────────────────────────
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,200,83,0.09)";
      ctx.lineWidth   = 1.5;
      candles.forEach((c, i) => {
        const x = i * STEP - offsetX + CANDLE_W / 2;
        const y = toY(c.close);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // ── Area fill under price line ────────────────────────────────
      const lastX = (candles.length - 1) * STEP - offsetX + CANDLE_W / 2;
      const grad = ctx.createLinearGradient(0, padV, 0, padV + chartH);
      grad.addColorStop(0, "rgba(0,200,83,0.04)");
      grad.addColorStop(1, "rgba(0,200,83,0)");
      ctx.lineTo(lastX, padV + chartH);
      ctx.lineTo(0 - offsetX + CANDLE_W / 2, padV + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // ── Candles ───────────────────────────────────────────────────
      candles.forEach((c, i) => {
        const x = i * STEP - offsetX;
        if (x + CANDLE_W < -4 || x > W + 4) return;

        const bull = c.close >= c.open;
        const bodyFill   = bull ? "rgba(0,200,83,0.14)"  : "rgba(239,68,68,0.12)";
        const wickStroke = bull ? "rgba(0,200,83,0.09)"  : "rgba(239,68,68,0.08)";

        const openY  = toY(c.open);
        const closeY = toY(c.close);
        const highY  = toY(c.high);
        const lowY   = toY(c.low);
        const bodyTop = Math.min(openY, closeY);
        const bodyH   = Math.max(Math.abs(closeY - openY), 1.5);
        const cx      = x + CANDLE_W / 2;

        // Wick
        ctx.strokeStyle = wickStroke;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();

        // Body
        ctx.fillStyle = bodyFill;
        ctx.fillRect(x, bodyTop, CANDLE_W, bodyH);
      });

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
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0 }}
    />
  );
}
