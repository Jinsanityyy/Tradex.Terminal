"use client";

import React from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { AGENT_SYMBOLS, getSymbolLabel, getSymbolShort } from "@/lib/assetImpact";

// ── Bottom Sheet ──────────────────────────────────────────────────────────────

interface AssetSelectorSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AssetSelectorSheet({ open, onClose }: AssetSelectorSheetProps) {
  const { settings, saveSettings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";

  function selectAsset(sym: string) {
    saveSettings({ ...settings, selectedSymbol: sym });
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative rounded-t-2xl border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="h-1 w-10 rounded-full bg-[hsl(var(--muted))]" />
        </div>

        <div className="px-5 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--text-secondary))] mb-4">
            Active Asset
          </p>
          <div className="space-y-2.5">
            {AGENT_SYMBOLS.map((sym) => {
              const isSelected = selectedSymbol === sym;
              return (
                <button
                  key={sym}
                  onClick={() => selectAsset(sym)}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]",
                    isSelected
                      ? "bg-[hsl(var(--primary))]/12 border border-[hsl(var(--primary))]/35"
                      : "bg-[hsl(var(--foreground)_/_0.05)] border border-[hsl(var(--border))] active:bg-[hsl(var(--foreground)_/_0.1)]"
                  )}
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center text-[13px] font-bold font-mono shrink-0",
                      isSelected
                        ? "bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]"
                        : "bg-[hsl(var(--foreground)_/_0.08)] text-[hsl(var(--foreground))]"
                    )}
                  >
                    {sym.slice(0, 3)}
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className={cn(
                        "text-[15px] font-semibold leading-tight",
                        isSelected ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--foreground))]"
                      )}
                    >
                      {getSymbolLabel(sym)}
                    </p>
                    <p className="text-[11px] text-[hsl(var(--text-secondary))] font-mono mt-0.5">
                      {getSymbolShort(sym)}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-[hsl(var(--primary))] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chip trigger ──────────────────────────────────────────────────────────────

interface AssetChipProps {
  onPress: () => void;
  size?: "sm" | "md";
}

export function AssetChip({ onPress, size = "md" }: AssetChipProps) {
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";

  return (
    <button
      onClick={onPress}
      className={cn(
        "flex items-center gap-1.5 border transition-all active:scale-95",
        "rounded-[2px] bg-transparent",
        size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5"
      )}
      style={{ borderColor: "hsl(var(--primary))" }}
    >
      <span
        className={cn(
          "font-bold",
          size === "sm" ? "text-[11px]" : "text-[11px]"
        )}
        style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono','Courier New',monospace", color: "hsl(var(--primary))" }}
      >
        {getSymbolShort(selectedSymbol)}
      </span>
      <ChevronDown
        className={cn(
          "opacity-60",
          size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
        )}
        style={{ color: "hsl(var(--primary))" }}
      />
    </button>
  );
}
