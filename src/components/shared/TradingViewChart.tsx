"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradingViewChartProps {
  symbol?: string;
  heightClass?: string;
}

const INTERVALS = [
  { label: "1m", value: "1", minutes: 1 },
  { label: "5m", value: "5", minutes: 5 },
  { label: "15m", value: "15", minutes: 15 },
  { label: "30m", value: "30", minutes: 30 },
  { label: "1H", value: "60", minutes: 60 },
  { label: "4H", value: "240", minutes: 240 },
  { label: "1D", value: "D", minutes: 1440 },
];

const QUICK_SYMBOLS = [
  {
    group: "Metals",
    items: [
      { label: "XAU/USD",    value: "OANDA:XAUUSD"   },
      { label: "XAG/USD",    value: "OANDA:XAGUSD"   },
      { label: "XPT/USD",    value: "OANDA:XPTUSD"   },
      { label: "XPD/USD",    value: "OANDA:XPDUSD"   },
    ],
  },
  {
    group: "Forex Majors",
    items: [
      { label: "EUR/USD", value: "OANDA:EURUSD" },
      { label: "GBP/USD", value: "OANDA:GBPUSD" },
      { label: "USD/JPY", value: "OANDA:USDJPY" },
      { label: "USD/CHF", value: "OANDA:USDCHF" },
      { label: "USD/CAD", value: "OANDA:USDCAD" },
      { label: "AUD/USD", value: "OANDA:AUDUSD" },
      { label: "NZD/USD", value: "OANDA:NZDUSD" },
    ],
  },
  {
    group: "Forex Cross",
    items: [
      { label: "EUR/JPY", value: "OANDA:EURJPY" },
      { label: "EUR/GBP", value: "OANDA:EURGBP" },
      { label: "EUR/CHF", value: "OANDA:EURCHF" },
      { label: "EUR/CAD", value: "OANDA:EURCAD" },
      { label: "EUR/AUD", value: "OANDA:EURAUD" },
      { label: "EUR/NZD", value: "OANDA:EURNZD" },
      { label: "GBP/JPY", value: "OANDA:GBPJPY" },
      { label: "GBP/CHF", value: "OANDA:GBPCHF" },
      { label: "GBP/CAD", value: "OANDA:GBPCAD" },
      { label: "GBP/AUD", value: "OANDA:GBPAUD" },
      { label: "GBP/NZD", value: "OANDA:GBPNZD" },
      { label: "AUD/JPY", value: "OANDA:AUDJPY" },
      { label: "AUD/CAD", value: "OANDA:AUDCAD" },
      { label: "AUD/CHF", value: "OANDA:AUDCHF" },
      { label: "AUD/NZD", value: "OANDA:AUDNZD" },
      { label: "CAD/JPY", value: "OANDA:CADJPY" },
      { label: "CAD/CHF", value: "OANDA:CADCHF" },
      { label: "CHF/JPY", value: "OANDA:CHFJPY" },
      { label: "NZD/JPY", value: "OANDA:NZDJPY" },
      { label: "NZD/CAD", value: "OANDA:NZDCAD" },
      { label: "NZD/CHF", value: "OANDA:NZDCHF" },
    ],
  },
  {
    group: "Forex Exotics",
    items: [
      { label: "USD/SGD", value: "OANDA:USDSGD" },
      { label: "USD/HKD", value: "OANDA:USDHKD" },
      { label: "USD/MXN", value: "OANDA:USDMXN" },
      { label: "USD/TRY", value: "OANDA:USDTRY" },
      { label: "USD/ZAR", value: "OANDA:USDZAR" },
      { label: "USD/NOK", value: "OANDA:USDNOK" },
      { label: "USD/SEK", value: "OANDA:USDSEK" },
      { label: "USD/DKK", value: "OANDA:USDDKK" },
      { label: "USD/PLN", value: "OANDA:USDPLN" },
      { label: "USD/HUF", value: "OANDA:USDHUF" },
      { label: "USD/CZK", value: "OANDA:USDCZK" },
      { label: "EUR/TRY", value: "OANDA:EURTRY" },
      { label: "EUR/PLN", value: "OANDA:EURPLN" },
      { label: "EUR/NOK", value: "OANDA:EURNOK" },
      { label: "EUR/SEK", value: "OANDA:EURSEK" },
      { label: "GBP/SGD", value: "OANDA:GBPSGD" },
    ],
  },
  {
    group: "US Indices",
    items: [
      { label: "S&P 500",      value: "FOREXCOM:SPX500" },
      { label: "NASDAQ 100",   value: "FOREXCOM:NAS100"  },
      { label: "Dow Jones",    value: "FOREXCOM:US30"    },
      { label: "Russell 2000", value: "TVC:RUT"          },
      { label: "VIX",          value: "TVC:VIX"          },
    ],
  },
  {
    group: "Global Indices",
    items: [
      { label: "DAX 40",       value: "FOREXCOM:GER40"   },
      { label: "FTSE 100",     value: "FOREXCOM:UK100"   },
      { label: "CAC 40",       value: "FOREXCOM:FRA40"   },
      { label: "Euro STOXX 50",value: "FOREXCOM:EUSTX50" },
      { label: "Nikkei 225",   value: "FOREXCOM:JPN225"  },
      { label: "ASX 200",      value: "FOREXCOM:AUS200"  },
      { label: "Hang Seng",    value: "FOREXCOM:HK50"    },
      { label: "KOSPI",        value: "KRX:KOSPI"        },
      { label: "Shanghai Comp",value: "SSE:000001"       },
      { label: "Bombay SE",    value: "BSE:SENSEX"       },
      { label: "Ibex 35",      value: "FOREXCOM:ESP35"   },
      { label: "AEX",          value: "EURONEXT:AEX"     },
      { label: "SMI",          value: "FOREXCOM:CHE20"   },
    ],
  },
  {
    group: "Crypto — Layer 1",
    items: [
      { label: "BTC/USD",   value: "BITSTAMP:BTCUSD"   },
      { label: "ETH/USD",   value: "BITSTAMP:ETHUSD"   },
      { label: "SOL/USD",   value: "COINBASE:SOLUSD"   },
      { label: "BNB/USD",   value: "BINANCE:BNBUSDT"   },
      { label: "XRP/USD",   value: "BITSTAMP:XRPUSD"   },
      { label: "ADA/USD",   value: "COINBASE:ADAUSD"   },
      { label: "AVAX/USD",  value: "COINBASE:AVAXUSD"  },
      { label: "TRX/USD",   value: "BINANCE:TRXUSDT"   },
      { label: "TON/USD",   value: "BINANCE:TONUSDT"   },
      { label: "SUI/USD",   value: "BINANCE:SUIUSDT"   },
      { label: "APT/USD",   value: "COINBASE:APTUSD"   },
      { label: "NEAR/USD",  value: "COINBASE:NEARUSD"  },
      { label: "ICP/USD",   value: "COINBASE:ICPUSD"   },
      { label: "ATOM/USD",  value: "COINBASE:ATOMUSD"  },
      { label: "HBAR/USD",  value: "BINANCE:HBARUSDT"  },
      { label: "ETC/USD",   value: "BINANCE:ETCUSDT"   },
      { label: "BCH/USD",   value: "BINANCE:BCHUSDT"   },
      { label: "LTC/USD",   value: "COINBASE:LTCUSD"   },
      { label: "XLM/USD",   value: "COINBASE:XLMUSD"   },
      { label: "XTZ/USD",   value: "COINBASE:XTZUSD"   },
      { label: "EOS/USD",   value: "COINBASE:EOSUSD"   },
      { label: "VET/USD",   value: "BINANCE:VETUSDT"   },
      { label: "ALGO/USD",  value: "COINBASE:ALGOUSD"  },
      { label: "EGLD/USD",  value: "BINANCE:EGLDUSDT"  },
      { label: "KSM/USD",   value: "COINBASE:KSMUSD"   },
      { label: "CELO/USD",  value: "COINBASE:CELOUSD"  },
      { label: "ONE/USD",   value: "BINANCE:ONEUSDT"   },
      { label: "KAVA/USD",  value: "BINANCE:KAVAUSDT"  },
      { label: "THETA/USD", value: "BINANCE:THETAUSDT" },
      { label: "ZIL/USD",   value: "BINANCE:ZILUSDT"   },
      { label: "IOTA/USD",  value: "BINANCE:IOTAUSDT"  },
      { label: "QTUM/USD",  value: "BINANCE:QTUMUSDT"  },
      { label: "ICX/USD",   value: "BINANCE:ICXUSDT"   },
      { label: "XMR/USD",   value: "BINANCE:XMRUSDT"   },
      { label: "ZEC/USD",   value: "BINANCE:ZECUSDT"   },
      { label: "DASH/USD",  value: "BINANCE:DASHUSDT"  },
      { label: "DCR/USD",   value: "BINANCE:DCRUSDT"   },
      { label: "STX/USD",   value: "BINANCE:STXUSDT"   },
      { label: "CFX/USD",   value: "BINANCE:CFXUSDT"   },
      { label: "ROSE/USD",  value: "BINANCE:ROSEUSDT"  },
      { label: "FTM/USD",   value: "BINANCE:FTMUSDT"   },
      { label: "MINA/USD",  value: "COINBASE:MINAUSD"  },
      { label: "FLOW/USD",  value: "COINBASE:FLOWUSD"  },
    ],
  },
  {
    group: "Crypto — Layer 2 / Scaling",
    items: [
      { label: "MATIC/USD", value: "COINBASE:MATICUSD" },
      { label: "ARB/USD",   value: "COINBASE:ARBUSD"   },
      { label: "OP/USD",    value: "COINBASE:OPUSD"    },
      { label: "IMX/USD",   value: "BINANCE:IMXUSDT"   },
      { label: "LRC/USD",   value: "COINBASE:LRCUSD"   },
      { label: "BOBA/USD",  value: "BINANCE:BOBAUSDT"  },
      { label: "METIS/USD", value: "BINANCE:METISUSDT" },
    ],
  },
  {
    group: "Crypto — DeFi",
    items: [
      { label: "UNI/USD",   value: "COINBASE:UNIUSD"   },
      { label: "LINK/USD",  value: "COINBASE:LINKUSD"  },
      { label: "AAVE/USD",  value: "BINANCE:AAVEUSDT"  },
      { label: "MKR/USD",   value: "COINBASE:MKRUSD"   },
      { label: "CRV/USD",   value: "COINBASE:CRVUSD"   },
      { label: "COMP/USD",  value: "COINBASE:COMPUSD"  },
      { label: "SNX/USD",   value: "COINBASE:SNXUSD"   },
      { label: "YFI/USD",   value: "BINANCE:YFIUSDT"   },
      { label: "SUSHI/USD", value: "BINANCE:SUSHIUSDT" },
      { label: "1INCH/USD", value: "BINANCE:1INCHUSDT" },
      { label: "BAL/USD",   value: "COINBASE:BALUSD"   },
      { label: "GRT/USD",   value: "BINANCE:GRTUSDT"   },
      { label: "LDO/USD",   value: "BINANCE:LDOUSDT"   },
      { label: "RPL/USD",   value: "COINBASE:RPLUSD"   },
      { label: "GMX/USD",   value: "BINANCE:GMXUSDT"   },
      { label: "DYDX/USD",  value: "BINANCE:DYDXUSDT"  },
      { label: "ENS/USD",   value: "COINBASE:ENSUSD"   },
      { label: "DOT/USD",   value: "COINBASE:DOTUSD"   },
      { label: "FIL/USD",   value: "COINBASE:FILUSD"   },
      { label: "STORJ/USD", value: "COINBASE:STORJUSD" },
      { label: "BAT/USD",   value: "COINBASE:BATUSD"   },
      { label: "ZRX/USD",   value: "COINBASE:ZRXUSD"   },
      { label: "NMR/USD",   value: "COINBASE:NMRUSD"   },
      { label: "BAND/USD",  value: "BINANCE:BANDUSDT"  },
    ],
  },
  {
    group: "Crypto — AI & Data",
    items: [
      { label: "FET/USD",   value: "BINANCE:FETUSDT"   },
      { label: "AGIX/USD",  value: "BINANCE:AGIXUSDT"  },
      { label: "OCEAN/USD", value: "BINANCE:OCEANUSDT" },
      { label: "RNDR/USD",  value: "BINANCE:RENDERUSDT"},
      { label: "WLD/USD",   value: "BINANCE:WLDUSDT"   },
      { label: "TAO/USD",   value: "BINANCE:TAOUSDT"   },
      { label: "ARKM/USD",  value: "BINANCE:ARKMUSDT"  },
      { label: "PYTH/USD",  value: "BINANCE:PYTHUSDT"  },
      { label: "API3/USD",  value: "BINANCE:API3USDT"  },
    ],
  },
  {
    group: "Crypto — Gaming & NFT",
    items: [
      { label: "AXS/USD",  value: "BINANCE:AXSUSDT"  },
      { label: "SAND/USD", value: "COINBASE:SANDUSD"  },
      { label: "MANA/USD", value: "COINBASE:MANAUSD"  },
      { label: "ENJ/USD",  value: "BINANCE:ENJUSDT"   },
      { label: "GALA/USD", value: "BINANCE:GALAUSDT"  },
      { label: "ILV/USD",  value: "BINANCE:ILVUSDT"   },
      { label: "BLUR/USD", value: "COINBASE:BLURUSD"  },
      { label: "APE/USD",  value: "COINBASE:APEUSD"   },
      { label: "CHZ/USD",  value: "BINANCE:CHZUSDT"   },
      { label: "ALICE/USD",value: "BINANCE:ALICEUSDT" },
    ],
  },
  {
    group: "Crypto — Meme",
    items: [
      { label: "DOGE/USD",  value: "BINANCE:DOGEUSDT"  },
      { label: "SHIB/USD",  value: "BINANCE:SHIBUSDT"  },
      { label: "PEPE/USD",  value: "BINANCE:PEPEUSDT"  },
      { label: "BONK/USD",  value: "BINANCE:BONKUSDT"  },
      { label: "WIF/USD",   value: "BINANCE:WIFUSDT"   },
      { label: "FLOKI/USD", value: "BINANCE:FLOKIUSDT" },
      { label: "MEME/USD",  value: "BINANCE:MEMEUSDT"  },
      { label: "TURBO/USD", value: "BINANCE:TURBOUSDT" },
      { label: "BOME/USD",  value: "BINANCE:BOMEUSDT"  },
    ],
  },
  {
    group: "Crypto — Stables & Other",
    items: [
      { label: "USDT",       value: "BINANCE:USDTUSD"  },
      { label: "SEI/USD",    value: "BINANCE:SEIUSDT"  },
      { label: "JUP/USD",    value: "BINANCE:JUPUSDT"  },
      { label: "JTO/USD",    value: "BINANCE:JTOUSDT"  },
      { label: "ENA/USD",    value: "BINANCE:ENAUSDT"  },
      { label: "WOO/USD",    value: "BINANCE:WOOUSDT"  },
      { label: "INJ/USD",    value: "BINANCE:INJUSDT"  },
      { label: "MASK/USD",   value: "BINANCE:MASKUSDT" },
      { label: "ANKR/USD",   value: "BINANCE:ANKRUSDT" },
      { label: "SC/USD",     value: "BINANCE:SCUSDT"   },
      { label: "NKN/USD",    value: "BINANCE:NKNUSDT"  },
      { label: "AUCTION/USD",value: "BINANCE:AUCTIONUSDT"},
      { label: "ACH/USD",    value: "COINBASE:ACHUSD"  },
      { label: "CLV/USD",    value: "COINBASE:CLVUSD"  },
      { label: "OXT/USD",    value: "COINBASE:OXTUSD"  },
    ],
  },
  {
    group: "Energy",
    items: [
      { label: "WTI Oil",   value: "NYMEX:CL1!"        },
      { label: "Brent Oil", value: "ICEEUR:B1!"         },
      { label: "Nat. Gas",  value: "NYMEX:NG1!"         },
      { label: "RBOB Gas",  value: "NYMEX:RB1!"         },
      { label: "Heating Oil",value: "NYMEX:HO1!"        },
    ],
  },
  {
    group: "Agricultural",
    items: [
      { label: "Corn",        value: "CBOT:ZC1!"  },
      { label: "Wheat",       value: "CBOT:ZW1!"  },
      { label: "Soybeans",    value: "CBOT:ZS1!"  },
      { label: "Soy Oil",     value: "CBOT:ZL1!"  },
      { label: "Soy Meal",    value: "CBOT:ZM1!"  },
      { label: "Sugar",       value: "ICEUS:SB1!" },
      { label: "Coffee",      value: "ICEUS:KC1!" },
      { label: "Cocoa",       value: "ICEUS:CC1!" },
      { label: "Cotton",      value: "ICEUS:CT1!" },
      { label: "Orange Juice",value: "ICEUS:OJ1!" },
      { label: "Lumber",      value: "CME:LBS1!"  },
    ],
  },
  {
    group: "Metals & Minerals",
    items: [
      { label: "Copper",   value: "COMEX:HG1!"  },
      { label: "Iron Ore", value: "SGX:FEF1!"   },
      { label: "Nickel",   value: "LME:NI1!"    },
      { label: "Zinc",     value: "LME:ZS1!"    },
      { label: "Aluminum", value: "LME:MAL1!"   },
      { label: "Lead",     value: "LME:PB1!"    },
    ],
  },
  {
    group: "Livestock",
    items: [
      { label: "Live Cattle",   value: "CME:LE1!" },
      { label: "Feeder Cattle", value: "CME:GF1!" },
      { label: "Lean Hogs",     value: "CME:HE1!" },
    ],
  },
  {
    group: "US Stocks",
    items: [
      { label: "Apple",        value: "NASDAQ:AAPL"  },
      { label: "Microsoft",    value: "NASDAQ:MSFT"  },
      { label: "NVIDIA",       value: "NASDAQ:NVDA"  },
      { label: "Amazon",       value: "NASDAQ:AMZN"  },
      { label: "Meta",         value: "NASDAQ:META"  },
      { label: "Alphabet",     value: "NASDAQ:GOOGL" },
      { label: "Tesla",        value: "NASDAQ:TSLA"  },
      { label: "Broadcom",     value: "NASDAQ:AVGO"  },
      { label: "Berkshire B",  value: "NYSE:BRK.B"   },
      { label: "JPMorgan",     value: "NYSE:JPM"     },
      { label: "Visa",         value: "NYSE:V"       },
      { label: "UnitedHealth", value: "NYSE:UNH"     },
      { label: "ExxonMobil",   value: "NYSE:XOM"     },
      { label: "Walmart",      value: "NYSE:WMT"     },
      { label: "Johnson&J",    value: "NYSE:JNJ"     },
      { label: "Mastercard",   value: "NYSE:MA"      },
      { label: "Procter&G",    value: "NYSE:PG"      },
      { label: "Bank of Am",   value: "NYSE:BAC"     },
      { label: "Chevron",      value: "NYSE:CVX"     },
      { label: "Home Depot",   value: "NYSE:HD"      },
      { label: "AbbVie",       value: "NYSE:ABBV"    },
      { label: "Salesforce",   value: "NYSE:CRM"     },
      { label: "Netflix",      value: "NASDAQ:NFLX"  },
      { label: "AMD",          value: "NASDAQ:AMD"   },
      { label: "Intel",        value: "NASDAQ:INTC"  },
      { label: "Palantir",     value: "NYSE:PLTR"    },
      { label: "Coinbase",     value: "NASDAQ:COIN"  },
      { label: "MicroStrategy",value: "NASDAQ:MSTR"  },
    ],
  },
  {
    group: "ETFs",
    items: [
      { label: "SPY (S&P 500)", value: "AMEX:SPY"   },
      { label: "QQQ (NASDAQ)",  value: "NASDAQ:QQQ" },
      { label: "DIA (Dow)",     value: "AMEX:DIA"   },
      { label: "IWM (Russell)", value: "AMEX:IWM"   },
      { label: "GLD (Gold)",    value: "AMEX:GLD"   },
      { label: "SLV (Silver)",  value: "AMEX:SLV"   },
      { label: "USO (Oil)",     value: "AMEX:USO"   },
      { label: "GDX (Gold Miners)", value: "AMEX:GDX" },
      { label: "ARKK",          value: "AMEX:ARKK"  },
      { label: "TLT (20Y Bond)",value: "NASDAQ:TLT" },
      { label: "HYG (Hi-Yield)",value: "AMEX:HYG"   },
      { label: "EEM (Emerging)",value: "AMEX:EEM"   },
    ],
  },
];

