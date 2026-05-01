"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { type Layout, type LayoutItem } from "react-grid-layout";
import { Plus, RotateCcw } from "lucide-react";
import { WidgetCard } from "./WidgetCard";

export interface WidgetDef {
  id: string;
  title: string;
  content: ReactNode;
  headerRight?: ReactNode;
  className?: string;
}

const COLS = 24;
const MARGIN: [number, number] = [6, 6];
const PADDING: [number, number] = [6, 6];
const TOTAL_ROWS = 24;
const STORAGE_KEY = "tradex-dashboard-grid-v3";

const DEFAULT_LAYOUT: Layout = [
  { i: "chart", x: 0, y: 0, w: 10, h: 14, minW: 8, minH: 14 },
  { i: "trump", x: 10, y: 0, w: 5, h: 5, minW: 4, minH: 3 },
  { i: "globe", x: 19, y: 0, w: 5, h: 7, minW: 4, minH: 5 },
  { i: "mtf", x: 10, y: 5, w: 5, h: 4, minW: 4, minH: 3 },
  { i: "catalysts", x: 10, y: 9, w: 5, h: 5, minW: 4, minH: 4 },
  { i: "community", x: 0, y: 14, w: 10, h: 6, minW: 6, minH: 5 },
  { i: "events", x: 0, y: 20, w: 5, h: 4, minW: 4, minH: 3 },
  { i: "sessions", x: 5, y: 20, w: 5, h: 4, minW: 4, minH: 3 },
];

interface SavedGridState {
  layout: Layout;
  collapsed: Record<string, boolean>;
  hidden: Record<string, boolean>;
  prevHeights: Record<string, number>;
}

function loadGridState(): SavedGridState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedGridState) : null;
  } catch {
    return null;
  }
}

function saveGridState(state: SavedGridState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence failures.
  }
}

function defaultLayoutFor(id: string): LayoutItem {
  return DEFAULT_LAYOUT.find((item) => item.i === id) ?? {
    i: id,
    x: 0,
    y: TOTAL_ROWS,
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
  };
}

function mergeLayouts(widgetIds: string[], savedLayout?: Layout): Layout {
  const savedMap = new Map((savedLayout ?? []).map((item) => [item.i, item]));

  return widgetIds.map((id, index) => {
    const fallback = defaultLayoutFor(id);
    const saved = savedMap.get(id);

    if (!saved) {
      if (fallback.i !== id) {
        return {
          ...fallback,
          i: id,
          x: (index % 3) * 4,
          y: TOTAL_ROWS + Math.floor(index / 3) * 4,
        };
      }

      return fallback;
    }

    return {
      ...fallback,
      ...saved,
      i: id,
      h: Math.max(saved.h, fallback.minH ?? fallback.h),
      minW: fallback.minW,
      minH: fallback.minH,
    };
  });
}

function layoutOrder(layout: Layout, id: string) {
  const item = layout.find((entry) => entry.i === id);
  return item ? item.y * 100 + item.x : Number.MAX_SAFE_INTEGER;
}

