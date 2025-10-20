// 🤖 INTERNAL NOTE:
// Purpose: Auto-pricing logic hook for newly added assets
// Exports: useAutoPricing hook
// Feature: my-consignments

import { useEffect } from 'react';
import type { ConsignmentAssetData, MarketData } from '../types';

interface UseAutoPricingProps {
  editableRows: ConsignmentAssetData[];
  marketData: Record<string, MarketData>;
  updateListPriceMutation: any;
  updateReserveMutation: any;
}

export function useAutoPricing({
  editableRows,
  marketData,
  updateListPriceMutation,
  updateReserveMutation,
}: UseAutoPricingProps) {
  
  // Auto-pricing: Apply default pricing when market data arrives for newly added assets
  useEffect(() => {
    // Only process assets that have no pricing set but now have market data
    const assetsNeedingPricing = editableRows.filter(asset => {
      // Skip if already has pricing set
      if (asset.askingPrice && Number(asset.askingPrice) > 0) return false;
      if (asset.reservePrice && Number(asset.reservePrice) > 0) return false;
      
      // Skip if no market data yet
      const market = marketData?.[asset.globalAssetId];
      if (!market || !market.averagePrice || market.averagePrice <= 0) return false;
      
      // Skip if currently being updated to avoid conflicts
      if (updateListPriceMutation.isPending || updateReserveMutation.isPending) return false;
      
      return true;
    });

    if (assetsNeedingPricing.length === 0) return;

    // Load consignment settings for pricing calculation
    const loadConsignmentSettings = () => {
      try {
        const saved = localStorage.getItem('consignment-settings') || localStorage.getItem('consignmentSettings');
        const defaults = {
          pricingMode: 'market',
          listPercentAboveMarket: 20,
          listRounding: 1,
          enableReserveStrategy: true,
          reserveStrategy: 'match',
          reservePercentOfMarket: 100,
          reserveRounding: 1,
        };
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
      } catch {
        return {
          pricingMode: 'market',
          listPercentAboveMarket: 20,
          listRounding: 1,
          enableReserveStrategy: true,
          reserveStrategy: 'match',
          reservePercentOfMarket: 100,
          reserveRounding: 1,
        };
      }
    };

    const settings = loadConsignmentSettings();
    if (settings.pricingMode !== 'market') return;

    // Apply rounding helper
    const applyRounding = (price: number, roundingValue: number): number => {
      if (!price || price <= 0) return 0;
      return Math.ceil(price / roundingValue) * roundingValue;
    };

    // Process each asset that needs pricing
    assetsNeedingPricing.forEach(asset => {
      const market = marketData[asset.globalAssetId];
      if (!market || !market.averagePrice) return;

      const marketPrice = market.averagePrice;
      
      // Calculate list price
      const percentage = settings.listPercentAboveMarket || 20;
      const rawListPrice = marketPrice * (1 + percentage / 100);
      const listPrice = applyRounding(rawListPrice, settings.listRounding || 1);

      // Calculate reserve price
      let reservePrice = 0;
      if (settings.enableReserveStrategy) {
        if (settings.reserveStrategy === 'match') {
          reservePrice = marketPrice;
        } else if (settings.reserveStrategy === 'percentage') {
          const reservePercent = settings.reservePercentOfMarket || 100;
          reservePrice = marketPrice * (reservePercent / 100);
        }
        reservePrice = applyRounding(reservePrice, settings.reserveRounding || 1);
      }

      // Apply the calculated pricing - only trigger once per asset
      console.log(`🎯 Auto-applying pricing for ${asset.playerName}: List $${listPrice}, Reserve $${reservePrice} (based on market $${marketPrice})`);
      
      // Apply list price if calculated and > 0
      if (listPrice > 0) {
        updateListPriceMutation.mutate({ 
          assetId: asset.id, 
          listPrice: listPrice 
        });
      }
      
      // Apply reserve price if calculated and > 0
      if (reservePrice > 0) {
        // Small delay to avoid concurrent mutations
        setTimeout(() => {
          updateReserveMutation.mutate({ 
            assetId: asset.id, 
            reserve: reservePrice 
          });
        }, 200);
      }
    });

  }, [marketData, editableRows, updateListPriceMutation, updateReserveMutation]);
}