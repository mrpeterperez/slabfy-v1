import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AnalyticsTransaction, AnalyticsFilters, AnalyticsSummary } from "../types/analytics-types";

export function useAnalyticsData(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ['/api/analytics/transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.type && filters.type !== 'all') {
        params.append('type', filters.type);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.eventId) {
        params.append('eventId', filters.eventId);
      }
      
      const response = await apiRequest('GET', `/api/analytics/transactions?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        transactions: data.transactions as AnalyticsTransaction[],
        summary: data.summary as AnalyticsSummary
      };
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}