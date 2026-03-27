"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Newspaper, ExternalLink } from "lucide-react";
import type { NewsItem } from "@/types";

interface NewsFeedProps {
  items: NewsItem[];
  limit?: number;
  compact?: boolean;
}

export function NewsFeed({ items, limit, compact = false }: NewsFeedProps) {
  const displayed = limit ? items.slice(0, limit) : items;

  return (
    <div className="space-y-1.5">
      {displayed.map((item) => (
        <div
          key={item.id}
          className={cn(
            "group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-colors hover:bg-[hsl(var(--secondary))]",
            item.impactScore >= 8 && "border-amber-500/20"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] leading-tight mb-1">
                {item.headline}
              </h4>
              {!compact && (
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-1.5 line-clamp-2">
                  {item.summary}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={item.sentiment}>{item.sentiment}</Badge>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                  {item.category}
                </span>
                {item.affectedAssets.slice(0, 3).map((a) => (
                  <span key={a} className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{a}</span>
                ))}
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-auto shrink-0">
                  {item.source} · {timeAgo(item.timestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
