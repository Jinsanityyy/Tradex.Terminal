import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cache 5 minutes
let cache: { data: GlobePayload; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export interface LiveMarker {
  id: string;
  layer: "conflict" | "centralBanks" | "economicEvents" | "goldRegions";
  name: string;
  lat: number;
  lon: number;
  desc: string;
  impact: { xauusd: string; eurusd: string; gbpusd: string };
  eventTime?: string;
  actual?: string;
  estimate?: string;
  prev?: string;
  source?: string;
  isLive: boolean;
}

export interface GlobePayload {
  markers: LiveMarker[];
  fetchedAt: string;
}

// ─── Country → base location ──────────────────────────────────────────────────
const COUNTRY_LOC: Record<string, { lat: number; lon: number; label: string }> = {
  US: { lat: 38.9,  lon: -77.0,  label: "United States"  },
  EU: { lat: 50.1,  lon:  8.7,   label: "Eurozone"       },
  GB: { lat: 51.5,  lon: -0.1,   label: "United Kingdom" },
  JP: { lat: 35.7,  lon: 139.7,  label: "Japan"          },
  CN: { lat: 39.9,  lon: 116.4,  label: "China"          },
  CA: { lat: 45.4,  lon: -75.7,  label: "Canada"         },
  AU: { lat: -33.9, lon: 151.2,  label: "Australia"      },
  NZ: { lat: -36.8, lon: 174.8,  label: "New Zealand"    },
  CH: { lat: 46.9,  lon:  7.4,   label: "Switzerland"    },
  DE: { lat: 52.5,  lon: 13.4,   label: "Germany"        },
  FR: { lat: 48.85, lon:  2.35,  label: "France"         },
  IN: { lat: 28.6,  lon: 77.2,   label: "India"          },
  BR: { lat: -15.8, lon: -47.9,  label: "Brazil"         },
  ZA: { lat: -25.7, lon: 28.2,   label: "South Africa"   },
  RU: { lat: 55.75, lon: 37.6,   label: "Russia"         },
  KR: { lat: 37.6,  lon: 126.9,  label: "South Korea"    },
  MX: { lat: 19.4,  lon: -99.1,  label: "Mexico"         },
};

// Events that belong to centralBanks layer
const CB_KEYWORDS = [
  "rate", "fomc", "boe", "ecb", "rba", "boj", "snb", "boc", "rbnz",
  "federal reserve", "central bank", "monetary policy", "interest",
  "bank of england", "bank of japan", "bank of canada",
];

// Geopolitical keyword → conflict zone
const GEO_ZONES: Array<{
  keywords: string[];
  marker: Omit<LiveMarker, "id" | "isLive">;
}> = [
  {
    keywords: ["middle east", "israel", "gaza", "iran", "houthi", "lebanon", "red sea", "syria"],
    marker: {
      layer: "conflict", name: "Middle East",
      lat: 32, lon: 35,
      desc: "Active geopolitical risk — conflict & shipping lane disruption",
      impact: { xauusd: "+2.1%", eurusd: "-0.3%", gbpusd: "-0.2%" },
    },
  },
  {
    keywords: ["russia", "ukraine", "nato", "eastern europe", "kharkiv", "kyiv", "zelenskyy", "putin"],
    marker: {
      layer: "conflict", name: "Eastern Europe",
      lat: 49, lon: 32,
      desc: "Russia-Ukraine conflict — energy & grain supply disruption",
      impact: { xauusd: "+1.6%", eurusd: "-1.1%", gbpusd: "-0.7%" },
    },
  },
  {
    keywords: ["china", "taiwan", "south china sea", "pla", "xi jinping", "beijing"],
    marker: {
      layer: "conflict", name: "China / Taiwan Strait",
      lat: 25, lon: 121,
      desc: "Cross-strait tension — semiconductor & shipping risk",
      impact: { xauusd: "+1.4%", eurusd: "-0.4%", gbpusd: "-0.3%" },
    },
  },
  {
    keywords: ["north korea", "kim jong", "dprk", "missile"],
    marker: {
      layer: "conflict", name: "Korean Peninsula",
      lat: 39, lon: 126,
      desc: "DPRK missile activity — regional risk elevation",
      impact: { xauusd: "+0.8%", eurusd: "-0.1%", gbpusd: "-0.1%" },
    },
  },
  {
    keywords: ["sudan", "sahel", "mali", "burkina", "niger", "west africa", "ethiopia"],
    marker: {
      layer: "conflict", name: "Africa Instability Belt",
      lat: 13, lon: 20,
      desc: "Sahel/Horn instability — gold supply chain risk",
      impact: { xauusd: "+0.5%", eurusd: "0.0%", gbpusd: "0.0%" },
    },
  },
];

// Impact percentage lookup for economic events by country + layer
function impactFor(country: string, layer: "centralBanks" | "economicEvents"): LiveMarker["impact"] {
  if (layer === "centralBanks") {
    const cb: Record<string, LiveMarker["impact"]> = {
      US: { xauusd: "±2.0%", eurusd: "±1.5%", gbpusd: "±1.2%" },
      EU: { xauusd: "±1.0%", eurusd: "±2.0%", gbpusd: "±0.6%" },
      GB: { xauusd: "±0.8%", eurusd: "±0.5%", gbpusd: "±1.8%" },
      JP: { xauusd: "±0.9%", eurusd: "±0.4%", gbpusd: "±0.3%" },
      CN: { xauusd: "±1.5%", eurusd: "±0.3%", gbpusd: "±0.2%" },
    };
    return cb[country] ?? { xauusd: "±0.5%", eurusd: "±0.3%", gbpusd: "±0.2%" };
  }
  const eco: Record<string, LiveMarker["impact"]> = {
    US: { xauusd: "±1.8%", eurusd: "±1.2%", gbpusd: "±1.0%" },
    EU: { xauusd: "±0.9%", eurusd: "±2.2%", gbpusd: "±0.5%" },
    GB: { xauusd: "±0.5%", eurusd: "±0.3%", gbpusd: "±1.6%" },
    JP: { xauusd: "±0.6%", eurusd: "±0.2%", gbpusd: "±0.2%" },
    CN: { xauusd: "±1.2%", eurusd: "±0.2%", gbpusd: "±0.2%" },
  };
  return eco[country] ?? { xauusd: "±0.4%", eurusd: "±0.3%", gbpusd: "±0.2%" };
}

function fmtValue(v: number | null | undefined, unit?: string): string {
  if (v == null) return "—";
  const s = v % 1 === 0 ? v.toFixed(0) : v.toFixed(2);
  return unit ? `${s}${unit}` : s;
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const key = process.env.FINNHUB_API_KEY;
  const markers: LiveMarker[] = [];

  if (key) {
    const now   = new Date();
    const from  = now.toISOString().slice(0, 10);
    const toD   = new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10);

    // ── Economic calendar (next 7 days) ───────────────────────────────────
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(
        `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${toD}&token=${key}`,
        { signal: ctrl.signal, cache: "no-store" }
      );
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json() as {
          economicCalendar?: Array<{
            country: string; event: string; impact: string;
            time: string; actual: number | null; estimate: number | null;
            prev: number | null; unit?: string;
          }>;
        };

        const seen = new Set<string>();
        for (const ev of json.economicCalendar ?? []) {
          if (ev.impact !== "high") continue;
          const loc = COUNTRY_LOC[ev.country];
          if (!loc) continue;

          const isCB = CB_KEYWORDS.some((k) => ev.event.toLowerCase().includes(k));
          const layer: LiveMarker["layer"] = isCB ? "centralBanks" : "economicEvents";

          // One marker per country per layer — keep the soonest event
          const key_ = `${ev.country}-${layer}`;
          if (seen.has(key_)) continue;
          seen.add(key_);

          markers.push({
            id: `cal-${ev.country}-${ev.event}-${ev.time}`.replace(/\s+/g, "_"),
            layer,
            name: ev.event,
            lat: loc.lat,
            lon: loc.lon,
            desc: `${loc.label} — ${ev.event}${ev.estimate != null ? ` | Est: ${fmtValue(ev.estimate, ev.unit ?? "")}` : ""}${ev.prev != null ? ` | Prev: ${fmtValue(ev.prev, ev.unit ?? "")}` : ""}`,
            impact: impactFor(ev.country, layer),
            eventTime: ev.time,
            actual:   ev.actual   != null ? fmtValue(ev.actual,   ev.unit) : undefined,
            estimate: ev.estimate != null ? fmtValue(ev.estimate, ev.unit) : undefined,
            prev:     ev.prev     != null ? fmtValue(ev.prev,     ev.unit) : undefined,
            source: "Finnhub Economic Calendar",
            isLive: true,
          });
        }
      }
    } catch { /* timeout or network — fall through */ }

    // ── Geopolitical news scan ─────────────────────────────────────────────
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${key}`,
        { signal: ctrl.signal, cache: "no-store" }
      );
      clearTimeout(timer);

      if (res.ok) {
        const news = await res.json() as Array<{ headline: string; summary?: string; source: string; datetime: number }>;
        const triggered = new Set<string>();

        for (const article of news.slice(0, 60)) {
          const text = `${article.headline} ${article.summary ?? ""}`.toLowerCase();
          for (const zone of GEO_ZONES) {
            const zoneName = zone.marker.name;
            if (triggered.has(zoneName)) continue;
            if (zone.keywords.some((kw) => text.includes(kw))) {
              triggered.add(zoneName);
              markers.push({
                id: `geo-${zoneName.replace(/\s+/g, "_")}-${article.datetime}`,
                ...zone.marker,
                desc: `[LIVE] ${article.headline.slice(0, 100)}`,
                source: article.source,
                isLive: true,
              });
            }
          }
        }
      }
    } catch { /* timeout — fall through */ }
  }

  // ── Static gold regions (these don't need live data) ─────────────────────
  const GOLD_REGIONS: LiveMarker[] = [
    { id: "gld-za",  layer: "goldRegions", name: "South Africa",     lat: -29.0, lon:  25.0, desc: "Witwatersrand belt — world's historically largest producer",   impact: { xauusd: "+0.5%", eurusd: "0.0%", gbpusd: "0.0%" }, isLive: false },
    { id: "gld-au",  layer: "goldRegions", name: "Australia",        lat: -25.0, lon: 133.0, desc: "Kalgoorlie & Pilbara — 2nd largest gold reserves",             impact: { xauusd: "+0.8%", eurusd: "0.0%", gbpusd: "0.0%" }, isLive: false },
    { id: "gld-gh",  layer: "goldRegions", name: "Ghana",            lat:   7.9, lon:  -1.0, desc: "Africa's top current gold producer",                           impact: { xauusd: "+0.3%", eurusd: "0.0%", gbpusd: "0.0%" }, isLive: false },
    { id: "gld-ru",  layer: "goldRegions", name: "Russia",           lat:  62.0, lon:  94.0, desc: "Sanctions impacting supply routes from major producer",         impact: { xauusd: "+1.2%", eurusd: "-0.2%", gbpusd: "-0.1%" }, isLive: false },
    { id: "gld-br",  layer: "goldRegions", name: "Brazil",           lat: -10.0, lon: -55.0, desc: "Growing Amazon basin gold production region",                   impact: { xauusd: "+0.4%", eurusd: "0.0%", gbpusd: "0.0%" }, isLive: false },
    { id: "gld-png", layer: "goldRegions", name: "Papua New Guinea", lat:  -6.0, lon: 147.0, desc: "Pacific gold & copper hub — Ok Tedi, Lihir Island mines",       impact: { xauusd: "+0.3%", eurusd: "0.0%", gbpusd: "0.0%" }, isLive: false },
  ];
  markers.push(...GOLD_REGIONS);

  // If Finnhub had no data (no key or empty calendar), fall back to static conflict + CB
  const hasCB       = markers.some((m) => m.layer === "centralBanks");
  const hasConflict = markers.some((m) => m.layer === "conflict");
  const hasEco      = markers.some((m) => m.layer === "economicEvents");

  if (!hasCB) {
    const STATIC_CB: LiveMarker[] = [
      { id: "cb-fed", layer: "centralBanks", name: "Federal Reserve", lat: 38.9, lon: -77.0, desc: "FOMC rate decisions — primary USD monetary policy anchor",  impact: { xauusd: "±2.0%", eurusd: "±1.5%", gbpusd: "±1.2%" }, isLive: false },
      { id: "cb-boe", layer: "centralBanks", name: "Bank of England",  lat: 51.5, lon: -0.1,  desc: "MPC rate decisions — GBP monetary policy",                 impact: { xauusd: "±0.8%", eurusd: "±0.5%", gbpusd: "±1.8%" }, isLive: false },
      { id: "cb-ecb", layer: "centralBanks", name: "ECB Frankfurt",    lat: 50.1, lon:  8.7,  desc: "Governing council decisions — EUR monetary policy",        impact: { xauusd: "±1.0%", eurusd: "±2.0%", gbpusd: "±0.6%" }, isLive: false },
      { id: "cb-pbo", layer: "centralBanks", name: "PBOC Beijing",     lat: 39.9, lon: 116.4, desc: "CNY policy — major driver of global gold demand",           impact: { xauusd: "±1.5%", eurusd: "±0.3%", gbpusd: "±0.2%" }, isLive: false },
      { id: "cb-boj", layer: "centralBanks", name: "Bank of Japan",    lat: 35.7, lon: 139.7, desc: "YCC policy — global carry trade & risk dynamics",           impact: { xauusd: "±0.9%", eurusd: "±0.4%", gbpusd: "±0.3%" }, isLive: false },
    ];
    markers.push(...STATIC_CB);
  }

  if (!hasConflict) {
    const STATIC_CONFLICT: LiveMarker[] = [
      { id: "cfz-me", layer: "conflict", name: "Middle East",    lat: 32, lon: 35, desc: "Active conflicts — Gaza, Lebanon, regional theaters",         impact: { xauusd: "+2.4%", eurusd: "-0.3%", gbpusd: "-0.2%" }, isLive: false },
      { id: "cfz-eu", layer: "conflict", name: "Eastern Europe", lat: 49, lon: 32, desc: "Russia-Ukraine war — energy & grain supply disruption",       impact: { xauusd: "+1.8%", eurusd: "-1.2%", gbpusd: "-0.8%" }, isLive: false },
      { id: "cfz-ye", layer: "conflict", name: "Yemen",          lat: 15, lon: 48, desc: "Houthi attacks on Red Sea shipping lanes",                   impact: { xauusd: "+1.2%", eurusd: "-0.2%", gbpusd: "-0.3%" }, isLive: false },
    ];
    markers.push(...STATIC_CONFLICT);
  }

  if (!hasEco) {
    const STATIC_ECO: LiveMarker[] = [
      { id: "eco-nfp",  layer: "economicEvents", name: "US NFP",            lat: 40.7, lon: -74.0, desc: "Non-Farm Payrolls — largest USD and gold catalyst",              impact: { xauusd: "±1.8%", eurusd: "±1.2%", gbpusd: "±1.0%" }, isLive: false },
      { id: "eco-ecb",  layer: "economicEvents", name: "ECB Rate Decision", lat: 50.1, lon:  8.9,  desc: "European Central Bank policy statement & press conference",      impact: { xauusd: "±0.9%", eurusd: "±2.2%", gbpusd: "±0.5%" }, isLive: false },
      { id: "eco-pce",  layer: "economicEvents", name: "US Core PCE",       lat: 38.8, lon: -77.3, desc: "Fed's preferred inflation gauge — key for rate path",            impact: { xauusd: "±1.5%", eurusd: "±1.0%", gbpusd: "±0.8%" }, isLive: false },
      { id: "eco-cpi",  layer: "economicEvents", name: "UK CPI",            lat: 51.4, lon: -0.2,  desc: "UK inflation — drives BOE rate expectations",                   impact: { xauusd: "±0.5%", eurusd: "±0.3%", gbpusd: "±1.6%" }, isLive: false },
    ];
    markers.push(...STATIC_ECO);
  }

  const payload: GlobePayload = { markers, fetchedAt: new Date().toISOString() };
  cache = { data: payload, ts: Date.now() };

  return NextResponse.json(payload);
}
