// 🤖 INTERNAL NOTE:
// Purpose: React hooks for buying desk settings management
// Exports: useBuyingDeskSettings hook
// Feature: buying-desk-v0

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { BuyingDeskSettings } from '../lib/auto-accept-engine';

interface BuyingDeskSettingsResponse {
  id: string;
  userId: string;
  defaultOfferPercentage: string;
  housePercentage: string;
  priceRounding: number;
  autoDenyEnabled: boolean;
  minLiquidityLevel: string;
  minConfidenceLevel: number;
  minMarketValue: string;
  targetFlipDays: number;
  minRoiPercentage: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch buying desk settings from API
 */
async function fetchSettings(): Promise<BuyingDeskSettingsResponse> {
  const response = await fetch('/api/buying-desk/settings', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch buying desk settings');
  }

  return response.json();
}

/**
 * Update buying desk settings via API
 */
async function updateSettings(data: Partial<BuyingDeskSettings>): Promise<BuyingDeskSettingsResponse> {
  const response = await fetch('/api/buying-desk/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update buying desk settings');
  }

  return response.json();
}

/**
 * Hook for managing buying desk settings (both localStorage and database)
 */
export function useBuyingDeskSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings from API
  const query = useQuery({
    queryKey: ['buying-desk-settings'],
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Update settings mutation
  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(['buying-desk-settings'], data);
      
      // Also update localStorage for offline access
      const settings = {
        defaultOfferPercentage: parseFloat(data.defaultOfferPercentage),
        housePercentage: parseFloat(data.housePercentage),
        priceRounding: data.priceRounding,
        autoDenyEnabled: data.autoDenyEnabled,
        minLiquidityLevel: data.minLiquidityLevel,
        minConfidenceLevel: data.minConfidenceLevel,
        minMarketValue: parseFloat(data.minMarketValue),
        targetFlipDays: data.targetFlipDays,
        minRoiPercentage: parseFloat(data.minRoiPercentage),
      };
      localStorage.setItem('buyingDeskSettings', JSON.stringify(settings));
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('buyingDeskSettingsChanged', { detail: settings }));
      
      toast({
        title: 'Settings Updated',
        description: 'Your buying desk settings have been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('[Buying Desk Settings] Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Convert API response to BuyingDeskSettings format
  const settings: BuyingDeskSettings | undefined = query.data
    ? {
        defaultOfferPercentage: parseFloat(query.data.defaultOfferPercentage),
        housePercentage: parseFloat(query.data.housePercentage),
        priceRounding: query.data.priceRounding as 1 | 5 | 10,
        autoDenyEnabled: query.data.autoDenyEnabled,
        minLiquidityLevel: query.data.minLiquidityLevel as 'fire' | 'hot' | 'warm' | 'cool' | 'cold',
        minConfidenceLevel: query.data.minConfidenceLevel,
        minMarketValue: parseFloat(query.data.minMarketValue),
        targetFlipDays: query.data.targetFlipDays,
        minRoiPercentage: parseFloat(query.data.minRoiPercentage),
      }
    : undefined;

  return {
    settings,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
