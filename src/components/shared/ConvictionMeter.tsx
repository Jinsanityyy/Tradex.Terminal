"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ConvictionMeterProps {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function ConvictionMeter({ value, label, size = "md" }: ConvictionMeterProps) {
  const sizes = {
    sm: { container: "h-16 w-16", text: "text-sm", label: "text-[8px]" },
    md: { container: "h-24 w-24", text: "text-xl", label: "text-[10px]" },
    lg: { container: "h-32 w-32", text: "text-2xl", label: "text-xs" },
  };

  const s = sizes[size];
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? "hsl(142,71%,45%)" : value >= 40 ? "hsl(38,92%,50%)" : "hsl(0,84%,60%)";

  return (
    <div className={cn("relative inline-flex items-center justify-center", s.container)}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(220,14%,12%)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="text-center z-10">
        <span className={cn("font-bold font-mono text-[hsl(var(--foreground))]", s.text)}>{value}</span>
        {label && (
          <span className={cn("block uppercase tracking-wider text-[hsl(var(--muted-foreground))]", s.label)}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
