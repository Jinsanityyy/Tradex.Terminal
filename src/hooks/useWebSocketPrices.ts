"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Maps our display symbols → Finnhub WebSocket subscription symbols
const WS_SYMBOL_MAP: Record<string, string> = {
  XAUUSD: "OANDA:XAU_USD",
  XAGUSD: "OANDA:XAG_USD",
  BTCUSD: "BINANCE:BTCUSDT",
  ETHUSD: "BINANCE:ETHUSDT",
  LTCUSD: "BINANCE:LTCUSDT",
  SOLUSD: "BINANCE:SOLUSDT",
  XRPUSD: "BINANCE:XRPUSDT",
  BNBUSD: "BINANCE:BNBUSDT",
  EURUSD: "OANDA:EUR_USD",
  GBPUSD: "OANDA:GBP_USD",
  USDJPY: "OANDA:USD_JPY",
  USDCAD: "OANDA:USD_CAD",
  USDCHF: "OANDA:USD_CHF",
  AUDUSD: "OANDA:AUD_USD",
  NZDUSD: "OANDA:NZD_USD",
  GBPJPY: "OANDA:GBP_JPY",
  EURJPY: "OANDA:EUR_JPY",
  EURGBP: "OANDA:EUR_GBP",
  AUDJPY: "OANDA:AUD_JPY",
  USOIL:  "OANDA:WTICO_USD",
  UKOIL:  "OANDA:BCO_USD",
};

const FINNHUB_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(WS_SYMBOL_MAP).map(([k, v]) => [v, k])
);

export interface WSPriceState {
  prices: Map<string, number>;
  connected: boolean;
}

export function useWebSocketPrices(symbols: string[]): WSPriceState {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [connected, setConnected] = useState(false);

  const wsRef         = useRef<WebSocket | null>(null);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef    = useRef(true);
  const symbolsRef    = useRef<string[]>(symbols);
  const subscribedRef = useRef<Set<string>>(new Set());
  const tokenRef      = useRef<string | null>(null);

  symbolsRef.current = symbols;

  const subscribeAll = useCallback((ws: WebSocket) => {
    for (const sym of symbolsRef.current) {
      const fhSym = WS_SYMBOL_MAP[sym];
      if (fhSym && !subscribedRef.current.has(fhSym) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "subscribe", symbol: fhSym }));
        subscribedRef.current.add(fhSym);
      }
    }
  }, []);

  const connect = useCallback(() => {
    const apiKey = tokenRef.current;
    if (!apiKey || typeof window === "undefined") return;

    const state = wsRef.current?.readyState;
    if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) return;

    subscribedRef.current.clear();

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      subscribeAll(ws);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg.type !== "trade" || !Array.isArray(msg.data)) return;

        setPrices((prev) => {
          const next = new Map(prev);
          let changed = false;
          for (const trade of msg.data as Array<{ s: string; p: number }>) {
            const sym = FINNHUB_TO_SYMBOL[trade.s];
            if (sym && typeof trade.p === "number" && trade.p > 0) {
              next.set(sym, trade.p);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      timerRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }, [subscribeAll]);

  useEffect(() => {
    mountedRef.current = true;

    // Fetch token from server — keeps the API key out of the client bundle
    fetch("/api/ws/token")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(({ token }: { token: string }) => {
        if (!mountedRef.current) return;
        tokenRef.current = token;
        connect();
      })
      .catch(() => { /* unauthenticated or key not configured */ });

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [connect]);

  // Subscribe to newly-added symbols without full reconnect
  useEffect(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) subscribeAll(ws);
  }, [symbols, subscribeAll]);

  return { prices, connected };
}
