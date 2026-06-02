"use client";

import React, { useState, useEffect } from "react";
import { Palette, BarChart3, Globe, Bell, Filter, RotateCcw, Save, CheckCircle2, ShieldCheck, ShieldOff, Smartphone, Loader2, AlertCircle, DollarSign, Trash2, ChevronRight, ChevronLeft, Settings2 } from "lucide-react";
import {
  useSettings, DEFAULTS,
  Settings, Theme, Density, TimeZone, DateFormat, RefreshInterval, ImpactThreshold,
} from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { getSymbolLabel } from "@/lib/assetImpact";
import { playOrderFilled, playHighImpactAlert, playSignalArmed, playAppOpen, unlockAudio } from "@/lib/sounds";
import { createClient } from "@/lib/supabase/client";

// ── Atoms ─────────────────────────────────────────────────────────────────────

function SettingRow({ label, description, children, wide }: { label: string; description: string; children: React.ReactNode; wide?: boolean }) {
  if (wide) {
    return (
      <div className="py-4 border-b border-[hsl(var(--border))]/40 last:border-0 space-y-3">
        <div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{description}</p>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-[hsl(var(--border))]/40 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{description}</p>
      </div>
      <div className="shrink-0 max-w-[58%] flex flex-wrap justify-end gap-1.5">{children}</div>
    </div>
  );
}

function AttentionDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-amber-400/90 shadow-[0_0_5px_1px] shadow-amber-400/40 shrink-0" />;
}

