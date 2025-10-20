import { useEffect } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';

interface CrosshairHandlerProps {
  chart: IChartApi | null;
  areaSeries: ISeriesApi<'Area'> | null;
  rollingAverageSeries?: ISeriesApi<'Line'> | null;
  saleMetadataMap?: Map<number, { source: string; saleType: string }>;
  onCrosshairMove: (d: { 
    price: number | null; 
    date: string | null; 
    isRollingAverage?: boolean;
    rollingAveragePrice?: number | null;
    individualSalePrice?: number | null;
    saleType?: string | null;
    source?: string | null;
  }) => void;
}

/**
 * Subscribes to crosshair moves and reports the hovered price + date
 * (using UTC calendar day to avoid timezone shifts) back to the parent.
 * Prioritizes rolling average series when available.
 */
export function CrosshairHandler({
  chart,
  areaSeries,
  rollingAverageSeries,
  saleMetadataMap,
  onCrosshairMove,
}: CrosshairHandlerProps) {
  useEffect(() => {
    if (!chart || !areaSeries) return;

    const handleMove = (param: any) => {
      try {
        const valid =
          param &&
          param.time !== undefined &&
          param.point &&
          param.point.x >= 0 &&
          param.point.y >= 0;

        if (!valid || !param.point) {
          onCrosshairMove({ price: null, date: null });
          return;
        }
      } catch (error) {
        // Chart may be disposed, ignore the error
        console.warn('Crosshair handler error - chart may be disposed:', error);
        return;
      }

      try {
        // Check which series has data at this point
        const rollingAvgBar = rollingAverageSeries ? param.seriesData.get(rollingAverageSeries) : null;
        const mainBar = param.seriesData.get(areaSeries);
        
        // Get sale metadata from the map if available
        let saleMetadata = null;
        if (saleMetadataMap && mainBar) {
          // Try to find matching metadata by time
          const timeKey = typeof mainBar.time === 'object' 
            ? new Date(Date.UTC(mainBar.time.year, mainBar.time.month - 1, mainBar.time.day)).getTime() / 1000
            : mainBar.time;
          saleMetadata = saleMetadataMap.get(timeKey);
        }
        
        // Always prefer rolling average for primary display, but pass both prices when available
        let bar, isRollingAverage;
        let rollingAveragePrice = null;
        let individualSalePrice = null;
        let saleType = saleMetadata?.saleType || 'Buy It Now';
        let source = saleMetadata?.source || 'ebay';
        
        if (rollingAvgBar && mainBar) {
          // Both have data - show rolling average as primary, but include individual sale info
          bar = rollingAvgBar;
          isRollingAverage = true;
          rollingAveragePrice = rollingAvgBar.value;
          individualSalePrice = mainBar.value;
          saleType = saleMetadata?.saleType || 'Buy It Now';
        } else if (rollingAvgBar) {
          bar = rollingAvgBar;
          isRollingAverage = true;
          rollingAveragePrice = rollingAvgBar.value;
        } else if (mainBar) {
          bar = mainBar;
          isRollingAverage = false;
          individualSalePrice = mainBar.value;
          saleType = saleMetadata?.saleType || 'Buy It Now';
        } else {
          onCrosshairMove({ price: null, date: null });
          return;
        }

        /* ----------- FORMAT DATE (UTC to avoid timezone shifts) ----------- */
        const t = bar.time;
        let dateStr: string | null = null;

        if (typeof t === 'object') {
          // t is BusinessDay: { year, month, day } - create UTC date to avoid timezone shifts
          dateStr = new Date(Date.UTC(t.year, t.month - 1, t.day)).toLocaleDateString(
            'en-US',
            { 
              month: 'numeric', 
              day: 'numeric', 
              year: 'numeric',
              timeZone: 'UTC' // Ensure we display the UTC date to match chart axis
            },
          );
        } else {
          // epoch seconds – shouldn't happen after chart conversion, but safe:
          dateStr = new Date(t * 1000).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
          });
        }
        /* ------------------------------------------ */

        const price =
          bar.value !== undefined ? bar.value : (bar.close || 0);

        onCrosshairMove({ 
          price, 
          date: dateStr, 
          isRollingAverage,
          rollingAveragePrice,
          individualSalePrice,
          saleType,
          source
        });
      } catch (error) {
        // Series may be disposed during chart update, ignore silently
        console.warn('Series data access error - chart may be updating:', error);
        onCrosshairMove({ price: null, date: null });
      }
    };

    chart.subscribeCrosshairMove(handleMove);
    return () => {
      try {
        chart.unsubscribeCrosshairMove(handleMove);
      } catch (error) {
        // Chart may be disposed, ignore the error
        console.warn('Unsubscribe crosshair error - chart already disposed:', error);
      }
    };
  }, [chart, areaSeries, rollingAverageSeries, saleMetadataMap, onCrosshairMove]);

  return null;
}
