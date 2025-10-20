/**
 * Universal Chart Hook
 * 
 * Purpose: Centralized chart data processing and time range filtering for all assets
 * Ensures consistent behavior across the entire platform for current and future implementations
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { filterDataByTimeRange, type TimeRange } from '../components/overview-tab/trading-chart/utils/time-range-filter';
import { apiRequest } from '@/lib/queryClient';
import type { TradingChartData } from '../components/overview-tab/trading-chart/types';

// Use TradingChartData directly instead of extending undefined ChartDataPoint
export type UniversalChartData = TradingChartData;

interface UseUniversalChartProps {
  assetId: string | undefined;
  selectedRange: TimeRange;
  enabled?: boolean;
}

/**
 * Universal chart hook that works for ALL assets across the platform
 * Provides consistent data processing, caching, and time range filtering
 */
export function useUniversalChart({ assetId, selectedRange, enabled = true }: UseUniversalChartProps) {
  // Fetch sales data with standardized caching
  const { data: salesData, isLoading: isLoadingSales, error: salesError } = useQuery({
    queryKey: ['universal-sales-comp', assetId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/sales/sales-comp-universal/${assetId}`);
      return response.json();
    },
    enabled: !!assetId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch pricing data with standardized caching
  const { data: pricingData, isLoading: isLoadingPricing, error: pricingError } = useQuery({
    queryKey: ['universal-pricing', assetId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/pricing/${assetId}`);
      return response.json();
    },
    enabled: !!assetId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Process and filter chart data universally
  const chartData = useMemo((): UniversalChartData[] => {
    const salesHistory = (salesData as any)?.sales_history;
    if (!salesHistory?.length) return [];

    // Debug: Log raw API timing data to understand what's available
    console.log('🔍 Raw sales data timing fields:', salesHistory?.slice(0, 3).map((sale: any, i: number) => ({
      index: i,
      price: sale.final_price || sale.price?.value || sale.sold_price?.value || sale.price,
      sold_date: sale.sold_date,
      sold_timestamp: sale.sold_timestamp, 
      end_time: sale.end_time,
      listing_end_time: sale.listing_end_time,
      timestamp: sale.timestamp,
      created_at: sale.created_at,
      raw_date: sale.sold_date?.date?.raw
    })));

    // Convert sales to standardized chart format with robust date/price handling
    const processedData = salesHistory
      .filter((sale: any) => {
        // Check for any valid date field
        const hasDate = sale.sold_date?.date?.raw || sale.sold_date || sale.date_sold || sale.endDate || sale.date;
        // Check for any valid price field  
        const hasPrice = sale.final_price || sale.price?.value || sale.sold_price?.value || sale.price;
        return hasDate && hasPrice;
      })
      .map((sale: any, index: number) => {
        // Handle various date formats like sparklines does
        let dateStr: string;
        if (sale.sold_date?.date?.raw) {
          dateStr = sale.sold_date.date.raw;
        } else if (sale.sold_date) {
          dateStr = sale.sold_date;
        } else if (sale.date_sold) {
          dateStr = sale.date_sold;
        } else if (sale.endDate) {
          dateStr = sale.endDate;
        } else {
          dateStr = sale.date;
        }
        
        const saleDate = new Date(dateStr);
        
        // Handle various price formats like sparklines does
        let price: number;
        if (sale.final_price) {
          price = parseFloat(sale.final_price.toString());
        } else if (sale.price?.value) {
          price = parseFloat(sale.price.value.toString());
        } else if (sale.sold_price?.value) {
          price = parseFloat(sale.sold_price.value.toString());
        } else {
          price = parseFloat(sale.price.toString());
        }
        const shipping = parseFloat(sale.shipping) || 0;
        const totalPrice = price + shipping;

        return {
          // Chart shows oldest→newest, so we need to reverse database order
          // Database gives us newest first, but chart needs oldest first
          time: Math.floor(saleDate.getTime() / 1000 + (salesData.length - 1 - index)).toString(),
          value: totalPrice,
          date: saleDate.toISOString().split('T')[0],
          saleInfo: {
            title: sale.title || 'Unknown',
            condition: sale.condition || 'Unknown',
            saleType: sale.listingType || 'Buy It Now',
            sellerName: sale.seller_info?.name || 'Unknown',
            totalPrice: totalPrice,
            shipping: shipping,
            soldDate: dateStr
          }
        };
      })
      // FIX: Sort by timestamp to ensure oldest → newest display (left to right)
      // This should show $141 (oldest) on left → $130 (newest) on right
      .sort((a: TradingChartData, b: TradingChartData) => {
        const timeA = parseInt(a.time);
        const timeB = parseInt(b.time);
        console.log('Chart sorting:', { 
          priceA: a.value, 
          timeA, 
          priceB: b.value, 
          timeB, 
          result: timeA - timeB,
          dateA: new Date(timeA * 1000).toISOString(),
          dateB: new Date(timeB * 1000).toISOString()
        });
        return timeA - timeB; // Ascending order = oldest first
      });

    // Apply universal time range filtering
    return filterDataByTimeRange(processedData, selectedRange);
  }, [salesData, selectedRange]);

  // Calculate metrics from filtered data
  const metrics = useMemo(() => {
    if (!chartData.length) {
      return {
        averagePrice: 0,
        salesCount: 0,
        priceRange: { min: 0, max: 0 },
        recentSalesCount: 0
      };
    }

    const prices = chartData.map(point => point.value);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Count recent sales (30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentSalesCount = chartData.filter(point => {
      const saleTime = parseInt(point.time) * 1000;
      return saleTime >= thirtyDaysAgo;
    }).length;

    return {
      averagePrice,
      salesCount: chartData.length,
      priceRange: { min: minPrice, max: maxPrice },
      recentSalesCount
    };
  }, [chartData]);

  return {
    // Data
    chartData,
    salesData: (salesData as any)?.sales_history || [],
    pricingData: pricingData as any,
    
    // Metrics
    metrics,
    
    // Loading states
    isLoading: isLoadingSales || isLoadingPricing,
    isLoadingSales,
    isLoadingPricing,
    
    // Error states
    error: salesError || pricingError,
    salesError,
    pricingError,
    
    // Computed properties
    hasData: chartData.length > 0,
    liquidityRating: (pricingData as any)?.liquidityRating || 'cold',
    averagePrice: (pricingData as any)?.averagePrice || metrics.averagePrice
  };
}

/**
 * Hook specifically for chart components that need processed chart data
 */
export function useChartData(assetId: string | undefined, selectedRange: TimeRange) {
  const { chartData, isLoading, error, hasData } = useUniversalChart({ 
    assetId, 
    selectedRange 
  });

  return {
    data: chartData,
    isLoading,
    error,
    hasData
  };
}

/**
 * Hook specifically for pricing components that need metrics
 */
export function usePricingMetrics(assetId: string | undefined) {
  const { metrics, pricingData, isLoading, error } = useUniversalChart({ 
    assetId, 
    selectedRange: 'ALL' // Get all data for comprehensive metrics
  });

  return {
    ...metrics,
    liquidityRating: (pricingData as any)?.liquidityRating || 'cold',
    isLoading,
    error
  };
}