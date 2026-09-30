# Golden file: SuperTrend vs TradingView

`golden.csv` is intentionally empty (header only), so the golden test is skipped until you fill it.

1. On TradingView, open XAU/USD on one timeframe. Add the built-in **Supertrend** (ATR length 10, factor 4)
   or the TradeX Trend indicator.
2. Export chart data (Chart menu > Export chart data...), choosing "Include Supertrend / plot values".
   Use **ISO time off**: choose unix timestamps. If only ISO times are available, convert them to unix seconds UTC.
3. Paste rows into `golden.csv` under the header, columns:
   `time,open,high,low,close,volume,supertrend`
   Keep the bars in ascending order, with at least ~200 bars **from the start of the export**
   (Wilder smoothing depends on history, so export the whole range you compare against; leave `supertrend`
   empty on bars where TradingView shows no line).
   If TradingView exports two plots (up / down), merge them into the single `supertrend` column.
4. Run: `npm test`. Other params: `GOLDEN_FACTOR=3 GOLDEN_ATR_LEN=7 npm test`.
   The test fails if any bar differs from TradingView by more than 0.01.
5. Lines starting with `#` are ignored.
