"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ctrl/⌘+K (or "/") command bar, Bloomberg style: every screen and action has
 * a short function code. Type the code and Enter to jump straight there, or
 * type words to search. Anything else searches the economic-calendar archive.
 */

type Command = {
  code: string;
  label: string;
  group: "Screens" | "Actions" | "Help";
  href: string;
  keywords?: string;
  newTab?: boolean;
};

const COMMANDS: Command[] = [
  { code: "HOME", label: "Dashboard",                 group: "Screens", href: "/dashboard",                          keywords: "home terminal overview" },
  { code: "BIAS", label: "Market Direction",          group: "Screens", href: "/dashboard/market-bias",              keywords: "bias trend direction xau gold" },
  { code: "XA",   label: "Cross-Asset",               group: "Screens", href: "/dashboard/asset-matrix",             keywords: "matrix quotes prices dxy spx oil" },
  { code: "SESS", label: "Trading Sessions",          group: "Screens", href: "/dashboard/session-intelligence",     keywords: "london new york tokyo sydney" },
  { code: "INSI", label: "Insights",                  group: "Screens", href: "/dashboard/market-intelligence",      keywords: "intelligence ai" },
  { code: "MACR", label: "Macro Events",              group: "Screens", href: "/dashboard/catalysts",                keywords: "catalysts" },
  { code: "TRMP", label: "Trump Monitor",             group: "Screens", href: "/dashboard/trump-monitor",            keywords: "truth social tariffs" },
  { code: "NEWS", label: "News Feed",                 group: "Screens", href: "/dashboard/news-flow",                keywords: "headlines" },
  { code: "CAL",  label: "Economic Calendar",         group: "Screens", href: "/dashboard/economic-calendar",        keywords: "events cpi nfp fomc" },
  { code: "READ", label: "Read History",              group: "Screens", href: "/dashboard/signals",                  keywords: "signals outcomes" },
  { code: "PNL",  label: "P&L Calendar",              group: "Screens", href: "/dashboard/pnl-calendar",             keywords: "journal trades profit" },
  { code: "ANLY", label: "P&L Analytics",             group: "Screens", href: "/dashboard/pnl-calendar?tab=analytics", keywords: "stats win rate drawdown setup" },
  { code: "CNDL", label: "Candle Analysis",           group: "Screens", href: "/dashboard/candle-analysis",          keywords: "chart" },
  { code: "FLOR", label: "Trading Floor",             group: "Screens", href: "/dashboard/brain",                    keywords: "agents 7-agent brain" },
  { code: "TV",   label: "Live Feed",                 group: "Screens", href: "/dashboard/live-tv",                  keywords: "bloomberg tv youtube" },
  { code: "SET",  label: "Settings",                  group: "Screens", href: "/dashboard/settings",                 keywords: "account license password" },
  { code: "LOG",  label: "Log a trade",               group: "Actions", href: "/dashboard/pnl-calendar?action=log",  keywords: "manual add trade journal" },
  { code: "MT5",  label: "Connect MT5",               group: "Actions", href: "/dashboard/pnl-calendar?action=connect-mt5", keywords: "metatrader ea auto journal" },
  { code: "RISK", label: "Set Risk Guard limits",     group: "Actions", href: "/dashboard/pnl-calendar?action=rules", keywords: "daily loss prop firm drawdown ftmo" },
  { code: "FOMC", label: "Past FOMC decisions",       group: "Actions", href: "/dashboard/economic-calendar?q=FOMC", keywords: "fed rate" },
  { code: "CPI",  label: "Past CPI releases",         group: "Actions", href: "/dashboard/economic-calendar?q=CPI",  keywords: "inflation" },
  { code: "NFP",  label: "Past payrolls releases",    group: "Actions", href: "/dashboard/economic-calendar?q=NFP",  keywords: "jobs payrolls" },
  { code: "GUIDE", label: "MT5 setup guide",          group: "Help",    href: "/guides/mt5.html",                    keywords: "help ea install", newTab: true },
];

function score(c: Command, q: string): number {
  if (!q) return 1;
  const code = c.code.toLowerCase();
  if (code === q) return 100;
  if (code.startsWith(q)) return 60;
  const hay = `${c.label} ${c.keywords ?? ""}`.toLowerCase();
  if (hay.startsWith(q)) return 40;
  if (hay.includes(q)) return 20;
  // every word of the query appears somewhere
  return q.split(/\s+/).every(w => hay.includes(w) || code.includes(w)) ? 10 : 0;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement &&
        (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("tradex:command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("tradex:command-palette", onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    const ranked = COMMANDS.map(c => ({ c, s: score(c, query) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.c);
    // Nothing matched: offer the calendar archive, which knows every past release.
    if (query && ranked.length === 0) {
      ranked.push({
        code: "↵", label: `Search past releases for "${q.trim()}"`, group: "Actions",
        href: `/dashboard/economic-calendar?q=${encodeURIComponent(q.trim())}`,
      });
    }
    return ranked;
  }, [query, q]);

  useEffect(() => { setActive(0); }, [query]);

  function run(c: Command | undefined) {
    if (!c) return;
    setOpen(false);
    if (c.newTab) window.open(c.href, "_blank", "noopener,noreferrer");
    // A full load for deep links, so the target page reads its ?action= on mount
    // even when it is the page already open.
    else if (c.href.includes("?")) window.location.assign(c.href);
    else router.push(c.href);
  }

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 backdrop-blur-[2px] p-4 pt-[12vh]"
      onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[hsl(var(--card))] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); run(results[active]); }
              else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Type a function code (PNL, CAL, FOMC…) or search"
            className="h-12 flex-1 bg-transparent font-mono text-sm uppercase tracking-wide text-[hsl(var(--foreground))] placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-600 outline-none"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? (lastGroup = c.group) : null;
            return (
              <React.Fragment key={`${c.code}-${c.href}`}>
                {header && !query && (
                  <p className="px-4 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">{header}</p>
                )}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                  className={cn("flex w-full items-center gap-3 px-4 py-2 text-left",
                    i === active ? "bg-[hsl(var(--primary))]/12" : "hover:bg-white/5")}>
                  <span className={cn("w-12 shrink-0 font-mono text-[11px] font-bold",
                    i === active ? "text-[hsl(var(--primary))]" : "text-amber-500/70")}>{c.code}</span>
                  <span className="flex-1 truncate text-[13px] text-zinc-200">{c.label}</span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-zinc-500" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 font-mono text-[10px] text-zinc-600">
          <span><kbd className="text-zinc-400">↑↓</kbd> move</span>
          <span><kbd className="text-zinc-400">↵</kbd> go</span>
          <span><kbd className="text-zinc-400">/</kbd> or <kbd className="text-zinc-400">Ctrl K</kbd> open anywhere</span>
        </div>
      </div>
    </div>
  );
}
