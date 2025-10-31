/**
 * Conditional logging utility for development and production
 * 
 * - dev(): Only logs in development mode
 * - error(): Always logs errors (production-safe)
 * - warn(): Always logs warnings (production-safe)
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log only in development mode
   * Use this for debugging, trace logs, and development-only information
   */
  dev: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Always log errors (production-safe)
   * Use this for error conditions that need investigation
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Always log warnings (production-safe)
   * Use this for potential issues that don't break functionality
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },
};
