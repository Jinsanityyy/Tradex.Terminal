"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "midnight" | "oled";
export type Density = "compact" | "default" | "expanded";
export type TimeZone = "ET" | "CT" | "PT" | "UTC" | "GMT";
export type DateFormat = "MM/DD" | "DD/MM" | "YYYY-MM-DD";
export type RefreshInterval = "5s" | "15s" | "30s" | "60s";
export type ImpactThreshold = "all" | "medium+" | "high-only";

export interface Settings {
  theme: Theme;
  density: Density;
  animations: boolean;
  trackedAssets: string[];
  defaultBiasAsset: string;
  impactThreshold: ImpactThreshold;
  timeZone: TimeZone;
  dateFormat: DateFormat;
  notifications: {
    highImpactEvents: boolean;
    biasChanges: boolean;
    trumpPosts: boolean;
    sessionHandoffs: boolean;
  };
  feedCategories: string[];
  autoRefreshInterval: RefreshInterval;
}

const DEFAULTS: Settings = {
  theme: "dark",
  density: "default",
  animations: true,
  trackedAssets: ["Gold", "DXY", "SPX", "NDX", "BTC", "EURUSD", "Oil"],
  defaultBiasAsset: "Gold",
  impactThreshold: "all",
  timeZone: "ET",
  dateFormat: "MM/DD",
  notifications: {
    highImpactEvents: true,
    biasChanges: true,
    trumpPosts: false,
    sessionHandoffs: false,
  },
  feedCategories: ["Central Banks", "Inflation", "Tariffs", "Geopolitics", "Crypto", "Energy"],
  autoRefreshInterval: "15s",
};

interface SettingsContextValue {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setNotification: (key: keyof Settings["notifications"], value: boolean) => void;
  toggleAsset: (asset: string) => void;
  toggleFeedCategory: (category: string) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applyTheme(theme: Theme, animations: boolean, density: Density) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-density", density);
  if (!animations) {
    root.classList.add("no-animations");
  } else {
    root.classList.remove("no-animations");
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const saved = localStorage.getItem("tradex_settings");
      if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULTS;
  });

  // Apply theme/density/animations to DOM on mount + change
  useEffect(() => {
    applyTheme(settings.theme, settings.animations, settings.density);
  }, [settings.theme, settings.animations, settings.density]);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem("tradex_settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setNotification = useCallback(async (key: keyof Settings["notifications"], value: boolean) => {
    // Request browser notification permission when enabling
    if (value && typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  }, []);

  const toggleAsset = useCallback((asset: string) => {
    setSettings((prev) => {
      const current = prev.trackedAssets;
      const next = current.includes(asset)
        ? current.filter((a) => a !== asset)
        : [...current, asset];
      return { ...prev, trackedAssets: next };
    });
  }, []);

  const toggleFeedCategory = useCallback((category: string) => {
    setSettings((prev) => {
      const current = prev.feedCategories;
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return { ...prev, feedCategories: next };
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, set, setNotification, toggleAsset, toggleFeedCategory, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
