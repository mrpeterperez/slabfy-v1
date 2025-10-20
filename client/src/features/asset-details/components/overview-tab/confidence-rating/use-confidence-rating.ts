/**
 * useConfidenceRating Hook
 * 
 * Purpose: Calculates market confidence rating based on sales data
 * Exports: useConfidenceRating
 * Feature: asset-details/confidence-rating
 * 
 * Usage: Provides real-time confidence analysis for asset pricing
 */

import { useMemo } from 'react';
import { calculateConfidence, ConfidenceResult } from './confidence-calculator';
import { SalesRecord } from "@shared/sales-types";

interface UseConfidenceRatingProps {
  salesData?: SalesRecord[];
  isLoading?: boolean;
}

export function useConfidenceRating({ 
  salesData = [], 
  isLoading = false 
}: UseConfidenceRatingProps): ConfidenceResult {
  
  return useMemo(() => {
    // Return loading state
    if (isLoading) {
      return {
        level: 0,
        color: "red",
        factors: ["Loading market data..."],
        details: {
          salesVolume: 0,
          priceConsistency: 0,
          recency: 0,
          dataQuality: 0
        }
      };
    }

    // Calculate confidence based on sales data
    return calculateConfidence(salesData);
  }, [salesData, isLoading]);
}