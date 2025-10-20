// 🤖 INTERNAL NOTE:
// Purpose: Wrapper component for public storefront asset detail page
// Exports: PublicStorefrontAssetDetail component
// Feature: sales-channels/show-storefront
// Dependencies: StorefrontAssetDetail, data fetching

import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { StorefrontAssetDetail } from './storefront-asset-detail';

export function PublicStorefrontAssetDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();

  // Fetch storefront settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['public-storefront-settings', userId],
    queryFn: async () => {
      const response = await fetch(`/api/storefront/settings/user/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch storefront settings');
      return response.json();
    },
    enabled: !!userId
  });

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Storefront Not Found</h1>
          <p className="text-gray-600">This storefront is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <StorefrontAssetDetail
      settings={settings}
      userId={userId!}
      onBack={() => navigate(`/storefront/${userId}`)}
      onCartClick={() => navigate(`/storefront/${userId}/cart`)}
      onAddToCart={(asset) => {
        console.log('Add to cart:', asset.id);
        // TODO: Integrate with cart system
      }}
    />
  );
}
