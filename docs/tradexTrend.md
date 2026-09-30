# TradeX Trend (experimental)

Port of `docs/reference/TradeX_TrendSystem_v1_7.pine` to TypeScript, shown as the **TRADEX TREND** dashboard widget (XAU/USD).

- Enable: set `NEXT_PUBLIC_TRADEX_TREND=1` (build-time), redeploy/restart. Then Dashboard > Add Widget > "TRADEX TREND · XAU/USD", and Save Layout.
- Logic: `src/lib/tradexTrend/` (pure). Data hook: `src/hooks/useTradexTrend.ts`. Widget: `src/components/dashboard/TradexTrendWidget.tsx`.
- Tests: `npm test` (node:test via tsx, no new dependencies). Golden file harness: `src/lib/tradexTrend/__tests__/fixtures/README.md`.
- The TERMINAL chart is a TradingView `tv.js` embed (iframe), so custom overlays are not possible there; the indicator lives in the widget.

Deviations from the Pine script (on purpose):
- Multi-timeframe values use the last **closed** higher-timeframe candle at each signal time. Pine's `request.security` on history can read the still-forming HTF bar.
- Lots are floored to 0.01 (Pine rounds for display only).

## Assets
XAU/USD, XAG/USD, EUR/USD, GBP/USD, AUD/USD, NZD/USD, USD/JPY, USD/CHF, USD/CAD, BTC/USD, ETH/USD, WTI Oil (`src/lib/tradexTrend/assets.ts`). Indices and crosses are not supported by the candle API.
Lot size assumes: gold 100 oz, silver 5000 oz, FX 100,000 units, oil 1000 bbl, crypto 1 coin per lot; for USD/JPY, USD/CHF, USD/CAD the risk is converted from the quote currency. Check your broker's contract size.
Gold, silver and oil on the Yahoo fallback are futures, not spot: the chart says so and turns the live tick off.

## Agents (same flag)
With `NEXT_PUBLIC_TRADEX_TREND=1` the agent pipeline takes the execution setup (entry / SL / TP1-3, signal state) from the same TradeX Trend computation as the chart, on the chart's timeframe
(`lib/tradexTrend/server.ts`, `lib/agents/tradex-adapter.ts`). The other agents confirm (same side), keep it with lower confidence (neutral), or veto it (opposite side).
Falls back to the classic execution agent when the candles are futures rather than spot or cannot be loaded. `TRADEX_TREND_AGENTS=0` turns only this agent core off.
Signal states: ARMED while price is within 0.5R of the entry; EXPIRED once it is further away or the setup closed (TP1 / SL / flip).
Agent results are cached for about 2.5 minutes, so the dashboard card can lag the chart by that long.
