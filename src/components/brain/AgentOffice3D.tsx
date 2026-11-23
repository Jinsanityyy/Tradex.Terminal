"use client";

/**
 * TradeX Agent Office — isometric 3D room where the 7 real agents walk to
 * their stations and act out the latest /api/agents/run result.
 *
 * Every bubble, screen and log line comes from AgentRunResult; nothing is
 * simulated. Clicking an agent opens the existing BrainOverviewDrawer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRunResult, SnapshotCandle } from "@/lib/agents/schemas";

// ─── Types & config ──────────────────────────────────────────────────────────

type BotId = "trend" | "smc" | "news" | "risk" | "contrarian" | "execution" | "master";
type Face = "n" | "s" | "w" | "e";
type Kind = "up" | "dn" | "warn" | "";
type StationId = "chart" | "whiteboard" | "news" | "master" | "master2" | "terminal" | "lounge";
type SpotId = StationId | "home";

interface LogItem { key: number; id: BotId; msg: string; kind: Kind; t: number }

interface BotDef { id: BotId; name: string; color: string; home: [number, number, Face]; desk?: [number, number] }

const FACE: Record<Face, number> = { n: Math.PI, s: 0, w: -Math.PI / 2, e: Math.PI / 2 };

const BOTS: BotDef[] = [
  { id: "trend",      name: "Trend",        color: "#38bdf8", desk: [-6, -3.5],  home: [-6, -2.45, "n"] },
  { id: "smc",        name: "Price Action", color: "#a78bfa", desk: [-2.5, -3.5], home: [-2.5, -2.45, "n"] },
  { id: "news",       name: "News",         color: "#f472b6", desk: [1, -3.5],   home: [1, -2.45, "n"] },
  { id: "risk",       name: "Risk",         color: "#f59e0b", desk: [-6, 0.5],   home: [-6, 1.55, "n"] },
  { id: "contrarian", name: "Contrarian",   color: "#fde047", desk: [-2.5, 0.5], home: [-2.5, 1.55, "n"] },
  { id: "execution",  name: "Execution",    color: "#22c55e", desk: [1, 0.5],    home: [1, 1.55, "n"] },
  { id: "master",     name: "Master",       color: "#2dd4bf", home: [7, -5.2, "s"] },
];
const BOT_BY_ID = Object.fromEntries(BOTS.map((b) => [b.id, b])) as Record<BotId, BotDef>;

const SPOTS: Record<StationId, [number, number, Face, string]> = {
  chart:      [1.5, -6.6, "n", "the chart wall"],
  whiteboard: [-9.6, -3.2, "w", "the level board"],
  news:       [-9.6, 4.8, "w", "the news screen"],
  master:     [7, -2.75, "n", "the master desk"],
  master2:    [5.3, -2.75, "n", "the master desk"],
  terminal:   [8.5, 2.6, "e", "the order terminal"],
  lounge:     [-1.5, 5.5, "w", "the lounge"],
};

const STATION: Record<BotId, StationId | null> = {
  trend: "chart", smc: "whiteboard", news: "news", risk: "master",
  contrarian: "master2", execution: "terminal", master: null,
};

const KIND_TEXT: Record<Kind, string> = {
  up: "text-emerald-400", dn: "text-red-400", warn: "text-amber-400", "": "text-zinc-400",
};

// ─── Small helpers ───────────────────────────────────────────────────────────

function fmtPrice(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "–";
  if (v > 10000) return v.toFixed(0);
  if (v > 100) return v.toFixed(1);
  if (v > 1) return v.toFixed(4);
  return v.toFixed(5);
}
const clip = (s: string | null | undefined, n = 110) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};
const up = (s: string | undefined) => (s ?? "").replace(/[-_]/g, " ").toUpperCase();
const pick = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

interface ScreenState {
  symbol: string;
  timeframe: string;
  candles: SnapshotCandle[];
  price: number | null;
  plan: { dir: "long" | "short"; entry: number; sl: number; tp: number } | null;
  finalBias: string;
  catalysts: { headline: string; impact: "high" | "medium" | "low" }[];
  regime: string;
  levels: [string, number | null][];
  setupLabel: string;
  exec: { state: string; lines: string[] };
}

const EMPTY_SCREEN: ScreenState = {
  symbol: "XAUUSD", timeframe: "H1", candles: [], price: null, plan: null, finalBias: "no-trade",
  catalysts: [], regime: "", levels: [], setupLabel: "", exec: { state: "WAIT", lines: [] },
};

function screenFromRun(d: AgentRunResult, livePrice: number | null): ScreenState {
  const { master, execution, news, smc } = d.agents;
  const tp = master.tradePlan;
  const plan = tp
    ? { dir: tp.direction, entry: tp.entry, sl: tp.stopLoss, tp: tp.tp1 }
    : execution.hasSetup && execution.entry != null && execution.stopLoss != null && execution.tp1 != null &&
      execution.direction !== "none"
      ? { dir: execution.direction, entry: execution.entry, sl: execution.stopLoss, tp: execution.tp1 }
      : null;
  const k = smc.keyLevels ?? ({} as Partial<typeof smc.keyLevels>);
  return {
    symbol: d.symbolDisplay || d.symbol,
    timeframe: d.timeframe,
    candles: d.snapshot.recentCandles ?? [],
    price: livePrice ?? d.snapshot.price.current,
    plan,
    finalBias: master.finalBias,
    catalysts: (news.catalysts ?? []).slice(0, 4).map((c) => ({ headline: c.headline, impact: c.impact })),
    regime: news.regime,
    levels: [
      ["OB high", k.orderBlockHigh ?? null], ["OB low", k.orderBlockLow ?? null], ["FVG mid", k.fvgMid ?? null],
      ["Liquidity", k.liquidityTarget ?? null], ["Sweep", k.sweepLevel ?? null],
    ],
    setupLabel: smc.setupPresent ? `${smc.setupType} · ${smc.premiumDiscount}` : `No setup · ${smc.premiumDiscount}`,
    exec: {
      state: execution.signalState,
      lines: execution.hasSetup
        ? [
            `${up(execution.direction)} ${execution.grade}`,
            `Entry ${fmtPrice(execution.entry)}`,
            `SL    ${fmtPrice(execution.stopLoss)}`,
            `TP1   ${fmtPrice(execution.tp1)}`,
            `R:R   ${execution.rrRatio?.toFixed(1) ?? "–"}`,
          ]
        : [clip(execution.signalStateReason, 26), clip(execution.trigger, 26)],
    },
  };
}

// ─── Canvas drawings for the in-room screens ────────────────────────────────

const FONT = "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";

function drawChart(x: CanvasRenderingContext2D, w: number, h: number, s: ScreenState) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#081018"); g.addColorStop(1, "#0c1622");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.font = `700 36px ${FONT}`; x.fillStyle = "#f2b33d"; x.fillText(s.symbol, 24, 54);
  x.font = `500 24px ${FONT}`; x.fillStyle = "#8b96a7"; x.fillText(`${s.timeframe} · live`, 24 + x.measureText(s.symbol).width * 1.5 + 16, 54);
  const candles = s.candles.slice(-60);
  if (!candles.length) {
    x.fillStyle = "#8b96a7"; x.font = `500 28px ${FONT}`; x.fillText("Waiting for candles…", 24, h / 2);
    return;
  }
  const lv = s.plan ? [s.plan.entry, s.plan.sl, s.plan.tp] : [];
  const px = s.price != null ? [s.price] : [];
  let hi = Math.max(...candles.map((c) => c.h), ...lv, ...px);
  let lo = Math.min(...candles.map((c) => c.l), ...lv, ...px);
  const pad = (hi - lo) * 0.08 || 1; hi += pad; lo -= pad;
  const L = 24, R = w - 150, T = 84, B = h - 28;
  const Y = (v: number) => T + ((hi - v) / (hi - lo)) * (B - T);
  x.strokeStyle = "rgba(255,255,255,.06)"; x.lineWidth = 1;
  for (let i = 0; i < 6; i++) { const y = T + (i * (B - T)) / 5; x.beginPath(); x.moveTo(L, y); x.lineTo(R, y); x.stroke(); }
  const cw = (R - L) / candles.length; x.lineWidth = 2;
  candles.forEach((c, i) => {
    const isUp = c.c >= c.o, cx = L + i * cw + cw / 2;
    x.strokeStyle = x.fillStyle = isUp ? "#22c55e" : "#f05252";
    x.beginPath(); x.moveTo(cx, Y(c.h)); x.lineTo(cx, Y(c.l)); x.stroke();
    const y1 = Y(Math.max(c.o, c.c)), y2 = Y(Math.min(c.o, c.c));
    x.fillRect(cx - cw * 0.32, y1, cw * 0.64, Math.max(2, y2 - y1));
  });
  if (s.plan) {
    x.fillStyle = s.plan.dir === "long" ? "#22c55e" : "#f05252"; x.font = `700 24px ${FONT}`;
    x.fillText(s.plan.dir.toUpperCase(), R - 90, 54);
    ([["TP1", s.plan.tp, "#22c55e"], ["SL", s.plan.sl, "#f05252"], ["Entry", s.plan.entry, "#e9eef5"]] as const).forEach(([n, v, c]) => {
      x.strokeStyle = c; x.setLineDash([10, 8]); x.lineWidth = 2;
      x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(R, Y(v)); x.stroke(); x.setLineDash([]);
      x.fillStyle = c; x.font = `600 20px ${FONT}`; x.fillText(n, R - 64, Y(v) - 8);
    });
  }
  if (s.price != null) {
    const py = Y(s.price);
    x.fillStyle = "#f2b33d"; x.fillRect(R + 8, py - 20, w - R - 14, 40);
    x.fillStyle = "#0b0e13"; x.font = `700 24px ${FONT}`; x.fillText(fmtPrice(s.price), R + 18, py + 9);
  }
}

function drawNews(x: CanvasRenderingContext2D, w: number, h: number, s: ScreenState) {
  x.fillStyle = "#0b0f17"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#f472b6"; x.font = `700 34px ${FONT}`; x.fillText("Catalysts", 28, 56);
  if (s.regime) { x.fillStyle = "#8b96a7"; x.font = `500 24px ${FONT}`; x.fillText(up(s.regime), 220, 56); }
  x.font = `500 24px ${FONT}`;
  const rows = s.catalysts.length ? s.catalysts : [{ headline: "No catalysts in this run", impact: "low" as const }];
  rows.forEach((r, i) => {
    const y = 124 + i * 76;
    x.fillStyle = { high: "#f05252", medium: "#f59e0b", low: "#3b4556" }[r.impact];
    x.fillRect(28, y - 22, 14, 28);
    x.fillStyle = "#e9eef5"; x.fillText(clip(r.headline, 44), 58, y);
  });
}

function drawBoard(x: CanvasRenderingContext2D, w: number, h: number, s: ScreenState) {
  x.fillStyle = "#e9eef4"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#1e3a8a"; x.font = `700 30px ${FONT}`; x.fillText(s.setupLabel || "Key levels", 24, 46);
  x.font = `600 24px ${FONT}`;
  s.levels.forEach(([n, v], i) => {
    const y = 96 + i * 40;
    x.fillStyle = "#475569"; x.fillText(n, 24, y);
    x.fillStyle = v == null ? "#94a3b8" : "#b91c1c"; x.fillText(fmtPrice(v), 220, y);
  });
}

function drawTerminal(x: CanvasRenderingContext2D, w: number, h: number, s: ScreenState) {
  x.fillStyle = "#06120b"; x.fillRect(0, 0, w, h);
  const armed = s.exec.state === "ARMED" || s.exec.state === "PENDING";
  x.fillStyle = armed ? "#22c55e" : "#f59e0b"; x.font = `700 24px ${FONT}`; x.fillText(s.exec.state, 16, 36);
  x.font = `500 19px ${FONT}`; x.fillStyle = "#9be7b4";
  s.exec.lines.slice(0, 6).forEach((l, i) => x.fillText(l, 16, 74 + i * 28));
}

function drawMonitor(x: CanvasRenderingContext2D, w: number, h: number) {
  x.fillStyle = "#0a1220"; x.fillRect(0, 0, w, h);
  let p = 72;
  for (let i = 0; i < 28; i++) {
    const o = p; p = Math.max(22, Math.min(122, p + (Math.random() - 0.5) * 18));
    x.fillStyle = p < o ? "#22c55e" : "#f05252";
    x.fillRect(10 + i * 8.5, Math.min(o, p), 5, Math.abs(p - o) + 2);
  }
}

// ─── Scene ───────────────────────────────────────────────────────────────────

interface Bot {
  def: BotDef;
  g: THREE.Group; rig: THREE.Group; head: THREE.Group; eyes: THREE.Group; tip: THREE.Mesh;
  fL: THREE.Mesh; fR: THREE.Mesh;
  tag: HTMLButtonElement; bubble: HTMLSpanElement;
  path: [number, number][]; done: ((ok: boolean) => void) | null;
  rot: number; targetRot: number; face: number; where: string;
  sayUntil: number; ph: number; blink: number;
}

interface OfficeApi {
  go(id: BotId, spot: SpotId): Promise<boolean>;
  say(id: BotId, msg: string, kind?: Kind): void;
  setScreens(s: ScreenState): void;
  resetView(): void;
  dispose(): void;
}

function route(x0: number, z0: number, x1: number, z1: number): [number, number][] {
  const A = [-5.6, -1.6, 2.6];
  const near = (z: number) => A.reduce((b, a) => (Math.abs(a - z) < Math.abs(b - z) ? a : b));
  const a1 = near(z0), a2 = near(z1);
  const pts: [number, number][] = [[x0, a1]];
  if (a1 !== a2) {
    const cx = [-8.6, 3.4].reduce((b, c) => (Math.abs(x0 - c) + Math.abs(c - x1) < Math.abs(x0 - b) + Math.abs(b - x1) ? c : b));
    pts.push([cx, a1], [cx, a2]);
  }
  pts.push([x1, a2], [x1, z1]);
  let px = x0, pz = z0;
  return pts.filter((p) => {
    const keep = Math.hypot(p[0] - px, p[1] - pz) > 0.01;
    if (keep) { px = p[0]; pz = p[1]; }
    return keep;
  });
}

function buildOffice(
  wrap: HTMLDivElement,
  tagLayer: HTMLDivElement,
  onBotClick: (id: BotId) => void,
  onSay: (id: BotId, msg: string, kind: Kind) => void,
): OfficeApi {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none";
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#090c11");
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  const CAM0 = new THREE.Vector3(20, 20.5, 20), TGT0 = new THREE.Vector3(-0.5, 1.4, 0);
  cam.position.copy(CAM0);
  const controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minZoom = 0.6; controls.maxZoom = 3.2; controls.maxPolarAngle = 1.35;
  controls.target.copy(TGT0); controls.update();

  const resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const a = w / h, v = Math.max(9.2, 15.5 / a);
    cam.left = -v * a; cam.right = v * a; cam.top = v; cam.bottom = -v; cam.updateProjectionMatrix();
  };
  const sizeObs = new ResizeObserver(resize); sizeObs.observe(wrap); resize();

  // helpers
  const M = (c: string, o: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.05, ...o });
  const Glow = (c: string) => new THREE.MeshBasicMaterial({ color: c });
  const box = (w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m;
  };
  const plane = (w: number, h: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
  };
  const tex = (w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d")!;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const redraw = (fn = draw) => { fn(x, w, h); t.needsUpdate = true; };
    redraw();
    return { t, redraw };
  };

  // room
  const W = 22, D = 16, HW = W / 2, HD = D / 2;
  const fl = tex(256, 256, (x, w, h) => {
    x.fillStyle = "#0f131a"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#131924"; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2);
    x.strokeStyle = "#0a0d12"; x.lineWidth = 3;
    for (const p of [0, w / 2, w]) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, h); x.moveTo(0, p); x.lineTo(w, p); x.stroke(); }
  });
  fl.t.wrapS = fl.t.wrapT = THREE.RepeatWrapping; fl.t.repeat.set(W / 2, D / 2);
  const edge = M("#0c0f15");
  const floorMat = M("#ffffff", { map: fl.t, roughness: 0.55, metalness: 0.15 });
  box(W, 0.4, D, [edge, edge, floorMat, edge, edge, edge], 0, -0.2, 0, false);
  const wallM = M("#0d1118", { roughness: 0.9 });
  box(W + 0.3, 6, 0.3, wallM, -0.15, 3, -HD - 0.15, false);
  box(0.3, 6, D, wallM, -HW - 0.15, 3, 0, false);
  box(W, 0.04, 0.04, Glow("#1f6f68"), 0, 0.02, -HD + 0.02, false);
  box(0.04, 0.04, D, Glow("#1f6f68"), -HW + 0.02, 0.02, 0, false);

  const city = (seed: number) => {
    let r = seed;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    return tex(512, 384, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0a1224"); g.addColorStop(1, "#17223f"); x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) {
        const bw = 30 + rnd() * 60, bx = rnd() * w, bh = 120 + rnd() * 240;
        x.fillStyle = `hsl(225,30%,${7 + rnd() * 6}%)`; x.fillRect(bx, h - bh, bw, bh);
        for (let yy = h - bh + 8; yy < h - 6; yy += 12)
          for (let xx = bx + 5; xx < bx + bw - 6; xx += 9)
            if (rnd() < 0.32) { x.globalAlpha = 0.5 + rnd() * 0.5; x.fillStyle = rnd() < 0.8 ? "#ffd88a" : "#8fd3ff"; x.fillRect(xx, yy, 4, 5); x.globalAlpha = 1; }
      }
    });
  };
  const frameM = M("#1a2030");
  const win = (c: number, side: "back" | "left", w: number, h: number, seed: number) => {
    const mat = new THREE.MeshBasicMaterial({ map: city(seed).t }), y = 3.3;
    if (side === "back") {
      plane(w, h, mat, c, y, -HD + 0.02);
      box(w + 0.2, 0.12, 0.12, frameM, c, y - h / 2, -HD + 0.06, false);
      box(w + 0.2, 0.12, 0.12, frameM, c, y + h / 2, -HD + 0.06, false);
      box(0.08, h, 0.08, frameM, c, y, -HD + 0.05, false);
    } else {
      plane(w, h, mat, -HW + 0.02, y, c, Math.PI / 2);
      box(0.12, 0.12, w + 0.2, frameM, -HW + 0.06, y - h / 2, c, false);
      box(0.12, 0.12, w + 0.2, frameM, -HW + 0.06, y + h / 2, c, false);
      box(0.08, h, 0.08, frameM, -HW + 0.05, y, c, false);
    }
  };
  win(-8, "back", 3.2, 2.4, 11); win(-4.4, "back", 2.8, 2.4, 23); win(1, "left", 3, 2.4, 37); win(-6.4, "left", 2, 2.4, 51);

  // live screens
  let screen: ScreenState = EMPTY_SCREEN;
  box(6.7, 3.7, 0.12, M("#05070a"), 1.5, 3.1, -HD + 0.06, false);
  const chart = tex(1024, 560, (x, w, h) => drawChart(x, w, h, screen));
  plane(6.4, 3.4, new THREE.MeshBasicMaterial({ map: chart.t }), 1.5, 3.1, -HD + 0.13);

  const neon = tex(1024, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.font = `800 150px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
    x.shadowColor = "#f2b33d"; x.shadowBlur = 40; x.fillStyle = "#ffd27a"; x.fillText("TRADEX", w / 2, h / 2 + 6);
    x.shadowBlur = 10; x.fillStyle = "#fff3d6"; x.fillText("TRADEX", w / 2, h / 2 + 6);
  });
  plane(4.6, 1.15, new THREE.MeshBasicMaterial({ map: neon.t, transparent: true, depthWrite: false }), 8, 4.5, -HD + 0.05);

  box(0.1, 2.1, 3.3, M("#c9d1db"), -HW + 0.05, 3, -3.2, false);
  const board = tex(512, 300, (x, w, h) => drawBoard(x, w, h, screen));
  plane(3.1, 1.9, M("#ffffff", { map: board.t, roughness: 0.9, emissive: "#3a3f46" }), -HW + 0.11, 3, -3.2, Math.PI / 2);

  box(0.12, 2.5, 3.9, M("#05070a"), -HW + 0.06, 3.1, 4.8, false);
  const newsTex = tex(720, 440, (x, w, h) => drawNews(x, w, h, screen));
  plane(3.6, 2.2, new THREE.MeshBasicMaterial({ map: newsTex.t }), -HW + 0.13, 3.1, 4.8, Math.PI / 2);

  // desks
  const deskTop = M("#1b212c", { roughness: 0.5 }), deskLeg = M("#141922"), screenBack = M("#07090d");
  const monitors: ReturnType<typeof tex>[] = [];
  const desk = (x: number, z: number, accent: string) => {
    box(1.9, 0.08, 1, deskTop, x, 0.78, z);
    box(0.08, 0.74, 0.9, deskLeg, x - 0.88, 0.37, z); box(0.08, 0.74, 0.9, deskLeg, x + 0.88, 0.37, z);
    box(1.9, 0.03, 0.03, Glow(accent), x, 0.76, z + 0.5, false);
    box(0.08, 0.32, 0.08, deskLeg, x, 0.98, z - 0.3); box(1.05, 0.62, 0.06, screenBack, x, 1.38, z - 0.3);
    const t = tex(256, 144, drawMonitor); monitors.push(t);
    plane(0.96, 0.54, new THREE.MeshBasicMaterial({ map: t.t }), x, 1.38, z - 0.265);
  };

  // master desk
  box(3.2, 0.9, 1.1, M("#161b24"), 7, 0.45, -4); box(3.2, 0.03, 0.03, Glow("#2dd4bf"), 7, 0.9, -3.44, false);
  box(0.8, 0.05, 0.55, M("#2a3140"), 6.2, 0.93, -4.1);
  const biasOrb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), Glow("#71717a"));
  biasOrb.position.set(8.1, 1.08, -4.1); scene.add(biasOrb);

  // order terminal + rack
  box(1.1, 2.5, 1.7, M("#121720"), 9.9, 1.25, 3);
  const term = tex(320, 256, (x, w, h) => drawTerminal(x, w, h, screen));
  plane(1.4, 1.1, new THREE.MeshBasicMaterial({ map: term.t }), 9.33, 1.65, 3, -Math.PI / 2);
  const leds: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) leds.push(box(0.04, 0.06, 0.06, Glow("#22c55e"), 9.33, 0.45 + i * 0.14, 2.4, false));
  box(1.1, 2.2, 1.3, M("#151020"), 9.9, 1.1, 5.2);
  box(0.03, 1.9, 0.03, Glow("#c026d3"), 9.33, 1.1, 4.75, false); box(0.03, 1.9, 0.03, Glow("#c026d3"), 9.33, 1.1, 5.65, false);

  // lounge + plants
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.2), M("#3b1430", { roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(-3, 0.01, 5.9); rug.receiveShadow = true; scene.add(rug);
  const sofaM = M("#2b2147");
  box(3.4, 0.45, 1, sofaM, -3, 0.32, 7.05); box(3.4, 0.75, 0.3, sofaM, -3, 0.7, 7.45);
  box(0.3, 0.65, 1, sofaM, -4.85, 0.45, 7.05); box(0.3, 0.65, 1, sofaM, -1.15, 0.45, 7.05);
  box(1.4, 0.08, 0.7, M("#6b4a2b"), -3, 0.42, 5.5); box(1.2, 0.36, 0.5, M("#3a2a1a"), -3, 0.2, 5.5);
  const bean = (x: number, z: number, c: string) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), M(c, { roughness: 0.9 }));
    m.scale.y = 0.6; m.position.set(x, 0.3, z); m.castShadow = true; scene.add(m);
  };
  bean(-8.6, 6.4, "#c2410c"); bean(-7.5, 7.1, "#be185d");
  const plant = (x: number, z: number) => {
    box(0.5, 0.5, 0.5, M("#2a2f3a"), x, 0.25, z);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), M("#1f5c3a", { flatShading: true }));
    m.position.set(x, 0.85, z); m.castShadow = true; scene.add(m);
  };
  plant(-10.3, -7.3); plant(10.3, -7.3); plant(10.3, 7.3); plant(-10.3, 7.3); plant(5.1, -7.3);

  // lights (physically-based units in three r155+)
  scene.add(new THREE.HemisphereLight("#9db4dd", "#0b0e13", 1.9));
  const moon = new THREE.DirectionalLight("#b8c6ff", 1.7);
  moon.position.set(-6, 16, 10); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
  moon.shadow.bias = -0.0005; scene.add(moon);
  const pl = (c: string, i: number, d: number, x: number, y: number, z: number) => {
    const l = new THREE.PointLight(c, i, d, 0); l.position.set(x, y, z); scene.add(l); return l;
  };
  pl("#2dd4bf", 2.2, 14, -2.5, 3.4, -1.5); pl("#d946ef", 2.4, 8, -3, 2.4, 6); pl("#f2b33d", 2.2, 8, 8, 3.4, -6.4);
  const termLight = pl("#22c55e", 1.8, 6, 8.4, 2.2, 3); pl("#38bdf8", 1.5, 9, 1.5, 2.5, -5.4);

  // bots
  const bots = {} as Record<BotId, Bot>;
  const tagCleanup: (() => void)[] = [];
  for (const d of BOTS) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const mat = M(d.color, { roughness: 0.4, metalness: 0.15 }), dark = M("#0d1117", { roughness: 0.5 });
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; rig.add(o); return o;
    };
    add(new THREE.BoxGeometry(0.66, 0.56, 0.5), mat, 0, 0.56, 0);
    const head = new THREE.Group(); head.position.y = 1.17; rig.add(head);
    const hm = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.62, 0.72), mat); hm.castShadow = true; head.add(hm);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.4), dark); face.position.z = 0.361; head.add(face);
    const eyes = new THREE.Group(); eyes.position.z = 0.366; head.add(eyes);
    for (const ex of [-0.14, 0.14]) {
      const e = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.14), Glow("#ffffff")); e.position.set(ex, 0.02, 0); eyes.add(e);
    }
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28), dark); ant.position.y = 0.45; head.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), Glow(d.color)); tip.position.y = 0.62; head.add(tip);
    const fL = add(new THREE.BoxGeometry(0.22, 0.2, 0.32), dark, -0.17, 0.1, 0);
    const fR = add(new THREE.BoxGeometry(0.22, 0.2, 0.32), dark, 0.17, 0.1, 0);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.015; g.add(sh);
    g.position.set(d.home[0], 0, d.home[1]); g.rotation.y = FACE[d.home[2]];
    g.traverse((o) => { o.userData.bot = d.id; });
    scene.add(g);
    if (d.desk) desk(d.desk[0], d.desk[1], d.color);

    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "tx-office-tag";
    tag.style.setProperty("--c", d.color);
    const bubble = document.createElement("span"); bubble.className = "tx-office-bubble";
    tag.appendChild(bubble); tag.appendChild(document.createTextNode(d.name));
    const onClick = () => onBotClick(d.id);
    tag.addEventListener("click", onClick);
    tagLayer.appendChild(tag);
    tagCleanup.push(() => { tag.removeEventListener("click", onClick); tag.remove(); });

    bots[d.id] = {
      def: d, g, rig, head, eyes, tip, fL, fR, tag, bubble, path: [], done: null,
      rot: g.rotation.y, targetRot: g.rotation.y, face: g.rotation.y, where: "desk",
      sayUntil: 0, ph: Math.random() * 6, blink: 2 + Math.random() * 3,
    };
  }
  const botList = Object.values(bots);

  // click a bot in 3D
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let down: [number, number] | null = null;
  const onDown = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, cam);
    const hit = ray.intersectObjects(botList.map((b) => b.g), true)[0];
    const id = hit?.object.userData.bot as BotId | undefined;
    if (id) onBotClick(id);
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);

  // frame loop
  const v3 = new THREE.Vector3();
  let last = performance.now(), t = 0;
  const lerpA = (a: number, b: number, t: number) => {
    const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return a + d * t;
  };
  const SPEED = 4.2;
  let monT = 0, raf = 0;
  const frame = () => {
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05), amp = reduced ? 0.3 : 1;
    last = now; t += dt;
    for (const b of botList) {
      const walking = b.path.length > 0;
      if (walking) {
        const [tx, tz] = b.path[0], p = b.g.position, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), st = SPEED * dt;
        if (d <= st) {
          p.x = tx; p.z = tz; b.path.shift();
          if (!b.path.length) { b.targetRot = b.face; const f = b.done; b.done = null; f?.(true); }
        } else { p.x += (dx / d) * st; p.z += (dz / d) * st; b.targetRot = Math.atan2(dx, dz); }
      }
      b.rot = lerpA(b.rot, b.targetRot, Math.min(1, dt * 10)); b.g.rotation.y = b.rot;
      if (walking) {
        const w = Math.sin(t * 11 + b.ph);
        b.rig.position.y = Math.abs(w) * 0.12 * amp; b.fL.position.z = w * 0.12; b.fR.position.z = -w * 0.12; b.head.rotation.z = 0;
      } else {
        b.rig.position.y = Math.abs(Math.sin(t * 3 + b.ph)) * 0.03 * amp; b.fL.position.z = b.fR.position.z = 0;
        b.head.rotation.z = b.where === "desk" ? Math.sin(t * 2 + b.ph) * 0.06 * amp : 0;
      }
      const talking = now < b.sayUntil;
      b.tip.scale.setScalar(talking ? 1 + Math.abs(Math.sin(t * 8)) * 0.6 : 1);
      b.blink -= dt; b.eyes.scale.y = b.blink < 0.12 ? 0.15 : 1; if (b.blink < 0) b.blink = 2 + Math.random() * 4;
      if (!talking && b.bubble.classList.contains("on")) b.bubble.classList.remove("on");
    }
    const armed = screen.exec.state === "ARMED";
    leds.forEach((l, i) => { l.visible = Math.sin(t * (armed ? 9 : 3) + i * 1.7) > 0; });
    termLight.intensity = armed ? 1.8 + Math.abs(Math.sin(t * 4)) * 1.2 : 1.8;
    monT += dt;
    if (monT > 2.2 && monitors.length) { monT = 0; monitors[Math.floor(Math.random() * monitors.length)].redraw(); }
    controls.update();
    renderer.render(scene, cam);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    for (const b of botList) {
      v3.set(b.g.position.x, 2.15 + b.rig.position.y, b.g.position.z).project(cam);
      b.tag.style.transform = `translate(${((v3.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-v3.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%,-100%)`;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    go(id, spot) {
      const b = bots[id];
      const s = spot === "home" ? [...b.def.home, "desk"] as const : SPOTS[spot];
      if (b.done) { const f = b.done; b.done = null; f(false); }
      b.path = route(b.g.position.x, b.g.position.z, s[0], s[1]);
      b.face = FACE[s[2]]; b.where = s[3];
      if (!b.path.length) { b.targetRot = b.face; return Promise.resolve(true); }
      return new Promise<boolean>((r) => { b.done = r; });
    },
    say(id, msg, kind = "") {
      const b = bots[id];
      b.bubble.textContent = msg;
      b.bubble.className = `tx-office-bubble on ${kind}`;
      b.sayUntil = performance.now() + 5200;
      onSay(id, msg, kind);
    },
    setScreens(s) {
      screen = s;
      chart.redraw(); board.redraw(); newsTex.redraw(); term.redraw();
      (biasOrb.material as THREE.MeshBasicMaterial).color.set(
        s.finalBias === "bullish" ? "#22c55e" : s.finalBias === "bearish" ? "#f05252" : "#71717a",
      );
    },
    resetView() {
      cam.position.copy(CAM0); cam.zoom = 1; cam.updateProjectionMatrix();
      controls.target.copy(TGT0); controls.update();
    },
    dispose() {
      cancelAnimationFrame(raf);
      sizeObs.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      for (const b of botList) { if (b.done) { const f = b.done; b.done = null; f(false); } }
      tagCleanup.forEach((f) => f());
      controls.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => { (m as THREE.MeshBasicMaterial).map?.dispose(); m.dispose(); });
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// ─── Run choreography (all text from the real agent outputs) ────────────────

function stationLine(id: BotId, d: AgentRunResult): [string, Kind] | null {
  const a = d.agents;
  switch (id) {
    case "trend": return (a.trend.reasons ?? []).length ? [clip(pick((a.trend.reasons ?? []))), ""] : null;
    case "smc": return (a.smc.reasons ?? []).length ? [clip(pick((a.smc.reasons ?? []))), ""] : null;
    case "news": {
      const pool = [...(a.news.reasons ?? []), ...(a.news.catalysts ?? []).map((c) => c.headline)];
      return pool.length ? [clip(pick(pool)), ""] : null;
    }
    case "risk": {
      const pool = [...(a.risk.warnings ?? []), ...(a.risk.reasons ?? [])];
      return pool.length ? [clip(pick(pool)), (a.risk.warnings ?? []).length ? "warn" : ""] : null;
    }
    case "contrarian": {
      const pool = [...(a.contrarian.failureReasons ?? []), a.contrarian.alternativeScenario].filter(Boolean);
      return pool.length ? [clip(pick(pool)), "warn"] : null;
    }
    case "execution": {
      const pool = [...(a.execution.managementNotes ?? []), a.execution.triggerCondition].filter(Boolean);
      return pool.length ? [clip(pick(pool)), ""] : null;
    }
    case "master": {
      const pool = [...(a.master.supports ?? []), ...(a.master.invalidations ?? [])];
      return pool.length ? [clip(pick(pool)), ""] : null;
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface AgentOffice3DProps {
  data?: AgentRunResult;
  loading?: boolean;
  livePrice?: number | null;
  onAgentClick?: (agentId: string) => void;
  /** Height classes for the 3D canvas (ignored when `fill` is set). */
  sceneClassName?: string;
  /** Stretch to the height of the parent (dashboard grid widget) instead of a fixed height. */
  fill?: boolean;
  /** Show the agent log under the scene. */
  showLog?: boolean;
}

