"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, BarChart3, Globe, Bell, Filter, RotateCcw, CheckCircle2 } from "lucide-react";
import { useSettings, Theme, Density, TimeZone, DateFormat, RefreshInterval, ImpactThreshold } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

// ── Reusable atoms ───────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[hsl(var(--border))]/50 last:border-0">
      <div className="min-w-0">
        <span className="text-xs font-medium text-[hsl(var(--foreground))]">{label}</span>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors focus:outline-none",
        checked ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function Pills<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-all border",
            value === o
              ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
              : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
          )}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

function MultiSelect({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all border",
              active
                ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
          >
            {active && <CheckCircle2 className="h-2.5 w-2.5" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const ALL_ASSETS = ["Gold", "DXY", "SPX", "NDX", "BTC", "EURUSD", "Oil", "ETH", "Silver"];
const ALL_CATEGORIES = ["Central Banks", "Inflation", "Tariffs", "Geopolitics", "Crypto", "Energy", "Earnings"];

export default function SettingsPage() {
  const { settings, set, setNotification, toggleAsset, toggleFeedCategory, reset } = useSettings();
  const [saved, setSaved] = React.useState(false);

  // Flash "Saved" indicator on any setting change (debounced)
  const saveTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  function flashSaved() {
    setSaved(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1800);
  }

  function wrap<T>(fn: (v: T) => void) {
    return (v: T) => { fn(v); flashSaved(); };
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Settings</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Customize your terminal experience</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--primary))] animate-pulse">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
          <button
            onClick={() => { reset(); flashSaved(); }}
            className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2.5 py-1.5 text-[10px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all"
          >
            <RotateCcw className="h-3 w-3" /> Reset Defaults
          </button>
        </div>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-4 w-4 text-purple-400" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Theme" description="Terminal color scheme">
            <Pills<Theme>
              options={["dark", "midnight", "oled"]}
              value={settings.theme}
              onChange={wrap((v) => set("theme", v))}
              labels={{ dark: "Dark", midnight: "Midnight", oled: "OLED" }}
            />
          </SettingRow>
          <SettingRow label="Layout Density" description="Compact shows more data, expanded improves readability">
            <Pills<Density>
              options={["compact", "default", "expanded"]}
              value={settings.density}
              onChange={wrap((v) => set("density", v))}
              labels={{ compact: "Compact", default: "Default", expanded: "Expanded" }}
            />
          </SettingRow>
          <SettingRow label="Animations" description="Enable smooth transitions and micro-interactions">
            <Toggle checked={settings.animations} onChange={wrap((v) => set("animations", v))} />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Market Preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
            Market Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Tracked Assets" description="Select which assets appear in your terminal">
            <MultiSelect
              options={ALL_ASSETS}
              selected={settings.trackedAssets}
              onToggle={(a) => { toggleAsset(a); flashSaved(); }}
            />
          </SettingRow>
          <SettingRow label="Default Bias Asset" description="Primary asset shown on dashboard">
            <Pills
              options={["Gold", "DXY", "SPX", "BTC"]}
              value={settings.defaultBiasAsset}
              onChange={wrap((v) => set("defaultBiasAsset", v))}
            />
          </SettingRow>
          <SettingRow label="Impact Threshold" description="Minimum impact level shown in feeds">
            <Pills<ImpactThreshold>
              options={["all", "medium+", "high-only"]}
              value={settings.impactThreshold}
              onChange={wrap((v) => set("impactThreshold", v))}
              labels={{ all: "All", "medium+": "Medium+", "high-only": "High Only" }}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Time & Region */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-blue-400" />
            Time & Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Time Zone" description="Display times in your local timezone">
            <Pills<TimeZone>
              options={["ET", "CT", "PT", "UTC", "GMT"]}
              value={settings.timeZone}
              onChange={wrap((v) => set("timeZone", v))}
            />
          </SettingRow>
          <SettingRow label="Date Format" description="How dates are displayed">
            <Pills<DateFormat>
              options={["MM/DD", "DD/MM", "YYYY-MM-DD"]}
              value={settings.dateFormat}
              onChange={wrap((v) => set("dateFormat", v))}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-amber-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(["highImpactEvents", "biasChanges", "trumpPosts", "sessionHandoffs"] as const).map((key) => {
            const labels: Record<string, [string, string]> = {
              highImpactEvents: ["High Impact Events", "Alert when high-impact events are released"],
              biasChanges: ["Bias Changes", "Notify when major bias shifts are detected"],
              trumpPosts: ["Trump Posts", "Alert on high-impact Trump-related content"],
              sessionHandoffs: ["Session Handoffs", "Summary notification when sessions transition"],
            };
            const [label, desc] = labels[key];
            return (
              <SettingRow key={key} label={label} description={desc}>
                <Toggle
                  checked={settings.notifications[key]}
                  onChange={(v) => { setNotification(key, v); flashSaved(); }}
                />
              </SettingRow>
            );
          })}
          {typeof Notification !== "undefined" && Notification.permission === "denied" && (
            <p className="mt-2 text-[10px] text-red-400">
              Browser notifications are blocked. Enable them in your browser site settings to receive alerts.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Feed Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            Feed Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="News Categories" description="Filter which news categories appear in feeds">
            <MultiSelect
              options={ALL_CATEGORIES}
              selected={settings.feedCategories}
              onToggle={(c) => { toggleFeedCategory(c); flashSaved(); }}
            />
          </SettingRow>
          <SettingRow label="Auto-refresh Interval" description="How often data feeds update">
            <Pills<RefreshInterval>
              options={["5s", "15s", "30s", "60s"]}
              value={settings.autoRefreshInterval}
              onChange={wrap((v) => set("autoRefreshInterval", v))}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
          TradeX Terminal v0.1.0 — All settings saved automatically to your browser
        </p>
      </div>
    </div>
  );
}
