// 🤖 INTERNAL NOTE:
// Purpose: TypeScript types for theme data
// Exports: ThemeData interface
// Feature: sales-channels/show-storefront
// Dependencies: None
// NOTE: Heading/body font colors are auto-calculated based on background luminance (see theme-utils.ts)

export interface ThemeData {
  name: string;
  category: "bold" | "sophisticated" | "modern" | "elegant";
  // Light mode
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  // Dark mode
  primaryColorDark: string;
  accentColorDark: string;
  backgroundColorDark: string;
  textColorDark: string;
  // Fonts
  headingFont: string;
  bodyFont: string;
  buttonRadius: number;
}
