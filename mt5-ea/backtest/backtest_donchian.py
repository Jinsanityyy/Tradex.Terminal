#!/usr/bin/env python3
"""
Reproducible backtest for the XauusdTrendEA Donchian-breakout strategy.

It mirrors the EA's live logic on historical XAUUSD bars:
  * Trend filter: EMA(200) on the working timeframe (long above, short below).
  * Entry: close breaks the N-bar Donchian channel (default 40).
  * Stop:  2.0 x ATR(14).
  * Exit:  ATR trailing stop (3.0 x ATR) — let winners run (no fixed TP).
  * Filter: trade only during liquid hours (server 08:00-20:00).
  * Sizing: risk 1% of (compounding) equity per trade.
  * Cost:  flat $0.40/oz round trip to approximate spread + commission.

This is a BAR-OHLC backtest, not a MetaTrader real-tick test. Treat the
numbers as a robustness check, not a promise of live performance. Always
re-validate in the MT5 Strategy Tester with "Every tick based on real ticks"
and your own broker's spread before trading real money.

Data source (free, public, MIT-style mirror of MT5 history):
  https://raw.githubusercontent.com/ejtraderLabs/historical-data/main/XAUUSD/XAUUSDh1.csv

Usage:
  python3 backtest_donchian.py                 # auto-download H1 and run
  python3 backtest_donchian.py path/to.csv     # use your own CSV (Date,open,high,low,close,...)
"""
import sys, os, urllib.request
import numpy as np
import pandas as pd

DATA_URL = "https://raw.githubusercontent.com/ejtraderLabs/historical-data/main/XAUUSD/XAUUSDh1.csv"
LOCAL    = "/tmp/xau_h1.csv"

# ---- strategy / account parameters (match the EA defaults) ----
DONCHIAN   = 40
TREND_EMA  = 200
ATR_PERIOD = 14
ATR_SL     = 2.0
TRAIL_ATR  = 3.0
SESS_START, SESS_END = 8, 20
START_EQUITY = 10_000.0
RISK_PCT     = 1.0
ROUND_TRIP_USD = 0.40
SLIPPAGE_USD = 0.10    # per-oz slippage on the breakout (stop-order) fill
PRICE_SCALE  = 100.0   # ejtraderLabs feed is scaled x100 -> USD/oz


def ema(a, n):
    out = np.empty_like(a); k = 2 / (n + 1); out[0] = a[0]
    for i in range(1, len(a)):
        out[i] = a[i] * k + out[i - 1] * (1 - k)
    return out


def rma(a, n):
    out = np.empty_like(a); k = 1 / n; out[0] = a[0]
    for i in range(1, len(a)):
        out[i] = a[i] * k + out[i - 1] * (1 - k)
    return out


def load(path):
    df = pd.read_csv(path)
    df.columns = [c.strip().lower() for c in df.columns]
    df["date"] = pd.to_datetime(df["date"])
    for c in ["open", "high", "low", "close"]:
        df[c] = df[c].astype(float) / PRICE_SCALE
    return df.sort_values("date").reset_index(drop=True)


def backtest(df, donchian=DONCHIAN, atr_sl=ATR_SL, trail_atr=TRAIL_ATR,
             trend=TREND_EMA, use_session=True):
    o = df["open"].values; h = df["high"].values
    l = df["low"].values;  c = df["close"].values
    hour = df["date"].dt.hour.values

    et = ema(c, trend)
    tr = np.maximum(h - l, np.maximum(abs(h - np.roll(c, 1)), abs(l - np.roll(c, 1))))
    tr[0] = h[0] - l[0]
    atr = rma(tr, ATR_PERIOD)
    don_hi = pd.Series(h).rolling(donchian).max().shift(1).values
    don_lo = pd.Series(l).rolling(donchian).min().shift(1).values

    eq = START_EQUITY; peak = eq; mdd = 0.0
    trades = []; pos = None
    for i in range(max(trend, donchian) + 1, len(c)):
        # manage open trade
        if pos is not None:
            exit_px = None
            if pos["dir"] == 1 and l[i] <= pos["sl"]:
                exit_px = pos["sl"]
            elif pos["dir"] == -1 and h[i] >= pos["sl"]:
                exit_px = pos["sl"]
            if exit_px is not None:
                pnl = (exit_px - pos["entry"]) * pos["dir"] * pos["size"] - ROUND_TRIP_USD * pos["size"]
                eq += pnl; trades.append(pnl); pos = None
            else:
                if pos["dir"] == 1:
                    pos["sl"] = max(pos["sl"], c[i] - trail_atr * atr[i])
                else:
                    pos["sl"] = min(pos["sl"], c[i] + trail_atr * atr[i])
            peak = max(peak, eq); mdd = max(mdd, (peak - eq) / peak * 100)
            continue

        if use_session and not (SESS_START <= hour[i] < SESS_END):
            continue
        if np.isnan(don_hi[i]):
            continue

        # Intrabar stop-order breakout: trigger when the bar trades through the
        # channel; fill at the channel level plus slippage. Trend gate uses the
        # PRIOR bar close vs EMA (no look-ahead). This matches the EA's entry.
        d = 0; entry = 0.0
        if h[i] > don_hi[i] and c[i - 1] > et[i - 1]:
            d = 1; entry = don_hi[i] + SLIPPAGE_USD
        elif l[i] < don_lo[i] and c[i - 1] < et[i - 1]:
            d = -1; entry = don_lo[i] - SLIPPAGE_USD
        if d != 0:
            a = atr[i]; stop = atr_sl * a
            size = (eq * RISK_PCT / 100.0) / stop if stop > 0 else 0
            if size > 0:
                pos = dict(dir=d, entry=entry, sl=entry - d * stop, size=size)
        peak = max(peak, eq); mdd = max(mdd, (peak - eq) / peak * 100)

    t = np.array(trades); n = len(t)
    if n == 0:
        return None
    gw = t[t > 0].sum(); gl = -t[t < 0].sum()
    return dict(n=n, win=(t > 0).mean() * 100, pf=(gw / gl if gl > 0 else 99.0),
                ret=(eq - START_EQUITY) / START_EQUITY * 100, mdd=mdd, eq=eq)


def show(label, r):
    if r is None:
        print(f"{label:14} no trades"); return
    print(f"{label:14}{r['n']:>8}{r['win']:>8.1f}{r['pf']:>7.2f}{r['ret']:>10.1f}{r['mdd']:>9.1f}")


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else LOCAL
    if path == LOCAL and not os.path.exists(LOCAL):
        print("Downloading H1 XAUUSD data ...")
        urllib.request.urlretrieve(DATA_URL, LOCAL)
    df = load(path)

    print(f"Data: {df['date'].iloc[0]} -> {df['date'].iloc[-1]}  ({len(df)} bars)")
    print(f"Strategy: Donchian({DONCHIAN}) breakout + EMA{TREND_EMA} trend + {ATR_SL}xATR stop "
          f"+ {TRAIL_ATR}xATR trail, session {SESS_START}-{SESS_END}, risk {RISK_PCT}%\n")
    print(f"{'segment':14}{'trades':>8}{'win%':>8}{'PF':>7}{'ret%':>10}{'maxDD%':>9}")

    show("FULL", backtest(df))

    # Out-of-sample split (two independent halves).
    mid = df["date"].iloc[len(df) // 2]
    first = df[df["date"] < mid].reset_index(drop=True)
    second = df[df["date"] >= mid].reset_index(drop=True)
    show(f"1st half", backtest(first))
    show(f"2nd half", backtest(second))
    print(f"\n(out-of-sample split at {mid.date()})")


if __name__ == "__main__":
    main()
