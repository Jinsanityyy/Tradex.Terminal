"use client";

import React from "react";
import { Brain } from "lucide-react";
import type { TradeContext } from "@/types";

interface TradeContextBoxProps {
  context: TradeContext;
}

export function TradeContextBox({ context }: TradeContextBoxProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Brain className="h-3 w-3 text-zinc-500" />
        <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold">AI Context</span>
      </div>

      {/* Directional lean  -  most important */}
      <p className="text-[11px] text-[hsl(var(--primary))] leading-snug font-medium">
        {context.directionalLean}
      </p>

      {/* Top caution factor only */}
      {context.cautionFactors?.[0] && (
        <p className="text-[10px] text-zinc-500 leading-snug border-l border-amber-500/30 pl-2">
          {context.cautionFactors[0]}
        </p>
      )}
    </div>
  );
}
