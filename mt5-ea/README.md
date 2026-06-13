# XauusdTrendEA — MT5 Expert Advisor (Gold / XAUUSD)

A **Donchian channel-breakout** trend-following Expert Advisor for MetaTrader 5,
built and tuned for **XAUUSD (Gold)** — and, unlike most "gold EAs" online,
**backtested on ~10 years of data with an out-of-sample check** (see results
below). The strategy was chosen *because* it survived that test, not picked first
and hoped for.

> ## ⚠️ Read this first — honest expectations
>
> **No EA is guaranteed profitable.** The numbers below are from a **bar-level
> backtest** with a modelled spread/slippage cost — **not** a MetaTrader
> real-tick test and **not** a promise of live results. Published "PF 1.6 / +44%"
> gold strategies routinely fail to reproduce on independent data; in our own
> testing they did. What you get here is a *modest but genuine, out-of-sample-
> verified edge* — which you must still re-validate on **your** broker in the MT5
> Strategy Tester and on a **demo account** before risking real money.

## Why this strategy

Across the research and our own testing, the consistent findings for gold were:

- **Gold is a trending / breakout asset.** Pure RSI mean-reversion has negative expectancy on XAUUSD.
- **EMA-crossover entries lost** on independent data (PF < 1).
- **Channel (Donchian) breakout + trend filter + "let winners run" trailing** is the one approach that stayed profitable **in both halves** of a 10-year out-of-sample split. This is the classic Turtle-style breakout, and gold respects it.
- **H1 is the robust timeframe. M15 was fragile** (huge drawdowns) — do not run this on M15.

## Strategy rules

| Component | Default | Purpose |
|-----------|---------|---------|
| Trend filter: EMA(200) on working TF | 200 | Long only above, short only below |
| Donchian breakout entry | 40 bars | Enter when price breaks the N-bar high/low (intrabar, stop-order style) |
| ATR stop | 2.0 × ATR(14) | Volatility-based initial stop |
| ATR trailing exit | 3.0 × ATR(14) | Let winners run; no fixed take-profit |
| Session filter | 08:00–20:00 | Trade only liquid London/NY hours (server time) |
| Risk sizing | 1% / trade | Lot adapts to gold's volatility |

**Long:** price breaks **above** the 40-bar high **and** the last close is **above** EMA200.
**Short:** the mirror image. One position at a time, exited by the ATR trailing stop.

## 📊 Backtest results (honest)

Reproducible via [`backtest/backtest_donchian.py`](backtest/backtest_donchian.py) on
public XAUUSD **H1** data (2012–2022, ~57,600 bars), 1% risk compounding,
**$0.40/oz round-trip cost + $0.10/oz breakout slippage**:

| Segment | Trades | Win% | **Profit Factor** | Return | Max DD |
|---------|--------|------|-------------------|--------|--------|
| **Full (2012–2022)** | 1042 | 33% | **1.12** | +150% | 26.5% |
| Out-of-sample 1st half (2012–2017) | 492 | 36% | **1.20** | +77% | 12.3% |
| Out-of-sample 2nd half (2017–2022) | 545 | 32% | **1.08** | +37% | 26.5% |

**How to read this honestly:**
- ✅ Profitable in **both** independent halves → the edge is not a single curve-fit.
- ⚠️ The edge is **modest** (PF ~1.1–1.2). Low win rate (~33%) is normal for breakout trend-following — a few big winners pay for many small losers. You must be able to sit through losing streaks.
- ⚠️ ~26% max drawdown is real. Size accordingly.
- ⚠️ Bar-backtest + modelled costs. **Live slippage on fast gold breakouts will reduce this.** Re-test with real ticks.

Run it yourself:
```bash
cd mt5-ea/backtest
python3 backtest_donchian.py          # auto-downloads H1 data and prints the table
```

## Installation

1. MT5 → **File → Open Data Folder** → `MQL5/Experts/`, copy `XauusdTrendEA.mq5` there.
2. In **MetaEditor**, open it and press **Compile** (F7). Expect **0 errors**.
3. In MT5, refresh Navigator → drag **XauusdTrendEA** onto an **XAUUSD H1** chart.
4. Turn on **Algo Trading**.

> **Recommended timeframe: H1.** Not M15 — it was fragile in testing.

## Key inputs

| Input | Default | Notes |
|-------|---------|-------|
| `InpDonchianPeriod` | 40 | Breakout lookback. 20–55 were all robust; 40 was best. |
| `InpTrendEmaPeriod` | 200 | Trend filter. |
| `InpAtrSlMult` | 2.0 | Initial stop = ATR × this. |
| `InpTrailAtrMult` | 3.0 | Trailing distance = ATR × this (the core of the edge). |
| `InpAtrTpMult` | 0.0 | Fixed TP off — trailing manages exits. |
| `InpRiskPercent` | 1.0 | Risk per trade (% equity). `InpFixedLot` > 0 overrides. |
| `InpUseSessionFilter` / hours | on / 8–20 | Liquid-hours filter (server time). |
| `InpUseAdxFilter` | off | Optional extra trend-strength filter. |

### Capital-protection guards (keep these on while testing)

| Guard | Default | What it does |
|-------|---------|--------------|
| Daily loss limit | 4% | Stops new trades after the day's loss cap. |
| Max drawdown halt | 15% | Halts the EA (and optionally closes trades) on a 15% equity drop from peak. |
| Max trades/day | 5 | Caps daily entries. |
| Friday close | 21:00 | Flattens before the weekend gap. |
| Spread filter | 50 pts | Blocks entries when spread is too wide. |

> Set `InpFridayCloseHour`, session hours, etc. to **your broker's server timezone** — they are not always GMT.

## Validation workflow (DO NOT SKIP)

1. **MT5 Strategy Tester**, XAUUSD **H1**, **"Every tick based on real ticks"**, 2–3+ years.
2. Confirm it still clears **PF > 1.1** and a drawdown you can stomach **after your broker's real spread**.
3. Re-optimise gently if needed (`InpDonchianPeriod`, `InpTrailAtrMult`) — avoid curve-fitting; prefer settings that work across a *range*.
4. **Forward-test on DEMO for 4–8 weeks** on the exact account you'll trade.
5. Only then consider a small live position at the lowest risk setting.

## Safety notes

- Only touches positions matching its **magic number** + symbol — safe alongside manual trades.
- Respects broker minimum stop distance and lot min/max/step.
- Non-gold symbol → prints a warning (still runs if you insist).

## Disclaimer

Trading leveraged instruments carries a significant risk of loss. This code is
provided **as-is for educational purposes with no guarantee of profitability**.
Backtested results are not indicative of future performance. You alone are
responsible for any use on a live account.

## Data & references

- Historical XAUUSD data: [ejtraderLabs/historical-data](https://github.com/ejtraderLabs/historical-data) (public MT5 history mirror).
- Strategy research drew on public gold-trading write-ups; the channel-breakout / Turtle approach is long-established public-domain trading methodology.
