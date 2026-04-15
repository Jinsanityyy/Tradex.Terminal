"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ShieldAlert, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface InvalidationPanelProps {
  supports: string[];
  invalidations: string[];
  loading?: boolean;
}

export function InvalidationPanel({ supports, invalidations, loading }: InvalidationPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="rounded-xl border border-white/6 bg-[#111]/60 p-4 animate-pulse space-y-2">
            <div className="h-4 w-24 bg-white/8 rounded" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-8 w-full bg-white/5 rounded" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Supports */}
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            What Supports the Bias
          </span>
        </div>
        <div className="space-y-2">
          {supports.length === 0 ? (
            <p className="text-[11px] text-zinc-500">No strong support signals identified</p>
          ) : (
            supports.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <p className="text-[11px] text-zinc-300 leading-relaxed">{s}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invalidations */}
      <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            What Could Invalidate
          </span>
        </div>
        <div className="space-y-2">
          {invalidations.length === 0 ? (
            <p className="text-[11px] text-zinc-500">No invalidation conditions identified</p>
          ) : (
            invalidations.map((inv, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-zinc-300 leading-relaxed">{inv}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
