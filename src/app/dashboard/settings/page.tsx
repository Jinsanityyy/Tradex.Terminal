"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, BarChart3, Globe, Bell, Filter, RotateCcw, Save, CheckCircle2, ShieldCheck, ShieldOff, Smartphone, Loader2, AlertCircle, DollarSign } from "lucide-react";
import {
  useSettings, applyVisualSettings, DEFAULTS,
  Settings, Theme, Density, TimeZone, DateFormat, RefreshInterval, ImpactThreshold,
} from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

// ── Atoms ────────────────────────────────────────────────────────────────────

function SettingRow({ label, description, children, wide }: { label: string; description: string; children: React.ReactNode; wide?: boolean }) {
  if (wide) {
    return (
      <div className="py-3 border-b border-[hsl(var(--border))]/50 last:border-0 space-y-2">
        <div>
          <p className="text-xs font-medium text-[hsl(var(--foreground))]">{label}</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{description}</p>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-[hsl(var(--border))]/50 last:border-0 overflow-hidden">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[hsl(var(--foreground))]">{label}</p>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{description}</p>
      </div>
      <div className="shrink-0 max-w-[55%] flex flex-wrap justify-end gap-1">{children}</div>
    </div>
  );
}

function AttentionDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-amber-400/90 shadow-[0_0_5px_1px] shadow-amber-400/40 shrink-0" />;
}

function SegmentedPills<T extends string>({
  options, value, onChange, labels,
}: {
  options: T[]; value: T; onChange: (v: T) => void; labels?: Record<string, string>;
}) {
  return (
    <div className="flex gap-px overflow-x-auto scrollbar-none rounded-lg border border-[hsl(var(--border))] p-0.5 shrink-0">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide transition-all whitespace-nowrap",
            value === o
              ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]"
              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
          )}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
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
      <span className={cn(
        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-[18px]" : "translate-x-0.5"
      )} />
    </button>
  );
}