function SegmentedPills<T extends string>({ options, value, onChange, labels }: { options: T[]; value: T; onChange: (v: T) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex gap-0.5 overflow-x-auto scrollbar-none rounded-lg border border-[hsl(var(--border))] p-1 shrink-0">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-all whitespace-nowrap cursor-pointer",
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
        "relative h-5 w-9 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0",
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

function Pills<T extends string>({ options, value, onChange, labels }: { options: T[]; value: T; onChange: (v: T) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-3 py-1 text-[10px] font-medium uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer",
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

function MultiSelect({ options, selected, onToggle, labelFn }: { options: string[]; selected: string[]; onToggle: (v: string) => void; labelFn?: (v: string) => string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        const display = labelFn ? labelFn(o) : o;
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-[10px] font-medium transition-all border cursor-pointer",
              active
                ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
          >
            {active && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
            <span className="truncate">{display}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Nav sections data ──────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "appearance",    label: "Appearance",    icon: Palette,     danger: false },
  { id: "market",        label: "Market",        icon: BarChart3,   danger: false },
  { id: "risk",          label: "Risk",          icon: DollarSign,  danger: false },
  { id: "time",          label: "Time & Region", icon: Globe,       danger: false },
  { id: "notifications", label: "Notifications", icon: Bell,        danger: false },
  { id: "feed",          label: "Feed Filters",  icon: Filter,      danger: false },
  { id: "security",      label: "Security",      icon: ShieldCheck, danger: false },
  { id: "danger",        label: "Danger Zone",   icon: Trash2,      danger: true  },
] as const;

type SectionId = typeof NAV_SECTIONS[number]["id"];

// ── Assets / categories ────────────────────────────────────────────────────────

const ALL_ASSETS = [
  "XAUUSD", "XAGUSD", "USOIL",
  "EURUSD", "GBPUSD", "USDJPY", "USDCAD", "USDCHF", "AUDUSD", "NZDUSD",
  "EURGBP", "GBPJPY",
  "BTCUSD", "ETHUSD", "LTCUSD",
];
const ALL_CATEGORIES = ["Central Banks", "Inflation", "Tariffs", "Geopolitics", "Crypto", "Energy", "Earnings"];

// ── MFA Section ────────────────────────────────────────────────────────────────

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

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />
        <span className="text-xs text-[hsl(var(--muted-foreground))]">Checking MFA status…</span>
      </div>
    );
  }

  if (status === "enabled") {
    return (
      <div className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Authenticator App</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 ml-6">Your account is protected with 2-step verification.</p>
          </div>
          <button
            onClick={removeMFA}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
            Remove
          </button>
        </div>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>
    );
  }

  if (step === "idle") {
    return (
      <div className="py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">Authenticator App</p>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] px-2 py-0.5 rounded-full">Not enabled</span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 ml-6">Use Google Authenticator or Authy for login verification.</p>
        </div>
        <button
          onClick={startEnroll}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 px-3 py-1.5 text-[10px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
          Enable 2FA
        </button>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">Set up Authenticator App</p>
      <ol className="space-y-2 text-xs text-[hsl(var(--muted-foreground))] list-decimal list-inside">
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
        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
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
          className="flex-1 rounded-lg border border-[hsl(var(--border))] py-2 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={verifyEnroll}
          disabled={loading || code.length !== 6}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] py-2 text-xs font-semibold text-[#0a0e1a] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Verify & Enable
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, saveSettings, applyVisual } = useSettings();
  const [draft, setDraft] = useState<Settings>(settings);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  useEffect(() => { setDraft(settings); }, [settings]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      applyVisual(next.theme, next.density, next.animations);
      return next;
    });
  }

  function updateNotification(key: keyof Settings["notifications"], value: boolean) {
    if (value && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setDraft((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
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

  function renderContent(id: SectionId) {
    switch (id) {
      case "appearance":
        return (
          <>
            <SettingRow wide label="Theme" description="Terminal color scheme — previewed live, saved on click Save">
              <SegmentedPills<Theme>
                options={["dark", "midnight", "oled", "nord", "bloomberg", "pink", "light"]}
                value={draft.theme}
                onChange={(v) => update("theme", v)}
                labels={{ dark: "Dark", midnight: "Midnight", oled: "OLED", nord: "Nord", bloomberg: "Bloomberg", pink: "Pink", light: "Light" }}
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
          </>
        );

      case "market":
        return (
          <>
            <SettingRow wide label="Tracked Assets" description="Select which assets appear in your terminal">
              <MultiSelect options={ALL_ASSETS} selected={draft.trackedAssets} onToggle={toggleAsset} labelFn={getSymbolLabel} />
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
          </>
        );

      case "risk":
        return (
          <>
            <SettingRow label="Account Balance" description="Your trading account size — used by the lot size calculator">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">$</span>
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
                      "rounded-md px-2.5 py-1 text-[10px] font-medium transition-all border cursor-pointer",
                      draft.riskPerTrade === pct
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
            <div className="mt-2 rounded-lg border border-[hsl(var(--border))]/50 bg-[hsl(var(--secondary))]/40 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Max risk at {draft.riskPerTrade}%</span>
              <span className="text-base font-mono font-bold text-amber-400">
                ${(draft.accountBalance * draft.riskPerTrade / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        );

      case "time":
        return (
          <>
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
          </>
        );

      case "notifications":
        return (
          <>
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
            <SettingRow label="Welcome Tone" description="Play the startup chime and voice greeting on app open">
              <Toggle
                checked={draft.welcomeTone}
                onChange={(v) => {
                  update("welcomeTone", v);
                  try {
                    const raw = localStorage.getItem("tradex_settings");
                    const cur = raw ? JSON.parse(raw) : {};
                    localStorage.setItem("tradex_settings", JSON.stringify({ ...cur, welcomeTone: v }));
                  } catch {}
                }}
              />
            </SettingRow>
            {typeof Notification !== "undefined" && Notification.permission === "denied" && (
              <p className="mt-2 text-xs text-red-400">
                Browser notifications are blocked. Enable them in your browser site settings.
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-white/6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">Sound Preview</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: "Order Filled", desc: "On Take Trade",  fn: playOrderFilled,    color: "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" },
                  { label: "High Impact",  desc: "News / Trump",   fn: playHighImpactAlert, color: "text-red-400 border-red-500/30 hover:bg-red-500/10" },
                  { label: "Signal Armed", desc: "EXEC Armed",     fn: playSignalArmed,     color: "text-amber-400 border-amber-500/30 hover:bg-amber-500/10" },
                  { label: "App Open",     desc: "Login / Launch", fn: playAppOpen,         color: "text-sky-400 border-sky-500/30 hover:bg-sky-500/10" },
                ] as const).map(({ label, desc, color, fn }) => (
                  <button
                    key={label}
                    onClick={() => { unlockAudio(); fn(); }}
                    className={cn("flex flex-col items-center gap-1 py-3 px-2 rounded-lg border bg-white/3 transition-colors text-center cursor-pointer", color)}
                  >
                    <span className="text-[11px] font-bold">{label}</span>
                    <span className="text-[9px] text-zinc-600">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case "feed":
        return (
          <>
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
          </>
        );

      case "security":
        return <MFASection />;

      case "danger":
        return (
          <div className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Delete Account</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
            <button
              onClick={async () => {
                if (!window.confirm("Permanently delete your account? This cannot be undone.")) return;
                try {
                  const res = await fetch("/api/account/delete", { method: "DELETE" });
                  if (res.ok) window.location.href = "/login";
                } catch {}
              }}
              className="shrink-0 flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <Trash2 className="h-3 w-3" /> Delete Account
            </button>
          </div>
        );
    }
  }

  const activeSectionMeta = NAV_SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">

      {/* ── Left: Category nav ─────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col w-full md:w-60 md:border-r border-[hsl(var(--border))]/50 shrink-0 overflow-y-auto",
        activeSection ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Settings</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Customize your terminal</p>
        </div>

        {/* Unsaved banner */}
        {isDirty && (
          <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
            <span className="text-[10px] text-amber-400 flex-1 font-medium">Unsaved changes</span>
            <button
              onClick={handleReset}
              className="rounded px-2 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] transition-all cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 hover:bg-[hsl(var(--primary))]/20 transition-all cursor-pointer"
            >
              <Save className="h-2.5 w-2.5" /> Save
            </button>
          </div>
        )}
        {savedAt && (
          <div className="mx-3 mb-3 flex items-center gap-1.5 rounded-xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 px-3 py-2.5">
            <CheckCircle2 className="h-3 w-3 text-[hsl(var(--primary))]" />
            <span className="text-[10px] text-[hsl(var(--primary))] font-medium">Settings saved</span>
          </div>
        )}

        {/* Nav rows */}
        <nav className="flex-1 pb-2">
          {NAV_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-[9px] text-left transition-colors cursor-pointer",
                  isActive
                    ? "border-l-2 border-[hsl(var(--primary))] bg-white/[0.03] pl-[14px]"
                    : "hover:bg-white/[0.03]"
                )}
              >
                <Icon className={cn(
                  "h-3 w-3 shrink-0 opacity-50",
                  isActive ? "text-[hsl(var(--foreground))]" : section.danger ? "text-red-400" : "text-[hsl(var(--muted-foreground))]"
                )} strokeWidth={1.5} />
                <span className={cn(
                  "flex-1 text-[11.5px] font-medium tracking-[0.01em]",
                  section.danger ? "text-red-400" : isActive ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"
                )}>
                  {section.label}
                </span>
              </button>
            );
          })}
        </nav>

        <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))]/40 py-3 px-4">
          TradeX Terminal v0.1.0
        </p>
      </div>

      {/* ── Right: Section content ─────────────────────────────────────── */}
      <div className={cn(
        "flex-1 overflow-y-auto",
        !activeSection ? "hidden md:flex md:items-center md:justify-center" : "block"
      )}>
        {activeSection ? (
          <div>
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[hsl(var(--border))]/40 sticky top-0 bg-[hsl(var(--background))]/95 backdrop-blur z-10">
              <button
                onClick={() => setActiveSection(null)}
                className="md:hidden flex items-center gap-1 text-[hsl(var(--primary))] text-sm font-medium cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Settings
              </button>
              {activeSectionMeta && (
                <div className="hidden md:flex items-center gap-2.5">
                  <activeSectionMeta.icon className="h-3.5 w-3.5 opacity-50 text-[hsl(var(--muted-foreground))]" strokeWidth={1.5} />
                  <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">{activeSectionMeta.label}</h2>
                </div>
              )}
              {/* Save/Reset on desktop in section header */}
              {isDirty && (
                <div className="ml-auto hidden md:flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2.5 py-1.5 text-[10px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 px-3 py-1.5 text-[10px] font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 transition-all cursor-pointer"
                  >
                    <Save className="h-3 w-3" /> Save Settings
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-5 py-2">
              {renderContent(activeSection)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))]">
              <Settings2 className="h-7 w-7 text-[hsl(var(--muted-foreground))]/40" />
            </span>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Select a section</p>
          </div>
        )}
      </div>
    </div>
  );
}
