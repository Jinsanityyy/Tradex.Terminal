import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function getChangeColor(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-muted-foreground";
}

export function getBiasColor(bias: string): string {
  switch (bias) {
    case "bullish": return "text-positive";
    case "bearish": return "text-negative";
    case "neutral": return "text-neutral-accent";
    default: return "text-muted-foreground";
  }
}

export function getBiasBadgeClass(bias: string): string {
  switch (bias) {
    case "bullish": return "badge-bullish";
    case "bearish": return "badge-bearish";
    case "neutral": return "badge-neutral";
    default: return "badge-neutral";
  }
}

export function getImpactColor(impact: string): string {
  switch (impact) {
    case "high": return "text-red-400";
    case "medium": return "text-amber-400";
    case "low": return "text-blue-400";
    default: return "text-muted-foreground";
  }
}

export function getImpactBg(impact: string): string {
  switch (impact) {
    case "high": return "bg-red-500/10 border-red-500/20 text-red-400";
    case "medium": return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    case "low": return "bg-blue-500/10 border-blue-500/20 text-blue-400";
    default: return "bg-muted/50 text-muted-foreground";
  }
}

export function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function getCurrentSession(): string {
  const utcHour = new Date().getUTCHours();
  if (utcHour >= 0 && utcHour < 8) return "Asia";
  if (utcHour >= 8 && utcHour < 13) return "London";
  if (utcHour >= 13 && utcHour < 21) return "New York";
  return "Asia";
}
