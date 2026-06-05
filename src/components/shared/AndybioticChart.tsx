"use client";

/**
 * AndybioticChart — Custom Lightweight Chart with Andybiotic Max% indicator logic
 *
 * Implements (in TypeScript, no TradingView account needed):
 *   - Candlestick chart via lightweight-charts v5
 *   - EMA 200 (trend filter line)
 *   - SuperTrend line (factor = sensitivity×2, ATR len = 11)
 *   - Buy / Smart Buy / Sell / Smart Sell signal markers
 *   - Bar coloring: green (bull) / red (bear) / purple (sideways ADX < 15)
 *   - SMA 13 (signal filter)
 *
 * Data: fetched from /api/market/candles (TwelveData → Finnhub → Yahoo fallback)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type CandlestickData,
  type LineData,
  type SeriesMarker,
  type Time,
  ColorType,
} from "lightweight-charts";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Bar {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
}

type TF = "M5" | "M15" | "H1" | "H4";

const TF_LABELS: Record<TF, string> = { M5: "5m", M15: "15m", H1: "1H", H4: "4H" };
const TF_SECONDS: Record<TF, number> = { M5: 300, M15: 900, H1: 3600, H4: 14400 };

// ── Indicator math ───────────────────────────────────────────────────────────

function ema(src: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = new Array(src.length).fill(NaN);
  let val = NaN;
  for (let i = 0; i < src.length; i++) {
    if (isNaN(val)) { val = src[i]; } else { val = src[i] * k + val * (1 - k); }
    out[i] = val;
  }
  return out;
}

function sma(src: number[], period: number): number[] {
  const out: number[] = new Array(src.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i];
    if (i >= period) sum -= src[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function atr(bars: Bar[], period: number): number[] {
  const tr: number[] = bars.map((b, i) => {
    if (i === 0) return b.h - b.l;
    const prev = bars[i - 1].c;
    return Math.max(b.h - b.l, Math.abs(b.h - prev), Math.abs(b.l - prev));
  });
  // Wilder smoothing (RMA)
  const out: number[] = new Array(bars.length).fill(NaN);
  let val = NaN;
  for (let i = 0; i < tr.length; i++) {
    if (isNaN(val)) { val = tr[i]; } else { val = (val * (period - 1) + tr[i]) / period; }
    out[i] = val;
  }
  return out;
}

interface SuperTrendResult {
  line: number[];
  direction: number[]; // 1 = bear (price below), -1 = bull (price above)
}

function superTrend(bars: Bar[], factor: number, atrLen: number): SuperTrendResult {
  const atrVals = atr(bars, atrLen);
  const line: number[] = new Array(bars.length).fill(NaN);
  const dir: number[] = new Array(bars.length).fill(1);

  let prevUpper = NaN;
  let prevLower = NaN;
  let prevDir = 1;
  let prevST = NaN;

  for (let i = 0; i < bars.length; i++) {
    const src = bars[i].c;
    const a = atrVals[i];
    if (isNaN(a)) { line[i] = NaN; dir[i] = 1; continue; }

    let upper = src + factor * a;
    let lower = src - factor * a;

    // Ratchet
    if (!isNaN(prevLower)) lower = lower > prevLower || bars[i - 1]?.c < prevLower ? lower : prevLower;
    if (!isNaN(prevUpper)) upper = upper < prevUpper || bars[i - 1]?.c > prevUpper ? upper : prevUpper;

    let d: number;
    if (isNaN(prevST)) {
      d = 1;
    } else if (prevST === prevUpper) {
      d = src > upper ? -1 : 1;
    } else {
      d = src < lower ? 1 : -1;
    }

    const st = d === -1 ? lower : upper;
    line[i] = st;
    dir[i] = d;

    prevUpper = upper;
    prevLower = lower;
    prevDir = d;
    prevST = st;
  }

  return { line, direction: dir };
}

// ADX for sideways detection
function adx(bars: Bar[], period: number): number[] {
  const out: number[] = new Array(bars.length).fill(NaN);
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trArr: number[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i === 0) { plusDM.push(0); minusDM.push(0); trArr.push(bars[i].h - bars[i].l); continue; }
    const up = bars[i].h - bars[i - 1].h;
    const dn = bars[i - 1].l - bars[i].l;
    plusDM.push(up > dn && up > 0 ? up : 0);
    minusDM.push(dn > up && dn > 0 ? dn : 0);
    const prev = bars[i - 1].c;
    trArr.push(Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - prev), Math.abs(bars[i].l - prev)));
  }

  // Wilder smooth
  const smooth = (arr: number[], p: number) => {
    const s: number[] = new Array(arr.length).fill(NaN);
    let v = NaN;
    for (let i = 0; i < arr.length; i++) {
      v = isNaN(v) ? arr[i] : v - v / p + arr[i];
      s[i] = v;
    }
    return s;
  };

  const sTR = smooth(trArr, period);
  const sPDM = smooth(plusDM, period);
  const sMDM = smooth(minusDM, period);
  const dx: number[] = sTR.map((tr, i) => {
    if (isNaN(tr) || tr === 0) return NaN;
    const pdi = (sPDM[i] / tr) * 100;
    const mdi = (sMDM[i] / tr) * 100;
    const sum = pdi + mdi;
    return sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100;
  });

  // Smooth DX → ADX
  let v = NaN;
  for (let i = 0; i < dx.length; i++) {
    v = isNaN(v) ? dx[i] : v - v / period + (dx[i] ?? 0);
    out[i] = isNaN(v) ? NaN : v;
  }
  return out;
}

// Crossover helpers
function crossover(a: number[], b: number[], i: number): boolean {
  return i > 0 && a[i - 1] <= b[i - 1] && a[i] > b[i];
}
function crossunder(a: number[], b: number[], i: number): boolean {
  return i > 0 && a[i - 1] >= b[i - 1] && a[i] < b[i];
}

// ── Component ────────────────────────────────────────────────────────────────

const SYMBOLS = [
  { id: "XAUUSD", label: "XAU/USD" },
  { id: "XAGUSD", label: "XAG/USD" },
  { id: "EURUSD", label: "EUR/USD" },
  { id: "GBPUSD", label: "GBP/USD" },
  { id: "USDJPY", label: "USD/JPY" },
  { id: "BTCUSD", label: "BTC/USD" },
  { id: "ETHUSD", label: "ETH/USD" },
] as const;

type SymbolId = typeof SYMBOLS[number]["id"];

interface AndybioticChartProps {
  symbol?: string;
  heightClass?: string;
  sensitivity?: number; // 1–20, default 4
}

export function AndybioticChart({
  symbol: initialSymbol = "XAUUSD",
  heightClass = "h-[400px]",
  sensitivity = 4,
}: AndybioticChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const stSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [symbol, setSymbol] = useState<string>(
    SYMBOLS.find(s => s.id === initialSymbol)?.id ?? "XAUUSD"
  );
  const [tf, setTf] = useState<TF>("H1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Build chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#6b7280",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.15)", labelBackgroundColor: "#1a1a2e" },
        horzLine: { color: "rgba(255,255,255,0.15)", labelBackgroundColor: "#1a1a2e" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        textColor: "#6b7280",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // SuperTrend line
    const stSeries = chart.addSeries(LineSeries, {
      color: "rgba(0,226,255,0.7)",
      lineWidth: 2,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // EMA 200
    const emaSeries = chart.addSeries(LineSeries, {
      color: "rgba(255,255,255,0.25)",
      lineWidth: 1,
      lineStyle: 2, // dashed
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    stSeriesRef.current = stSeries;
    emaSeriesRef.current = emaSeries;
    markersRef.current = createSeriesMarkers(candleSeries, []);

    // ResizeObserver for responsive sizing
    const ro = new ResizeObserver(() => { chart.applyOptions({ autoSize: true }); });
    ro.observe(el);
    resizeObserverRef.current = ro;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      stSeriesRef.current = null;
      emaSeriesRef.current = null;
    };
  }, []);

  // Fetch + render whenever symbol / tf changes
  const fetchAndRender = useCallback(async () => {
    if (!candleSeriesRef.current || !stSeriesRef.current || !emaSeriesRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/market/candles?symbol=${symbol}&timeframe=${tf}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { candles } = (await res.json()) as { candles: Bar[] };
      if (!candles?.length) throw new Error("No candle data");

      const closes = candles.map(b => b.c);
      const factor = sensitivity * 2;      // default sensitivity=4 → factor=8
      const { line: stLine, direction } = superTrend(candles, factor, 11);
      const ema200 = ema(closes, 200);
      const sma13  = sma(closes, 13);
      const adxVals = adx(candles, 15);

      // Candlestick data with bar coloring
      const candleData: CandlestickData[] = candles.map((b, i) => {
        const isBull = direction[i] === -1;
        const isSideways = !isNaN(adxVals[i]) && adxVals[i] < 15;
        let upColor: string, downColor: string, borderUp: string, borderDown: string, wickUp: string, wickDown: string;

        if (isSideways) {
          upColor = borderUp = wickUp = "#6b21a8";
          downColor = borderDown = wickDown = "#4c1d95";
        } else if (isBull) {
          upColor = borderUp = wickUp = "#26a69a";
          downColor = borderDown = wickDown = "#26a69a";
        } else {
          upColor = borderUp = wickUp = "#ef5350";
          downColor = borderDown = wickDown = "#ef5350";
        }

        return {
          time: b.t as Time,
          open: b.o, high: b.h, low: b.l, close: b.c,
          color: b.c >= b.o ? upColor : downColor,
          borderColor: b.c >= b.o ? borderUp : borderDown,
          wickColor: b.c >= b.o ? wickUp : wickDown,
        };
      });

      // SuperTrend line — split by direction (green when bull, red when bear)
      const stData: LineData[] = candles
        .map((b, i) => ({
          time: b.t as Time,
          value: stLine[i],
          color: direction[i] === -1 ? "#26a69a" : "#ef5350",
        }))
        .filter(d => !isNaN(d.value));

      // EMA 200 line
      const emaData: LineData[] = candles
        .map((b, i) => ({ time: b.t as Time, value: ema200[i] }))
        .filter(d => !isNaN(d.value));

      // Buy / Sell markers
      const markers: SeriesMarker<Time>[] = [];
      for (let i = 1; i < candles.length; i++) {
        const isBull = crossover(closes, stLine, i) && closes[i] >= sma13[i];
        const isBear = crossunder(closes, stLine, i) && closes[i] <= sma13[i];
        const isSmartBuy  = isBull && closes[i] > ema200[i];
        const isSmartSell = isBear && closes[i] < ema200[i];

        if (isBull) {
          markers.push({
            time: candles[i].t as Time,
            position: "belowBar",
            color: isSmartBuy ? "#03fc45" : "#03fc8c",
            shape: "arrowUp",
            text: isSmartBuy ? "Smart Buy" : "Buy",
            size: isSmartBuy ? 2 : 1,
          });
        } else if (isBear) {
          markers.push({
            time: candles[i].t as Time,
            position: "aboveBar",
            color: "#fd0205",
            shape: "arrowDown",
            text: isSmartSell ? "Smart Sell" : "Sell",
            size: isSmartSell ? 2 : 1,
          });
        }
      }

      candleSeriesRef.current.setData(candleData);
      stSeriesRef.current.setData(stData);
      emaSeriesRef.current.setData(emaData);
      markersRef.current?.setMarkers(markers);
      chartRef.current?.timeScale().fitContent();
      setLastUpdate(new Date());
    } catch (err) {
      setError((err as Error).message ?? "Failed to load candles");
    } finally {
      setLoading(false);
    }
  }, [symbol, tf, sensitivity]);

  useEffect(() => { fetchAndRender(); }, [fetchAndRender]);

  // Auto-refresh every candle close
  useEffect(() => {
    const ms = TF_SECONDS[tf] * 1000;
    const id = setInterval(fetchAndRender, ms);
    return () => clearInterval(id);
  }, [tf, fetchAndRender]);

  return (
    <div className={cn("flex w-full flex-col overflow-hidden bg-black", heightClass)}>

      {/* Toolbar */}
      <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-white/5 px-2.5 bg-black">

        {/* Symbol selector */}
        <select
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          className="bg-white/5 border border-white/10 text-white text-[11px] font-semibold rounded px-2 py-0.5 outline-none hover:border-white/20 cursor-pointer"
        >
          {SYMBOLS.map(s => (
            <option key={s.id} value={s.id} className="bg-black">{s.label}</option>
          ))}
        </select>

        <div className="h-4 w-px bg-white/10 shrink-0" />

        {/* Timeframe buttons */}
        <div className="flex items-center gap-1">
          {(Object.keys(TF_LABELS) as TF[]).map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] font-semibold border transition-all",
                tf === t
                  ? "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]"
                  : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              {TF_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10 shrink-0" />

        {/* Indicator badge */}
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
          <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider">Andybiotic Max%</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 ml-1">
          <span className="flex items-center gap-1 text-[9px] text-gray-500">
            <span className="h-2 w-4 rounded-sm bg-[#26a69a] inline-block" /> Bull
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-500">
            <span className="h-2 w-4 rounded-sm bg-[#ef5350] inline-block" /> Bear
          </span>
          <span className="flex items-center gap-1 text-[9px] text-gray-500">
            <span className="h-2 w-4 rounded-sm bg-[#6b21a8] inline-block" /> Range
          </span>
        </div>

        {/* Refresh + timestamp */}
        <div className="ml-auto flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[9px] text-gray-600 tabular-nums">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAndRender}
            disabled={loading}
            className="flex items-center justify-center rounded border border-white/10 bg-white/5 p-1 text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-all"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 text-violet-400 animate-spin" />
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Loading candles…</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <span className="text-[11px] text-red-400">{error}</span>
              <button
                onClick={fetchAndRender}
                className="text-[10px] text-violet-400 hover:text-violet-300 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
