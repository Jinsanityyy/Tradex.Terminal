"use client";

import { Theme } from "@/contexts/SettingsContext";
import { useSettings } from "@/contexts/SettingsContext";

export type SectionHeaderStyle = "terminal" | "normal" | "minimal";
export type ProgressBarStyle = "segmented" | "smooth";
export type BadgeStyle = "flat" | "pill" | "outline";
export type DividerStyle = "line" | "none";
export type FontFamily = "mono" | "sans";
export type Density = "compact" | "default" | "comfortable";

export interface ThemePersonality {
  sectionHeaderStyle: SectionHeaderStyle;
  progressBarStyle: ProgressBarStyle;
  badgeStyle: BadgeStyle;
  dividerStyle: DividerStyle;
  fontFamily: FontFamily;
  density: Density;
}

export const THEME_PERSONALITIES: Record<Theme, ThemePersonality> = {
  bloomberg: {
    sectionHeaderStyle: "terminal",
    progressBarStyle: "segmented",
    badgeStyle: "flat",
    dividerStyle: "line",
    fontFamily: "mono",
    density: "compact",
  },
  dark: {
    sectionHeaderStyle: "normal",
    progressBarStyle: "smooth",
    badgeStyle: "pill",
    dividerStyle: "none",
    fontFamily: "sans",
    density: "default",
  },
  midnight: {
    sectionHeaderStyle: "normal",
    progressBarStyle: "smooth",
    badgeStyle: "pill",
    dividerStyle: "none",
    fontFamily: "sans",
    density: "default",
  },
  oled: {
    sectionHeaderStyle: "minimal",
    progressBarStyle: "smooth",
    badgeStyle: "outline",
    dividerStyle: "line",
    fontFamily: "sans",
    density: "compact",
  },
  nord: {
    sectionHeaderStyle: "normal",
    progressBarStyle: "smooth",
    badgeStyle: "pill",
    dividerStyle: "none",
    fontFamily: "sans",
    density: "comfortable",
  },
  pink: {
    sectionHeaderStyle: "normal",
    progressBarStyle: "smooth",
    badgeStyle: "pill",
    dividerStyle: "none",
    fontFamily: "sans",
    density: "default",
  },
  light: {
    sectionHeaderStyle: "normal",
    progressBarStyle: "smooth",
    badgeStyle: "pill",
    dividerStyle: "none",
    fontFamily: "sans",
    density: "default",
  },
};

export function useThemePersonality(): ThemePersonality {
  const { settings } = useSettings();
  return THEME_PERSONALITIES[settings.theme];
}
