/**
 * @file sales-types.ts
 * @description Shared type definitions for sales data across the application
 * @exports SalesRecord, SalesMetrics, LiquidityRating, FlexibleAsset
 */

// Database-aligned SalesRecord type matching actual schema
export interface SalesRecord {
  id: string;
  global_asset_id: string;
  title: string;
  final_price: number;
  listing_price: number;
  shipping: number;
  sold_date: string; // timestamp from database
  condition: string;
  marketplace: string;
  listing_type: string;
  seller_name: string;
  seller_feedback: number;
  seller_rating: number;
  listing_url: string;
  image_url: string;
  source_api_call: string;
  created_at: string;
}

export interface SalesMetrics {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  totalSales: number;
  salesCount: number;
  liquidityData: LiquidityRating;
}

export interface LiquidityRating {
  rating: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  percentage: number;
}

// Flexible asset type for compatibility across components
export type FlexibleAsset = {
  id?: string;
  title?: string;
  playerName?: string | null;
  setName?: string | null;
  year?: string | null;
  cardNumber?: string | null;
  grade?: string | null;
  purchasePrice?: string | number | null;
  certNumber?: string | null;
  grader?: string | null;
  [key: string]: any;
};

export interface UseSalesMetricsOptions {
  timeframe?: string; // e.g., "30 days", "90 days"
  providedSalesData?: SalesRecord[]; // Use pre-filtered sales data if provided
}

export interface UseSalesMetricsReturn {
  metrics: SalesMetrics;
  salesData: SalesRecord[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}