"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Finnhub symbol map (metals, forex, oil + crypto via Binance proxy) ────
const WS_SYMBOL_MAP: Record<string, string> = {
  XAUUSD: "OANDA:XAU_USD",
  XAGUSD: "OANDA:XAG_USD",
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
  // Crypto — routed through Finnhub's Binance proxy (no extra key, same WS connection)
  BTCUSD: "BINANCE:BTCUSDT",
  ETHUSD: "BINANCE:ETHUSDT",
  LTCUSD: "BINANCE:LTCUSDT",
  SOLUSD: "BINANCE:SOLUSDT",
  XRPUSD: "BINANCE:XRPUSDT",
  BNBUSD: "BINANCE:BNBUSDT",
};

const FINNHUB_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(WS_SYMBOL_MAP).map(([k, v]) => [v, k])
);

// ── Binance stream map (crypto — port 443, no API key needed) ─────────────
const BINANCE_STREAM_MAP: Record<string, string> = {
  BTCUSD: "btcusdt",
  ETHUSD: "ethusdt",
  LTCUSD: "ltcusdt",
  SOLUSD: "solusdt",
  XRPUSD: "xrpusdt",
  BNBUSD: "bnbusdt",
};

const BINANCE_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(BINANCE_STREAM_MAP).map(([k, v]) => [v.toUpperCase(), k])
);

export interface WSPriceState {
  prices: Map<string, number>;
  connected: boolean;
}

export function useWebSocketPrices(symbols: string[]): WSPriceState {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [connected, setConnected] = useState(false);

  const finnhubWsRef   = useRef<WebSocket | null>(null);
  const binanceWsRef   = useRef<WebSocket | null>(null);
  const timersRef      = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef     = useRef(true);
  const symbolsRef     = useRef<string[]>(symbols);
  const subscribedRef  = useRef<Set<string>>(new Set());
  const tokenRef       = useRef<string | null>(null);

  symbolsRef.current = symbols;

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  // ── Binance direct (port 443, no key, crypto always real-time) ────────────
  const connectBinance = useCallback(() => {
    if (typeof window === "undefined") return;

    const cryptoSymbols = symbolsRef.current.filter(s => BINANCE_STREAM_MAP[s]);
    if (cryptoSymbols.length === 0) return;

    const state = binanceWsRef.current?.readyState;
    if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) return;

    const streams = cryptoSymbols.map(s => `${BINANCE_STREAM_MAP[s]}@aggTrade`).join("/");
    // Port 443 avoids mobile network blocks on the default port 9443
    const ws = new WebSocket(`wss://stream.binance.com:443/stream?streams=${streams}`);
    binanceWsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        const trade = msg.data ?? msg;
        const streamSym = (trade.s as string)?.toUpperCase();
        const sym = BINANCE_TO_SYMBOL[streamSym];
        if (sym && typeof trade.p === "string") {
          const price = parseFloat(trade.p);
          if (isFinite(price) && price > 0) {
            setPrices(prev => {
              const next = new Map(prev);
              next.set(sym, price);
              return next;
            });
            setConnected(true);
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      const t = setTimeout(connectBinance, 4000);
      timersRef.current.push(t);
    };

    ws.onerror = () => ws.close();
  }, []);

  // ── Finnhub (metals, forex, oil — and crypto fallback) ───────────────────
  const subscribeFinnhub = useCallback((ws: WebSocket) => {
    for (const sym of symbolsRef.current) {
      const fhSym = WS_SYMBOL_MAP[sym];
      if (fhSym && !subscribedRef.current.has(fhSym) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "subscribe", symbol: fhSym }));
        subscribedRef.current.add(fhSym);
      }
    }
  }, []);

  const connectFinnhub = useCallback((apiKey: string) => {
    if (typeof window === "undefined") return;

    const state = finnhubWsRef.current?.readyState;
    if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) return;

    subscribedRef.current.clear();
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    finnhubWsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      subscribeFinnhub(ws);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg.type !== "trade" || !Array.isArray(msg.data)) return;
        setPrices(prev => {
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
      } catch {}
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      const t = setTimeout(() => connectFinnhub(apiKey), 5000);
      timersRef.current.push(t);
    };

    ws.onerror = () => ws.close();
  }, [subscribeFinnhub]);

  useEffect(() => {
    mountedRef.current = true;

    // Always connect Binance for crypto (no key needed, port 443)
    connectBinance();

    // Try to get Finnhub key from server (keeps key out of bundle)
    // Falls back to NEXT_PUBLIC_ env var if token endpoint fails (e.g. Capacitor auth)
    fetch("/api/ws/token")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ token }: { token: string }) => {
        if (mountedRef.current && token) {
          tokenRef.current = token;
          connectFinnhub(token);
        }
      })
      .catch(() => {
        // Fallback: use NEXT_PUBLIC_ key directly (acceptable for Capacitor where auth cookie isn't sent)
        const pubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
        if (pubKey && mountedRef.current) {
          tokenRef.current = pubKey;
          connectFinnhub(pubKey);
        }
      });

    return () => {
      mountedRef.current = false;
      clearTimers();
      finnhubWsRef.current?.close();
      binanceWsRef.current?.close();
    };
  }, [connectBinance, connectFinnhub]);

  // Re-subscribe to new symbols when list changes
  useEffect(() => {
    const fhWs = finnhubWsRef.current;
    if (fhWs?.readyState === WebSocket.OPEN) subscribeFinnhub(fhWs);
    // Binance needs full reconnect for new streams
    connectBinance();
  }, [symbols, subscribeFinnhub, connectBinance]);

  return { prices, connected };
}
