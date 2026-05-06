"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  X, Search, ChevronDown, ChevronRight, BookOpen,
  BarChart2, CandlestickChart, TrendingUp, Activity,
  ShieldCheck, Crosshair, Building2, Brain,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, BarChart2, CandlestickChart, TrendingUp,
  Activity, ShieldCheck, Crosshair, Building2, Brain,
};
import { cn } from "@/lib/utils";
import { TRADING_KNOWLEDGE, KnowledgeCategory, KnowledgeItem } from "@/data/trading-knowledge";

interface TradingKnowledgeSidebarProps {
  open: boolean;
  onClose: () => void;
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[-| ]+\|$/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0]
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      const rows = tableLines.slice(2).map((row) =>
        row
          .split("|")
          .filter((c) => c.trim())
          .map((c) => c.trim())
      );
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-2.5">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    className="text-left py-1.5 px-2 text-[hsl(var(--muted-foreground))] font-semibold uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/30"
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-1.5 px-2 text-[hsl(var(--foreground))]/80">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line === "") {
      i++;
      continue;
    }

    // Heading ##
    if (line.startsWith("## ")) {
      elements.push(
        <p key={`h-${i}`} className="text-[12px] font-bold text-[hsl(var(--foreground))] mt-3 mb-1">
          {line.slice(3)}
        </p>
      );
      i++;
      continue;
    }

    // Bold + body line with **text**
    const parsedLine = parseInline(line);
    elements.push(
      <p key={`p-${i}`} className="text-[12px] text-[hsl(var(--foreground))]/80 leading-relaxed">
        {parsedLine}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[hsl(var(--foreground))]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function ItemCard({ item }: { item: KnowledgeItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[hsl(var(--secondary))]/50 transition-colors"
      >
        <span className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-[hsl(var(--foreground))] leading-tight">
            {item.title}
          </p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-snug">
            {item.summary}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]/40">
          {renderContent(item.content)}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  defaultOpen,
}: {
  category: KnowledgeCategory;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[hsl(var(--secondary))]/60 transition-colors"
      >
        {(() => { const Icon = ICON_MAP[category.icon] ?? BookOpen; return <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />; })()}
        <span className="flex-1 text-left text-[13px] font-semibold text-[hsl(var(--foreground))]">
          {category.label}
        </span>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] mr-1">
          {category.items.length}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
        )}
      </button>

      {open && (
        <div className="mt-1 mb-2 ml-2 space-y-1.5">
          {category.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TradingKnowledgeContent() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const results: Array<{ category: KnowledgeCategory; item: KnowledgeItem }> = [];
    for (const cat of TRADING_KNOWLEDGE) {
      for (const item of cat.items) {
        if (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.includes(q))
        ) {
          results.push({ category: cat, item });
        }
      }
    }
    return results;
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2.5 border-b border-[hsl(var(--border))] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, indicators, patterns…"
            className={cn(
              "w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))]",
              "pl-8 pr-3 py-1.5 text-[12px] text-[hsl(var(--foreground))]",
              "placeholder:text-[hsl(var(--muted-foreground))]",
              "outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]/50 focus:border-[hsl(var(--primary))]/50",
              "transition-colors"
            )}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <Search className="h-8 w-8 text-[hsl(var(--muted-foreground))]/30" />
              <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 px-1">
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest px-2 py-1">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.map(({ category, item }) => (
                <div key={item.id}>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] px-2 mb-1">
                    {(() => { const Icon = ICON_MAP[category.icon] ?? BookOpen; return <><Icon className="inline h-3 w-3 mr-1 text-zinc-500" />{category.label}</>; })()}
                  </p>
                  <ItemCard item={item} />
                </div>
              ))}
            </div>
          )
        ) : (
          TRADING_KNOWLEDGE.map((cat, idx) => (
            <CategorySection key={cat.id} category={cat} defaultOpen={idx === 0} />
          ))
        )}
      </div>
    </div>
  );
}

export function TradingKnowledgeSidebar({ open, onClose }: TradingKnowledgeSidebarProps) {
  const totalTopics = TRADING_KNOWLEDGE.reduce((n, c) => n + c.items.length, 0);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-[50] flex h-screen w-[360px] max-w-[calc(100vw-60px)] flex-col",
          "border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[hsl(var(--border))] px-4 py-3 shrink-0">
          <BookOpen className="h-4 w-4 text-[hsl(var(--primary))]" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[hsl(var(--foreground))] leading-tight">
              Trading Knowledge
            </p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {totalTopics} topics · Basics to Advanced
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <TradingKnowledgeContent />
        </div>

        {/* Footer */}
        <div className="border-t border-[hsl(var(--border))] px-4 py-2.5 shrink-0">
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] text-center">
            {TRADING_KNOWLEDGE.length} categories · Basics → SMC → Psychology
          </p>
        </div>
      </aside>
    </>
  );
}
