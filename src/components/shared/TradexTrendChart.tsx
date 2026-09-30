"use client";

import React, { useEffect, useRef } from "react";
import {
  CandlestickSeries, ColorType, LineSeries, LineStyle, createChart, createSeriesMarkers,
  type IChartApi, type IPrimitivePaneRenderer, type ISeriesApi, type ISeriesPrimitive,
  type SeriesAttachedParameter, type SeriesMarker, type Time, type UTCTimestamp,
} from "lightweight-charts";
import { useTradexTrend } from "@/hooks/useTradexTrend";
import type { Candle, Tf, TrendSnapshot } from "@/lib/tradexTrend";
import { TF_LABEL } from "@/lib/tradexTrend/tf";

const TEAL = "#1de9b6";
const PINK = "#ec407a";
const AMBER = "#f6b93b";
const RED = "#ef5350";

const TFS: Tf[] = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];
const t = (s: number) => s as UTCTimestamp;

type Ctx = CanvasRenderingContext2D;
interface Target {
  useMediaCoordinateSpace<R>(f: (scope: { context: Ctx; mediaSize: { width: number; height: number } }) => R): R;
}

/** Cloud (two edges + fill, coloured by trend) and the risk / reward boxes of the latest trade. */
class OverlayPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Candlestick"> | null = null;
  private req: (() => void) | null = null;
  snap: TrendSnapshot | null = null;
  showCloud = true;

  attached(p: SeriesAttachedParameter<Time>) {
    this.chart = p.chart as IChartApi;
    this.series = p.series as ISeriesApi<"Candlestick">;
    this.req = p.requestUpdate;
  }
  detached() { this.chart = null; this.series = null; this.req = null; }
  set(snap: TrendSnapshot | null, showCloud: boolean) {
    this.snap = snap; this.showCloud = showCloud; this.req?.();
  }
  updateAllViews() { /* drawn from snap on every frame */ }

  paneViews() {
    const renderer: IPrimitivePaneRenderer = { draw: (target) => this.draw(target as unknown as Target) };
    return [{ zOrder: () => "bottom" as const, renderer: () => renderer }];
  }

  private draw(target: Target) {
    const { chart, series, snap } = this;
    if (!chart || !series || !snap) return;
    const ts = chart.timeScale();
    const S = snap.series;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const x = (i: number) => ts.timeToCoordinate(t(S.time[i]));
      const y = (v: number | null) => (v === null ? null : series.priceToCoordinate(v));

      if (this.showCloud) {
        const vis = ts.getVisibleLogicalRange();
        const from = Math.max(1, Math.floor(vis?.from ?? 1) - 1);
        const to = Math.min(S.time.length - 1, Math.ceil(vis?.to ?? S.time.length - 1) + 1);
        for (let i = from; i <= to; i++) {
          const x0 = x(i - 1), x1 = x(i);
          const a0 = y(S.cloudTop[i - 1]), a1 = y(S.cloudTop[i]);
          const b0 = y(S.cloudBottom[i - 1]), b1 = y(S.cloudBottom[i]);
          if ([x0, x1, a0, a1, b0, b1].some((v) => v === null)) continue;
          const col = S.stDir[i] < 0 ? TEAL : PINK;
          ctx.globalAlpha = 0.13;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(x0!, a0!); ctx.lineTo(x1!, a1!); ctx.lineTo(x1!, b1!); ctx.lineTo(x0!, b0!);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = col; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x0!, a0!); ctx.lineTo(x1!, a1!);
          ctx.moveTo(x0!, b0!); ctx.lineTo(x1!, b1!);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Risk / reward boxes for the latest trade
      const tr = snap.trades.length ? snap.trades[snap.trades.length - 1] : null;
      const last = S.time.length - 1;
      if (tr && last >= 0) {
        const xs = x(tr.index);
        const xl = x(last);
        if (xs !== null && xl !== null) {
          const right = Math.min(xl + ts.options().barSpacing * 2, mediaSize.width);
          const yE = y(tr.entry), ySl = y(tr.sl), yT3 = y(tr.tp3);
          if (yE !== null && ySl !== null) {
            ctx.fillStyle = "rgba(239,83,80,0.16)";
            ctx.fillRect(xs, Math.min(yE, ySl), right - xs, Math.abs(ySl - yE));
          }
          if (yE !== null && yT3 !== null) {
            ctx.fillStyle = "rgba(29,233,182,0.12)";
            ctx.fillRect(xs, Math.min(yE, yT3), right - xs, Math.abs(yT3 - yE));
          }
        }
      }
    });
  }
}

