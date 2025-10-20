// 🤖 INTERNAL NOTE:
// Purpose: Central export for all theme data
// Exports: PRE_MADE_THEMES array, ThemeData type
// Feature: sales-channels/show-storefront
// Dependencies: Theme category files

export { type ThemeData } from "./theme-types";
export { BOLD_THEMES } from "./bold-themes";
export { SOPHISTICATED_THEMES } from "./sophisticated-themes";
export { MODERN_THEMES } from "./modern-themes";
export { ELEGANT_THEMES } from "./elegant-themes";

import { BOLD_THEMES } from "./bold-themes";
import { SOPHISTICATED_THEMES } from "./sophisticated-themes";
import { MODERN_THEMES } from "./modern-themes";
import { ELEGANT_THEMES } from "./elegant-themes";

export const PRE_MADE_THEMES = [
  ...BOLD_THEMES,
  ...SOPHISTICATED_THEMES,
  ...MODERN_THEMES,
  ...ELEGANT_THEMES,
];
