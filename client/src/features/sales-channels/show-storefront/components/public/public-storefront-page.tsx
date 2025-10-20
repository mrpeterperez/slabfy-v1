// 🤖 INTERNAL NOTE:
// Purpose: Public storefront page wrapper with tab state for home/inventory/checkout
// Exports: PublicStorefrontPage component
// Feature: sales-channels/show-storefront
// Dependencies: extracted tab components, data fetching hooks

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StorefrontHomeTab } from "./storefront-home-tab";
import { StorefrontInventoryTab } from "./storefront-inventory-tab";
import { StorefrontCheckout } from "./storefront-checkout";
import { StorefrontAssetDetail } from "./storefront-asset-detail";
import { StorefrontCartPanel, type StorefrontCartItem } from "./storefront-cart-panel";
import { StorefrontThemeToggle } from "./storefront-theme-toggle";
import { CartProvider } from "../../hooks/use-cart";
import { useStorefrontInventory } from "../../hooks/use-storefront-inventory";
import type { Asset } from "@shared/schema";

interface PublicStorefrontPageProps {
  eventId?: string;  // Optional: if provided, loads event inventory
  userId?: string;   // Optional: if provided (without eventId), loads user portfolio (legacy mode)
  previewSettings?: any; // Optional: if provided, uses these settings instead of fetching (for live preview)
  event?: any; // Optional: event data for placeholder replacement
  initialTab?: "home" | "inventory" | "checkout"; // Optional: force initial tab (for preview)
}