export function TradexTrendChart({
  chartTf, onTfChange, symbol = "XAUUSD",
}: { chartTf: Tf; onTfChange: (tf: Tf) => void; symbol?: string }) {
  const { snapshot, candles, loading, error } = useTradexTrend(symbol, chartTf);
  const host = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<{
    candle: ISeriesApi<"Candlestick">; up: ISeriesApi<"Line">; down: ISeriesApi<"Line">;
    markers: ReturnType<typeof createSeriesMarkers<Time>>; overlay: OverlayPrimitive;
    lines: ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[];
  } | null>(null);
  const fitted = useRef<string>("");

  // Create the chart once
  useEffect(() => {
    if (!host.current) return;
    const chart = createChart(host.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: "#a1a1aa", fontSize: 11 },
      grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.03)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false, rightOffset: 8 },
      crosshair: { mode: 0 },
    });
    // Candles coloured like the Pine script (teal up, pink down), wicks and borders too.
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: TEAL, downColor: PINK, wickUpColor: TEAL, wickDownColor: PINK, borderUpColor: TEAL, borderDownColor: PINK,
      priceLineVisible: false,
    });
    const lineOpts = { lineWidth: 2 as const, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
    const up = chart.addSeries(LineSeries, { ...lineOpts, color: TEAL });
    const down = chart.addSeries(LineSeries, { ...lineOpts, color: PINK });
    const overlay = new OverlayPrimitive();
    candle.attachPrimitive(overlay);
    const markers = createSeriesMarkers(candle, []);
    chartRef.current = chart;
    seriesRef.current = { candle, up, down, markers, overlay, lines: [] };
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; fitted.current = ""; };
  }, []);

  // Push data on every recompute (candle close)
  useEffect(() => {
    const s = seriesRef.current;
    if (!s || !snapshot || candles.length === 0) return;
    const S = snapshot.series;

    s.candle.setData(candles.map((c: Candle) => ({ time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));

    // Trend line, broken at flips: the other colour gets whitespace (time only) on those bars.
    const upData: { time: UTCTimestamp; value?: number }[] = [];
    const downData: { time: UTCTimestamp; value?: number }[] = [];
    for (let i = 0; i < S.time.length; i++) {
      const v = S.stLine[i];
      if (v === null) continue;
      const isUp = S.stDir[i] < 0;
      upData.push(isUp ? { time: t(S.time[i]), value: v } : { time: t(S.time[i]) });
      downData.push(isUp ? { time: t(S.time[i]) } : { time: t(S.time[i]), value: v });
    }
    s.up.setData(upData);
    s.down.setData(downData);

    const mk: SeriesMarker<Time>[] = snapshot.signals.map((g) => {
      const buy = g.side === "BUY";
      return {
        time: t(g.time),
        position: buy ? "belowBar" : "aboveBar",
        shape: buy ? "arrowUp" : "arrowDown",
        color: buy ? TEAL : PINK,
        text: `${g.smart ? "+Smart " : ""}${buy ? "Buy" : "Sell"}`,
      };
    });
    s.markers.setMarkers(mk);
    s.overlay.set(snapshot, true);

    // Entry / SL / TP levels of the latest trade
    for (const l of s.lines) s.candle.removePriceLine(l);
    s.lines = [];
    const tr = snapshot.trades.length ? snapshot.trades[snapshot.trades.length - 1] : null;
    if (tr) {
      const add = (price: number, title: string, color: string, style: LineStyle) =>
        s.lines.push(s.candle.createPriceLine({ price, title, color, lineStyle: style, lineWidth: 1, axisLabelVisible: true }));
      add(tr.entry, `Entry ${tr.entry.toFixed(2)} | ${tr.lots.toFixed(2)} lot`, AMBER, LineStyle.Dashed);
      add(tr.sl, "Stop loss", RED, LineStyle.Solid);
      add(tr.tp1, "TP 1", TEAL, LineStyle.Dotted);
      add(tr.tp2, "TP 2", TEAL, LineStyle.Dotted);
      add(tr.tp3, "TP 3", TEAL, LineStyle.Dotted);
    }

    // Fit once per symbol/timeframe, then leave the user's zoom alone.
    const key = `${symbol}|${chartTf}`;
    if (fitted.current !== key) {
      fitted.current = key;
      const n = candles.length;
      chartRef.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 140), to: n + 8 });
    }
  }, [snapshot, candles, symbol, chartTf]);

  return (
    <div className="flex h-full w-full flex-col bg-black">
      <div className="flex h-[30px] shrink-0 items-center gap-1 border-b border-white/5 px-2.5">
        <span className="mr-2 text-[10px] font-semibold text-zinc-300">XAU/USD</span>
        {TFS.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => onTfChange(tf)}
            className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
              tf === chartTf ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {TF_LABEL[tf]}
          </button>
        ))}
        <span className="ml-2 rounded border border-amber-400/30 px-1 text-[8px] font-medium uppercase tracking-wider text-amber-300/90">
          Experimental
        </span>
        <span className="ml-auto text-[9px] text-zinc-600">
          Updates on candle close · signals from closed candles only
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0" />
        {!snapshot && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-500">
            {error ?? (loading ? "Loading candles…" : "No data")}
          </div>
        )}
      </div>
    </div>
  );
}
