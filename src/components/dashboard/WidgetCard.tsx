"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  isCollapsed: boolean;
  onCollapse: () => void;
  onClose: () => void;
  headerRight?: ReactNode;
  className?: string;
}

export function WidgetCard({
  title,
  children,
  isCollapsed,
  onCollapse,
  onClose,
  headerRight,
  className,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-[hsl(var(--card))]",
        className
      )}
    >
      <div className="widget-drag-handle flex h-7 shrink-0 cursor-grab select-none items-center gap-2 border-b border-white/[0.05] bg-[hsl(var(--secondary))]/80 px-2.5 active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
        <span className="min-w-0 flex-1 truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
          {title}
        </span>

        {headerRight ? (
          <div className="flex shrink-0 items-center gap-1" onMouseDown={(event) => event.stopPropagation()}>
            {headerRight}
          </div>
        ) : null}

        <button
          type="button"
          title={isCollapsed ? "Expand widget" : "Collapse widget"}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onCollapse}
          className="rounded p-0.5 text-zinc-600 transition-colors hover:text-zinc-300"
        >
          {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <button
          type="button"
          title="Hide widget"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onClose}
          className="rounded p-0.5 text-zinc-600 transition-colors hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {!isCollapsed ? <div className="min-h-0 flex-1 overflow-hidden">{children}</div> : null}
    </div>
  );
}
