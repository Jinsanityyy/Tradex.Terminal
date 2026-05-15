"use client";

import { CUSTOM_NOTIFICATION_EVENT, type Notif } from "@/hooks/useNotifications";

const SAMPLES: Omit<Notif, "id" | "timestamp">[] = [
  {
    type: "news",
    severity: "high",
    title: "High Impact Event",
    body: "US CPI data came in hotter than expected at 3.6% YoY vs 3.2% forecast — bond yields spike +18bps.",
    chartLink: "/dashboard/economic-calendar",
  },
  {
    type: "news",
    severity: "medium",
    title: "Medium Impact Event",
    body: "Fed's Waller: 2 rate cuts still possible in 2025 if inflation data cooperates.",
  },
  {
    type: "trump",
    severity: "high",
    title: "Trump Post",
    body: "We are going to put a 50% Tariff on the European Union, starting June 1st. No exceptions.",
    chartLink: "/dashboard/trump-monitor",
  },
  {
    type: "signal",
    severity: "high",
    title: "Entry Zone Reached",
    body: "XAUUSD — LONG entry at 3285.00. Setup valid.",
    chartLink: "/dashboard/signals",
  },
  {
    type: "signal",
    severity: "high",
    title: "TP1 Hit",
    body: "XAUUSD LONG — +2.4R",
  },
  {
    type: "signal",
    severity: "low",
    title: "Setup Invalidated",
    body: "GBPUSD LONG — price moved beyond setup range",
  },
];

let idx = 0;

function fire() {
  const sample = SAMPLES[idx % SAMPLES.length];
  idx++;
  window.dispatchEvent(new CustomEvent(CUSTOM_NOTIFICATION_EVENT, {
    detail: { ...sample, id: crypto.randomUUID(), timestamp: Date.now() } satisfies Notif,
  }));
}

export function TestAlertButton() {
  return (
    <button
      onClick={fire}
      className="fixed bottom-6 right-6 z-[9000] flex items-center gap-2 px-3 py-2 text-[10px] font-mono tracking-widest uppercase transition-all hover:opacity-80 active:scale-95"
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 4,
        color: "rgba(255,255,255,0.4)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
      }}
      title={`Fire test alert (${idx % SAMPLES.length + 1}/${SAMPLES.length})`}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
      TEST ALERT
    </button>
  );
}
