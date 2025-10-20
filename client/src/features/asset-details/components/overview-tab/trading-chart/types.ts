/**
 * Trading Chart Types
 * 
 * Purpose: Type definitions for trading chart components using authentic sales data
 * Exports: TradingChartData interface for real marketplace sales
 * Feature: asset-details
 */

export interface TradingChartData {
  time: string; // epoch timestamp as string for TradingView
  value: number; // price value
  date?: string; // YYYY-MM-DD format for easier filtering
  saleInfo?: {
    title: string;
    condition: string;
    saleType: string;
    sellerName: string;
    totalPrice: number;
    shipping: number;
    soldDate: string;
  };
}