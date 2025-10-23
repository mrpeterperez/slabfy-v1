// 🤖 INTERNAL NOTE (LLM):
// Main entry for the V2 asset details page. Keep this file lean: compose small components,
// no default exports, no stray logs, and avoid unnecessary effects per slabfyrules.

import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { getAsset } from "@shared/api/asset-api";
import { apiRequest } from "@/lib/queryClient";
import { Asset } from "@shared/schema";
import { useAuth } from "@/components/auth-provider";
// PSA metadata now comes from the asset data directly
import { Separator } from "@/components/ui/separator";
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";


// Import components
import { AssetDetailHeader } from "./asset-detail-header";
import { AssetDetailMobile } from "./asset-detail-mobile";
import { AssetDetailDesktop } from "./asset-detail-desktop";
import { useUserAssets } from "../hooks/use-user-assets";

// Import overview tab components via index
import {
  ChartComponent,
  AssetDetailsCard,
  GradingDetailsCard,
  MarketValueCard,
  AverageCostCard,
  AssetBreakdownTable,
} from "./overview-tab";

// Import variations components
import { VariationsTable, useVariations } from "./variations";

// Sales history components removed - now using Sales Comp

// Import sales comp components
import { SalesView } from "./sales-comp";


// Pricing panel removed as requested

// Import point of sale components
// Layout is split across header/mobile/desktop components

/**
 * V2 of the asset detail page with enhanced layout and features
 */