export function PublicStorefrontPage({ eventId, userId: propUserId, previewSettings, event, initialTab }: PublicStorefrontPageProps = {}) {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const userId = propUserId || paramUserId; // Use prop if provided, fallback to URL param
  const [, navigate] = useLocation();
  
  // Check if we're on the preview route - if so, get userId from sessionStorage
  const isPreviewRoute = window.location.pathname === '/storefront/preview';
  
  // Determine if this is a preview mode (settings page OR preview route)
  const isPreview = !!previewSettings || isPreviewRoute;
  
  // Read preview userId from sessionStorage (set by Eye button click)
  const previewUserId = (() => {
    try {
      const stored = sessionStorage.getItem('storefront-preview-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        return settings.userId; // Extract userId from saved settings
      }
      return null;
    } catch (e) {
      console.error('Failed to parse preview settings:', e);
      return null;
    }
  })();
  
  // For preview route, use the userId from sessionStorage to fetch LATEST settings
  const effectiveUserId = isPreviewRoute ? previewUserId : userId;
  
  // Asset detail view state (for preview mode modal)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  // Load persisted tab from localStorage or default to "home"
  // If initialTab prop provided (preview mode), use that instead
  const [activeTab, setActiveTab] = useState<"home" | "inventory" | "checkout">(() => {
    if (initialTab) return initialTab; // Preview mode - use forced tab
    const saved = localStorage.getItem('storefront-active-tab');
    return (saved as "home" | "inventory" | "checkout") || "home";
  });
  
  // Update active tab when initialTab prop changes (for preview tab switching)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      // Close modal when switching tabs
      setSelectedAssetId(null);
    }
  }, [initialTab]);
  
  // Auto-open first asset modal when "asset" preview mode is triggered
  useEffect(() => {
    if (isPreview && initialTab === 'inventory' && selectedAssetId === null) {
      // Check if we need to show asset detail (simulate "asset" tab click)
      const shouldShowAssetDetail = sessionStorage.getItem('storefront-show-asset-detail');
      if (shouldShowAssetDetail === 'true') {
        setSelectedAssetId('preview-1'); // Open first dummy asset
        sessionStorage.removeItem('storefront-show-asset-detail'); // Clear flag
      }
    }
  }, [isPreview, initialTab, selectedAssetId]);
  
  // Cart state - load from localStorage
  const [cartItems, setCartItems] = useState<StorefrontCartItem[]>(() => {
    const saved = localStorage.getItem('storefront-cart-items');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Cart open state - auto-open if cart has items
  const [cartOpen, setCartOpen] = useState(() => {
    const saved = localStorage.getItem('storefront-cart-items');
    const savedItems = saved ? JSON.parse(saved) : [];
    return savedItems.length > 0; // Auto-open if cart has items
  });

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('storefront-active-tab', activeTab);
  }, [activeTab]);

  // Persist cart items to localStorage
  useEffect(() => {
    localStorage.setItem('storefront-cart-items', JSON.stringify(cartItems));
  }, [cartItems]);

  // Fetch storefront settings
  // For preview route: fetches LATEST settings from DB using userId from sessionStorage
  // For settings panel: uses previewSettings prop (no fetch needed)
  // For other routes: fetches settings using userId
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['public-storefront-settings', effectiveUserId],
    queryFn: async () => {
      const response = await fetch(`/api/storefront/settings/user/${effectiveUserId}`);
      if (!response.ok) throw new Error('Failed to fetch storefront settings');
      return response.json();
    },
    enabled: !!effectiveUserId && !previewSettings, // Fetch if userId available and no prop provided
    staleTime: 0, // Always fetch fresh data on mount
    refetchOnMount: 'always', // Refetch on every mount to get latest changes
  });

  // 🎯 DUMMY PREVIEW ASSETS - showing what storefront looks like with inventory
  const dummyPreviewAssets = [
    {
      id: 'preview-1',
      title: '2024 Bowman Chrome Prospect Card',
      playerName: 'Sample Player',
      year: 2024,
      setName: 'Bowman Chrome',
      cardNumber: '101',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-001',
      psaImageFrontUrl: null,
      category: 'Baseball',
    },
    {
      id: 'preview-2',
      title: '2023 Prizm Basketball Rookie',
      playerName: 'Rising Star',
      year: 2023,
      setName: 'Prizm',
      cardNumber: '250',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-002',
      psaImageFrontUrl: null,
      category: 'Basketball',
    },
    {
      id: 'preview-3',
      title: '2022 Topps Chrome Football',
      playerName: 'MVP Candidate',
      year: 2022,
      setName: 'Topps Chrome',
      cardNumber: '75',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-003',
      psaImageFrontUrl: null,
      category: 'Football',
    },
    {
      id: 'preview-4',
      title: '2024 Panini Select Soccer',
      playerName: 'World Class',
      year: 2024,
      setName: 'Select',
      cardNumber: '33',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-004',
      psaImageFrontUrl: null,
      category: 'Soccer',
    },
    {
      id: 'preview-5',
      title: '2023 Topps Chrome Baseball Refractor',
      playerName: 'All-Star',
      year: 2023,
      setName: 'Topps Chrome',
      cardNumber: '150',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-005',
      psaImageFrontUrl: null,
      category: 'Baseball',
    },
    {
      id: 'preview-6',
      title: '2024 Prizm Basketball',
      playerName: 'Rookie Sensation',
      year: 2024,
      setName: 'Prizm',
      cardNumber: '88',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-006',
      psaImageFrontUrl: null,
      category: 'Basketball',
    },
  ];

  // Event inventory (if eventId provided) OR dummy preview assets (legacy/preview mode)
  const { data: eventInventory, isLoading: eventInventoryLoading } = useStorefrontInventory(eventId);
  
  // Determine which data to use:
  // 1. If eventId provided → use real event inventory
  // 2. Otherwise → use dummy preview assets (legacy/preview mode)
  const portfolioAssets = eventId ? (eventInventory || []) : dummyPreviewAssets;
  const assetsLoading = eventId ? eventInventoryLoading : false;

  // 🎯 PREVIEW MODE: If previewSettings prop provided OR no userId/eventId
  const isPreviewMode = !!previewSettings || (!userId && !eventId);
  
  // Default dummy settings for preview mode
  const dummySettings = {
    id: 'preview',
    userId: 'preview',
    storeName: 'My Card Collection',
    description: 'Welcome to my sports card storefront',
    isPublished: true,
    logoUrl: null,
    bannerUrl: null,
    themeMode: 'light',
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    enableInventory: true,
    enableCart: true,
    enableCheckout: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Loading state - only show for real data fetching (not when previewSettings prop provided)
  if (!previewSettings && (settingsLoading || (eventId && eventInventoryLoading))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading storefront...</p>
        </div>
      </div>
    );
  }

  // Error state - only show for real storefronts that failed to load (not when previewSettings prop provided)
  if (!previewSettings && !settings && effectiveUserId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Storefront Not Found</h1>
          <p className="text-gray-600">This storefront is not available.</p>
        </div>
      </div>
    );
  }
  
  // Use settings with priority: previewSettings prop > fetched settings > dummy settings
  const activeSettings = previewSettings || settings || dummySettings;

  return (
    <div className="h-screen overflow-hidden relative">
      {activeTab === "home" && (
        <StorefrontHomeTab 
          settings={activeSettings} 
          userId={userId}
          event={event}
          onNavigateToInventory={() => setActiveTab('inventory')}
        />
      )}

      {activeTab === "inventory" && (
        <div className="h-screen flex overflow-hidden">
          {/* Main content - shrinks when cart opens */}
          <div className={`flex-1 transition-all duration-300 ${cartOpen ? 'mr-0' : 'mr-0'}`}>
            <StorefrontInventoryTab 
              settings={activeSettings}
              assets={portfolioAssets || []}
              isLoading={assetsLoading}
              userId={userId}
              cartItemCount={cartItems.length}
              isPreview={isPreview}
              onNavigateHome={() => setActiveTab('home')}
              onNavigateToAsset={(assetId: string) => {
                // In preview mode, show modal instead of navigating
                if (isPreview) {
                  setSelectedAssetId(assetId);
                } else {
                  navigate(`/storefront/${userId}/asset/${assetId}`);
                }
              }}
              onAddToCart={(asset: Asset) => {
                // Check if already in cart
                if (cartItems.some(item => item.id === asset.id)) {
                  console.log('Item already in cart');
                  return;
                }
                
                // Event inventory items have askingPrice from API
                const inventoryItem = asset as any;
                
                // Add to cart with pricing and event references
                const newItem: StorefrontCartItem = {
                  id: asset.id,
                  asset: asset,
                  price: inventoryItem.askingPrice ? parseFloat(inventoryItem.askingPrice) : 0,
                  // Event-based storefront data (if eventId provided)
                  eventId: eventId,
                  eventInventoryId: inventoryItem.eventInventoryId, // From event inventory API
                };
                
                setCartItems([...cartItems, newItem]);
                setCartOpen(true); // Auto-open cart when item added
              }}
              onCartClick={() => setCartOpen(true)}
            />
          </div>
          
          {/* Cart panel - pushes content, no overlay */}
          {cartOpen && (
            <div className="w-40 flex-shrink-0 border-l bg-white">
              <StorefrontCartPanel
                cartItems={cartItems}
                settings={activeSettings}
                cartOpen={cartOpen}
                onCartOpenChange={setCartOpen}
                onCartItemsChange={setCartItems}
                onCheckout={() => setActiveTab('checkout')}
                userId={userId}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "checkout" && (
        <StorefrontCheckout 
          userId={userId} 
          eventId={eventId} 
          cartItems={cartItems}
          settings={activeSettings || null}
          onBack={() => setActiveTab('inventory')}
        />
      )}
      
      {/* Asset Detail Modal (Preview Mode Only) */}
      {isPreview && selectedAssetId && (
        <div className="absolute inset-0 bg-white z-50 overflow-auto">
          <StorefrontAssetDetail
            settings={activeSettings}
            userId={userId || ''}
            previewAssetId={selectedAssetId}
            showCloseIcon={true}
            cartItemCount={cartItems.length}
            onBack={() => setSelectedAssetId(null)}
            onAddToCart={(asset: Asset) => {
              // Check if already in cart
              if (cartItems.some(item => item.id === asset.id)) {
                console.log('Item already in cart');
                return;
              }
              
              const inventoryItem = asset as any;
              const newItem: StorefrontCartItem = {
                id: asset.id,
                asset: asset,
                price: inventoryItem.askingPrice ? parseFloat(inventoryItem.askingPrice) : 0,
                eventId: eventId,
                eventInventoryId: inventoryItem.eventInventoryId,
              };
              
              setCartItems([...cartItems, newItem]);
              setCartOpen(true);
              setSelectedAssetId(null); // Close modal after adding
            }}
            onCartClick={() => {
              setSelectedAssetId(null);
              setCartOpen(true);
            }}
          />
        </div>
      )}
      
      {/* Floating theme toggle - ONLY on public storefront, NOT in preview */}
      {!isPreview && <StorefrontThemeToggle />}
    </div>
  );
}
