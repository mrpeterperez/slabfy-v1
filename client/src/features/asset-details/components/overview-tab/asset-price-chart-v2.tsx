/**
 * AssetPriceChartV2 Component
 * 
 * Purpose: Displays authentic marketplace sales data in TradingView chart
 * Data Source: /api/sales-comp-universal and /api/pricing endpoints
 * Feature: Real-time price movement visualization with authentic sales history
 */

import React, { useMemo, useState } from "react";
import { Asset } from "@shared/schema";
import TradingChart from "./trading-chart/trading-chart";
import type { TradingChartData } from "./trading-chart/types";
import { useQuery } from "@tanstack/react-query";
import type { TimeRange } from "./trading-chart/utils/time-range-filter";

interface AssetPriceChartV2Props {
  cardData?: Asset | null;
  className?: string;
}

export default function AssetPriceChartV2({ cardData, className }: AssetPriceChartV2Props) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1M');
  
  // Fetch authentic sales data from our API
  const { data: salesResponse, isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales-comp-universal', cardData?.id],
    queryFn: async () => {
      if (!cardData?.id) return null;
      const response = await fetch(`/api/sales/sales-comp-universal/${cardData.id}`);
      if (!response.ok) throw new Error('Failed to fetch sales data');
      return response.json();
    },
    enabled: !!cardData?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch pricing metrics with shorter cache for refresh responsiveness
  const { data: pricingData, isLoading: isLoadingPricing } = useQuery({
    queryKey: ['pricing', cardData?.id],
    queryFn: async () => {
      if (!cardData?.id) return null;
      const response = await fetch(`/api/pricing/${cardData.id}`);
      if (!response.ok) throw new Error('Failed to fetch pricing data');
      return response.json();
    },
    enabled: !!cardData?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes  
    refetchOnWindowFocus: false,
  });



  // Debug chart data - moved after chartData declaration



  // Transform authentic sales into chart data points
  const chartData: TradingChartData[] = useMemo(() => {
    // Use sales_history from the API response
    const salesData = salesResponse?.sales_history || [];
    
    if (!salesData?.length) {
      return [];
    }
    
    const transformedData = salesData
      .filter((sale: any) => {
        // Check for valid date and price
        const hasDate = sale.sold_date?.date?.raw || sale.sold_date;
        const hasPrice = sale.sold_price?.value || sale.price?.value;
        return hasDate && hasPrice && hasPrice > 0;
      })
      .map((sale: any) => {
        // Extract price - prioritize sold_price.value
        const salePrice = parseFloat(sale.sold_price?.value || sale.price?.value || '0');
        const shipping = parseFloat(sale.shipping || '0');
        const totalPrice = salePrice + shipping;
        
        // Extract date - prioritize sold_date.date.raw
        const rawDate = sale.sold_date?.date?.raw || sale.sold_date;
        const dateObj = new Date(rawDate);
        
        // Validate date
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid date:', rawDate);
          return null;
        }
        
        // Convert to epoch seconds (lightweight-charts requirement)
        const epochTime = Math.floor(dateObj.getTime() / 1000);
        
        // Extract YYYY-MM-DD for filtering
        const dateStr = dateObj.toISOString().split('T')[0];
        
        return {
          time: epochTime,  // Use number instead of string
          value: totalPrice,
          date: dateStr,
          saleInfo: {
            title: sale.title || 'Unknown Item',
            condition: sale.condition || 'Unknown',
            saleType: sale.listingType || 'Unknown',
            sellerName: sale.seller_info?.name || 'Unknown',
            totalPrice,
            shipping,
            soldDate: dateStr
          }
        };
      })
      .filter(Boolean) // Remove null entries from invalid dates
      .sort((a: any, b: any) => a.time - b.time); // Sort by time ascending
    
    
    return transformedData;
  }, [salesResponse]);



  return (
    <div className="w-full" style={{ minHeight: 'auto', height: '100%' }}>
      <TradingChart 
        data={chartData}
        cardData={cardData}
        symbolName={cardData?.playerName || 'Asset Price'}
        averagePrice={pricingData?.averagePrice || 0}
        salesData={salesResponse?.sales_history || []} // Pass raw sales data for counting
        isLoadingSales={isLoadingSales || isLoadingPricing}
        salesCount={0} // Will be calculated by trading chart from raw salesData
        liquidityRating={pricingData?.liquidity || 'cold'}
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={setSelectedTimeRange}
        confidence={pricingData?.confidence || 0}
        pricingData={pricingData}
        className="w-full h-full"
      />
    </div>
  );
}