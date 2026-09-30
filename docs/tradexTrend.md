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