export function AgentOffice3D({
  data, loading = false, livePrice = null, onAgentClick,
  sceneClassName = "h-[440px] sm:h-[540px]", fill = false, showLog = true,
}: AgentOffice3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<OfficeApi | null>(null);
  const clickRef = useRef(onAgentClick);
  const dataRef = useRef(data);
  const runIdRef = useRef(0);
  const busyRef = useRef(false);
  const playedRef = useRef<string | null>(null);
  const logKey = useRef(0);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [failed, setFailed] = useState(false);

  clickRef.current = onAgentClick;
  dataRef.current = data;

  // build the scene once
  useEffect(() => {
    if (!wrapRef.current || !tagRef.current) return;
    let api: OfficeApi;
    try {
      api = buildOffice(
        wrapRef.current,
        tagRef.current,
        (id) => clickRef.current?.(id),
        (id, msg, kind) =>
          setLogs((l) => [{ key: ++logKey.current, id, msg, kind, t: Date.now() }, ...l].slice(0, 50)),
      );
    } catch (err) {
      console.error("AgentOffice3D: WebGL unavailable", err);
      setFailed(true);
      return;
    }
    apiRef.current = api;
    return () => { runIdRef.current++; api.dispose(); apiRef.current = null; };
  }, []);

  const play = useCallback(async (d: AgentRunResult) => {
    const api = apiRef.current;
    if (!api) return;
    const my = ++runIdRef.current;
    const alive = () => runIdRef.current === my && apiRef.current === api;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    busyRef.current = true;
    const { trend, smc, news, risk, contrarian, execution, master } = d.agents;
    const visit = async (id: BotId, spot: SpotId, msg: string, kind: Kind = "", hold = 1700) => {
      if (!alive()) return;
      await api.go(id, spot);
      if (!alive()) return;
      api.say(id, clip(msg), kind);
      await wait(hold);
    };
    try {
      api.say("master", `New run: ${d.symbolDisplay} ${d.timeframe}`);
      if (d.isMockData) api.say("master", "Live quote failed. This run used fallback data", "warn");
      await wait(900);

      // the three analysts work in parallel, each at its own station
      const analyst = async (delay: number, id: BotId, spot: SpotId, msg: string, kind: Kind) => {
        await wait(delay);
        await visit(id, spot, msg, kind, 2200);
        if (alive()) void api.go(id, "home");
      };
      await Promise.all([
        analyst(0, "news", "news", `${up(news.regime)} regime, risk ${news.riskScore}/100. ${news.dominantCatalyst}`, news.riskScore >= 70 ? "warn" : ""),
        analyst(500, "trend", "chart",
          `${up(trend.bias)} ${trend.confidence}% · ${trend.marketPhase} · momentum ${trend.momentumDirection}`,
          trend.bias === "bullish" ? "up" : trend.bias === "bearish" ? "dn" : ""),
        analyst(1000, "smc", "whiteboard",
          smc.setupPresent ? `${smc.setupType} setup in ${smc.premiumDiscount}, ${up(smc.bias)} ${smc.confidence}%` : `No clean setup yet. Price in ${smc.premiumDiscount}`,
          smc.setupPresent ? (smc.bias === "bearish" ? "dn" : "up") : "warn"),
      ]);
      if (!alive()) return;

      const contra = visit("contrarian", "master2",
        contrarian.challengesBias
          ? `Careful: possible ${contrarian.trapType ?? "trap"} (${contrarian.trapConfidence}%)`
          : `No strong counter-case. Contrarian risk ${contrarian.riskFactor}/100`,
        contrarian.challengesBias ? "warn" : "");
      await visit("risk", "master",
        risk.valid
          ? `Grade ${risk.grade}. Max risk ${risk.maxRiskPercent}%${risk.estimatedRR != null ? `, est. R:R ${risk.estimatedRR.toFixed(1)}` : ""}`
          : `Blocked, grade ${risk.grade}. ${(risk.warnings ?? [])[0] ?? ""}`,
        risk.valid ? "up" : "dn");
      await contra;
      if (!alive()) return;
      void api.go("risk", "home"); void api.go("contrarian", "home");

      await visit("execution", "terminal",
        execution.hasSetup
          ? `${up(execution.direction)} ${execution.grade} @ ${fmtPrice(execution.entry)} · SL ${fmtPrice(execution.stopLoss)} · TP1 ${fmtPrice(execution.tp1)} (${execution.signalState})`
          : `${execution.signalState}: ${execution.signalStateReason}`,
        execution.hasSetup ? (execution.direction === "short" ? "dn" : "up") : "warn", 2000);
      if (!alive()) return;
      void api.go("execution", "home");

      api.say("master",
        master.finalBias === "no-trade"
          ? `No clear bias. ${master.noTradeReason ?? "Agents disagree"}`
          : `Final read: ${up(master.finalBias)} ${master.confidence}%${master.strategyMatch ? ` · ${master.strategyMatch}` : ""}`,
        master.finalBias === "bullish" ? "up" : master.finalBias === "bearish" ? "dn" : "warn");
      await wait(2500);
    } finally {
      if (runIdRef.current === my) busyRef.current = false;
    }
  }, []);

  // screens + choreography follow the real run
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !data) return;
    api.setScreens(screenFromRun(data, livePrice));
    const stamp = `${data.symbol}|${data.timeframe}|${data.timestamp}`;
    if (playedRef.current !== stamp) { playedRef.current = stamp; void play(data); }
    // livePrice intentionally handled by its own effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, play]);

  useEffect(() => {
    const api = apiRef.current, d = dataRef.current;
    if (api && d) api.setScreens(screenFromRun(d, livePrice));
  }, [livePrice]);

  // while a run is in flight every agent heads to its station
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !loading) return;
    runIdRef.current++;
    busyRef.current = true;
    api.say("master", "Running all 7 agents…");
    (Object.keys(STATION) as BotId[]).forEach((id) => {
      const st = STATION[id];
      if (st) void api.go(id, st).then((ok) => { if (ok && apiRef.current === api) api.say(id, "Analyzing…"); });
    });
    return () => {
      // run finished (or a cached result came back): everyone back to their desks;
      // a new result's choreography picks them up from wherever they are
      busyRef.current = false;
      if (apiRef.current === api) BOTS.forEach((b) => void api.go(b.id, "home"));
    };
  }, [loading]);

  // ambient: between runs, one agent at a time revisits its station with a real reason
  useEffect(() => {
    const id = window.setInterval(async () => {
      const api = apiRef.current, d = dataRef.current;
      if (!api || !d || busyRef.current || document.hidden) return;
      const who = pick(BOTS)!.id;
      const line = stationLine(who, d);
      if (!line) return;
      const st = STATION[who];
      const my = runIdRef.current;
      if (st && !(await api.go(who, st))) return;
      if (runIdRef.current !== my || busyRef.current) return;
      api.say(who, line[0], line[1]);
      window.setTimeout(() => { if (runIdRef.current === my && !busyRef.current && st) void api.go(who, "home"); }, 3200);
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  const replay = () => {
    const api = apiRef.current, d = dataRef.current;
    if (!api || !d) return;
    BOTS.forEach((b) => void api.go(b.id, "home"));
    window.setTimeout(() => { if (dataRef.current) void play(dataRef.current); }, 600);
  };

  return (
    <div className={cn("flex flex-col gap-2", fill && "h-full min-h-0")}>
      <div className={cn("relative overflow-hidden rounded-xl border border-white/8 bg-[#090c11]", fill ? "min-h-0 flex-1" : sceneClassName)}>
        <div ref={wrapRef} className="absolute inset-0" />
        <div ref={tagRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[12px] text-zinc-500">
            This device can’t render the 3D office (WebGL is off). Use the Command Floor view instead.
          </div>
        ) : null}
        <div className="pointer-events-none absolute left-3 top-2.5 text-[11px] font-semibold text-zinc-500">
          TradeX agent office {data ? `· ${data.symbolDisplay} ${data.timeframe}` : ""}
        </div>
        <div className="absolute right-2.5 top-2 flex gap-1.5">
          <button
            type="button"
            onClick={replay}
            disabled={!data || loading}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            <Play className="h-3 w-3" /> Replay run
          </button>
          <button
            type="button"
            onClick={() => apiRef.current?.resetView()}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-white/10"
          >
            <RotateCcw className="h-3 w-3" /> Reset view
          </button>
        </div>
        <div className="pointer-events-none absolute bottom-2 left-3 hidden text-[11px] text-zinc-600 sm:block">
          Drag to orbit · scroll to zoom · right-drag to pan · click an agent
        </div>
      </div>

      {showLog ? (
      <div className="rounded-xl border border-white/8 bg-[hsl(var(--card))] px-3 py-2.5">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-[11px] font-bold text-zinc-300">Agent log</span>
          <span className="text-[10px] text-zinc-600">newest first</span>
        </div>
        <ol className="max-h-[200px] overflow-y-auto">
          {logs.length === 0 ? (
            <li className="py-2 text-[11px] text-zinc-600">Waiting for the first run…</li>
          ) : (
            logs.map((l) => (
              <li key={l.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 border-t border-white/5 py-1.5">
                <span className="mt-1 h-2 w-2 rounded-[3px]" style={{ background: BOT_BY_ID[l.id].color }} />
                <span className="text-[11px] font-semibold text-zinc-300">{BOT_BY_ID[l.id].name}</span>
                <span className="whitespace-nowrap font-mono text-[10px] text-zinc-600">{new Date(l.t).toLocaleTimeString()}</span>
                <span className={cn("col-start-2 col-end-4 text-[11px] leading-snug", KIND_TEXT[l.kind])}>{l.msg}</span>
              </li>
            ))
          )}
        </ol>
      </div>
      ) : null}

      <style jsx global>{`
        .tx-office-tag {
          position: absolute; left: 0; top: 0; pointer-events: auto; will-change: transform;
          border: 0; border-left: 3px solid var(--c); border-radius: 6px;
          background: rgba(10, 13, 18, 0.85); color: #e9eef5;
          padding: 2px 8px 2px 7px; font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer;
        }
        .tx-office-tag:focus-visible { outline: 2px solid #f2b33d; outline-offset: 2px; }
        .tx-office-bubble {
          position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
          width: max-content; max-width: 220px; white-space: normal; text-align: left;
          background: #f4f7fb; color: #0b0e13; font-weight: 500; font-size: 11px; line-height: 1.35;
          padding: 5px 9px; border-radius: 9px; opacity: 0; transition: opacity 0.25s; pointer-events: none;
        }
        .tx-office-bubble.on { opacity: 1; }
        .tx-office-bubble.up { background: #d4f7e0; }
        .tx-office-bubble.dn { background: #ffdede; }
        .tx-office-bubble.warn { background: #fff0cc; }
        @media (max-width: 600px) { .tx-office-bubble { max-width: 160px; font-size: 10px; } }
      `}</style>
    </div>
  );
}
