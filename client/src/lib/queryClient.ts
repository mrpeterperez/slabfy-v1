import { QueryClient, QueryFunction, onlineManager } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import localforage from "localforage";
import { logger } from "./logger";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse as JSON first (for structured API errors)
      const errorData = await res.json();
      const error = new Error(errorData.error || res.statusText) as any;
      error.status = res.status;
      error.error = errorData.error;
      error.details = errorData.details;
      throw error;
    } catch (jsonError) {
      // Fall back to text if not valid JSON
      const text = res.statusText;
      const error = new Error(`${res.status}: ${text}`) as any;
      error.status = res.status;
      throw error;
    }
  }
}

// Global token refresh state to prevent race conditions
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function getAuthToken(): Promise<string> {
  if (!(window as any).supabase) return '';

  try {
    // Handle token refresh with race condition protection
    if (isRefreshing && refreshPromise) {
      const refreshedToken = await refreshPromise;
      return refreshedToken || '';
    }

    const { data: { session }, error } = await (window as any).supabase.auth.getSession();
    
    if (error || !session) {
      // Start refresh process
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          logger.dev('Attempting to refresh expired/missing session...');
          const { data: refreshData, error: refreshError } = await (window as any).supabase.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            logger.dev('Session refreshed successfully');
            return refreshData.session.access_token;
          }
          console.warn('Unable to refresh auth session:', refreshError);
          return null;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      const refreshedToken = await refreshPromise;
      return refreshedToken || '';
    } else {
      return session.access_token || '';
    }
  } catch (authError) {
    console.warn('Auth session error:', authError);
    return '';
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };

  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If we get 401, try one token refresh and retry
  if (res.status === 401 && (window as any).supabase) {
    const newToken = await getAuthToken();
    if (newToken && newToken !== token) {
      // Retry with refreshed token
      const newHeaders = {
        ...headers,
        "Authorization": `Bearer ${newToken}`,
      };
      
      res = await fetch(url, {
        method,
        headers: newHeaders,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Use the centralized token management
    const token = await getAuthToken();
    
    const headers: Record<string, string> = {
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };

    // Build URL from query key - handle both string and array formats
    let url: string;
    if (Array.isArray(queryKey) && queryKey.length > 1) {
      // For array keys like ["/api/user", userId, "assets"], join them properly
      url = queryKey.filter(Boolean).join('/').replace(/\/+/g, '/');
    } else {
      // For string keys like ["/api/user/123/assets"], use as-is
      url = queryKey[0] as string;
    }

    let res = await fetch(url, {
      credentials: "include",
      headers,
    });

    // If we get 401, try one token refresh and retry
    if (res.status === 401 && (window as any).supabase) {
      const newToken = await getAuthToken();
      if (newToken && newToken !== token) {
        // Retry with refreshed token
        const newHeaders = {
          ...headers,
          "Authorization": `Bearer ${newToken}`,
        };
        
        res = await fetch(url, {
          credentials: "include",
          headers: newHeaders,
        });
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, // Reduce aggressive refetching
      refetchOnReconnect: false, // Don't refetch on reconnect
      refetchOnMount: false, // Don't refetch on mount if data exists
      staleTime: 15 * 60 * 1000, // 15 minutes fresh (increased from 10)
      gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours (increased from 1)
      retry: 1, // Allow one retry for network issues
      structuralSharing: true, // Optimize re-renders
    },
    mutations: {
      retry: false,
    },
  },
});

// Make queryClient globally available for direct access in auth provider
if (typeof window !== "undefined") {
  (window as any).queryClient = queryClient;
}

// Track browser online/offline to prevent thrashing while offline
if (typeof window !== "undefined") {
  onlineManager.setEventListener((setOnline) => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  });
}

// Persist React Query cache to IndexedDB for offline reads
if (typeof window !== "undefined") {
  // Configure localForage to use IndexedDB under the hood
  localforage.config({
    name: "slabfy",
    storeName: "react-query",
    description: "SlabFy React Query cache",
  });

  const persister = createAsyncStoragePersister({
    storage: localforage,
    throttleTime: 2000,
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000,
  });
}
