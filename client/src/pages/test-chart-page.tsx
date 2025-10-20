/**
 * Test Chart Page - Clean Implementation
 * 
 * Purpose: Build Kobe Bryant trading chart from scratch with proper data consistency
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SalesRecord } from '@shared/sales-types';
import { createChart, IChartApi, Time } from 'lightweight-charts';

// Simple time range type
type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

// Trading Chart Component
interface TradingChartProps {
  salesData: any[];
  timeRange: TimeRange;
}

function TradingChart({ salesData, timeRange }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoverInfo, setHoverInfo] = useState<string>('');
  
  // Filter to only SOLD items and process chart data
  const chartDataInfo = useMemo(() => {
    // Filter to only SOLD items (exclude For Sale, High Bid, Last Asking Price)
    const soldSales = salesData.filter(sale => {
      return sale.sold_price?.value > 0 || sale.sale_type === 'sold' || sale.status === 'sold';
    });

    // Group SOLD sales by date
    const salesByDate = new Map<string, Array<{
      time: number;
      price: number;
      saleIndex: number;
    }>>();
    
    const individualSales: Array<{
      time: number;
      price: number;
      dateKey: string;
    }> = [];
    
    soldSales.forEach((sale, index) => {
      // Enhanced date extraction to handle multiple formats
      let dateStr = null;
      if (sale.sold_date?.date?.raw) {
        dateStr = sale.sold_date.date.raw;
      } else if (sale.date) {
        dateStr = sale.date;
      } else if (sale.sold_date) {
        dateStr = sale.sold_date;
      } else if (sale.end_date) {
        dateStr = sale.end_date;
      }
      
      if (!dateStr) return;
      
      const price = sale.sold_price?.value || sale.price?.value || 0;
      const shipping = sale.shipping || 0;
      const totalPrice = price + shipping;
      
      if (totalPrice <= 0) return;
      
      // Enhanced date parsing
      let date: Date;
      if (dateStr.includes('T')) {
        // Handle ISO format with time
        date = new Date(dateStr);
      } else {
        // Handle simple date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format for sale ${index}:`, dateStr);
        return;
      }
      
      const dateKey = date.toISOString().split('T')[0];
      const timestamp = Math.floor(date.getTime() / 1000);
      
      console.log(`Sale #${index}:`, {
        title: sale.title || 'Unknown title',
        date: dateStr,
        price: price,
        shipping: shipping,
        total: totalPrice
      });
      
      const saleData = { time: timestamp, price: totalPrice, saleIndex: index };
      
      if (!salesByDate.has(dateKey)) {
        salesByDate.set(dateKey, []);
      }
      salesByDate.get(dateKey)!.push(saleData);
      
      individualSales.push({ time: timestamp, price: totalPrice, dateKey });
    });
    
    // Create chart data map with last sold and average prices
    const chartDataMap = new Map<string, { 
      time: number; 
      lastSoldPrice: number; 
      avgPrice: number; 
      count: number; 
    }>();
    
    salesByDate.forEach((sales, dateKey) => {
      // FIX: Instead of sorting by timestamp (which is unreliable when all have same date),
      // use the FIRST sale in the original array as the "most recent" since API returns them
      // in chronological order with most recent first
      const lastSoldPrice = sales[0].price; // Take the first sale as most recent
      const avgPrice = sales.reduce((sum, sale) => sum + sale.price, 0) / sales.length;
      const timestamp = sales[0].time;
      
      // Debug logging to understand the fix
      console.log(`📅 Date ${dateKey}:`);
      console.log(`  • Sales count: ${sales.length}`);
      console.log(`  • All prices: [${sales.map(s => `$${s.price}`).join(', ')}]`);
      console.log(`  • FIXED: Taking first sale as most recent: $${lastSoldPrice}`);
      console.log(`  • Average price: $${avgPrice.toFixed(2)}`);
      
      chartDataMap.set(dateKey, {
        time: timestamp,
        lastSoldPrice,
        avgPrice,
        count: sales.length
      });
    });
    
    // Convert to arrays for line charts
    const lastSoldData = Array.from(chartDataMap.values())
      .map(({ time, lastSoldPrice }) => ({ time: time as Time, value: lastSoldPrice }))
      .sort((a, b) => (a.time as number) - (b.time as number));
      
    const avgData = Array.from(chartDataMap.values())
      .map(({ time, avgPrice }) => ({ time: time as Time, value: avgPrice }))
      .sort((a, b) => (a.time as number) - (b.time as number));
    
    console.log(`📊 Chart Data Summary:`);
    console.log(`  • Sold sales: ${soldSales.length}`);
    console.log(`  • Unique dates: ${chartDataMap.size}`);
    console.log(`  • Last sold data points: ${lastSoldData.length}`);
    console.log(`  • Average data points: ${avgData.length}`);
    console.log(`  • Date range:`, lastSoldData.map(d => new Date(d.time as number * 1000).toLocaleDateString()));
    
    // Show the final last sold prices for debugging
    console.log(`🎯 Final Last Sold Prices:`);
    lastSoldData.forEach((dataPoint, i) => {
      console.log(`  ${i}: $${dataPoint.value} on ${new Date(dataPoint.time as number * 1000).toLocaleDateString()}`);
    });
    
    if (lastSoldData.length > 0) {
      const finalLastSold = lastSoldData[lastSoldData.length - 1];
      console.log(`🎯 DISPLAYED LAST SOLD PRICE: $${finalLastSold.value} (from ${new Date(finalLastSold.time as number * 1000).toLocaleDateString()})`);
    }
    
    return { 
      lastSoldData, 
      avgData, 
      chartDataMap, 
      salesByDate, 
      individualSales,
      soldSalesCount: soldSales.length,
      soldSales // Include soldSales for marker details
    };
  }, [salesData]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const width = chartContainerRef.current.clientWidth;
    const isMobile = width < 768;

    // Create chart with professional dimensions matching asset details page
    const chart = createChart(chartContainerRef.current, {
      width,
      height: isMobile ? 250 : 400, // Responsive height like asset details
      layout: {
        background: { color: 'transparent' },
        textColor: '#666',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      rightPriceScale: {
        borderColor: '#485158',
      },
      timeScale: {
        borderColor: '#485158',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12, // Add some padding on right
        lockVisibleTimeRangeOnResize: true, // Prevent zoom changes on resize
        fixLeftEdge: true,  // Fix left edge
        fixRightEdge: true, // Fix right edge
      },
      handleScroll: false, // Disable scroll zooming
      handleScale: false,  // Disable scale manipulation
      kineticScroll: {
        touch: false,     // Disable touch scrolling
        mouse: false      // Disable mouse wheel scrolling
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
    });

    chartRef.current = chart;

    if (chartDataInfo.lastSoldData.length > 0) {
      // Add Last Sold line series (green)
      const lastSoldSeries = chart.addLineSeries({
        color: '#22c55e', // Green for last sold
        lineWidth: 2,
        title: 'Last Sold',
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
      });
      
      // Add Average line series (blue)
      const avgSeries = chart.addLineSeries({
        color: '#2196F3', // Blue for average
        lineWidth: 2,
        title: 'Average',
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
      });

      lastSoldSeries.setData(chartDataInfo.lastSoldData as any);
      avgSeries.setData(chartDataInfo.avgData as any);
      
      // Fit chart content to show all data points
      chart.timeScale().fitContent();
      
      // Create individual markers for each SOLD sale (green dots)
      const individualMarkers: any[] = [];
      
      chartDataInfo.salesByDate.forEach((sales: Array<{time: number; price: number; saleIndex: number}>) => {
        sales.forEach((sale: {time: number; price: number; saleIndex: number}) => {
          // Get the original sale data for additional details
          const originalSale = chartDataInfo.soldSales[sale.saleIndex];
          const saleType = originalSale?.sale_type || originalSale?.type || 'Unknown';
          const salePrice = `$${sale.price.toFixed(2)}`;
          const saleDate = new Date(sale.time * 1000).toLocaleDateString();
          
          individualMarkers.push({
            time: sale.time as Time,
            position: 'aboveBar' as const,
            color: '#22c55e',
            shape: 'circle' as const,
            size: 2, // Larger size for better visibility (10px x 10px)
            text: `${salePrice} • ${saleDate} • ${saleType}`, // Hover label with details
          });
        });
      });
      
      // Sort markers by time
      individualMarkers.sort((a, b) => (a.time as number) - (b.time as number));
      
      if (individualMarkers.length > 0) {
        lastSoldSeries.setMarkers(individualMarkers);
      }
    }

    // Add hover handler
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.time) {
        setHoverInfo('');
        return;
      }
      
      const timestamp = param.time as number;
      const date = new Date(timestamp * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const dataPoint = chartDataInfo.chartDataMap.get(dateKey);
      
      if (dataPoint) {
        const displayDate = date.toLocaleDateString();
        if (dataPoint.count > 1) {
          setHoverInfo(`${displayDate}: Last $${dataPoint.lastSoldPrice.toFixed(2)} | Avg $${dataPoint.avgPrice.toFixed(2)} (${dataPoint.count} sales)`);
        } else {
          setHoverInfo(`${displayDate}: $${dataPoint.lastSoldPrice.toFixed(2)} sold`);
        }
      }
    });

    // Handle resize with proper responsive dimensions
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const width = chartContainerRef.current.clientWidth;
        const isMobile = width < 768;
        
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobile ? 250 : 400, // Responsive height on resize
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [chartDataInfo]);

  if (chartDataInfo.soldSalesCount === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/30 rounded border-2 border-dashed border-muted-foreground/20"
        style={{ minHeight: '400px', height: '400px' }} // Professional height
      >
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No Sold Items</div>
          <div className="text-sm">No sold items found for {timeRange} range</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div 
        ref={chartContainerRef} 
        className="w-full h-full" 
        style={{ minHeight: '400px', height: '400px' }} // Professional dimensions
      />
      
      {/* Chart info panel */}
      <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          {chartDataInfo.soldSalesCount} sold items • {timeRange} range
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Green: Last Sold • Blue: Average
        </div>
      </div>
      
      {/* Hover info display */}
      {hoverInfo && (
        <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border/50">
          <div className="text-sm font-mono text-card-foreground">
            {hoverInfo}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-green-50 dark:bg-green-900/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>= Individual sold item</span>
        </div>
      </div>
    </div>
  );
}

