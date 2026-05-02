"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { getCompactor, type Layout, type LayoutItem } from "react-grid-layout";
import { Check, ChevronDown, Plus, RotateCcw, Save } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { UserMenu } from "@/components/layout/TopStatusBar";

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
const DEFAULT_VIEW_ROWS = 24;
const MAX_GRID_ROWS = 60;
const STORAGE_KEY = "tradex-dashboard-grid-v7";
const PRESET_STORAGE_KEY = "tradex-dashboard-custom-presets-v1";

type BuiltInPresetId = "pro" | "minimal";
type LayoutPresetId = BuiltInPresetId | string;

const DEFAULT_PRESET: BuiltInPresetId = "pro";
const OPTIONAL_WIDGET_DEFAULTS: Record<string, boolean> = {
  "live-tv": true,
  agents: true,
  "economic-calendar": true,
  "pnl-calendar": true,
};

const PRESET_LAYOUTS: Record<BuiltInPresetId, Layout> = {
  pro: [
    { i: "chart", x: 0, y: 0, w: 13, h: 14, minW: 8, minH: 14 },
    { i: "globe", x: 13, y: 0, w: 6, h: 7, minW: 4, minH: 5 },
    { i: "live-tv", x: 13, y: 7, w: 11, h: 8, minW: 8, minH: 6 },
    { i: "trump", x: 19, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
    { i: "mtf", x: 19, y: 4, w: 5, h: 4, minW: 4, minH: 3 },
    { i: "catalysts", x: 13, y: 7, w: 11, h: 7, minW: 6, minH: 4 },
    { i: "community", x: 0, y: 14, w: 13, h: 6, minW: 6, minH: 5 },
    { i: "events", x: 13, y: 14, w: 6, h: 5, minW: 4, minH: 3 },
    { i: "sessions", x: 19, y: 14, w: 5, h: 5, minW: 4, minH: 3 },
    { i: "agents", x: 0, y: 20, w: 24, h: 4, minW: 10, minH: 4 },
    { i: "economic-calendar", x: 0, y: 20, w: 12, h: 4, minW: 6, minH: 4 },
    { i: "pnl-calendar", x: 12, y: 20, w: 12, h: 4, minW: 6, minH: 4 },
  ],
  minimal: [
    { i: "chart", x: 0, y: 0, w: 16, h: 16, minW: 10, minH: 14 },
    { i: "live-tv", x: 0, y: 16, w: 16, h: 8, minW: 8, minH: 6 },
    { i: "mtf", x: 16, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
    { i: "trump", x: 20, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
    { i: "catalysts", x: 16, y: 4, w: 8, h: 7, minW: 6, minH: 4 },
    { i: "events", x: 16, y: 11, w: 8, h: 5, minW: 4, minH: 3 },
    { i: "sessions", x: 16, y: 16, w: 8, h: 4, minW: 4, minH: 3 },
    { i: "community", x: 0, y: 16, w: 12, h: 4, minW: 6, minH: 4 },
    { i: "globe", x: 12, y: 16, w: 4, h: 4, minW: 4, minH: 4 },
    { i: "agents", x: 0, y: 20, w: 24, h: 4, minW: 10, minH: 4 },
    { i: "economic-calendar", x: 0, y: 20, w: 12, h: 4, minW: 6, minH: 4 },
    { i: "pnl-calendar", x: 12, y: 20, w: 12, h: 4, minW: 6, minH: 4 },
  ],
};

const PRESET_HIDDEN: Record<BuiltInPresetId, Record<string, boolean>> = {
  pro: {
    ...OPTIONAL_WIDGET_DEFAULTS,
  },
  minimal: {
    ...OPTIONAL_WIDGET_DEFAULTS,
    community: true,
    globe: true,
  },
};

const PRESET_LABELS: Record<BuiltInPresetId, string> = {
  pro: "Pro Trader",
  minimal: "Minimalist",
};

interface CustomPreset {
  id: string;
  label: string;
  layout: Layout;
  hidden: Record<string, boolean>;
  collapsed: Record<string, boolean>;
  prevHeights: Record<string, number>;
}

interface SavedGridState {
  preset: LayoutPresetId;
  layout: Layout;
  collapsed: Record<string, boolean>;
  hidden: Record<string, boolean>;
  prevHeights: Record<string, number>;
}

function isBuiltInPresetId(preset: LayoutPresetId): preset is BuiltInPresetId {
  return preset === "pro" || preset === "minimal";
}

function cloneLayout(layout: Layout): Layout {
  return layout.map((item) => ({ ...item }));
}

function mergeHiddenState(...states: Array<Record<string, boolean> | undefined>): Record<string, boolean> {
  return states.reduce<Record<string, boolean>>(
    (acc, state) => ({ ...acc, ...(state ?? {}) }),
    { ...OPTIONAL_WIDGET_DEFAULTS }
  );
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

function loadCustomPresets(): CustomPreset[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomPreset[]) : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: CustomPreset[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
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

function resolvePreset(preset: LayoutPresetId, customPresets: CustomPreset[]) {
  if (isBuiltInPresetId(preset)) {
    return {
      id: preset,
      label: PRESET_LABELS[preset],
      layout: PRESET_LAYOUTS[preset],
      hidden: mergeHiddenState(PRESET_HIDDEN[preset]),
      collapsed: {},
      prevHeights: {},
      isCustom: false,
    };
  }

  const customPreset = customPresets.find((item) => item.id === preset);
  if (customPreset) {
    return {
      ...customPreset,
      hidden: mergeHiddenState(customPreset.hidden),
      isCustom: true,
    };
  }

  return {
    id: DEFAULT_PRESET,
    label: PRESET_LABELS[DEFAULT_PRESET],
    layout: PRESET_LAYOUTS[DEFAULT_PRESET],
    hidden: mergeHiddenState(PRESET_HIDDEN[DEFAULT_PRESET]),
    collapsed: {},
    prevHeights: {},
    isCustom: false,
  };
}

function presetLayoutFor(id: string, preset: LayoutPresetId, customPresets: CustomPreset[]): LayoutItem {
  const resolved = resolvePreset(preset, customPresets);

  return resolved.layout.find((item) => item.i === id) ??
    PRESET_LAYOUTS[DEFAULT_PRESET].find((item) => item.i === id) ?? {
    i: id,
    x: 0,
    y: DEFAULT_VIEW_ROWS,
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
  const maxH = Math.min(fallback.maxH ?? MAX_GRID_ROWS, MAX_GRID_ROWS);
  const w = Math.max(minW, Math.min(item.w ?? fallback.w, maxW));
  const h = Math.max(minH, Math.min(item.h ?? fallback.h, maxH));
  const x = Math.max(0, Math.min(item.x ?? fallback.x, COLS - w));
  const y = Math.max(0, Math.min(item.y ?? fallback.y, MAX_GRID_ROWS - h));

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
  preset: LayoutPresetId = DEFAULT_PRESET,
  customPresets: CustomPreset[] = []
): Layout {
  const savedMap = new Map((savedLayout ?? []).map((item) => [item.i, item]));

  return widgetIds.map((id, index) => {
    const fallback = presetLayoutFor(id, preset, customPresets);
    const saved = savedMap.get(id);

    if (!saved) {
      if (fallback.i !== id) {
        return normalizeLayoutItem({
          ...fallback,
          i: id,
          x: (index % 3) * 4,
          y: DEFAULT_VIEW_ROWS + Math.floor(index / 3) * 4,
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

function syncLayoutWithCollapsedState(
  layout: Layout,
  collapsed: Record<string, boolean>,
  preset: LayoutPresetId = DEFAULT_PRESET,
  customPresets: CustomPreset[] = []
): Layout {
  return layout.map((entry) => {
    const fallback = presetLayoutFor(entry.i, preset, customPresets);

    if (collapsed[entry.i]) {
      return normalizeLayoutItem(
        {
          ...entry,
          h: 1,
          minH: 1,
        },
        { ...fallback, h: 1, minH: 1 }
      );
    }

    return normalizeLayoutItem(
      {
        ...entry,
        minW: fallback.minW,
        minH: fallback.minH,
      },
      fallback
    );
  });
}

function layoutOrder(layout: Layout, id: string) {
  const item = layout.find((entry) => entry.i === id);
  return item ? item.y * 100 + item.x : Number.MAX_SAFE_INTEGER;
}

function itemsCollide(a: LayoutItem, b: LayoutItem) {
  if (a.i === b.i) return false;

  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h
  );
}

function itemsOverlapVertically(a: LayoutItem, b: LayoutItem) {
  return a.y < b.y + b.h && a.y + a.h > b.y;
}

function adjustSiblingWidthsForRightResize(
  baselineLayout: Layout,
  proposedLayout: Layout,
  oldItem: LayoutItem | null,
  newItem: LayoutItem | null
): Layout {
  if (!oldItem || !newItem) return proposedLayout;

  const oldRight = oldItem.x + oldItem.w;
  const newRight = newItem.x + newItem.w;
  if (newRight <= oldRight) return proposedLayout;

  const proposedMap = new Map(proposedLayout.map((item) => [item.i, { ...item }]));
  const target = proposedMap.get(newItem.i);
  if (!target) return proposedLayout;

  const rightNeighbors = baselineLayout
    .filter((item) => item.i !== newItem.i)
    .filter((item) => itemsOverlapVertically(item, oldItem))
    .filter((item) => item.x >= oldRight || item.x + item.w > oldRight)
    .sort((left, right) => left.x - right.x);

  if (rightNeighbors.length === 0) {
    return proposedLayout;
  }

  const totalAvailableWidth = COLS - (target.x + target.w);
  const totalMinimumWidth = rightNeighbors.reduce(
    (sum, item) => sum + (proposedMap.get(item.i)?.minW ?? item.minW ?? 1),
    0
  );

  if (totalAvailableWidth < totalMinimumWidth) {
    return proposedLayout;
  }

  let cursor = target.x + target.w;

  rightNeighbors.forEach((neighbor, index) => {
    const current = proposedMap.get(neighbor.i) ?? { ...neighbor };
    const minW = current.minW ?? neighbor.minW ?? 1;
    const minWidthForRest = rightNeighbors
      .slice(index + 1)
      .reduce((sum, item) => sum + (proposedMap.get(item.i)?.minW ?? item.minW ?? 1), 0);
    const maxWidth = Math.max(minW, COLS - cursor - minWidthForRest);
    const nextWidth = Math.max(minW, Math.min(neighbor.w, maxWidth));

    proposedMap.set(neighbor.i, {
      ...current,
      x: cursor,
      y: neighbor.y,
      w: nextWidth,
      h: neighbor.h,
    });

    cursor += nextWidth;
  });

  return proposedLayout.map((item) => proposedMap.get(item.i) ?? item);
}

function findAvailableSlot(layout: Layout, candidate: LayoutItem) {
  const maxY = Math.max(0, MAX_GRID_ROWS - candidate.h);
  const maxX = Math.max(0, COLS - candidate.w);

  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const probe = { ...candidate, x, y };
      if (!layout.some((item) => itemsCollide(probe, item))) {
        return { x, y };
      }
    }
  }

  return {
    x: Math.max(0, Math.min(candidate.x, maxX)),
    y: Math.max(0, Math.min(candidate.y, maxY)),
  };
}

export function DashboardGrid({ widgets }: { widgets: WidgetDef[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const addWidgetMenuRef = useRef<HTMLDivElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const iframePointerStateRef = useRef<Array<{ frame: HTMLIFrameElement; pointerEvents: string }>>([]);
  const resizeBaselineRef = useRef<Layout | null>(null);
  const widgetSignature = useMemo(
    () => widgets.map((widget) => widget.id).join("|"),
    [widgets]
  );
  const widgetIds = useMemo(
    () => (widgetSignature ? widgetSignature.split("|") : []),
    [widgetSignature]
  );

  const [mounted, setMounted] = useState(false);
  const [gridWidth, setGridWidth] = useState(1280);
  const [rowHeight, setRowHeight] = useState(38);
  const [selectedPreset, setSelectedPreset] = useState<LayoutPresetId>(DEFAULT_PRESET);
  const [layout, setLayout] = useState<Layout>(() => mergeLayouts(widgetIds, PRESET_LAYOUTS[DEFAULT_PRESET], DEFAULT_PRESET));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [prevHeights, setPrevHeights] = useState<Record<string, number>>({});
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveLabel, setSaveLabel] = useState<"save" | "saved">("save");
  const [showAddWidgetMenu, setShowAddWidgetMenu] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"drag" | "resize" | null>(null);

  useEffect(() => {
    const savedCustomPresets = loadCustomPresets();
    setCustomPresets(savedCustomPresets);

    const saved = loadGridState();
    const resolvedPreset = resolvePreset(saved?.preset ?? DEFAULT_PRESET, savedCustomPresets);

    if (saved) {
      const savedCollapsed = saved.collapsed ?? {};
      setSelectedPreset(resolvedPreset.id);
      setLayout(
        syncLayoutWithCollapsedState(
          mergeLayouts(widgetIds, saved.layout, resolvedPreset.id, savedCustomPresets),
          savedCollapsed,
          resolvedPreset.id,
          savedCustomPresets
        )
      );
      setCollapsed(savedCollapsed);
      setHidden(mergeHiddenState(resolvedPreset.hidden, saved.hidden));
      setPrevHeights(saved.prevHeights);
    } else {
      const presetCollapsed = { ...resolvedPreset.collapsed };
      setSelectedPreset(resolvedPreset.id);
      setLayout(
        syncLayoutWithCollapsedState(
          mergeLayouts(widgetIds, resolvedPreset.layout, resolvedPreset.id, savedCustomPresets),
          presetCollapsed,
          resolvedPreset.id,
          savedCustomPresets
        )
      );
      setCollapsed(presetCollapsed);
      setHidden(mergeHiddenState(resolvedPreset.hidden));
      setPrevHeights({ ...resolvedPreset.prevHeights });
    }

    setHasUnsavedChanges(false);
    setSaveLabel("save");
    setMounted(true);
  }, [widgetIds, widgetSignature]);

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
        (DEFAULT_VIEW_ROWS - 1) * MARGIN[1] -
        PADDING[1] * 2;

      setGridWidth(Math.max(width, 640));
      setRowHeight(Math.max(30, Math.floor(availableHeight / DEFAULT_VIEW_ROWS)));
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

  const releaseIframePointerEvents = useCallback(() => {
    iframePointerStateRef.current.forEach(({ frame, pointerEvents }) => {
      frame.style.pointerEvents = pointerEvents;
    });
    iframePointerStateRef.current = [];
    document.body.classList.remove("dashboard-grid-interacting");
  }, []);

  const beginInteraction = useCallback((mode: "drag" | "resize") => {
    setShowAddWidgetMenu(false);
    setShowSaveMenu(false);
    setInteractionMode(mode);

    const frames = Array.from(document.querySelectorAll("iframe"));
    iframePointerStateRef.current = frames.map((frame) => ({
      frame,
      pointerEvents: frame.style.pointerEvents,
    }));
    frames.forEach((frame) => {
      frame.style.pointerEvents = "none";
    });

    document.body.classList.add("dashboard-grid-interacting");
  }, []);

  const endInteraction = useCallback(() => {
    setInteractionMode(null);
    releaseIframePointerEvents();
  }, [releaseIframePointerEvents]);

  const notifyEmbeddedWidgets = useCallback(() => {
    const fireResize = () => window.dispatchEvent(new Event("resize"));
    fireResize();
    requestAnimationFrame(fireResize);
    window.setTimeout(fireResize, 120);
    window.dispatchEvent(new Event("tradex-dashboard-layout-change"));
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

  useEffect(() => {
    if (!showSaveMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!saveMenuRef.current?.contains(target)) {
        setShowSaveMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showSaveMenu]);

  useEffect(() => {
    if (!interactionMode) return;

    const releaseInteraction = () => {
      window.setTimeout(() => {
        endInteraction();
      }, 0);
    };

    window.addEventListener("mouseup", releaseInteraction, true);
    window.addEventListener("touchend", releaseInteraction, true);
    window.addEventListener("touchcancel", releaseInteraction, true);
    window.addEventListener("pointerup", releaseInteraction, true);
    window.addEventListener("blur", releaseInteraction, true);

    return () => {
      window.removeEventListener("mouseup", releaseInteraction, true);
      window.removeEventListener("touchend", releaseInteraction, true);
      window.removeEventListener("touchcancel", releaseInteraction, true);
      window.removeEventListener("pointerup", releaseInteraction, true);
      window.removeEventListener("blur", releaseInteraction, true);
    };
  }, [endInteraction, interactionMode]);

  useEffect(() => {
    return () => {
      releaseIframePointerEvents();
    };
  }, [releaseIframePointerEvents]);

  const isDesktopGrid = gridWidth >= 1024;

  const orderedVisibleWidgets = [...widgets]
    .filter((widget) => !hidden[widget.id])
    .sort((left, right) => layoutOrder(layout, left.id) - layoutOrder(layout, right.id));

  const hiddenWidgets = widgets.filter((widget) => hidden[widget.id]);
  const visibleLayout = layout.filter((entry) => !hidden[entry.i]);
  const occupiedRows = Math.max(
    DEFAULT_VIEW_ROWS,
    visibleLayout.reduce((maxRows, entry) => Math.max(maxRows, entry.y + entry.h), 0)
  );
  const desktopGridHeight =
    rowHeight * occupiedRows +
    Math.max(0, occupiedRows - 1) * MARGIN[1] +
    PADDING[1] * 2;
  const presetOptions = [
    ...((Object.keys(PRESET_LABELS) as BuiltInPresetId[]).map((preset) => ({
      id: preset as LayoutPresetId,
      label: PRESET_LABELS[preset],
      isCustom: false,
    }))),
    ...customPresets.map((preset) => ({
      id: preset.id,
      label: preset.label,
      isCustom: true,
    })),
  ];
  const activeCustomPreset = customPresets.find((preset) => preset.id === selectedPreset) ?? null;

  const handleCollapse = useCallback(
    (id: string) => {
      const current = collapsed[id] ?? false;
      const fallback = presetLayoutFor(id, selectedPreset, customPresets);

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
    [collapsed, customPresets, layout, prevHeights, selectedPreset]
  );

  const handleClose = useCallback((id: string) => {
    setHidden((state) => ({ ...state, [id]: true }));
    setHasUnsavedChanges(true);
    setSaveLabel("save");
  }, []);

  const handleRestore = useCallback((id: string) => {
    const fallback = presetLayoutFor(id, selectedPreset, customPresets);
    const restoredHeight = prevHeights[id] ?? fallback.h;

    setHidden((state) => ({ ...state, [id]: false }));
    setCollapsed((state) => ({ ...state, [id]: false }));
    setLayout((state) => {
      const visibleLayout = state.filter((entry) => entry.i !== id && !hidden[entry.i]);
      const candidate = normalizeLayoutItem(
        {
          ...fallback,
          h: restoredHeight,
          minH: fallback.minH,
        },
        fallback
      );
      const slot = findAvailableSlot(visibleLayout, candidate);

      return state.map((entry) =>
        entry.i === id
          ? {
              ...entry,
              x: slot.x,
              y: slot.y,
              w: candidate.w,
              h: restoredHeight,
              minW: fallback.minW,
              minH: fallback.minH,
            }
          : entry
      );
    });
    setHasUnsavedChanges(true);
    setSaveLabel("save");
    setShowAddWidgetMenu(false);
  }, [customPresets, hidden, prevHeights, selectedPreset]);

  const handleReset = useCallback(() => {
    const resolved = resolvePreset(selectedPreset, customPresets);
    clearGridState();
    const nextCollapsed = { ...resolved.collapsed };
    setLayout(
      syncLayoutWithCollapsedState(
        mergeLayouts(widgetIds, resolved.layout, resolved.id, customPresets),
        nextCollapsed,
        resolved.id,
        customPresets
      )
    );
    setHidden(mergeHiddenState(resolved.hidden));
    setCollapsed(nextCollapsed);
    setPrevHeights({ ...resolved.prevHeights });
    setHasUnsavedChanges(false);
    setSaveLabel("save");
    setShowAddWidgetMenu(false);
    setShowSaveMenu(false);
  }, [customPresets, selectedPreset, widgetIds]);

  const commitGridLayout = useCallback(
    (nextLayout: Layout) => {
      const nextMap = new Map(nextLayout.map((item) => [item.i, item]));

      setLayout((state) =>
        state.map((entry) => {
          const updated = nextMap.get(entry.i);
          if (!updated) return entry;

          const fallback = presetLayoutFor(entry.i, selectedPreset, customPresets);
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
    [collapsed, customPresets, selectedPreset]
  );

  const buildResizeAwareLayout = useCallback(
    (nextLayout: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null) =>
      adjustSiblingWidthsForRightResize(
        resizeBaselineRef.current ?? layout,
        nextLayout,
        oldItem,
        newItem
      ),
    [layout]
  );

  const applyPreset = useCallback((preset: LayoutPresetId) => {
    const resolved = resolvePreset(preset, customPresets);
    const nextCollapsed = { ...resolved.collapsed };
    setSelectedPreset(resolved.id);
    setLayout(
      syncLayoutWithCollapsedState(
        mergeLayouts(widgetIds, resolved.layout, resolved.id, customPresets),
        nextCollapsed,
        resolved.id,
        customPresets
      )
    );
    setHidden(mergeHiddenState(resolved.hidden));
    setCollapsed(nextCollapsed);
    setPrevHeights({ ...resolved.prevHeights });
    setHasUnsavedChanges(true);
    setSaveLabel("save");
    setShowAddWidgetMenu(false);
    setShowSaveMenu(false);
  }, [customPresets, widgetIds]);

  const markSaved = useCallback(() => {
    setHasUnsavedChanges(false);
    setSaveLabel("saved");

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      setSaveLabel("save");
      saveTimerRef.current = null;
    }, 1800);
  }, []);

  const handleSaveLayout = useCallback(() => {
    const persistedLayout = syncLayoutWithCollapsedState(layout, collapsed, selectedPreset, customPresets);
    saveGridState({
      preset: selectedPreset,
      layout: persistedLayout,
      collapsed,
      hidden,
      prevHeights,
    });
    markSaved();
    setShowSaveMenu(false);
  }, [collapsed, customPresets, hidden, layout, markSaved, prevHeights, selectedPreset]);

  const handleSaveAsPreset = useCallback(() => {
    const suggestedName = activeCustomPreset?.label
      ? `${activeCustomPreset.label} Copy`
      : `${isBuiltInPresetId(selectedPreset) ? PRESET_LABELS[selectedPreset] : "Custom"} Copy`;
    const rawName = window.prompt("Preset name", suggestedName);
    const label = rawName?.trim();
    if (!label) return;

    const existingPreset = customPresets.find(
      (preset) => preset.label.toLowerCase() === label.toLowerCase()
    );
    const presetId =
      existingPreset?.id ?? `custom:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

    const nextPreset: CustomPreset = {
      id: presetId,
      label,
      layout: cloneLayout(syncLayoutWithCollapsedState(layout, collapsed, selectedPreset, customPresets)),
      hidden: { ...hidden },
      collapsed: { ...collapsed },
      prevHeights: { ...prevHeights },
    };

    const nextCustomPresets = existingPreset
      ? customPresets.map((preset) => (preset.id === presetId ? nextPreset : preset))
      : [...customPresets, nextPreset];

    setCustomPresets(nextCustomPresets);
    saveCustomPresets(nextCustomPresets);
    setSelectedPreset(presetId);
    saveGridState({
      preset: presetId,
      layout: syncLayoutWithCollapsedState(layout, collapsed, selectedPreset, customPresets),
      collapsed,
      hidden,
      prevHeights,
    });
    markSaved();
    setShowSaveMenu(false);
  }, [activeCustomPreset, collapsed, customPresets, hidden, layout, markSaved, prevHeights, selectedPreset]);

  const handleUpdateCurrentPreset = useCallback(() => {
    if (!activeCustomPreset) return;

    const nextPreset: CustomPreset = {
      ...activeCustomPreset,
      layout: cloneLayout(syncLayoutWithCollapsedState(layout, collapsed, selectedPreset, customPresets)),
      hidden: { ...hidden },
      collapsed: { ...collapsed },
      prevHeights: { ...prevHeights },
    };

    const nextCustomPresets = customPresets.map((preset) =>
      preset.id === activeCustomPreset.id ? nextPreset : preset
    );

    setCustomPresets(nextCustomPresets);
    saveCustomPresets(nextCustomPresets);
    saveGridState({
      preset: activeCustomPreset.id,
      layout: syncLayoutWithCollapsedState(layout, collapsed, selectedPreset, customPresets),
      collapsed,
      hidden,
      prevHeights,
    });
    markSaved();
    setShowSaveMenu(false);
  }, [activeCustomPreset, collapsed, customPresets, hidden, layout, markSaved, prevHeights]);

  if (!mounted) return null;

  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden">
      <div
        ref={toolbarRef}
        className="flex h-8 shrink-0 items-center gap-2 border-b border-white/[0.05] px-3"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {presetOptions.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] transition-colors ${
                selectedPreset === preset.id
                  ? "border-white/15 bg-white/[0.06] text-zinc-100"
                  : "border-white/[0.08] text-zinc-500 hover:border-white/15 hover:text-zinc-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="shrink-0">
          <UserMenu />
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

        <div ref={saveMenuRef} className="relative shrink-0">
          <div className="inline-flex overflow-hidden rounded border border-white/[0.08]">
            <button
              type="button"
              onClick={handleSaveLayout}
              disabled={!hasUnsavedChanges}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] transition-colors ${
                hasUnsavedChanges
                  ? "text-emerald-300 hover:bg-emerald-500/8"
                  : "text-zinc-600"
              }`}
            >
              {saveLabel === "saved" ? <Check className="h-2.5 w-2.5" /> : <Save className="h-2.5 w-2.5" />}
              {saveLabel === "saved" ? "Saved" : "Save Layout"}
            </button>
            <button
              type="button"
              onClick={() => setShowSaveMenu((state) => !state)}
              className="inline-flex items-center border-l border-white/[0.08] px-1.5 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
            >
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </div>

          {showSaveMenu ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-white/[0.08] bg-[#0b0b0d]/95 p-1 shadow-2xl backdrop-blur">
              <button
                type="button"
                onClick={handleSaveLayout}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
              >
                <span>Save workspace state</span>
                <Save className="h-3 w-3 shrink-0 text-zinc-500" />
              </button>
              {activeCustomPreset ? (
                <button
                  type="button"
                  onClick={handleUpdateCurrentPreset}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                >
                  <span>Update "{activeCustomPreset.label}"</span>
                  <Check className="h-3 w-3 shrink-0 text-zinc-500" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSaveAsPreset}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
              >
                <span>Save as new preset</span>
                <Plus className="h-3 w-3 shrink-0 text-zinc-500" />
              </button>
            </div>
          ) : null}
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
        <div className="min-h-0 w-full max-w-none flex-1 overflow-y-auto overflow-x-hidden pr-1 pb-4">
          <div className="relative w-full min-w-0" style={{ height: desktopGridHeight }}>
            <GridLayout
              className="relative h-full w-full max-w-none"
              layout={visibleLayout}
              width={gridWidth}
              gridConfig={{
                cols: COLS,
                rowHeight,
                margin: MARGIN,
                containerPadding: PADDING,
                maxRows: MAX_GRID_ROWS,
              }}
              dragConfig={{
                enabled: true,
                bounded: true,
                handle: ".widget-drag-handle",
                threshold: 6,
              }}
              resizeConfig={{
                enabled: true,
                handles: ["n", "s", "e", "w", "ne", "nw", "se", "sw"],
              }}
              compactor={getCompactor("vertical", false, false)}
              autoSize={false}
              style={{ height: desktopGridHeight }}
              onDragStart={() => beginInteraction("drag")}
              onResizeStart={() => {
                resizeBaselineRef.current = cloneLayout(layout);
                beginInteraction("resize");
              }}
              onDragStop={(nextLayout) => {
                commitGridLayout(nextLayout);
                endInteraction();
                notifyEmbeddedWidgets();
              }}
              onResize={(nextLayout, oldItem, newItem) => {
                setLayout(buildResizeAwareLayout(nextLayout, oldItem, newItem));
              }}
              onResizeStop={(nextLayout, oldItem, newItem) => {
                const adjustedLayout = buildResizeAwareLayout(nextLayout, oldItem, newItem);
                commitGridLayout(adjustedLayout);
                resizeBaselineRef.current = null;
                endInteraction();
                notifyEmbeddedWidgets();
              }}
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

      {interactionMode ? (
        <div
          className={`fixed inset-0 z-40 bg-transparent touch-none ${
            interactionMode === "resize" ? "cursor-se-resize" : "cursor-grabbing"
          }`}
          aria-hidden="true"
        />
      ) : null}

      <style>{`
        .react-resizable-handle {
          position: absolute;
          width: 16px;
          height: 16px;
          opacity: 0;
          transition: opacity 0.15s ease;
          touch-action: none;
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

        .react-resizable-handle-n {
          top: 0;
          left: 50%;
          cursor: n-resize;
          transform: translateX(-50%);
        }

        .react-resizable-handle-e {
          right: 0;
          top: 50%;
          cursor: e-resize;
          transform: translateY(-50%);
        }

        .react-resizable-handle-w {
          left: 0;
          top: 50%;
          cursor: w-resize;
          transform: translateY(-50%);
        }

        .react-resizable-handle-ne {
          right: 0;
          top: 0;
          cursor: ne-resize;
        }

        .react-resizable-handle-nw {
          left: 0;
          top: 0;
          cursor: nw-resize;
        }

        .react-resizable-handle-se {
          right: 0;
          bottom: 0;
          cursor: se-resize;
        }

        .react-resizable-handle-sw {
          left: 0;
          bottom: 0;
          cursor: sw-resize;
        }

        .react-grid-item.react-grid-placeholder {
          border-radius: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.14) !important;
          background: rgba(255, 255, 255, 0.04) !important;
          opacity: 1 !important;
        }

        .react-grid-item.react-draggable-dragging,
        .react-grid-item.react-grid-item-resizing {
          z-index: 30;
        }

        .dashboard-grid-interacting {
          user-select: none;
        }

        .react-grid-item.react-draggable-dragging .widget-card-body,
        .react-grid-item.react-grid-item-resizing .widget-card-body,
        .react-grid-item.react-draggable-dragging .widget-card-body *,
        .react-grid-item.react-grid-item-resizing .widget-card-body * {
          pointer-events: none !important;
          user-select: none;
        }

        .react-grid-item.react-draggable-dragging .widget-card-body::after,
        .react-grid-item.react-grid-item-resizing .widget-card-body::after {
          position: absolute;
          right: 12px;
          bottom: 12px;
          z-index: 4;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(8, 8, 10, 0.82);
          padding: 4px 8px;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: rgba(244, 244, 245, 0.9);
          backdrop-filter: blur(10px);
        }

        .react-grid-item.react-draggable-dragging .widget-card-body::after {
          content: "Release to place here";
        }

        .react-grid-item.react-grid-item-resizing .widget-card-body::after {
          content: "Release to set size";
        }

        .react-grid-item.react-draggable-dragging .widget-card-body::before,
        .react-grid-item.react-grid-item-resizing .widget-card-body::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 3;
          background: linear-gradient(180deg, rgba(10, 10, 12, 0.08), rgba(10, 10, 12, 0.18));
        }
      `}</style>
    </div>
  );
}
