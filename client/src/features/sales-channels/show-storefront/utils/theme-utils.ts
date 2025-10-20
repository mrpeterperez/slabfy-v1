// 🤖 INTERNAL NOTE:
// Purpose: Theme utilities for determining active colors based on theme mode
// Exports: getActiveColors, shouldUseDarkMode functions
// Feature: sales-channels/show-storefront
// Dependencies: none

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeColors {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFontColor: string;
  bodyFontColor: string;
}

interface StorefrontSettings {
  // Light mode
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  headingFontColor?: string | null;
  bodyFontColor?: string | null;
  
  // Dark mode
  primaryColorDark?: string | null;
  accentColorDark?: string | null;
  backgroundColorDark?: string | null;
  textColorDark?: string | null;
  headingFontColorDark?: string | null;
  bodyFontColorDark?: string | null;
  
  themeMode?: string | null;
}

/**
 * Determines if dark mode should be used based on theme mode setting
 * Now checks user's local preference first (set by floating theme toggle)
 */
export function shouldUseDarkMode(themeMode: ThemeMode = "light"): boolean {
  // Check if user has set a preference via the floating toggle
  const userPreference = localStorage.getItem('storefront-user-theme-preference') as ThemeMode | null;
  const rootTheme = document.documentElement.getAttribute('data-storefront-theme');
  
  // If user has explicitly set a preference, honor it
  if (rootTheme === 'dark') return true;
  if (rootTheme === 'light') return false;
  
  // Fall back to settings theme mode
  if (themeMode === "dark") return true;
  if (themeMode === "light") return false;
  
  // Auto mode - check system preference
  if (themeMode === "auto") {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  return false;
}

/**
 * Determines if a color is light or dark (for auto-contrast calculation)
 */
function isLightColor(hexColor: string): boolean {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5;
}

/**
 * Gets the active colors based on current theme mode
 * Font colors are automatically calculated based on background for optimal contrast
 * Heading text is PURE WHITE when overlaying colored backgrounds for maximum readability
 */
export function getActiveColors(settings: StorefrontSettings | null | undefined): ThemeColors {
  const themeMode = (settings?.themeMode as ThemeMode) || "light";
  const useDarkMode = shouldUseDarkMode(themeMode);
  
  if (useDarkMode) {
    const bgColor = settings?.backgroundColorDark || "#0a0a0a";
    const primaryColor = settings?.primaryColorDark || "#0aa5b0";
    const isLightBg = isLightColor(bgColor);
    
    return {
      primaryColor,
      accentColor: settings?.accentColorDark || "#0aa5b0",
      backgroundColor: bgColor,
      textColor: settings?.textColorDark || "#ffffff",
      // Heading: pure white for colored backgrounds, primary color for light plain backgrounds
      headingFontColor: isLightBg ? primaryColor : "#ffffff",
      bodyFontColor: isLightBg ? "#2a2a2a" : "#f0f0f0", // Slightly lighter for better readability
    };
  }
  
  const bgColor = settings?.backgroundColor || "#ffffff";
  const primaryColor = settings?.primaryColor || "#037C85";
  const isLightBg = isLightColor(bgColor);
  
  return {
    primaryColor,
    accentColor: settings?.accentColor || "#037C85",
    backgroundColor: bgColor,
    textColor: settings?.textColor || "#000000",
    // Heading: pure white for colored backgrounds, primary color for light plain backgrounds
    headingFontColor: isLightBg ? primaryColor : "#ffffff",
    bodyFontColor: isLightBg ? "#2a2a2a" : "#f0f0f0", // Slightly lighter for better readability
  };
}