export const AssetDetailPageV2 = ({ providedAsset }: { providedAsset?: Asset }) => {
  const { id, tab } = useParams<{ id: string; tab?: string }>();
  const activeTab = tab || "overview";
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  // Parse search parameters to detect where user came from
  // Wouter doesn't include query params in location, so we need to check window.location
  const fullUrl = typeof window !== 'undefined' ? window.location.href : '';
  const url = new URL(fullUrl, 'http://localhost'); // Fallback base for SSR
  const fromSource = url.searchParams.get('from') || 'portfolio';
  const offerId = url.searchParams.get('offerId'); // Get specific offer ID if coming from buy-mode
  const isGlobalAsset = url.searchParams.get('global') === 'true'; // Check if this is a global asset

  // If a providedAsset is given, use it directly instead of fetching
  // Otherwise fetch the asset details from the API
  // Smart fallback: Try user assets first, then global assets if not found
  const {
    data: fetchedAsset,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [`/api/assets-or-global/${id}`, user?.id],
    queryFn: async () => {
      // First try to fetch as user asset (will work if user owns it)
      try {
        const userAssetResponse = await apiRequest("GET", `/api/assets/${id}`);
        if (userAssetResponse.ok) {
          return userAssetResponse.json();
        }
      } catch (error: any) {
        // Only fall through to global assets if it's a 404 (not found)
        // If it's 401 (unauthorized), something's wrong with auth - throw it
        if (error?.status === 401) {
          console.error('Auth error when fetching asset:', error);
          throw new Error('Authentication required to view this asset');
        }
        // For 404 or other errors, try global assets
        console.log('Asset not in user collection, trying global assets');
      }
      
      // Fallback to global asset if user asset not found
      const globalAssetResponse = await apiRequest("GET", `/api/global-assets/by-id/${id}`);
      if (!globalAssetResponse.ok) {
        throw new Error('Asset not found in user collection or global assets');
      }
      return globalAssetResponse.json();
    },
    enabled: !!id && !providedAsset && !authLoading, // Wait for auth to load before fetching
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    placeholderData: (prev) => prev, // Keep previous data to prevent jank
  });

  // Use the provided asset or the fetched asset
  const asset = providedAsset || fetchedAsset;

  // Check ownership via backend API for more accurate determination
  // Use globalAssetId for ownership check (works for both user assets and global assets)
  const globalAssetIdForOwnership = asset?.globalAssetId || asset?.id;
  
  const { data: ownershipData, isLoading: isLoadingOwnership } = useQuery({
    queryKey: ['asset-ownership', globalAssetIdForOwnership, user?.id],
    queryFn: async () => {
      if (!user?.id || !globalAssetIdForOwnership) return null;
      const response = await apiRequest('GET', `/api/assets/ownership/${globalAssetIdForOwnership}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.id && !!globalAssetIdForOwnership && !authLoading,
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
  });

  // Determine ownership and sold status
  const isOwner = !!ownershipData?.id;
  const isSold = ownershipData?.soldAt || ownershipData?.ownershipStatus === 'sold';
  const ownershipStatus = ownershipData?.ownershipStatus || 'not-owned';

  // Use cached user assets to compute related assets without extra network calls
  const { assets: allUserAssets } = useUserAssets(asset?.userId);
  const relatedAssets: Asset[] = (asset && allUserAssets.length)
    ? allUserAssets.filter(otherAsset =>
        otherAsset.id !== asset.id &&
        otherAsset.playerName === asset.playerName &&
        otherAsset.year === asset.year &&
        otherAsset.setName === asset.setName &&
        otherAsset.cardNumber === asset.cardNumber &&
        otherAsset.grader === asset.grader &&
        otherAsset.grade === asset.grade &&
        otherAsset.variant === asset.variant
      )
    : [];

  // Fetch variations for the variations tab
  const { variations, isLoading: isLoadingVariations } = useVariations({
    baseAsset: asset,
    enabled: activeTab === "variations",
    cachedAssets: allUserAssets,
  });

  // Dynamic breadcrumb logic
  const getBreadcrumbConfig = (source: string): { label: string; path: string | null } => {
    switch (source) {
  case 'buy-mode':
        // For buy-mode, if no offerId or opened in new tab, show generic breadcrumb
        if (!offerId) {
          return {
    label: 'Asset Details', // No change when detached
            path: null // No navigation - just label for new tab context
          };
        } else {
          return {
  label: 'Buying Desk',
            path: `/buy-mode/${offerId}` // Route back to specific offer
          };
        }
      case 'consignments':
        return {
          label: 'Asset Details',
          path: null // No navigation - just show generic label for consignments context
        };
      case 'events':
        return {
          label: 'Events',
          path: '/events'
        };
      case 'search':
        return {
          label: 'Search',
          path: '/search'
        };
      case 'portfolio':
      default:
        return {
          label: 'Portfolio',
          path: '/portfolio'
        };
    }
  };

  const breadcrumbConfig = getBreadcrumbConfig(fromSource);


  // If we're still loading (auth or asset data) and don't have a provided asset
  if ((authLoading || isLoading) && !providedAsset) {
    return (
      <div className="min-h-screen bg-background">
  <div className="container mx-auto py-8">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // If there was an error fetching and we don't have a provided asset
  if ((isError || !asset) && !providedAsset) {
    return (
      <div className="min-h-screen bg-background">
  <div className="container mx-auto py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <h1 className="text-xl font-semibold text-destructive">
              Error loading asset
            </h1>
            <p className="text-muted-foreground">
              Unable to load asset details. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AssetDetailHeader
        asset={asset}
        assetId={id}
        activeTab={activeTab}
        isOwner={isOwner}
        isSold={isSold}
      />
      <div className="container mx-auto pl-3 pr-3 pt-4 pb-24">
        <AssetDetailMobile
          asset={asset}
          isOwner={isOwner}
          isSold={isSold}
          ownershipStatus={ownershipStatus}
          activeTab={activeTab}
          relatedAssets={relatedAssets}
          variations={variations}
          isLoadingVariations={isLoadingVariations}
        />
        <AssetDetailDesktop
          asset={asset}
          isOwner={isOwner}
          isSold={isSold}
          ownershipStatus={ownershipStatus}
          activeTab={activeTab}
          relatedAssets={relatedAssets}
          variations={variations}
          isLoadingVariations={isLoadingVariations}
        />
      </div>
    </div>
  );
};

// No default export per slabfyrules