export function DashboardGrid({ widgets }: { widgets: WidgetDef[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const widgetIds = useMemo(() => widgets.map((widget) => widget.id), [widgets]);

  const [mounted, setMounted] = useState(false);
  const [gridWidth, setGridWidth] = useState(1280);
  const [rowHeight, setRowHeight] = useState(38);
  const [layout, setLayout] = useState<Layout>(() => mergeLayouts(widgetIds));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [prevHeights, setPrevHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    const saved = loadGridState();

    if (saved) {
      setLayout(mergeLayouts(widgetIds, saved.layout));
      setCollapsed(saved.collapsed);
      setHidden(saved.hidden);
      setPrevHeights(saved.prevHeights);
    } else {
      setLayout(mergeLayouts(widgetIds));
    }

    setMounted(true);
  }, [widgetIds]);

  useEffect(() => {
    if (!mounted) return;
    saveGridState({ layout, collapsed, hidden, prevHeights });
  }, [collapsed, hidden, layout, mounted, prevHeights]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const updateMetrics = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      const toolbarHeight = toolbarRef.current?.offsetHeight ?? 30;
      const availableHeight =
        height -
        toolbarHeight -
        (TOTAL_ROWS - 1) * MARGIN[1] -
        PADDING[1] * 2;

      setGridWidth(Math.max(width, 640));
      setRowHeight(Math.max(30, Math.floor(availableHeight / TOTAL_ROWS)));
    };

    updateMetrics();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateMetrics);
      return () => window.removeEventListener("resize", updateMetrics);
    }

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const isDesktopGrid = gridWidth >= 1024;

  const orderedVisibleWidgets = [...widgets]
    .filter((widget) => !hidden[widget.id])
    .sort((left, right) => layoutOrder(layout, left.id) - layoutOrder(layout, right.id));

  const hiddenWidgets = widgets.filter((widget) => hidden[widget.id]);
  const visibleLayout = layout.filter((entry) => !hidden[entry.i]);

  const handleCollapse = useCallback(
    (id: string) => {
      const current = collapsed[id] ?? false;
      const fallback = defaultLayoutFor(id);

      if (!current) {
        const currentHeight = layout.find((entry) => entry.i === id)?.h ?? fallback.h;
        setPrevHeights((state) => ({ ...state, [id]: currentHeight }));
        setLayout((state) =>
          state.map((entry) => (entry.i === id ? { ...entry, h: 1, minH: 1 } : entry))
        );
      } else {
        const restoredHeight = prevHeights[id] ?? fallback.h;
        setLayout((state) =>
          state.map((entry) =>
            entry.i === id
              ? { ...entry, h: restoredHeight, minH: fallback.minH }
              : entry
          )
        );
      }

      setCollapsed((state) => ({ ...state, [id]: !current }));
    },
    [collapsed, layout, prevHeights]
  );

  const handleClose = useCallback((id: string) => {
    setHidden((state) => ({ ...state, [id]: true }));
  }, []);

  const handleRestore = useCallback((id: string) => {
    const fallback = defaultLayoutFor(id);
    const restoredHeight = prevHeights[id] ?? fallback.h;

    setHidden((state) => ({ ...state, [id]: false }));
    setCollapsed((state) => ({ ...state, [id]: false }));
    setLayout((state) =>
      state.map((entry) =>
        entry.i === id
          ? { ...entry, h: restoredHeight, minH: fallback.minH }
          : entry
      )
    );
  }, [prevHeights]);

  const handleReset = useCallback(() => {
    setLayout(mergeLayouts(widgetIds));
    setCollapsed({});
    setHidden({});
    setPrevHeights({});
  }, [widgetIds]);

  const handleLayoutChange = useCallback(
    (nextLayout: Layout) => {
      const nextMap = new Map(nextLayout.map((item) => [item.i, item]));

      setLayout((state) =>
        state.map((entry) => {
          const updated = nextMap.get(entry.i);
          if (!updated) return entry;

          const fallback = defaultLayoutFor(entry.i);
          return {
            ...entry,
            ...updated,
            minW: fallback.minW,
            minH: collapsed[entry.i] ? 1 : fallback.minH,
          };
        })
      );
    },
    [collapsed]
  );

  if (!mounted) return null;

  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden">
      <div
        ref={toolbarRef}
        className="flex h-8 shrink-0 items-center gap-2 border-b border-white/[0.05] px-3"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {hiddenWidgets.map((widget) => (
            <button
              key={widget.id}
              type="button"
              onClick={() => handleRestore(widget.id)}
              className="inline-flex items-center gap-1 rounded border border-white/[0.08] px-2 py-0.5 text-[9px] text-zinc-500 transition-colors hover:border-white/15 hover:text-zinc-200"
            >
              <Plus className="h-2.5 w-2.5" />
              {widget.title}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded border border-white/[0.08] px-2 py-0.5 text-[9px] text-zinc-500 transition-colors hover:border-white/15 hover:text-zinc-200"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Reset Layout
        </button>
      </div>

      {isDesktopGrid ? (
        <div className="min-h-0 w-full max-w-none flex-1 overflow-hidden">
          <GridLayout
            className="min-h-full w-full max-w-none"
            layout={visibleLayout}
            width={gridWidth}
            gridConfig={{
              cols: COLS,
              rowHeight,
              margin: MARGIN,
              containerPadding: PADDING,
              maxRows: TOTAL_ROWS,
            }}
            dragConfig={{
              enabled: true,
              handle: ".widget-drag-handle",
            }}
            resizeConfig={{
              enabled: true,
              handles: ["s", "e", "se"],
            }}
            onLayoutChange={handleLayoutChange}
          >
            {orderedVisibleWidgets.map((widget) => (
              <div key={widget.id}>
                <WidgetCard
                  title={widget.title}
                  isCollapsed={collapsed[widget.id] ?? false}
                  onCollapse={() => handleCollapse(widget.id)}
                  onClose={() => handleClose(widget.id)}
                  headerRight={widget.headerRight}
                  className={widget.className}
                >
                  {widget.content}
                </WidgetCard>
              </div>
            ))}
          </GridLayout>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-3">
            {orderedVisibleWidgets.map((widget) => (
              <div key={widget.id} className="min-h-[260px]">
                <WidgetCard
                  title={widget.title}
                  isCollapsed={collapsed[widget.id] ?? false}
                  onCollapse={() => handleCollapse(widget.id)}
                  onClose={() => handleClose(widget.id)}
                  headerRight={widget.headerRight}
                  className={widget.className}
                >
                  {widget.content}
                </WidgetCard>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .react-resizable-handle {
          position: absolute;
          width: 16px;
          height: 16px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .react-grid-item:hover .react-resizable-handle,
        .react-grid-item.react-grid-item-resizing .react-resizable-handle {
          opacity: 1;
        }

        .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-right: 2px solid rgba(255, 255, 255, 0.22);
          border-bottom: 2px solid rgba(255, 255, 255, 0.22);
          border-radius: 1px;
        }

        .react-resizable-handle-s {
          bottom: 0;
          left: 50%;
          cursor: s-resize;
          transform: translateX(-50%);
        }

        .react-resizable-handle-e {
          right: 0;
          top: 50%;
          cursor: e-resize;
          transform: translateY(-50%);
        }

        .react-resizable-handle-se {
          right: 0;
          bottom: 0;
          cursor: se-resize;
        }

        .react-grid-item.react-grid-placeholder {
          border-radius: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.14) !important;
          background: rgba(255, 255, 255, 0.04) !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
