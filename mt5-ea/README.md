# XauusdTrendEA — MT5 Expert Advisor (Gold / XAUUSD)

A trend-following Expert Advisor for MetaTrader 5, tuned for **XAUUSD (Gold)**.
It combines an EMA crossover with a higher-timeframe trend filter, ADX strength
and an RSI guard, then manages risk with ATR-based position sizing, stops,
break-even and trailing.

> ⚠️ **Educational template.** Gold is fast and spreads widen around news.
> Backtest and forward-test on a **demo account** before risking real money.

## Strategy

| Component | Purpose |
|-----------|---------|
| Fast/Slow EMA crossover (working TF) | Entry trigger |
| Higher-timeframe EMA (default H1, 100) | Trade only with the larger trend |
| ADX filter (default ≥ 20) | Skip choppy, trendless conditions |
| RSI guard | Avoid buying overbought / selling oversold |
| ATR position sizing | Lot size adapts to gold's volatility |
| ATR stop / target | SL = 2×ATR, TP = 3×ATR by default |
| Break-even + ATR trailing | Protect and ride winners |

**Entry logic**
- **Buy:** fast EMA crosses above slow EMA **and** HTF price > HTF EMA **and** RSI < `InpRsiBuyMax`, ADX ≥ `InpAdxMinStrength`.
- **Sell:** fast EMA crosses below slow EMA **and** HTF price < HTF EMA **and** RSI > `InpRsiSellMin`, ADX ≥ `InpAdxMinStrength`.

## Installation

1. Open MetaTrader 5 → **File → Open Data Folder**.
2. Copy `XauusdTrendEA.mq5` into `MQL5/Experts/`.
3. In **MetaEditor**, open the file and press **Compile** (F7). You should get 0 errors.
4. Back in MT5, refresh the Navigator, then drag **XauusdTrendEA** onto an **XAUUSD** chart.
5. Enable **Algo Trading** (toolbar button).

**Recommended chart:** XAUUSD on **M15** or **H1** working timeframe.

## Key inputs

| Input | Default | Notes |
|-------|---------|-------|
| `InpRiskPercent` | 1.0 | Risk per trade as % of equity. Set `InpFixedLot` > 0 to override. |
| `InpFastEmaPeriod` / `InpSlowEmaPeriod` | 21 / 55 | Crossover EMAs. Fast must be < Slow. |
| `InpHtfTimeframe` / `InpHtfEmaPeriod` | H1 / 100 | Higher-timeframe trend filter. |
| `InpAdxMinStrength` | 20 | Raise to trade only strong trends. |
| `InpAtrSlMult` / `InpAtrTpMult` | 2.0 / 3.0 | Stop / target as ATR multiples. TP = 0 disables target. |
| `InpUseBreakEven` / `InpUseTrailing` | true / true | Stop management. |
| `InpMaxSpreadPoints` | 50 | Blocks entries when spread is too wide (0 = ignore). |
| `InpMaxOpenPositions` | 1 | Cap on simultaneous EA trades. |
| `InpUseSessionFilter` | false | Restrict to server-time hours when enabled. |

## Backtesting

1. **View → Strategy Tester** (Ctrl+R).
2. Expert: `XauusdTrendEA`, Symbol: `XAUUSD`, Timeframe: M15/H1.
3. Use **Every tick based on real ticks** for the most realistic gold fills.
4. Optimise `InpAtrSlMult`, `InpAtrTpMult`, `InpAdxMinStrength` and the EMA periods.

## Safety notes

- The EA only touches positions matching its **magic number** (`InpMagicNumber`) and symbol, so it is safe to run alongside manual trades.
- It respects the broker's minimum stop distance and lot min/max/step.
- Symbol that isn't gold → a console warning is printed (it will still run if you insist).

## Disclaimer

Trading leveraged instruments carries significant risk of loss. This code is
provided as-is for educational purposes, with no guarantee of profitability.
You are solely responsible for any use on a live account.
