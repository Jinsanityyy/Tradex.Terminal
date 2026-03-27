"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Palette, Monitor, Globe, Bell, Filter, BarChart3, Clock } from "lucide-react";

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--border))]/50 last:border-0">
      <div>
        <span className="text-xs font-medium text-[hsl(var(--foreground))]">{label}</span>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = React.useState(defaultChecked);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function SelectPill({ options, defaultValue }: { options: string[]; defaultValue: string }) {
  const [selected, setSelected] = React.useState(defaultValue);
  return (
    <div className="flex items-center gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => setSelected(o)}
          className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-all border ${
            selected === o
              ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
              : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Settings</h1>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Customize your terminal experience</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-purple-400" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Theme" description="Terminal color scheme">
            <SelectPill options={["Dark", "Midnight", "OLED"]} defaultValue="Dark" />
          </SettingRow>
          <SettingRow label="Layout Density" description="Compact shows more data, expanded improves readability">
            <SelectPill options={["Compact", "Default", "Expanded"]} defaultValue="Default" />
          </SettingRow>
          <SettingRow label="Animations" description="Enable smooth transitions and micro-interactions">
            <ToggleSwitch defaultChecked />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Market Preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
            Market Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Tracked Assets" description="Select which assets appear in your terminal">
            <div className="flex flex-wrap gap-1">
              {["Gold", "DXY", "SPX", "NDX", "BTC", "EURUSD", "Oil"].map((a) => (
                <Badge key={a} variant="outline" className="cursor-pointer hover:bg-[hsl(var(--secondary))]">{a}</Badge>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Default Bias Asset" description="Primary asset shown on dashboard">
            <SelectPill options={["Gold", "DXY", "SPX", "BTC"]} defaultValue="Gold" />
          </SettingRow>
          <SettingRow label="Impact Threshold" description="Minimum impact level shown in feeds">
            <SelectPill options={["All", "Medium+", "High Only"]} defaultValue="All" />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Time & Region */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
            Time & Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Time Zone" description="Display times in your local timezone">
            <SelectPill options={["ET", "CT", "PT", "UTC", "GMT"]} defaultValue="ET" />
          </SettingRow>
          <SettingRow label="Date Format" description="How dates are displayed">
            <SelectPill options={["MM/DD", "DD/MM", "YYYY-MM-DD"]} defaultValue="MM/DD" />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="High Impact Events" description="Alert when high-impact events are released">
            <ToggleSwitch defaultChecked />
          </SettingRow>
          <SettingRow label="Bias Changes" description="Notify when major bias shifts are detected">
            <ToggleSwitch defaultChecked />
          </SettingRow>
          <SettingRow label="Trump Posts" description="Alert on high-impact Trump-related content">
            <ToggleSwitch />
          </SettingRow>
          <SettingRow label="Session Handoffs" description="Summary notification when sessions transition">
            <ToggleSwitch />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            Feed Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="News Categories" description="Filter which news categories appear">
            <div className="flex flex-wrap gap-1">
              {["Central Banks", "Inflation", "Tariffs", "Geopolitics", "Crypto", "Energy"].map((c) => (
                <Badge key={c} variant="outline" className="cursor-pointer hover:bg-[hsl(var(--secondary))]">{c}</Badge>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Auto-refresh Interval" description="How often data feeds update">
            <SelectPill options={["5s", "15s", "30s", "60s"]} defaultValue="15s" />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Version */}
      <div className="text-center py-4">
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
          TradeX Terminal v0.1.0 — Premium Market Intelligence
        </p>
      </div>
    </div>
  );
}
