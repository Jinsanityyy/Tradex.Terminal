"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "midnight" | "oled" | "pink" | "light";
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
  accountBalance: number;
  riskPerTrade: number;
}

export const DEFAULTS: Settings = {
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
  accountBalance: 10000,
  riskPerTrade: 1,
};

interface SettingsContextValue {
  settings: Settings;
  saveSettings: (next: Settings) => void;
  applyVisual: (theme: Theme, density: Density, animations: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function applyVisualSettings(theme: Theme, density: Density, animations: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-density", density);
  // Light theme needs to remove the "dark" class so dark: Tailwind prefixes don't apply
  if (theme === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }
  if (animations) {
    root.classList.remove("no-animations");
  } else {
    root.classList.add("no-animations");
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Always start with DEFAULTS on server, load from localStorage on client
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tradex_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULTS, ...parsed, notifications: { ...DEFAULTS.notifications, ...parsed.notifications } };
        setSettings(merged);
        applyVisualSettings(merged.theme, merged.density, merged.animations);
      } else {
        applyVisualSettings(DEFAULTS.theme, DEFAULTS.density, DEFAULTS.animations);
      }
    } catch {
      applyVisualSettings(DEFAULTS.theme, DEFAULTS.density, DEFAULTS.animations);
    }
    setLoaded(true);
  }, []);

  const saveSettings = useCallback((next: Settings) => {
    setSettings(next);
    applyVisualSettings(next.theme, next.density, next.animations);
    try {
      localStorage.setItem("tradex_settings", JSON.stringify(next));
    } catch {}
  }, []);

  const applyVisual = useCallback((theme: Theme, density: Density, animations: boolean) => {
    applyVisualSettings(theme, density, animations);
  }, []);

  if (!loaded) return null;

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, applyVisual }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
