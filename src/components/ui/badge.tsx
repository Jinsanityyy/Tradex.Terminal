import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bullish" | "bearish" | "neutral" | "outline" | "high" | "medium" | "low";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]",
    bullish: "badge-bullish",
    bearish: "badge-bearish",
    neutral: "badge-neutral",
    outline: "border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
    high: "bg-red-500/10 border border-red-500/20 text-red-400",
    medium: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
    low: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
