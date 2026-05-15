"use client";

import { CUSTOM_NOTIFICATION_EVENT, type Notif } from "@/hooks/useNotifications";

const SAMPLES: Notif[] = [
  {
    id: "test-news",
    type: "news",
    title: "High Impact Event",
    body: "US CPI data came in hotter than expected at 3.6% YoY vs 3.2% forecast — bond yields spike.",
    timestamp: Date.now(),
  },
  {
    id: "test-trump",
    type: "trump",
    title: "Trump Post",
    body: "We are going to put a 50% Tariff on the European Union, starting June 1st.",
    timestamp: Date.now(),
  },
  {
    id: "test-signal-entry",
    type: "signal",
    title: "Entry Zone Reached",
    body: "XAUUSD — LONG entry at 3285.00. Setup valid.",
    timestamp: Date.now(),
  },
  {
    id: "test-signal-tp",
    type: "signal",
    title: "TP1 Hit",
    body: "XAUUSD LONG — +2.4R",
    timestamp: Date.now(),
  },
  {
    id: "test-signal-sl",
    type: "signal",
    title: "Stop Loss Hit",
    body: "EURUSD SHORT — -1R",
    timestamp: Date.now(),
  },
  {
    id: "test-signal-invalid",
    type: "signal",
    title: "Setup Invalidated",
    body: "GBPUSD LONG — price moved beyond setup range",
    timestamp: Date.now(),
  },
];

let sampleIndex = 0;

function fire() {
  const notif: Notif = {
    ...SAMPLES[sampleIndex % SAMPLES.length],
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  sampleIndex++;
  window.dispatchEvent(new CustomEvent(CUSTOM_NOTIFICATION_EVENT, { detail: notif }));
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
      title="Fire test notification"
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: "#22c55e" }}
      />
      TEST ALERT
    </button>
  );
}
