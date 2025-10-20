/**
 * TradingChart Component
 *
 * Displays interactive price chart using TradingView Lightweight Charts.
 */

import {
  createChart,
  ColorType,
  type BusinessDay,
} from 'lightweight-charts';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import type { TradingChartData } from './types';
import { Asset } from '@shared/schema';
import { SalesRecord } from '@shared/sales-types';
import ChartLegend from './chart-legend';
import TimeRangeSelector from './time-range-selector';
import { type TimeRange, filterDataByTimeRange, extractSaleDate, count30DaySales } from './utils/time-range-filter';
import { CrosshairHandler } from './crosshair-handler';

interface TradingChartProps {
  data?: TradingChartData[];
  cardData?: Asset | null;
  symbolName?: string;
  averagePrice?: number;
  className?: string;
  onIntervalChange?: (interval: TimeRange) => void;
  salesData?: SalesRecord[];
  isLoadingSales?: boolean;
  salesCount?: number;
  liquidityRating?: string;
  selectedTimeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  confidence?: number; // 0-100 percentage from pricing API
  pricingData?: any; // Include full pricing data
}

export default function TradingChart({
  data,
  cardData,
  symbolName = 'Asset Price',
  averagePrice,
  className = '',
  onIntervalChange,
  salesData = [],
  isLoadingSales = false,
  salesCount = 0,
  liquidityRating = 'cold',
  selectedTimeRange = '1M',
  onTimeRangeChange,
  confidence = 0,
  pricingData,
}: TradingChartProps) {
  

  
  // Calculate recent sales count for confidence meter
  const recentSalesCount = useMemo(() => {
    return count30DaySales(salesData);
  }, [salesData]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Use controlled time range state
  const selectedRange = selectedTimeRange;
  const setSelectedRange = onTimeRangeChange || (() => {});


  const [legendHover, setLegendHover] = useState<{
    price: number | null;
    date: string | null;
    isRollingAverage?: boolean;
    rollingAveragePrice?: number | null;
    individualSalePrice?: number | null;
    saleType?: string | null;
    source?: string | null;
  }>({ price: null, date: null, rollingAveragePrice: null, individualSalePrice: null, saleType: null, source: null });
  


  // Chart / series handles for crosshair component
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [areaSeriesInstance, setAreaSeriesInstance] = useState<any>(null);
  const [rollingAverageSeriesInstance, setRollingAverageSeriesInstance] = useState<any>(null);
  const [gradientAreaSeriesInstance, setGradientAreaSeriesInstance] = useState<any>(null);
  const [saleMetadataMap, setSaleMetadataMap] = useState<Map<number, { source: string; saleType: string }>>(new Map());
  
  // Marker hover tooltip state
  // REMOVED: markerTooltip state - no longer needed since dots are purely visual

  // Pass hover updates up to legend
  const handleCrosshairMove = useCallback(
    (d: { 
      price: number | null; 
      date: string | null; 
      isRollingAverage?: boolean;
      rollingAveragePrice?: number | null;
      individualSalePrice?: number | null;
      saleType?: string | null;
      source?: string | null;
    }) => setLegendHover(d),
    [],
  );

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    if (onTimeRangeChange) {
      onTimeRangeChange(range);
    }
  };

  // Generate dynamic average title based on time range with 30-day baseline focus
  const getAverageTitle = (timeRange: TimeRange) => {
    switch (timeRange) {
      case '1D': return '30 Day Avg'; // Still use 30-day baseline for consistency
      case '1W': return '30 Day Avg'; // Still use 30-day baseline for consistency  
      case '1M': return '30 Day Avg'; // Primary 30-day window
      case '3M': return '30 Day Avg'; // Uses 30-day rolling within 3M view
      case 'YTD': return '30 Day Avg'; // Uses 30-day rolling within YTD view
      case '1Y': return '30 Day Avg'; // Uses 30-day rolling within 1Y view
      case 'ALL': return '30 Day Avg'; // Uses 30-day rolling (or best available) within ALL view
      default: return '30 Day Avg';
    }
  };

  /* ---------- Convert sales data to chart data ---------- */
  const allChartData = useMemo(() => {
    console.log('🔍 [CHART DEBUG] Raw salesData length:', salesData?.length);
    console.log('🔍 [CHART DEBUG] Raw salesData sample:', salesData?.slice(0, 2));
    
    // Prefer live salesData for the timeline so we don't filter out fresh points (e.g., Slabfy sales)
    if (salesData?.length) {
      const filtered = salesData.filter(sale => {
        // Use unified date extraction and check for price
        const dateStr = extractSaleDate(sale);
        const hasPrice = sale.final_price || (sale as any).price || (sale as any).sold_price;
        const result = dateStr && hasPrice;
        
        if (!result) {
          console.log('🔍 [CHART DEBUG] Filtered out sale (no date/price):', { 
            dateStr, 
            hasPrice: !!hasPrice,
            source: (sale as any).source,
            sold_date: (sale as any).sold_date
          });
        }
        
        return result;
      });
      
      console.log('🔍 [CHART DEBUG] After date/price filter:', filtered.length);
      
      const mapped = filtered.map(sale => {
        // Use unified date extraction
        const dateStr = extractSaleDate(sale);
        const saleDate = new Date(dateStr!);
        
        // Extract price using multiple fallback strategies 
        let salePrice = 0;
        if (sale.final_price) {
          salePrice = parseFloat(String(sale.final_price));
        } else if ((sale as any).price?.value) {
          salePrice = parseFloat(String((sale as any).price.value));
        } else if ((sale as any).sold_price?.value) {
          salePrice = parseFloat(String((sale as any).sold_price.value));
        } else if ((sale as any).price) {
          salePrice = parseFloat(String((sale as any).price));
        }
        
        const shipping = parseFloat(String(sale.shipping || '0'));
        const totalPrice = salePrice + shipping;
        const epochTime = Math.floor(saleDate.getTime() / 1000);
        
        const item = {
          time: epochTime.toString(),
          value: totalPrice,
          date: saleDate.toISOString().split('T')[0]
        };
        
        // Log Slabfy sales specifically
        if ((sale as any).source?.includes('slabfy')) {
          console.log('🔍 [CHART DEBUG] Slabfy sale mapped:', {
            source: (sale as any).source,
            date: item.date,
            price: totalPrice,
            epochTime: item.time
          });
        }
        
        return item;
      });
      
      const sorted = mapped.sort((a, b) => parseInt(a.time) - parseInt(b.time));
      console.log('🔍 [CHART DEBUG] Final allChartData length:', sorted.length);
      console.log('🔍 [CHART DEBUG] allChartData date range:', {
        first: sorted[0]?.date,
        last: sorted[sorted.length - 1]?.date
      });
      
      return sorted;
    }

    // Fallback to any provided transformed data
    if (data?.length) {
      console.log('🔍 [CHART DEBUG] Using fallback data prop, length:', data.length);
      return [...data];
    }

    console.log('🔍 [CHART DEBUG] No data available');
    return [];
  }, [data, salesData]);

  /* ---------- Filter data by time range ---------- */
  const filteredData = useMemo(() => {
    if (!allChartData.length) {
      console.log('🔍 [CHART DEBUG] No allChartData to filter');
      return null;
    }

    console.log('🔍 [CHART DEBUG] Filtering for time range:', selectedRange);
    console.log('🔍 [CHART DEBUG] allChartData before filter:', allChartData.length);

    // Apply time range filtering
    const filtered = filterDataByTimeRange(allChartData, selectedRange);
    
    console.log('🔍 [CHART DEBUG] filteredData after time range filter:', filtered.length);
    
    // If no data for selected range, fall back to ALL to show something
    if (filtered.length === 0 && selectedRange !== 'ALL') {
      console.log('🔍 [CHART DEBUG] No data for range, falling back to last 500');
      return allChartData.slice(-500); // Show last 500 sales as fallback
    }
    
    console.log('🔍 [CHART DEBUG] Final filteredData:', {
      length: filtered.length,
      first: filtered[0]?.date,
      last: filtered[filtered.length - 1]?.date
    });
    
    return filtered;
  }, [allChartData, selectedRange]);

  // 🔥 SMART BASELINE: Use pricing API for 1M, calculate for other ranges 🔥
  // For 1M (30-day), trust the server-side pricing API ($139.20)
  // For other ranges, calculate from the filtered data
  const timeRangeAverage = useMemo(() => {
    // For 1M, use the trusted pricing API average (includes AI filtering, proper calculation)
    if (selectedRange === '1M' && averagePrice) {
      return averagePrice; // This is your $139.20 from pricing API
    }
    
    // For other time ranges, calculate from filtered data
    if (!filteredData?.length) return averagePrice || 0;
    
    const totalPrice = filteredData.reduce((sum, item) => sum + parseFloat(item.value.toString()), 0);
    const average = totalPrice / filteredData.length;
    
    return average;
  }, [filteredData, averagePrice, selectedRange]);

  /* ---------- Chart rendering ---------- */
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Wait for container to have proper dimensions before creating chart
    const containerWidth = chartContainerRef.current.clientWidth;
    const containerHeight = chartContainerRef.current.clientHeight;
    const parentWidth = chartContainerRef.current.parentElement?.clientWidth ?? 0;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;

    const normalizedWidth = Math.max(containerWidth, parentWidth, viewportWidth, 320);
    const isMobileViewport = normalizedWidth < 768;
    const normalizedHeight = containerHeight > 0
      ? containerHeight
      : isMobileViewport
        ? 250
        : 372;

    chartContainerRef.current.innerHTML = '';

    // empty state
    if (!filteredData?.length) {
      chartContainerRef.current.innerHTML =
        '<div class="flex items-center justify-center h-full text-muted-foreground">' +
        '<p>No sales data available for this time range</p>' +
        '</div>';
      return;
    }

    // util helpers
    const getHexColor = (cssVar: string) => {
      const hsl = getComputedStyle(document.documentElement)
        .getPropertyValue(cssVar)
        .trim()
        .split(' ')
        .map(v => parseFloat(v.replace('%', '')));
      const [h, s, l] = hsl;
      const a = (s * Math.min(l, 100 - l)) / 10000;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

  const width = chartContainerRef.current.clientWidth || normalizedWidth;
  const height = chartContainerRef.current.clientHeight || normalizedHeight;
  const isMobile = width < 768;

  const chartWidth = width > 0 ? width : normalizedWidth;
  const chartHeight = height > 0 ? height : (isMobile ? 250 : 400);

  const chart = createChart(chartContainerRef.current, {
      layout: {
        textColor: getHexColor('--foreground'),
        background: { type: ColorType.Solid, color: 'transparent' },
      },
  width: chartWidth,
  height: chartHeight,
      rightPriceScale: {
        scaleMargins: {
          top: isMobile ? 0.3 : 0.4,
          bottom: 0.15,
        },
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        /** 🚩 key change: we only show dates */
        timeVisible: false,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true, // Prevent zoom changes on resize
      },
      watermark: {
        visible: false, // Remove TradingView watermark/branding
      },
      kineticScroll: {
        touch: false,     // Disable touch scrolling
        mouse: false      // Disable mouse wheel scrolling
      },
      crosshair: {
        horzLine: {
          visible: true,
          labelVisible: false, // Disable built-in horizontal label
          style: 3,
          width: 1,
          color: getHexColor('--muted-foreground'),
        },
        vertLine: {
          visible: true,
          labelVisible: true, // Enable built-in vertical date label
          style: 3,
          width: 1,
          color: getHexColor('--muted-foreground'),
          labelBackgroundColor: getHexColor('--background'),
        },
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      handleScroll: {
        vertTouchDrag: false,  // Disable vertical touch dragging  
        mouseWheel: false,     // Disable mouse wheel scrolling
        pressedMouseMove: false, // Disable mouse drag scrolling
        horzTouchDrag: false,  // Disable horizontal touch dragging
      },
      handleScale: {
        axisPressedMouseMove: false, // Disable axis scaling
        mouseWheel: false,           // Disable mouse wheel scaling
        pinch: false,               // Disable pinch scaling
      },
    });

    setChartInstance(chart);

    // Remove/Suppress TradingView attribution anchor if injected by the library
    const hideTradingViewAttribution = () => {
      try {
        const inContainer = chartContainerRef.current?.querySelector('#tv-attr-logo') as HTMLElement | null;
        const globalEl = document.getElementById('tv-attr-logo');
        const el = inContainer || globalEl;
        if (el) {
          el.remove();
        }
      } catch {}
    };

    // Inject a global style to keep it hidden if some script re-adds it
    if (!document.getElementById('slabfy-hide-tv-attr')) {
      const style = document.createElement('style');
      style.id = 'slabfy-hide-tv-attr';
      style.textContent = '#tv-attr-logo{display:none!important;visibility:hidden!important;opacity:0!important;}';
      document.head.appendChild(style);
    }

    // First pass removal
    hideTradingViewAttribution();

    // Watch for future insertions and remove immediately
    const attrObserver = new MutationObserver(() => hideTradingViewAttribution());
    attrObserver.observe(document.body, { childList: true, subtree: true });

    // Main series (green dots only, no connecting line)
    const areaSeries = chart.addLineSeries({
      color: getHexColor('--success'),
      lineVisible: false, // Remove the connecting line!
      crosshairMarkerVisible: true, // Re-enable crosshair for individual dots!
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: getHexColor('--success'),
      crosshairMarkerBackgroundColor: '#ffffff',
      pointMarkersVisible: true,
      pointMarkersRadius: 4,
      title: 'Last Sale', // Add tooltip title for green dots
    });

    // Rolling average line series (blue) - main interactive element with gradient fill
    const rollingAverageSeries = chart.addLineSeries({
      color: '#3b82f6', // Blue color
      lineWidth: 3, // Make it slightly thicker since it's the main line
      crosshairMarkerVisible: true, // Enable crosshair for blue line
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: '#3b82f6',
      crosshairMarkerBackgroundColor: '#ffffff',
      pointMarkersVisible: false, // No dots on the rolling average line
      lineStyle: 0, // Solid line
      title: getAverageTitle(selectedRange), // Dynamic tooltip title based on time range
    });

    // 🔥 ADD SICK GRADIENT AREA SERIES UNDER THE ROLLING AVERAGE 🔥
    const gradientAreaSeries = chart.addAreaSeries({
      lineColor: 'transparent', // No line - we already have the main blue line
      topColor: 'rgba(59, 130, 246, 0.80)', // Faint blue at top (matches #3b82f6 with 15% opacity)
      bottomColor: 'rgba(59, 130, 246, 0.00)', // Almost transparent at bottom
      crosshairMarkerVisible: false, // Don't show crosshair on gradient
      pointMarkersVisible: false, // No dots
    });

    setAreaSeriesInstance(areaSeries);
    setRollingAverageSeriesInstance(rollingAverageSeries);
    setGradientAreaSeriesInstance(gradientAreaSeries);

    /* ---------- DATA -> BusinessDay ---------- */
    // Use the same sales data for both line and dots to ensure perfect alignment
    // BUT apply time range filtering first!
    const processedSalesData = salesData?.length ? 
      salesData.filter(sale => {
        // Simple check: has a price and has a date (works for eBay AND Slabfy sales)
        const hasPrice = (sale as any).sold_price?.value > 0 || (sale as any).final_price > 0;
        const hasDate = (sale as any).sold_date || (sale as any).date;
        const result = hasPrice && hasDate;
        
        if (!result) {
          console.log('🔍 [CHART RENDER] Filtered out in processedSalesData:', {
            hasPrice,
            hasDate: !!hasDate,
            source: (sale as any).source
          });
        }
        
        return result;
      }).map((sale, index) => {
        // Enhanced date extraction
        let dateStr = null;
        if ((sale as any).sold_date?.date?.raw) {
          dateStr = (sale as any).sold_date.date.raw;
        } else if ((sale as any).date) {
          dateStr = (sale as any).date;
        } else if ((sale as any).sold_date) {
          dateStr = (sale as any).sold_date;
        } else if ((sale as any).end_date) {
          dateStr = (sale as any).end_date;
        }
        
        if (!dateStr) {
          console.log('🔍 [CHART RENDER] No dateStr found for sale:', (sale as any).source);
          return null;
        }
        
        // Parse date
        let date: Date;
        if (dateStr.includes('T')) {
          date = new Date(dateStr);
        } else {
          date = new Date(dateStr);
        }
        
        if (isNaN(date.getTime())) {
          console.log('🔍 [CHART RENDER] Invalid date:', dateStr);
          return null;
        }
        
        // Calculate price with shipping
        const price = (sale as any).sold_price?.value || (sale as any).price?.value || (sale as any).final_price || 0;
        const shipping = (sale as any).shipping || 0;
        const totalPrice = price + shipping;
        
        if (totalPrice <= 0) {
          console.log('🔍 [CHART RENDER] Zero/negative price:', totalPrice);
          return null;
        }
        
        const item = {
          date,
          price: totalPrice,
          timestamp: date.getTime() / 1000,
          sale,
          source: (sale as any).source || 'ebay', // Track source for tooltip display
          saleType: (sale as any).listingType || 'Buy It Now'
        };
        
        // Log Slabfy sales
        if (item.source.includes('slabfy')) {
          console.log('🔍 [CHART RENDER] Slabfy sale in processedSalesData:', {
            source: item.source,
            date: date.toISOString(),
            price: totalPrice,
            timestamp: item.timestamp
          });
        }
        
        return item;
      }).filter(Boolean)
      .sort((a, b) => a!.timestamp - b!.timestamp) // Stable chronological sort (oldest first)
      : [];

    console.log('🔍 [CHART RENDER] processedSalesData length:', processedSalesData.length);
    console.log('🔍 [CHART RENDER] processedSalesData date range:', {
      first: processedSalesData[0]?.date?.toISOString(),
      last: processedSalesData[processedSalesData.length - 1]?.date?.toISOString()
    });

    // Apply time range filtering to processed sales data
    const timeFilteredSalesData = processedSalesData.filter(item => {
      if (!filteredData?.length) {
        console.log('🔍 [CHART RENDER] No filteredData, showing all processedSalesData');
        return true; // If no filteredData, show all
      }
      
      // Check if this sale's timestamp falls within the filtered time range
      // Use Math.floor to compare only the integer seconds (ignore milliseconds)
      const saleTimestamp = Math.floor(item!.timestamp);
      const filteredTimestamps = filteredData.map(d => parseInt(d.time));
      const minTime = Math.min(...filteredTimestamps);
      const maxTime = Math.max(...filteredTimestamps);
      
      // Use <= and >= for inclusive range check
      const isInRange = saleTimestamp >= minTime && saleTimestamp <= maxTime;
      
      if (!isInRange && item!.source.includes('slabfy')) {
        console.log('🔍 [CHART RENDER] Slabfy sale FILTERED OUT by time range:', {
          saleTimestamp,
          minTime,
          maxTime,
          saleDate: item!.date?.toISOString(),
          minDate: new Date(minTime * 1000).toISOString(),
          maxDate: new Date(maxTime * 1000).toISOString()
        });
      }
      
      return isInRange;
    });

    console.log('🔍 [CHART RENDER] timeFilteredSalesData length:', timeFilteredSalesData.length);
    
    // Log if we have Slabfy sales in the final filtered set
    const slabfyInFinal = timeFilteredSalesData.filter(item => item!.source.includes('slabfy'));
    if (slabfyInFinal.length > 0) {
      console.log('🔍 [CHART RENDER] ✅ Slabfy sales in final filtered data:', slabfyInFinal.length);
    } else {
      console.log('🔍 [CHART RENDER] ❌ NO Slabfy sales in final filtered data');
    }

    // Create line data from time-filtered processed sales
    const finalData = timeFilteredSalesData.map((item, index) => ({
      time: item!.timestamp + (index * 60),
      value: item!.price
    }));
    
    // 🔥 CREATE LOOKUP MAP FOR SALE METADATA (SOURCE, TYPE) 🔥
    const metadataMap = new Map();
    timeFilteredSalesData.forEach((item, index) => {
      const time = item!.timestamp + (index * 60);
      metadataMap.set(time, {
        source: item!.source,
        saleType: item!.saleType
      });
    });
    setSaleMetadataMap(metadataMap);
    
    // 🔥 SMART 30-DAY ROLLING AVERAGE WITH INTELLIGENT FALLBACK 🔥
    // Always tries 30-day first, then expands to 60/90/all if needed for meaningful data
    const timeRangeBaselineData = finalData.map((item, index) => {
      const currentPointTimestamp = item.time;
      const currentDate = new Date(currentPointTimestamp * 1000);
      
      // 🎯 SMART FALLBACK SYSTEM - Always start with 30-day baseline
      const timeWindows = [
        { days: 30, label: '30-day' },   // Primary: 30-day rolling average
        { days: 60, label: '60-day' },   // Fallback 1: Expand to 60 days  
        { days: 90, label: '90-day' },   // Fallback 2: Expand to 90 days
        { days: 365, label: '1-year' },  // Fallback 3: Full year window
        { days: Infinity, label: 'all' } // Final fallback: All available data
      ];
      
      let bestAverage = item.value; // Fallback to current price
      let usedWindow = '30-day';
      
      // Try each time window until we find enough data (minimum 3 sales for meaningful average)
      for (const window of timeWindows) {
        const windowMs = window.days === Infinity ? Infinity : window.days * 24 * 60 * 60 * 1000;
        const windowStartTimestamp = windowMs === Infinity 
          ? 0 
          : currentPointTimestamp - (windowMs / 1000);
          
        const salesInWindow = finalData.filter(dataPoint => 
          dataPoint.time >= windowStartTimestamp && dataPoint.time <= currentPointTimestamp
        );
        
        // If we have at least 3 sales in this window, use it for a meaningful average
        if (salesInWindow.length >= 3) {
          bestAverage = salesInWindow.reduce((sum, dataPoint) => sum + dataPoint.value, 0) / salesInWindow.length;
          usedWindow = window.label;
          break; // Found good window, stop searching
        }
        
        // If it's our last option and we have any data, use whatever we got
        if (window.days === Infinity && salesInWindow.length > 0) {
          bestAverage = salesInWindow.reduce((sum, dataPoint) => sum + dataPoint.value, 0) / salesInWindow.length;
          usedWindow = `${salesInWindow.length}-sale avg`;
          break;
        }
      }
      
      return {
        time: item.time,
        value: bestAverage,
        // Store metadata for debugging (could be used in tooltips later)
        _meta: { window: usedWindow, dataPoints: finalData.length }
      };
    });

    areaSeries.setData(finalData as any);
    rollingAverageSeries.setData(timeRangeBaselineData as any);
    gradientAreaSeries.setData(timeRangeBaselineData as any); // Use same data as rolling average for gradient fill
    
    // 🔥 ADD CUSTOM MARKERS FOR SLABFY SALES 🔥
    // Orange for cash, Blue for credit card/verified
    const slabfyMarkers = timeFilteredSalesData
      .filter(item => {
        const source = (item!.sale as any).source || 'ebay';
        return source.includes('slabfy');
      })
      .map((item, index) => {
        const source = (item!.sale as any).source || 'slabfy_cash';
        const isCreditCard = source.includes('credit_card') || source.includes('verified');
        
        return {
          time: (item!.timestamp + (index * 60)) as any,
          position: 'inBar' as const,
          color: isCreditCard ? '#3b82f6' : '#f97316', // Blue for credit card/verified, Orange for cash
          shape: 'circle' as const,
          size: 0.5, // Same size as regular sale dots
        };
      });
    
    if (slabfyMarkers.length > 0) {
      areaSeries.setMarkers(slabfyMarkers);
    }
    
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (!chartContainerRef.current) return;
      
      // Prevent errors during resize by checking for valid dimensions
      const newWidth = chartContainerRef.current.clientWidth;
      const newHeight = chartContainerRef.current.clientHeight;
      const fallbackWidth = newWidth > 0 ? newWidth : normalizedWidth;
      const nextIsMobile = fallbackWidth < 768;
      const fallbackHeight = newHeight > 0
        ? newHeight
        : nextIsMobile
          ? 250
          : Math.max(chartHeight, 300);

      try {
        chart.applyOptions({
          width: fallbackWidth,
          height: Math.max(fallbackHeight, nextIsMobile ? 250 : 300),
        });
      } catch (error) {
        // Silently catch resize errors to prevent UI crashes
        console.warn('Chart resize error:', error);
      }
    });
    ro.observe(chartContainerRef.current);
    
    // REMOVED: Mouse event listeners for scatter point hover tooltips to prevent duplicate labels
    // Now dots are purely visual - only the main chart legend shows price information

    return () => {
      ro.disconnect();
      attrObserver.disconnect();
      // Clear series instances before removing chart
      setAreaSeriesInstance(null);
      setRollingAverageSeriesInstance(null);
      setGradientAreaSeriesInstance(null);
      setChartInstance(null);
      chart.remove();
    };
  }, [filteredData, symbolName, selectedRange, averagePrice, timeRangeAverage]);

  // REMOVED: Separate title update effect to prevent disposal errors
  // Title updates are now handled directly in the main chart rendering useEffect



  /* ---------- render ---------- */
  return (
    <div className={`relative w-full h-full ${className} flex flex-col`}>
      <div className="flex-1 relative">
        <ChartLegend
          cardData={cardData}
          symbolName={symbolName}
          averagePrice={averagePrice}
          hoveredPrice={legendHover.price}
          hoveredDate={legendHover.date}
          isMobile={false}
          salesData={salesData}
          isLoadingSales={isLoadingSales}
          salesCount={recentSalesCount}
          liquidityRating={liquidityRating}
          confidence={confidence}
          pricingData={pricingData}
          isMarkerTooltipVisible={false}
          isRollingAverage={legendHover.isRollingAverage || false}
          rollingAveragePrice={legendHover.rollingAveragePrice}
          individualSalePrice={legendHover.individualSalePrice}
          saleType={legendHover.saleType}
          source={legendHover.source}
        />

        <div
          ref={chartContainerRef}
          className="w-full h-full"
          style={{ minHeight: '372px', height: '100%' }}
        />
        


        <CrosshairHandler
          chart={chartInstance}
          areaSeries={areaSeriesInstance}
          rollingAverageSeries={rollingAverageSeriesInstance}
          saleMetadataMap={saleMetadataMap}
          onCrosshairMove={handleCrosshairMove}
        />
      </div>

      <TimeRangeSelector
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
        salesData={allChartData}
        rawSalesData={salesData}
        className="mt-2"
      />
    </div>
  );
}