function Pills<T extends string>({
  options, value, onChange, labels,
}: {
  options: T[]; value: T; onChange: (v: T) => void; labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all border whitespace-nowrap",
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

function MultiSelect({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={cn(
              "flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all border",
              active
                ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
          >
            {active && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
            <span className="truncate">{o}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const ALL_ASSETS = ["Gold", "DXY", "SPX", "NDX", "BTC", "EURUSD", "Oil", "ETH", "Silver"];
const ALL_CATEGORIES = ["Central Banks", "Inflation", "Tariffs", "Geopolitics", "Crypto", "Energy", "Earnings"];

// ── MFA Section ───────────────────────────────────────────────────────────────

function MFASection() {
  const [status, setStatus] = useState<"loading" | "enabled" | "disabled">("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "enrolling" | "verifying" | "removing">("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { checkMFA(); }, []);

  async function checkMFA() {
    setStatus("loading");
    const supabase = createClient();
    if (!supabase) { setStatus("disabled"); return; }
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find((f) => f.status === "verified");
    if (totp) { setStatus("enabled"); setFactorId(totp.id); }
    else setStatus("disabled");
  }

  async function startEnroll() {
    setError(""); setCode("");
    setStep("enrolling"); setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Authentication is not configured.");
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrollFactorId(data.id);
      setStep("verifying");
    } catch (err: any) {
      setError(err.message ?? "Failed to start enrollment");
      setStep("idle");
    } finally { setLoading(false); }
  }

  async function verifyEnroll() {
    if (!enrollFactorId || code.length !== 6) return;
    setError(""); setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Authentication is not configured.");
      const { data: c } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
      const { error } = await supabase.auth.mfa.verify({ factorId: enrollFactorId, challengeId: c!.id, code });
      if (error) throw error;
      setStep("idle"); setQrCode(null); setSecret(null); setCode("");
      await checkMFA();
    } catch (err: any) {
      setError("Invalid code  -  try again");
    } finally { setLoading(false); }
  }

  async function removeMFA() {
    if (!factorId) return;
    setError(""); setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Authentication is not configured.");
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setFactorId(null); setStep("idle");
      await checkMFA();
    } catch (err: any) {
      setError(err.message ?? "Failed to remove authenticator");
    } finally { setLoading(false); }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Security
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <div className="flex items-center gap-2 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Checking MFA status...</span>
          </div>
        ) : status === "enabled" ? (
          <div className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs font-medium text-[hsl(var(--foreground))]">Authenticator App</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">Active</span>
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 ml-6">Your account is protected with 2-step verification.</p>
              </div>
              <button
                onClick={removeMFA}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                Remove
              </button>
            </div>
            {error && <p className="text-[10px] text-red-400">{error}</p>}
          </div>
        ) : step === "idle" ? (
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <p className="text-xs font-medium text-[hsl(var(--foreground))]">Authenticator App</p>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] px-2 py-0.5 rounded-full">Not enabled</span>
              </div>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 ml-6">Use Google Authenticator or Authy for login verification.</p>
            </div>
            <button
              onClick={startEnroll}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 px-3 py-1.5 text-[10px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
              Enable 2FA
            </button>
          </div>
        ) : (
          <div className="py-3 space-y-4">
            <p className="text-xs font-medium text-[hsl(var(--foreground))]">Set up Authenticator App</p>
            <ol className="space-y-3 text-[11px] text-[hsl(var(--muted-foreground))] list-decimal list-inside">
              <li>Install <span className="text-[hsl(var(--foreground))] font-medium">Google Authenticator</span> or <span className="text-[hsl(var(--foreground))] font-medium">Authy</span> on your phone</li>
              <li>Scan the QR code below</li>
              <li>Enter the 6-digit code to confirm</li>
            </ol>

            {qrCode && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl border border-[hsl(var(--border))] bg-white p-3">
                  <img src={qrCode} alt="QR Code" className="w-40 h-40" />
                </div>
                {secret && (
                  <div className="w-full rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] px-3 py-2 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Manual entry key</p>
                    <p className="text-xs font-mono text-[hsl(var(--foreground))] break-all select-all">{secret}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                6-digit verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/40 outline-none focus:border-[hsl(var(--primary))]/50 font-mono tracking-widest text-center"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setStep("idle"); setQrCode(null); setCode(""); setError(""); }}
                className="flex-1 rounded-lg border border-[hsl(var(--border))] py-2 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={verifyEnroll}
                disabled={loading || code.length !== 6}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] py-2 text-xs font-semibold text-[#0a0e1a] hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Verify & Enable
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { settings, saveSettings, applyVisual } = useSettings();

  // Local draft  -  changes here are previewed live but not persisted until Save
  const [draft, setDraft] = useState<Settings>(settings);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Sync draft when context settings change (e.g. on first load)
  useEffect(() => { setDraft(settings); }, [settings]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      // Live preview for appearance settings
      applyVisual(next.theme, next.density, next.animations);
      return next;
    });
  }

  function updateNotification(key: keyof Settings["notifications"], value: boolean) {
    if (value && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setDraft((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  }

  function toggleAsset(asset: string) {
    setDraft((prev) => {
      const list = prev.trackedAssets.includes(asset)
        ? prev.trackedAssets.filter((a) => a !== asset)
        : [...prev.trackedAssets, asset];
      return { ...prev, trackedAssets: list };
    });
  }

  function toggleCategory(cat: string) {
    setDraft((prev) => {
      const list = prev.feedCategories.includes(cat)
        ? prev.feedCategories.filter((c) => c !== cat)
        : [...prev.feedCategories, cat];
      return { ...prev, feedCategories: list };
    });
  }

  function handleSave() {
    saveSettings(draft);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  }

  function handleReset() {
    setDraft(DEFAULTS);
    applyVisual(DEFAULTS.theme, DEFAULTS.density, DEFAULTS.animations);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Settings</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Customize your terminal experience</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Unsaved indicator */}
          {isDirty && !savedAt && (
            <span className="text-[10px] text-amber-400 font-medium px-2 py-1 rounded border border-amber-400/30 bg-amber-400/10">
              Unsaved changes
            </span>
          )}
          {savedAt && (
            <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--primary))] font-medium">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2.5 py-1.5 text-[10px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all border",
              isDirty
                ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]/40 cursor-not-allowed"
            )}
          >
            <Save className="h-3 w-3" /> Save Settings
          </button>
        </div>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-4 w-4 text-purple-400" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Theme" description="Terminal color scheme  -  previewed live, saved on click Save">
            <SegmentedPills<Theme>
              options={["dark", "midnight", "oled", "pink", "light"]}
              value={draft.theme}
              onChange={(v) => update("theme", v)}
              labels={{ dark: "Dark", midnight: "Midnight", oled: "OLED", pink: "Pink", light: "Light" }}
            />
          </SettingRow>
          <SettingRow label="Layout Density" description="Compact shows more data, expanded improves readability">
            <SegmentedPills<Density>
              options={["compact", "default", "expanded"]}
              value={draft.density}
              onChange={(v) => update("density", v)}
              labels={{ compact: "Compact", default: "Default", expanded: "Expanded" }}
            />
          </SettingRow>
          <SettingRow label="Animations" description="Enable smooth transitions and micro-interactions">
            <Toggle checked={draft.animations} onChange={(v) => update("animations", v)} />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Market Preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" /> Market Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow wide label="Tracked Assets" description="Select which assets appear in your terminal">
            <MultiSelect options={ALL_ASSETS} selected={draft.trackedAssets} onToggle={toggleAsset} />
          </SettingRow>
          <SettingRow label="Default Bias Asset" description="Primary asset shown on dashboard">
            <Pills
              options={["Gold", "DXY", "SPX", "BTC"]}
              value={draft.defaultBiasAsset}
              onChange={(v) => update("defaultBiasAsset", v)}
            />
          </SettingRow>
          <SettingRow label="Impact Threshold" description="Minimum impact level shown in feeds">
            <Pills<ImpactThreshold>
              options={["all", "medium+", "high-only"]}
              value={draft.impactThreshold}
              onChange={(v) => update("impactThreshold", v)}
              labels={{ all: "All", "medium+": "Medium+", "high-only": "High Only" }}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-amber-400" /> Risk Management
            {draft.accountBalance === DEFAULTS.accountBalance && draft.riskPerTrade === DEFAULTS.riskPerTrade && (
              <AttentionDot />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Account Balance" description="Your trading account size  -  used by the lot size calculator">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">$</span>
              <input
                type="number"
                min={100}
                step={100}
                value={draft.accountBalance}
                onChange={(e) => update("accountBalance", Math.max(100, Number(e.target.value)))}
                className="w-28 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-2 py-1 text-right text-[11px] font-mono text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 [color-scheme:dark]"
              />
            </div>
          </SettingRow>
          <SettingRow label="Risk Per Trade" description="Default % of account risked per trade in the lot size calculator">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {[0.5, 1, 1.5, 2, 3].map((pct) => (
                <button
                  key={pct}
                  onClick={() => update("riskPerTrade", pct)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-medium transition-all border",
                    draft.riskPerTrade === pct && [0.5, 1, 1.5, 2, 3].includes(draft.riskPerTrade)
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                  )}
                >
                  {pct}%
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={draft.riskPerTrade}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0) update("riskPerTrade", parseFloat(v.toFixed(1)));
                  }}
                  className="w-16 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-2 py-1 text-right text-[10px] font-mono text-[hsl(var(--foreground))] outline-none focus:border-amber-500/50 [color-scheme:dark]"
                  placeholder="Custom"
                />
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">%</span>
              </div>
            </div>
          </SettingRow>
          {/* Preview */}
          <div className="mt-3 rounded-lg border border-[hsl(var(--border))]/50 bg-[hsl(var(--secondary))]/40 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Max risk amount at {draft.riskPerTrade}%</span>
            <span className="text-sm font-mono font-bold text-amber-400">
              ${(draft.accountBalance * draft.riskPerTrade / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Time & Region */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-blue-400" /> Time & Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Time Zone" description="Display times in your local timezone">
            <Pills<TimeZone>
              options={["ET", "CT", "PT", "UTC", "GMT"]}
              value={draft.timeZone}
              onChange={(v) => update("timeZone", v)}
            />
          </SettingRow>
          <SettingRow label="Date Format" description="How dates are displayed">
            <SegmentedPills<DateFormat>
              options={["MM/DD", "DD/MM", "YYYY-MM-DD"]}
              value={draft.dateFormat}
              onChange={(v) => update("dateFormat", v)}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-amber-400" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(["highImpactEvents", "biasChanges", "trumpPosts", "sessionHandoffs"] as const).map((key) => {
            const info: Record<string, [string, string]> = {
              highImpactEvents: ["High Impact Events", "Alert when high-impact events are released"],
              biasChanges: ["Bias Changes", "Notify when major bias shifts are detected"],
              trumpPosts: ["Trump Posts", "Alert on high-impact Trump-related content"],
              sessionHandoffs: ["Session Handoffs", "Summary notification when sessions transition"],
            };
            const [label, desc] = info[key];
            return (
              <SettingRow key={key} label={label} description={desc}>
                <Toggle checked={draft.notifications[key]} onChange={(v) => updateNotification(key, v)} />
              </SettingRow>
            );
          })}
          {typeof Notification !== "undefined" && Notification.permission === "denied" && (
            <p className="mt-2 text-[10px] text-red-400">
              Browser notifications are blocked. Enable them in your browser site settings.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Feed Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /> Feed Filters
            {draft.feedCategories.length === 0 && <AttentionDot />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow wide label="News Categories" description="Filter which news categories appear in feeds">
            <MultiSelect options={ALL_CATEGORIES} selected={draft.feedCategories} onToggle={toggleCategory} />
          </SettingRow>
          <SettingRow label="Auto-refresh Interval" description="How often data feeds update">
            <Pills<RefreshInterval>
              options={["5s", "15s", "30s", "60s"]}
              value={draft.autoRefreshInterval}
              onChange={(v) => update("autoRefreshInterval", v)}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Security / MFA */}
      <MFASection />

      {/* Sticky Save Bar  -  appears when there are unsaved changes */}
      {isDirty && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--background))]/90 backdrop-blur px-4 py-3 shadow-lg">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">You have unsaved changes</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[10px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 px-3 py-1.5 text-[10px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-all"
            >
              <Save className="h-3 w-3" /> Save Settings
            </button>
          </div>
        </div>
      )}

      <div className="text-center py-2">
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
          TradeX Terminal v0.1.0  -  Settings saved to your browser
        </p>
      </div>
    </div>
  );
}
