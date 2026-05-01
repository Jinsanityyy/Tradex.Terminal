"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { getCompactor, type Layout, type LayoutItem } from "react-grid-layout";
import { Check, ChevronDown, Plus, RotateCcw, Save } from "lucide-react";
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
const STORAGE_KEY = "tradex-dashboard-grid-v6";

type LayoutPresetId = "pro" | "minimal";

const DEFAULT_PRESET: LayoutPresetId = "pro";

const PRESET_LAYOUTS: Record<LayoutPresetId, Layout> = {
  pro: [
    { i: "chart", x: 0, y: 0, w: 13, h: 14, minW: 8, minH: 14 },
    { i: "globe", x: 13, y: 0, w: 6, h: 7, minW: 4, minH: 5 },
    { i: "trump", x: 19, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
    { i: "mtf", x: 19, y: 4, w: 5, h: 4, minW: 4, minH: 3 },
    { i: "catalysts", x: 13, y: 7, w: 11, h: 7, minW: 6, minH: 4 },
    { i: "community", x: 0, y: 14, w: 13, h: 6, minW: 6, minH: 5 },
    { i: "events", x: 13, y: 14, w: 6, h: 5, minW: 4, minH: 3 },
    { i: "sessions", x: 19, y: 14, w: 5, h: 5, minW: 4, minH: 3 },
    { i: "economic-calendar", x: 0, y: 20, w: 12, h: 4, minW: 6, minH: 4 },
    { i: "pnl-calendar", x: 12, y: 20, w: 12, h: 4, minW: 6, minH: 4 },
  ],
  minimal: [
    { i: "chart", x: 0, y: 0, w: 16, h: 16, minW: 10, minH: 14 },
    { i: "mtf", x: 16, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
    { i: "trump", x: 20, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
    { i: "catalysts", x: 16, y: 4, w: 8, h: 7, minW: 6, minH: 4 },
    { i: "events", x: 16, y: 11, w: 8, h: 5, minW: 4, minH: 3 },
    { i: "sessions", x: 16, y: 16, w: 8, h: 4, minW: 4, minH: 3 },
    { i: "community", x: 0, y: 16, w: 12, h: 4, minW: 6, minH: 4 },
    { i: "globe", x: 12, y: 16, w: 4, h: 4, minW: 4, minH: 4 },
    { i: "economic-calendar", x: 0, y: 20, w: 12, h: 4, minW: 6, minH: 4 },
    { i: "pnl-calendar", x: 12, y: 20, w: 12, h: 4, minW: 6, minH: 4 },
  ],
};

const PRESET_HIDDEN: Record<LayoutPresetId, Record<string, boolean>> = {
  pro: {
    "economic-calendar": true,
    "pnl-calendar": true,
  },
  minimal: {
    community: true,
    globe: true,
    "economic-calendar": true,
    "pnl-calendar": true,
  },
};

const PRESET_LABELS: Record<LayoutPresetId, string> = {
  pro: "Pro Trader",
  minimal: "Minimalist",
};

interface SavedGridState {
  preset: LayoutPresetId;
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

function clearGridState() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore persistence failures.
  }
}

function presetLayoutFor(id: string, preset: LayoutPresetId): LayoutItem {
  return PRESET_LAYOUTS[preset].find((item) => item.i === id) ?? {
    i: id,
    x: 0,
    y: TOTAL_ROWS,
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
  };
}

function normalizeLayoutItem(item: LayoutItem, fallback: LayoutItem): LayoutItem {
  const minW = fallback.minW ?? 1;
  const minH = fallback.minH ?? 1;
  const maxW = Math.min(fallback.maxW ?? COLS, COLS);
  const maxH = Math.min(fallback.maxH ?? TOTAL_ROWS, TOTAL_ROWS);
  const w = Math.max(minW, Math.min(item.w ?? fallback.w, maxW));
  const h = Math.max(minH, Math.min(item.h ?? fallback.h, maxH));
  const x = Math.max(0, Math.min(item.x ?? fallback.x, COLS - w));
  const y = Math.max(0, Math.min(item.y ?? fallback.y, TOTAL_ROWS - h));

  return {
    ...item,
    x,
    y,
    w,
    h,
    minW: fallback.minW,
    minH: fallback.minH,
    maxW: fallback.maxW,
    maxH: fallback.maxH,
  };
}

function mergeLayouts(
  widgetIds: string[],
  savedLayout?: Layout,
  preset: LayoutPresetId = DEFAULT_PRESET
): Layout {
  const savedMap = new Map((savedLayout ?? []).map((item) => [item.i, item]));

  return widgetIds.map((id, index) => {
    const fallback = presetLayoutFor(id, preset);
    const saved = savedMap.get(id);

    if (!saved) {
      if (fallback.i !== id) {
        return normalizeLayoutItem({
          ...fallback,
          i: id,
          x: (index % 3) * 4,
          y: TOTAL_ROWS + Math.floor(index / 3) * 4,
        }, fallback);
      }

      return normalizeLayoutItem(fallback, fallback);
    }

    return normalizeLayoutItem({
      ...fallback,
      ...saved,
      i: id,
      h: Math.max(saved.h, fallback.minH ?? fallback.h),
    }, fallback);
  });
}

function layoutOrder(layout: Layout, id: string) {
  const item = layout.find((entry) => entry.i === id);
  return item ? item.y * 100 + item.x : Number.MAX_SAFE_INTEGER;
}

export function DashboardGrid({ widgets }: { widgets: WidgetDef[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const addWidgetMenuRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const widgetIds = useMemo(() => widgets.map((widget) => widget.id), [widgets]);

  const [mounted, setMounted] = useState(false);
  const [gridWidth, setGridWidth] = useState(1280);
  const [rowHeight, setRowHeight] = useState(38);
  const [selectedPreset, setSelectedPreset] = useState<LayoutPresetId>(DEFAULT_PRESET);
  const [layout, setLayout] = useState<Layout>(() => mergeLayouts(widgetIds, PRESET_LAYOUTS[DEFAULT_PRESET], DEFAULT_PRESET));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [prevHeights, setPrevHeights] = useState<Record<string, number>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveLabel, setSaveLabel] = useState<"save" | "saved">("save");
  const [showAddWidgetMenu, setShowAddWidgetMenu] = useState(false);

  useEffect(() => {
    const saved = loadGridState();

    if (saved) {
      const preset = saved.preset ?? DEFAULT_PRESET;
      setSelectedPreset(preset);
      setLayout(mergeLayouts(widgetIds, saved.layout, preset));
      setCollapsed(saved.collapsed);
      setHidden(saved.hidden);
      setPrevHeights(saved.prevHeights);
    } else {
      setSelectedPreset(DEFAULT_PRESET);
      setLayout(mergeLayouts(widgetIds, PRESET_LAYOUTS[DEFAULT_PRESET], DEFAULT_PRESET));
      setCollapsed({});
      setHidden({ ...PRESET_HIDDEN[DEFAULT_PRESET] });
      setPrevHeights({});
    }

    setHasUnsavedChanges(false);
    setSaveLabel("save");
    setMounted(true);
  }, [widgetIds]);

  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showAddWidgetMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!addWidgetMenuRef.current?.contains(target)) {
        setShowAddWidgetMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showAddWidgetMenu]);

  const isDesktopGrid = gridWidth >= 1024;
  const desktopGridHeight =
    rowHeight * TOTAL_ROWS +
    (TOTAL_ROWS - 1) * MARGIN[1] +
    PADDING[1] * 2;

  const orderedVisibleWidgets = [...widgets]
    .filter((widget) => !hidden[widget.id])
    .sort((left, right) => layoutOrder(layout, left.id) - layoutOrder(layout, right.id));

  const hiddenWidgets = widgets.filter((widget) => hidden[widget.id]);
  const visibleLayout = layout.filter((entry) => !hidden[entry.i]);

  const handleCollapse = useCallback(
    (id: string) => {
      const current = collapsed[id] ?? false;
      const fallback = presetLayoutFor(id, selectedPreset);

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
      setHasUnsavedChanges(true);
      setSaveLabel("save");
    },
    [collapsed, layout, prevHeights, selectedPreset]
  );

  const handleClose = useCallback((id: string) => {
    setHidden((state) => ({ ...state, [id]: true }));
    setHasUnsavedChanges(true);
    setSaveLabel("save");
  }, []);

  const handleRestore = useCallback((id: string) => {
    const fallback = presetLayoutFor(id, selectedPreset);
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
    setHasUnsavedChanges(true);
    setSaveLabel("save");
    setShowAddWidgetMenu(false);
  }, [prevHeights, selectedPreset]);

  const handleReset = useCallback(() => {
    clearGridState();
    setLayout(mergeLayouts(widgetIds, PRESET_LAYOUTS[selectedPreset], selectedPreset));
    setHidden({ ...PRESET_HIDDEN[selectedPreset] });
    setCollapsed({});
    setPrevHeights({});
    setHasUnsavedChanges(false);
    setSaveLabel("save");
    setShowAddWidgetMenu(false);
  }, [selectedPreset, widgetIds]);

  const commitGridLayout = useCallback(
    (nextLayout: Layout) => {
      const nextMap = new Map(nextLayout.map((item) => [item.i, item]));

      setLayout((state) =>
        state.map((entry) => {
          const updated = nextMap.get(entry.i);
          if (!updated) return entry;

          const fallback = presetLayoutFor(entry.i, selectedPreset);
          const effectiveFallback = collapsed[entry.i]
            ? { ...fallback, h: 1, minH: 1 }
            : fallback;

          return normalizeLayoutItem({
            ...entry,
            ...updated,
            minW: fallback.minW,
            minH: collapsed[entry.i] ? 1 : fallback.minH,
          }, effectiveFallback);
        })
      );
      setHasUnsavedChanges(true);
      setSaveLabel("save");
    },
    [collapsed, selectedPreset]
  );

  const applyPreset = useCallback((preset: LayoutPresetId) => {
    setSelectedPreset(preset);
    setLayout(mergeLayouts(widgetIds, PRESET_LAYOUTS[preset], preset));
    setHidden({ ...PRESET_HIDDEN[preset] });
    setCollapsed({});
    setPrevHeights({});
    setHasUnsavedChanges(true);
    setSaveLabel("save");
    setShowAddWidgetMenu(false);
  }, [widgetIds]);

  const handleSaveLayout = useCallback(() => {
    saveGridState({
      preset: selectedPreset,
      layout,
      collapsed,
      hidden,
      prevHeights,
    });
    setHasUnsavedChanges(false);
    setSaveLabel("saved");

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      setSaveLabel("save");
      saveTimerRef.current = null;
    }, 1800);
  }, [collapsed, hidden, layout, prevHeights, selectedPreset]);

  if (!mounted) return null;

  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden">
      <div
        ref={toolbarRef}
        className="flex h-8 shrink-0 items-center gap-2 border-b border-white/[0.05] px-3"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {(Object.keys(PRESET_LABELS) as LayoutPresetId[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] transition-colors ${
                selectedPreset === preset
                  ? "border-white/15 bg-white/[0.06] text-zinc-100"
                  : "border-white/[0.08] text-zinc-500 hover:border-white/15 hover:text-zinc-200"
              }`}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>

        <div ref={addWidgetMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowAddWidgetMenu((state) => !state)}
            disabled={hiddenWidgets.length === 0}
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[9px] transition-colors ${
              hiddenWidgets.length > 0
                ? "border-white/[0.08] text-zinc-300 hover:border-white/15 hover:text-zinc-100"
                : "border-white/[0.08] text-zinc-600"
            }`}
          >
            <Plus className="h-2.5 w-2.5" />
            Add Widget
            <ChevronDown className="h-2.5 w-2.5" />
          </button>

          {showAddWidgetMenu && hiddenWidgets.length > 0 ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-white/[0.08] bg-[#0b0b0d]/95 p-1 shadow-2xl backdrop-blur">
              <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                Available Widgets
              </p>
              <div className="space-y-1">
                {hiddenWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    type="button"
                    onClick={() => handleRestore(widget.id)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                  >
                    <span className="truncate">{widget.title}</span>
                    <Plus className="h-3 w-3 shrink-0 text-zinc-500" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSaveLayout}
          disabled={!hasUnsavedChanges}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded border px-2 py-0.5 text-[9px] transition-colors ${
            hasUnsavedChanges
              ? "border-emerald-500/20 text-emerald-300 hover:border-emerald-500/35"
              : "border-white/[0.08] text-zinc-600"
          }`}
        >
          {saveLabel === "saved" ? <Check className="h-2.5 w-2.5" /> : <Save className="h-2.5 w-2.5" />}
          {saveLabel === "saved" ? "Saved" : "Save Layout"}
        </button>

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
        <div className="relative min-h-0 w-full max-w-none flex-1 overflow-hidden">
          <GridLayout
            className="absolute inset-0 h-full w-full max-w-none"
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
              bounded: true,
              handle: ".widget-drag-handle",
              threshold: 6,
            }}
            resizeConfig={{
              enabled: true,
              handles: ["s", "e", "se"],
            }}
            compactor={getCompactor("vertical", false, false)}
            autoSize={false}
            style={{ height: desktopGridHeight }}
            onDragStart={() => setShowAddWidgetMenu(false)}
            onDragStop={(nextLayout) => commitGridLayout(nextLayout)}
            onResizeStop={(nextLayout) => commitGridLayout(nextLayout)}
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
