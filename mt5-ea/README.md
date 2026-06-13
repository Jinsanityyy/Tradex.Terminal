# XauusdTrendEA — MT5 Expert Advisor (Gold / XAUUSD)

A trend-following Expert Advisor for MetaTrader 5, tuned for **XAUUSD (Gold)**,
with intraday/swing defaults and a full layer of **capital-protection guards**.

> ## ⚠️ Read this first — honest expectations
>
> **No EA is guaranteed profitable, and nobody can hand you one that is.**
> This code is engineered to *run correctly and protect your capital* — it is
> **not** a promise of profit. Whether it makes money depends entirely on the
> market, your broker's spread/execution, and your settings.
>
> **Profitability is something you must PROVE with data, not assume from code.**
> Follow the [Validation workflow](#validation-workflow-do-not-skip) below.
> Test on a **demo account for weeks** before risking one cent of real money.
> Gold can wipe an over-leveraged account in a single news spike.

## Strategy (intraday / swing)

| Component | Purpose |
|-----------|---------|
| Fast/Slow EMA crossover (working TF) | Entry trigger |
| Higher-timeframe EMA (default H1, 100) | Trade only with the larger trend |
| ADX filter (default ≥ 20) | Skip choppy, trendless conditions |
| RSI guard | Avoid buying overbought / selling oversold |
| Session filter (London→US) | Trade only liquid hours; avoid thin spreads |
| ATR position sizing | Lot size adapts to gold's volatility |
| ATR stop / target | SL = 2×ATR, TP = 3×ATR by default |
| Break-even + ATR trailing | Protect and ride winners |
| Re-entry cooldown | Avoid re-firing on the same swing |

**Entry logic**
- **Buy:** fast EMA crosses above slow EMA **and** HTF price > HTF EMA **and** RSI < `InpRsiBuyMax`, ADX ≥ `InpAdxMinStrength`.
- **Sell:** fast EMA crosses below slow EMA **and** HTF price < HTF EMA **and** RSI > `InpRsiSellMin`, ADX ≥ `InpAdxMinStrength`.

## Capital-protection guards

These are what keep you alive while you test. All are configurable inputs.

| Guard | Default | What it does |
|-------|---------|--------------|
| **Daily loss limit** | 4% | Stops opening new trades for the rest of the day once the day's loss hits the cap. |
| **Max drawdown halt** | 15% | If equity falls 15% from its peak, the EA **halts for the session** and (optionally) closes all its trades. Requires a manual restart — a deep loss deserves your eyes. |
| **Max trades/day** | 5 | Hard cap on new entries per day. |
| **Friday close** | 21:00 | Flattens all EA trades and stops before the weekend gap. |
| **Monday/Sunday-open skip** | on | Skips the first hour after the weekend gap (worst spreads). |
| **Spread filter** | 50 pts | Blocks entries when the spread is too wide (news). |
| **Risk per trade** | 1% | Position sized so a stop-out loses ~1% of equity. |

> Adjust `InpFridayCloseHour`, `InpMondayOpenHour` and the session hours to
> **your broker's server timezone** — they are not all GMT.

## Installation

1. MT5 → **File → Open Data Folder** → `MQL5/Experts/`, copy `XauusdTrendEA.mq5` there.
2. In **MetaEditor**, open it and press **Compile** (F7). Expect **0 errors**.
3. In MT5, refresh Navigator → drag **XauusdTrendEA** onto an **XAUUSD** chart.
4. Turn on **Algo Trading**.

**Recommended chart:** XAUUSD on **M15** (intraday) or **H1** (swing).

## Suggested starting presets

These are *starting points to optimise*, not magic numbers.

### M15 intraday (moderate risk)
```
InpFastEmaPeriod   = 21      InpRiskPercent     = 1.0
InpSlowEmaPeriod   = 55      InpAtrSlMult       = 2.0
InpHtfTimeframe    = H1      InpAtrTpMult       = 3.0
InpHtfEmaPeriod    = 100     InpAdxMinStrength  = 22
InpSessionStart    = 8       InpDailyLossPercent= 4.0
InpSessionEnd      = 20      InpMaxDrawdown%    = 15
```

### H1 swing (smoother, fewer trades)
```
InpFastEmaPeriod   = 20      InpRiskPercent     = 1.0
InpSlowEmaPeriod   = 50      InpAtrSlMult       = 2.5
InpHtfTimeframe    = H4      InpAtrTpMult       = 4.0
InpHtfEmaPeriod    = 100     InpAdxMinStrength  = 20
InpSessionFilter   = false   InpMaxTradesPerDay = 3
```

## Validation workflow (DO NOT SKIP)

This is how you find out if it is actually profitable **for your broker**:

1. **Get quality data.** In the Strategy Tester use **"Every tick based on real ticks."** Gold backtests on modelled ticks lie.
2. **Backtest ≥ 2–3 years** of XAUUSD on M15 (or H1). Include a high-volatility period (e.g. 2020, 2022–2023).
3. **Judge with metrics, not the equity curve's vibe:**
   - **Profit Factor** > 1.3 (gross profit ÷ gross loss)
   - **Max drawdown** you can actually stomach (ideally < 20%)
   - **≥ 100 trades** so the result is statistically meaningful
   - Recovery factor and Sharpe as tie-breakers
4. **Optimise carefully.** Vary `InpAtrSlMult`, `InpAtrTpMult`, `InpAdxMinStrength`, EMA periods. **Avoid curve-fitting** — pick robust regions, not a single lucky combo. Confirm with **forward (out-of-sample) optimisation**.
5. **Forward test on DEMO for 4–8 weeks** with the exact broker/account you'll trade. Live spread and execution decide everything on gold.
6. **Only then** consider a small live position, at the lowest risk setting.

If it can't clear steps 3–5, it is **not** ready — tweak or discard. That is the
honest process every serious algo trader follows.

## Safety notes

- Only touches positions matching its **magic number** + symbol — safe alongside manual trades.
- Respects broker minimum stop distance and lot min/max/step.
- Non-gold symbol → prints a warning (still runs if you insist).

## Disclaimer

Trading leveraged instruments carries a significant risk of loss. This code is
provided **as-is for educational purposes with no guarantee of profitability**.
You alone are responsible for any use on a live account.
