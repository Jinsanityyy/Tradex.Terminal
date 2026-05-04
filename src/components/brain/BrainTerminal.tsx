"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { AgentCommandRoom } from "./AgentCommandRoom";
import { useQuotes } from "@/hooks/useMarketData";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BrainTerminal() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("H1");
  const [now, setNow] = useState(Date.now());

  const { data } = useSWR(`/api/agents/run?symbol=${symbol}&timeframe=${timeframe}`, fetcher);

  const { quotes } = useQuotes(60000);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!data) return null;

  const action = data.agents.execution.signalState === "ARMED" ? "EXECUTE" : "PREPARE";
  const bias = data.agents.trend.bias.toUpperCase();

  const price = quotes?.find(q => q.symbol === "XAU/USD")?.price;

  const plan = data.agents.master.tradePlan;

  return (
    <div className="w-full space-y-4">

      {/* TOP GRID */}
      <div className="grid xl:grid-cols-[0.7fr_1.3fr] gap-4">

        {/* LEFT: BRAIN OUTPUT */}
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4">

          <div className="text-[10px] text-zinc-500">BRAIN OUTPUT</div>

          <div className="mt-2 text-[26px] font-semibold text-emerald-300">
            {action} {data.agents.master.finalBias === "bearish" ? "SHORT" : "LONG"}
          </div>

          <div className="mt-2 text-[12px] text-zinc-400">
            {data.agents.execution.triggerCondition}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">

            <div className="bg-black/30 p-2 rounded border border-white/10">
              <div className="text-zinc-500 text-[9px]">BIAS</div>
              <div>{bias}</div>
            </div>

            <div className="bg-black/30 p-2 rounded border border-white/10">
              <div className="text-zinc-500 text-[9px]">RISK</div>
              <div>{data.agents.risk.valid ? "OPEN" : "BLOCKED"}</div>
            </div>

            <div className="bg-black/30 p-2 rounded border border-white/10">
              <div className="text-zinc-500 text-[9px]">CONFIDENCE</div>
              <div>{data.agents.master.confidence}%</div>
            </div>

            <div className="bg-black/30 p-2 rounded border border-white/10">
              <div className="text-zinc-500 text-[9px]">PRICE</div>
              <div>{price ?? "--"}</div>
            </div>

          </div>
        </div>

        {/* RIGHT: WAR ROOM */}
        <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-cyan-500/20">

          {/* BACKGROUND (FULL FRAME) */}
          <div className="absolute inset-0">
            <AgentCommandRoom data={data} />
          </div>

          {/* GLASS */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />

          {/* TOP LEFT */}
          <div className="absolute top-3 left-4 text-cyan-200 text-[10px] font-mono tracking-widest">
            X TRADEX
          </div>

          {/* TOP RIGHT HUD */}
          <div className="absolute top-3 right-4 flex gap-3 bg-black/30 px-3 py-1 rounded border border-white/10 text-[10px] font-mono">

            <span>{symbol}</span>
            <span className="text-emerald-300">{bias}</span>
            <span>{action}</span>
            <span>{data.agents.master.confidence}%</span>

          </div>

          {/* BOTTOM HUD */}
          <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2 text-[10px]">

            <div className="bg-black/30 p-2 border border-white/10 rounded">
              <div className="text-zinc-500 text-[8px]">CANDLE</div>
              <div>{data.agents.smc.bias.toUpperCase()}</div>
            </div>

            <div className="bg-black/30 p-2 border border-white/10 rounded">
              <div className="text-zinc-500 text-[8px]">REJECTION</div>
              <div>{data.agents.smc.liquiditySweepDetected ? "VALID" : "WAIT"}</div>
            </div>

            <div className="bg-black/30 p-2 border border-white/10 rounded">
              <div className="text-zinc-500 text-[8px]">PRICE</div>
              <div className="text-emerald-300">{price ?? "--"}</div>
            </div>

          </div>

        </div>
      </div>

      {/* EXECUTION PANEL */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">

        <div className="text-[10px] text-zinc-500 mb-3">EXECUTION</div>

        <div className="grid md:grid-cols-4 gap-3">

          <div className="border border-emerald-400/20 bg-emerald-400/5 p-3 rounded">
            <div className="text-[9px] text-zinc-500">ENTRY</div>
            <div className="text-emerald-300 font-mono text-[16px]">
              {plan?.entry ?? "--"}
            </div>
          </div>

          <div className="border border-red-400/20 bg-red-400/5 p-3 rounded">
            <div className="text-[9px] text-zinc-500">SL</div>
            <div className="text-red-300 font-mono text-[16px]">
              {plan?.stopLoss ?? "--"}
            </div>
          </div>

          <div className="border border-cyan-400/20 bg-cyan-400/5 p-3 rounded">
            <div className="text-[9px] text-zinc-500">TP1</div>
            <div className="text-cyan-300 font-mono text-[16px]">
              {plan?.tp1 ?? "--"}
            </div>
          </div>

          <div className="border border-cyan-400/20 bg-cyan-400/5 p-3 rounded">
            <div className="text-[9px] text-zinc-500">TP2</div>
            <div className="text-cyan-300 font-mono text-[16px]">
              {plan?.tp2 ?? "--"}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
