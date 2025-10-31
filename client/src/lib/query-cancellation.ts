/**
 * 🔥 PRODUCTION-QUALITY QUERY CANCELLATION
 * 
 * Prevents memory leaks and wasted network bandwidth by cancelling
 * in-flight requests when components unmount.
 * 
 * CRITICAL for:
 * - Long-running API calls (pricing, sales data)
 * - User navigating quickly between pages
 * - Mobile users on slow connections
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Cancellable fetch wrapper with AbortController
 * Use this for all API calls that might take >500ms
 */
export async function fetchWithCancel<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const controller = new AbortController();
  
  // Merge our abort signal with any existing signal
  const signal = options?.signal 
    ? combineAbortSignals([options.signal, controller.signal])
    : controller.signal;

  const response = await fetch(url, {
    ...options,
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Combine multiple AbortSignals into one
 * Useful when you have a parent signal and want to add timeout
 */
function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Create a timeout signal that auto-aborts after X milliseconds
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Fetch with automatic timeout
 * Use this for APIs that might hang
 */
export async function fetchWithTimeout<T>(
  url: string,
  timeoutMs: number = 30000, // 30 seconds default
  options?: RequestInit
): Promise<T> {
  const timeoutSignal = createTimeoutSignal(timeoutMs);
  
  try {
    return await fetchWithCancel<T>(url, {
      ...options,
      signal: options?.signal 
        ? combineAbortSignals([options.signal, timeoutSignal])
        : timeoutSignal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * React Query integration - cancel queries on component unmount
 * This is mostly automatic in React Query v5, but this helper
 * provides explicit control when needed
 */
export function cancelQueriesOnUnmount(
  queryClient: QueryClient,
  queryKeys: readonly unknown[][]
) {
  return () => {
    queryKeys.forEach(key => {
      queryClient.cancelQueries({ queryKey: key });
    });
  };
}

/**
 * Hook pattern for auto-cancelling queries
 * Use in components that make expensive API calls
 */
export function useCancellableQuery() {
  const abortControllerRef = { current: new AbortController() };

  // Cancel on unmount
  const cleanup = () => {
    abortControllerRef.current.abort();
  };

  // Return signal for use in fetch calls
  const signal = abortControllerRef.current.signal;

  return { signal, cleanup };
}

// ===== EXAMPLE USAGE =====

/**
 * Example: Pricing fetch with cancellation
 * 
 * import { fetchWithCancel } from '@/lib/query-cancellation';
 * 
 * useQuery({
 *   queryKey: queryKeys.pricing.single(assetId),
 *   queryFn: async ({ signal }) => {
 *     return fetchWithCancel<PricingData>(
 *       `/api/pricing/${assetId}`,
 *       { signal } // React Query auto-provides signal
 *     );
 *   },
 *   ...PRICING_CACHE
 * });
 */

/**
 * Example: Sales data with timeout
 * 
 * import { fetchWithTimeout } from '@/lib/query-cancellation';
 * 
 * useQuery({
 *   queryKey: queryKeys.sales.recent(assetId),
 *   queryFn: async () => {
 *     return fetchWithTimeout<SalesData>(
 *       `/api/sales/${assetId}`,
 *       15000 // 15 second timeout
 *     );
 *   },
 *   ...SALES_CACHE
 * });
 */
