// 🤖 INTERNAL NOTE:
// Purpose: Hook to generate CSS custom properties for storefront theming
// Exports: useStorefrontTheme hook
// Feature: sales-channels/show-storefront
// Dependencies: None

import { useMemo } from "react";
import type { StorefrontSettings } from "@shared/schema";

export type ThemeMode = "light" | "dark" | "auto";

export function useStorefrontTheme(
  settings: Partial<StorefrontSettings> | null,
  themeMode: ThemeMode = "light"
) {
  const cssVariables = useMemo(() => {
    if (!settings) return {};

    // Determine if we should use dark mode colors
    const isDark = themeMode === "dark" || 
      (themeMode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    return {
      "--storefront-primary": isDark 
        ? (settings.primaryColorDark || settings.primaryColor || "#0aa5b0")
        : (settings.primaryColor || "#037C85"),
      
      "--storefront-accent": isDark
        ? (settings.accentColorDark || settings.accentColor || "#0aa5b0")
        : (settings.accentColor || "#037C85"),
      
      "--storefront-background": isDark
        ? (settings.backgroundColorDark || "#0a0a0a")
        : (settings.backgroundColor || "#ffffff"),
      
      "--storefront-text": isDark
        ? (settings.textColorDark || "#ffffff")
        : (settings.textColor || "#000000"),
      
      "--storefront-button-radius": `${settings.buttonRadius || 16}px`,
    } as React.CSSProperties;
  }, [settings, themeMode]);

  return cssVariables;
}
