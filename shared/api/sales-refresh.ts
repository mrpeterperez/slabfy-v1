import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './endpoints';

export interface SalesRefreshResult {
  success: boolean;
  message?: string;
  salesCount?: number;
  savedCount?: number;
  totalSalesInDatabase?: number;
  new_records_added?: number; // legacy shape support
  total_cached_records?: number; // legacy shape support
}

export async function refreshSales(assetId: string, useAIFiltering = true): Promise<SalesRefreshResult> {
  // Use apiRequest helper which automatically handles auth tokens
  const res = await apiRequest('POST', API_ENDPOINTS.SALES_REFRESH, { assetId, useAIFiltering });
  return res.json();
}
