"use client";

import { useEffect, useRef, useState } from "react";

// Binance stream name → our symbol (free, no API key)
const BINANCE_TO_DISPLAY: Record<string, string> = {
  btcusdt: "BTCUSD",
  ethusdt: "ETHUSD",
};

// Finnhub symbol → our symbol (needs NEXT_PUBLIC_FINNHUB_API_KEY)
const FINNHUB_TO_DISPLAY: Record<string, string> = {
  "OANDA:XAU_USD": "XAUUSD",
  "OANDA:EUR_USD": "EURUSD",
  "OANDA:GBP_USD": "GBPUSD",
  "OANDA:USD_JPY": "USDJPY",
  "FXCM:USOIL":    "USOIL",
};

export type LivePriceMap = Record<string, number>;

/**
 * Real-time per-tick prices via:
 * - Binance combined stream (BTC, ETH) — free, no key
 * - Finnhub WebSocket (XAU, EUR, GBP, JPY, Oil) — needs NEXT_PUBLIC_FINNHUB_API_KEY
 *
 * Returns a map of symbol → latest price (e.g. { BTCUSD: 67234.5, XAUUSD: 3312.4 })
 * Falls back to empty map if WebSocket is unavailable.
 */
export function useLivePrices(): LivePriceMap {
  const [prices, setPrices] = useState<LivePriceMap>({});
  const binanceWs  = useRef<WebSocket | null>(null);
  const finnhubWs  = useRef<WebSocket | null>(null);
  const timers     = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    function clearTimers() {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }

    // ── Binance combined stream (BTC + ETH trades) ─────────────────────────
    function connectBinance() {
      const streams = Object.keys(BINANCE_TO_DISPLAY).map(s => `${s}@aggTrade`).join("/");
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      binanceWs.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          const trade = msg.data ?? msg;
          const sym = BINANCE_TO_DISPLAY[(trade.s as string)?.toLowerCase()];
          if (sym && trade.p) {
            const price = parseFloat(trade.p);
            if (isFinite(price) && price > 0) {
              setPrices(prev => ({ ...prev, [sym]: price }));
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        const t = setTimeout(connectBinance, 3000);
        timers.current.push(t);
      };

      ws.onerror = () => ws.close();
    }

    // ── Finnhub WebSocket (forex + gold) ───────────────────────────────────
    function connectFinnhub(apiKey: string) {
      const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
      finnhubWs.current = ws;

      ws.onopen = () => {
        Object.keys(FINNHUB_TO_DISPLAY).forEach(sym => {
          ws.send(JSON.stringify({ type: "subscribe", symbol: sym }));
        });
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === "trade" && Array.isArray(msg.data)) {
            setPrices(prev => {
              const next = { ...prev };
              for (const tick of msg.data as Array<{ s: string; p: number }>) {
                const sym = FINNHUB_TO_DISPLAY[tick.s];
                if (sym && isFinite(tick.p) && tick.p > 0) {
                  next[sym] = tick.p;
                }
              }
              return next;
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        const t = setTimeout(() => connectFinnhub(apiKey), 3000);
        timers.current.push(t);
      };

      ws.onerror = () => ws.close();
    }

    connectBinance();

    const fhKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (fhKey) connectFinnhub(fhKey);

    return () => {
      clearTimers();
      binanceWs.current?.close();
      finnhubWs.current?.close();
    };
  }, []);

  return prices;
}