const ALL_SYMBOLS = QUICK_SYMBOLS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.group }))
);

function getLabel(tvSymbol: string) {
  const found = ALL_SYMBOLS.find((entry) => entry.value === tvSymbol);
  return found ? found.label : tvSymbol.split(":")[1] ?? tvSymbol;
}

function secondsToClose(minutes: number): number {
  const nowMs = Date.now();
  const totalMs = minutes * 60 * 1000;
  return Math.floor((totalMs - (nowMs % totalMs)) / 1000);
}

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

let widgetCounter = 0;

export function TradingViewChart({
  symbol: initialSymbol = "OANDA:XAUUSD",
  heightClass = "h-[400px]",
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeSymbol, setActiveSymbol] = useState(initialSymbol);
  const [activeInterval, setActiveInterval] = useState(INTERVALS[4]);
  const [secondsLeft, setSecondsLeft] = useState(() => secondsToClose(60));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? ALL_SYMBOLS.filter(
        (entry) =>
          entry.label.toLowerCase().includes(query.toLowerCase()) ||
          entry.value.toLowerCase().includes(query.toLowerCase()) ||
          entry.group.toLowerCase().includes(query.toLowerCase())
      )
    : null;

  const selectSymbol = useCallback((value: string) => {
    setActiveSymbol(value);
    setPickerOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    setActiveSymbol(initialSymbol);
  }, [initialSymbol]);

  useEffect(() => {
    if (!pickerOpen) return;

    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  useEffect(() => {
    setSecondsLeft(secondsToClose(activeInterval.minutes));
    const timerId = setInterval(() => {
      setSecondsLeft(secondsToClose(activeInterval.minutes));
    }, 1000);

    return () => clearInterval(timerId);
  }, [activeInterval.minutes]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let isCancelled = false;
    let widget: any = null;
    const containerId = `tv_widget_${++widgetCounter}`;

    element.innerHTML = "";
    const widgetRoot = document.createElement("div");
    widgetRoot.id = containerId;
    widgetRoot.className = "h-full w-full";
    element.appendChild(widgetRoot);

    function buildWidget() {
      if (isCancelled || !(window as any).TradingView?.widget) return;

      try {
        widget = new (window as any).TradingView.widget({
          container_id: containerId,
          width: "100%",
          height: "100%",
          symbol: activeSymbol,
          interval: activeInterval.value,
          timezone: "America/New_York",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#000000",
          enable_publishing: false,
          hide_top_toolbar: true,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          save_image: false,
          withdateranges: false,
          studies: [],
          disabled_features: [
            "header_fullscreen_button",
            "use_localstorage_for_settings",
            "save_chart_properties_to_local_storage",
            "create_volume_indicator_by_default",
            "create_volume_indicator_by_default_once",
            "timeframes_toolbar",
            "display_market_status",
            "go_to_date",
            "clock_button",
            "border_around_the_chart",
          ],
          enabled_features: [
            "study_templates",
            "side_toolbar_in_fullscreen_mode",
          ],
          backgroundColor: "rgba(0,0,0,1)",
          gridColor: "rgba(0,0,0,0)",
          overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#26a69a",
            "mainSeriesProperties.candleStyle.downColor": "#ef5350",
            "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
            "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
            "paneProperties.background": "#000000",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "rgba(0,0,0,0)",
            "paneProperties.horzGridProperties.color": "rgba(0,0,0,0)",
            "scalesProperties.textColor": "#4b5563",
            "scalesProperties.fontSize": 11,
            "scalesProperties.backgroundColor": "#000000",
            "scalesProperties.lineColor": "rgba(255,255,255,0.04)",
          },
        });
      } catch (error) {
        console.warn("[TradingView] widget constructor failed:", error);
        return;
      }

      if (!widget || typeof widget.onChartReady !== "function") {
        return;
      }

      widget.onChartReady(() => {
        if (isCancelled) return;
        try {
          if (typeof widget.applyOverrides === "function") {
            widget.applyOverrides({
              "paneProperties.background": "#000000",
              "paneProperties.backgroundType": "solid",
              "paneProperties.vertGridProperties.color": "rgba(0,0,0,0)",
              "paneProperties.horzGridProperties.color": "rgba(0,0,0,0)",
              "scalesProperties.backgroundColor": "#000000",
              "scalesProperties.lineColor": "rgba(255,255,255,0.04)",
            });
          }
        } catch {}
      });
    }

    if ((window as any).TradingView?.widget) {
      buildWidget();
    } else {
      const existingScript = document.querySelector('script[src*="tradingview.com/tv.js"]') as HTMLScriptElement | null;

      if (existingScript) {
        const poll = setInterval(() => {
          if ((window as any).TradingView?.widget) {
            clearInterval(poll);
            buildWidget();
          }
        }, 100);

        return () => {
          isCancelled = true;
          clearInterval(poll);

          if (element) {
            element.innerHTML = "";
          }
        };
      }

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = buildWidget;
      script.onerror = () => {
        console.warn("[TradingView] failed to load tv.js");
      };
      document.head.appendChild(script);
    }

    return () => {
      isCancelled = true;

      if (element) {
        element.innerHTML = "";
      }
    };
  }, [activeInterval.value, activeSymbol]);

  const urgent = secondsLeft <= 60;

  return (
    <div className={cn("flex w-full flex-col overflow-hidden", heightClass)}>

      {/* TradeX custom header — symbol picker + timeframes + candle countdown */}
      <div className="flex h-[38px] shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-black px-2.5">
        <div className="flex min-w-0 items-center gap-1.5">

          {/* Symbol picker */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setPickerOpen(v => !v)}
              className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
            >
              <span>{getLabel(activeSymbol)}</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {pickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-[300px] overflow-hidden rounded-lg border border-white/10 bg-[#0d1117] shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search symbol..."
                    className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-gray-600" />
                  {query && <button onClick={() => setQuery("")}><X className="h-3 w-3 text-gray-500 hover:text-white" /></button>}
                </div>
                <div className="max-h-[520px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {filtered ? (
                    filtered.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[11px] text-gray-600">No results</div>
                    ) : (
                      <div className="py-1">
                        {filtered.map(entry => (
                          <button key={entry.value} onClick={() => selectSymbol(entry.value)}
                            className={cn("flex w-full items-center justify-between px-3 py-2 text-[12px] hover:bg-white/5", activeSymbol === entry.value ? "text-[hsl(var(--primary))]" : "text-gray-300")}>
                            <span className="font-medium">{entry.label}</span>
                            <span className="font-mono text-[10px] text-gray-600">{entry.group}</span>
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    QUICK_SYMBOLS.map(group => (
                      <div key={group.group}>
                        <div className="border-b border-white/5 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600">{group.group}</div>
                        {group.items.map(entry => (
                          <button key={entry.value} onClick={() => selectSymbol(entry.value)}
                            className={cn("flex w-full items-center justify-between px-3 py-2 text-[12px] hover:bg-white/5", activeSymbol === entry.value ? "text-[hsl(var(--primary))]" : "text-gray-300")}>
                            <span className="font-medium">{entry.label}</span>
                            <span className="font-mono text-[10px] text-gray-500">{entry.value.split(":")[1]}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mx-0.5 h-4 w-px bg-white/10" />

          {/* Timeframe buttons */}
          <div className="flex items-center gap-0.5">
            {INTERVALS.map(interval => (
              <button key={interval.value} onClick={() => setActiveInterval(interval)}
                className={cn("rounded px-2 py-1 text-[11px] font-semibold transition-all border",
                  activeInterval.value === interval.value
                    ? "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]"
                    : "border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                )}>
                {interval.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candle close countdown */}
        <div className={cn("flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5",
          urgent ? "border-red-500/35 bg-red-500/10" : "border-white/10 bg-white/5")}>
          <Timer className={cn("h-3 w-3", urgent ? "text-red-400" : "text-gray-500")} />
          <span className={cn("font-mono text-xs font-bold tabular-nums", urgent ? "text-red-400" : "text-gray-300")}>
            {formatCountdown(secondsLeft)}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-gray-600">{activeInterval.label} close</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 w-full" style={{ background: "#000000" }} />
    </div>
  );
}
