/**
 * @file formatters.ts
 * @description Utility functions for formatting asset detail values
 * @exports formatValue, formatCurrency, formatDate
 * @feature asset-details
 */

/**
 * Format a value for display, handling undefined, null, boolean, and numeric values
 */
export const formatValue = (value: any) => {
  if (value === null || value === undefined) return "Not specified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toString();
  return value;
};

/**
 * Format a currency value for display
 */
export const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "Not specified";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

/**
 * Format a date string for display
 */
export const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "Not specified";
  return new Date(dateStr).toLocaleDateString();
};
