/**
 * TradingChart Export
 *
 * Exports the base TradingChart component with controlled time range state
 */

export { default } from './trading-chart';
// Re-export TimeRange from the source where it's defined
export type { TimeRange } from './utils/time-range-filter';