"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries, ColorType, LineSeries, LineStyle, createChart, createSeriesMarkers,
  type IChartApi, type IPrimitivePaneRenderer, type ISeriesApi, type ISeriesPrimitive,
  type SeriesAttachedParameter, type SeriesMarker, type Time, type UTCTimestamp,
} from "lightweight-charts";
import { useTradexTrend } from "@/hooks/useTradexTrend";
import { useWebSocketPrices } from "@/hooks/useWebSocketPrices";
import { useQuotes } from "@/hooks/useMarketData";
import type { Candle, Tf, TrendSnapshot } from "@/lib/tradexTrend";
import { TF_LABEL } from "@/lib/tradexTrend/tf";
import { TF_SECONDS } from "@/lib/tradexTrend";
import { TREND_ASSETS, paramsFor, trendAsset } from "@/lib/tradexTrend/assets";

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
  chartTf, onTfChange, symbol = "XAUUSD", onSymbolChange,
}: {
  chartTf: Tf;
  onTfChange: (tf: Tf) => void;
  symbol?: string;
  /** When given, a symbol picker is shown; otherwise the symbol is fixed by the parent. */
  onSymbolChange?: (id: string) => void;
}) {
  const asset = trendAsset(symbol);
  const dp = asset.decimals;
  const assetParams = paramsFor(symbol);
  const { snapshot, candles, source, spot, adjusted, loading, error } = useTradexTrend(symbol, chartTf, assetParams);
  const { prices, connected } = useWebSocketPrices([symbol]);
  // The forex websocket often sends nothing for gold, so fall back to the app's polled
  // spot quote (same one the rest of the app shows, refreshed every ~15 s).
  const { quotes } = useQuotes();
  const wsPx = prices.get(symbol) ?? null;
  const quotePx = quotes.find((q) => q.symbol === symbol)?.price ?? null;
  const rawPx = wsPx ?? quotePx;
  const pxKind: "ws" | "poll" | null = wsPx !== null ? "ws" : quotePx !== null ? "poll" : null;

  const lastClose = candles.length ? candles[candles.length - 1].close : null;
  const livePx = rawPx !== null && lastClose !== null && Math.abs(rawPx - lastClose) / lastClose > 0.015 ? null : rawPx;

  // Countdown to the close of the current candle.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secLeft = TF_SECONDS[chartTf] - (Math.floor(nowMs / 1000) % TF_SECONDS[chartTf]);
  const fmtLeft = (n: number) => {
    const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), sec = n % 60;
    const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };
  const host = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<{
    candle: ISeriesApi<"Candlestick">; up: ISeriesApi<"Line">; down: ISeriesApi<"Line">;
    markers: ReturnType<typeof createSeriesMarkers<Time>>; overlay: OverlayPrimitive;
    lines: ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[];
  } | null>(null);
  const fitted = useRef<string>("");
  const liveRef = useRef<Candle | null>(null);
  // A data problem must show a message here, not take the whole chart down.
  const [drawError, setDrawError] = useState<string | null>(null);

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

  // Axis / label precision follows the asset (5 decimals for EUR/USD, 2 for gold).
  useEffect(() => {
    seriesRef.current?.candle.applyOptions({
      priceFormat: { type: "price", precision: dp, minMove: 1 / 10 ** dp },
    });
  }, [dp, symbol]);

  // Push data on every recompute (candle close)
  useEffect(() => {
    const s = seriesRef.current;
    if (!s || !snapshot || candles.length === 0) return;
    try {
    const S = snapshot.series;

    liveRef.current = null;
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
      add(tr.entry, `Entry ${tr.entry.toFixed(dp)} | ${tr.lots.toFixed(2)} lot`, AMBER, LineStyle.Dashed);
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
      setDrawError(null);
    } catch (err) {
      console.error("[TradexTrendChart]", err);
      setDrawError((err as Error)?.message ?? "draw failed");
    }
  }, [snapshot, candles, symbol, chartTf]);

  // Live price moves the forming candle (display only). Signals, levels and stats
  // still come from closed candles, so none of this can repaint them.
  useEffect(() => {
    const s = seriesRef.current;
    if (!s || livePx === null || candles.length === 0 || !spot) return;
    const sec = TF_SECONDS[chartTf];
    const start = Math.floor(Date.now() / 1000 / sec) * sec;
    const last = candles[candles.length - 1];
    let cur = liveRef.current;
    if (!cur || cur.time !== start) {
      cur = last.time === start
        ? { ...last }
        : { time: start, open: last.close, high: livePx, low: livePx, close: livePx, volume: 0 };
    }
    cur = { ...cur, high: Math.max(cur.high, livePx), low: Math.min(cur.low, livePx), close: livePx };
    liveRef.current = cur;
    try {
      s.candle.update({ time: t(cur.time), open: cur.open, high: cur.high, low: cur.low, close: cur.close });
    } catch (err) {
      // e.g. provider timestamps ahead of the local clock: skip the tick, keep the chart.
      console.error("[TradexTrendChart] live tick skipped", err);
    }
  }, [livePx, candles, chartTf, spot]);

  return (
    <div className="flex h-full w-full flex-col bg-black">
      <div className="flex h-[30px] shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-white/5 px-2.5">
        {onSymbolChange ? (
          <select
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            aria-label="Symbol"
            className="mr-2 rounded border border-white/10 bg-black px-1 py-0.5 text-[10px] font-semibold text-zinc-200 outline-none"
          >
            {TREND_ASSETS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        ) : (
          <span className="mr-2 text-[10px] font-semibold text-zinc-300">{asset.label}</span>
        )}
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
        <span
          className="ml-auto hidden pl-2 text-[9px] text-zinc-600 md:inline"
          title={`Candles: ${source || "?"}. Live price: ${pxKind === "ws" ? "websocket" : pxKind === "poll" ? "polled quote (~15 s)" : "none"}. Signals use closed candles only.`}
        >
          candles: {source || "?"} · signals on closed candles only
        </span>
      </div>
      {spot && adjusted !== null && (
        <div className="shrink-0 border-b border-white/5 bg-white/[0.03] px-2.5 py-1 text-[10px] leading-snug text-zinc-400">
          Candles come from futures ({source}) shifted {adjusted >= 0 ? "-" : "+"}{Math.abs(adjusted).toFixed(dp)} to line up with spot.
          An approximation: signals and levels can differ slightly from TradingView spot.
        </div>
      )}
      {!spot && (
        <div className="shrink-0 border-b border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] leading-snug text-amber-200">
          Candles are futures ({source}), not spot {asset.label}. Prices, signals and levels will differ from
          TradingView spot, and the live tick is off to avoid mixing the two.
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-2 top-1.5 z-10 flex items-center gap-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-300">
          <span className={`h-1.5 w-1.5 rounded-full ${livePx !== null ? "bg-[#1de9b6]" : "bg-zinc-600"}`} />
          <span>{livePx !== null ? livePx.toFixed(dp) : "--"}</span>
          <span className="text-zinc-500">
            {pxKind === "poll" ? "~15s" : pxKind === "ws" ? "live" : "no feed"}
          </span>
          <span className="text-zinc-500">|</span>
          <span title="Time until this candle closes">{TF_LABEL[chartTf]} closes {fmtLeft(secLeft)}</span>
        </div>
        {drawError && (
          <div className="absolute inset-x-2 top-8 z-10 rounded border border-red-400/30 bg-red-950/80 px-2 py-1 text-[10px] text-red-200">
            Chart data problem: {drawError}
          </div>
        )}
        {!snapshot && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-500">
            {error ?? (loading ? "Loading candles…" : "No data")}
          </div>
        )}
      </div>
    </div>
  );
}