// Test page component
export default function TestChartPage() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  
  // Kobe Bryant asset ID (hardcoded for testing)
  const kobeAssetId = '0804ddda-c6f7-4420-ab7d-b7d4700debe8';
  
  // Fetch sales data with proper typing
  const { data: salesResponse, isLoading } = useQuery<{sales_history: SalesRecord[], length: number}>({
    queryKey: [`/api/sales-comp-universal/${kobeAssetId}`],
    enabled: !!kobeAssetId
  });

  // Extract sales data array from response (API returns {sales_history: [...], ...})
  const salesData = salesResponse?.sales_history || [];
  
  // Debug: Log the raw sales data to understand the issue - KOBE SPECIFIC
  if (salesData.length > 0 && kobeAssetId === '0804ddda-c6f7-4420-ab7d-b7d4700debe8') {
    console.log(`🔢 KOBE Trading Chart Recent Sales Count: ${salesData.length} (from ${salesResponse?.length || 0} total sales)`);
    salesData.forEach((sale: any, index: number) => {
      console.log(`KOBE Sale #${index}:`, {
        title: sale.title,
        date: sale.sold_date?.date?.raw,
        price: sale.sold_price?.value,
        shipping: sale.shipping || 0,
        total: (sale.sold_price?.value || 0) + (sale.shipping || 0)
      });
    });
  }

  // Extract sale date (unified function matching API structure)
  const extractSaleDate = (sale: any): string | null => {
    if (sale.sold_date?.date?.raw) return sale.sold_date.date.raw.split('T')[0];
    if (sale.date) return sale.date;
    if (sale.sold_date) return sale.sold_date;
    if (sale.end_date) return sale.end_date;
    return null;
  };

  // Count sales within 30 days (unified function)
  const count30DaySales = (sales: SalesRecord[]): number => {
    if (!sales?.length) return 0;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return sales.filter(sale => {
      const dateStr = extractSaleDate(sale);
      if (!dateStr) return false;
      
      const saleDate = new Date(dateStr);
      return !isNaN(saleDate.getTime()) && saleDate >= thirtyDaysAgo && saleDate <= now;
    }).length;
  };

  // Count sales for any time range
  const countSalesForRange = (sales: SalesRecord[], range: TimeRange): number => {
    if (!sales?.length) return 0;
    if (range === 'ALL') return sales.length;
    
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '1D':
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);
        startDate = yesterday;
        break;
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        // Use unified 30-day calculation for consistency
        return count30DaySales(sales);
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return sales.length;
    }
    
    return sales.filter(sale => {
      const dateStr = extractSaleDate(sale);
      if (!dateStr) return false;
      
      const saleDate = new Date(dateStr);
      return !isNaN(saleDate.getTime()) && saleDate >= startDate && saleDate <= now;
    }).length;
  };

  // Calculate counts for display
  const total30DayCount = count30DaySales(salesData);
  const selectedRangeCount = countSalesForRange(salesData, selectedRange);
  const allTimeCount = salesData.length;

  // Get filtered sales data for selected range
  const selectedRangeSalesData = useMemo(() => {
    if (!salesData?.length) return [];
    if (selectedRange === 'ALL') return salesData;
    
    const now = new Date();
    let startDate: Date;
    
    switch (selectedRange) {
      case '1D':
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);
        startDate = yesterday;
        break;
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return salesData;
    }
    
    return salesData.filter((sale: SalesRecord) => {
      const dateStr = extractSaleDate(sale);
      if (!dateStr) return false;
      
      const saleDate = new Date(dateStr);
      return !isNaN(saleDate.getTime()) && saleDate >= startDate && saleDate <= now;
    });
  }, [salesData, selectedRange]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto"> {/* Wider container for better chart display */}
        <h1 className="text-3xl font-bold font-heading mb-6">Trading Chart Test Page</h1>
        
        {/* Card Info */}
        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-heading mb-4">1996 Topps Kobe Bryant #138 PSA 9</h2>
          
          {isLoading ? (
            <div className="text-muted-foreground">Loading sales data...</div>
          ) : (
            <>
              {/* Data Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-muted/50 rounded p-4">
                  <div className="text-sm text-muted-foreground">Total Sales</div>
                  <div className="text-2xl font-bold">{allTimeCount}</div>
                </div>
                <div className="bg-muted/50 rounded p-4">
                  <div className="text-sm text-muted-foreground">Last 30 Days (Unified)</div>
                  <div className="text-2xl font-bold text-green-600">{total30DayCount}</div>
                </div>
                <div className="bg-muted/50 rounded p-4">
                  <div className="text-sm text-muted-foreground">Selected Range ({selectedRange})</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedRangeCount}</div>
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="mb-6">
                <div className="text-sm font-medium mb-3">Time Range:</div>
                <div className="flex flex-wrap gap-2">
                  {(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as TimeRange[]).map(range => {
                    const count = countSalesForRange(salesData, range);
                    const isSelected = selectedRange === range;
                    const hasData = count > 0;
                    
                    return (
                      <button
                        key={range}
                        onClick={() => setSelectedRange(range)}
                        disabled={!hasData}
                        className={`
                          px-3 py-1 text-sm rounded transition-colors
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : hasData
                              ? 'bg-muted hover:bg-muted-foreground/10 text-foreground'
                              : 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
                          }
                        `}
                      >
                        {range} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Consistency Check */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4 mb-6">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  🎯 Consistency Test Results:
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  • 30-day unified count: <strong>{total30DayCount} sales</strong><br/>
                  • 1M button count: <strong>{countSalesForRange(salesData, '1M')} sales</strong><br/>
                  • Match status: <strong className={total30DayCount === countSalesForRange(salesData, '1M') ? 'text-green-600' : 'text-red-600'}>
                    {total30DayCount === countSalesForRange(salesData, '1M') ? '✅ CONSISTENT' : '❌ INCONSISTENT'}
                  </strong>
                </div>
              </div>

              {/* Trading Chart - Professional Layout */}
              <div className="bg-card rounded-lg border p-8 mb-6"> {/* More padding for professional look */}
                <h3 className="text-lg font-semibold font-heading mb-6">Price Chart - {selectedRange} Range</h3> {/* More bottom margin */}
                <TradingChart 
                  salesData={selectedRangeSalesData} 
                  timeRange={selectedRange}
                />
              </div>

              {/* Raw Data Debug */}
              <details className="bg-muted/30 rounded p-4">
                <summary className="cursor-pointer font-medium mb-2">Debug: API Response Structure</summary>
                <div className="text-xs bg-background rounded p-3 overflow-auto max-h-60">
                  <div className="mb-2">
                    <strong>Raw Response Type:</strong> {typeof salesResponse}<br/>
                    <strong>Is Array:</strong> {Array.isArray(salesResponse) ? 'Yes' : 'No'}<br/>
                    <strong>Length:</strong> {salesResponse?.length || 'undefined'}<br/>
                    <strong>salesData Length:</strong> {salesData?.length || 'undefined'}
                  </div>
                  <pre className="text-xs">
                    {JSON.stringify(salesResponse, null, 2)?.slice(0, 1000) || 'No response'}...
                  </pre>
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  );
}