// 🤖 INTERNAL NOTE:
// Purpose: Storefront asset detail page - clean product page vibe
// Exports: StorefrontAssetDetail component
// Feature: sales-channels/show-storefront
// Dependencies: asset data fetch, storefront settings

import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Download, X } from 'lucide-react';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { Asset, StorefrontSettings } from '@shared/schema';

export type ThemeMode = "light" | "dark" | "auto";

interface StorefrontAssetDetailProps {
  settings: Partial<StorefrontSettings> | null;
  userId: string;
  themeMode?: ThemeMode;
  previewAssetId?: string; // For dashboard preview mode
  onBack?: () => void;
  onCartClick?: () => void;
  onAddToCart?: (asset: Asset) => void;
  showCloseIcon?: boolean; // Show X instead of arrow
  cartItemCount?: number; // Show cart count badge
}

export function StorefrontAssetDetail({ 
  settings, 
  userId,
  themeMode = "light",
  previewAssetId, // For dashboard preview
  onBack,
  onCartClick,
  onAddToCart,
  showCloseIcon = false,
  cartItemCount = 0
}: StorefrontAssetDetailProps) {
  const { assetId: urlAssetId } = useParams<{ assetId: string }>();
  const [, navigate] = useLocation();

  // Use previewAssetId from props (dashboard) or urlAssetId from URL (public)
  const assetId = previewAssetId || urlAssetId;

  // 🎯 DUMMY PREVIEW ASSETS - same as public storefront page
  const dummyPreviewAssets: Asset[] = [
    {
      id: 'preview-1',
      userId: userId,
      title: '2024 Bowman Chrome Prospect Card',
      playerName: 'Sample Player',
      year: '2024',
      setName: 'Bowman Chrome',
      cardNumber: '101',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-001',
      psaImageFrontUrl: null,
      category: 'Baseball',
      serialNumbered: false,
      type: 'graded',
    },
    {
      id: 'preview-2',
      userId: userId,
      title: '2023 Prizm Basketball Rookie',
      playerName: 'Rising Star',
      year: '2023',
      setName: 'Prizm',
      cardNumber: '250',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-002',
      psaImageFrontUrl: null,
      category: 'Basketball',
      serialNumbered: false,
      type: 'graded',
    },
    {
      id: 'preview-3',
      userId: userId,
      title: '2022 Topps Chrome Football',
      playerName: 'MVP Candidate',
      year: '2022',
      setName: 'Topps Chrome',
      cardNumber: '75',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-003',
      psaImageFrontUrl: null,
      category: 'Football',
      serialNumbered: false,
      type: 'graded',
    },
    {
      id: 'preview-4',
      userId: userId,
      title: '2024 Panini Select Soccer',
      playerName: 'World Class',
      year: '2024',
      setName: 'Select',
      cardNumber: '33',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-004',
      psaImageFrontUrl: null,
      category: 'Soccer',
      serialNumbered: false,
      type: 'graded',
    },
    {
      id: 'preview-5',
      userId: userId,
      title: '2023 Topps Chrome Baseball Refractor',
      playerName: 'All-Star',
      year: '2023',
      setName: 'Topps Chrome',
      cardNumber: '150',
      grade: 'GEM MT 10',
      certNumber: 'PREVIEW-005',
      psaImageFrontUrl: null,
      category: 'Baseball',
      serialNumbered: false,
      type: 'graded',
    },
    {
      id: 'preview-6',
      userId: userId,
      title: '2024 Prizm Basketball',
      playerName: 'Rookie Sensation',
      year: '2024',
      setName: 'Prizm',
      cardNumber: '88',
      grade: 'MINT 9',
      certNumber: 'PREVIEW-006',
      psaImageFrontUrl: null,
      category: 'Basketball',
      serialNumbered: false,
      type: 'graded',
    },
  ];

  // ALWAYS use dummy preview assets
  const allAssets = dummyPreviewAssets;
  const isLoading = false;

  // Find the specific asset from the loaded assets
  const asset = allAssets.find((a: Asset) => a.id === assetId);

  // Fetch related assets (same player or set)
  const { data: relatedAssets = [] } = useQuery<Asset[]>({
    queryKey: ['storefront-related', userId, asset?.playerName, asset?.setName],
    queryFn: async () => {
      // Filter for related (same player or set, but not same asset)
      return allAssets.filter((a: Asset) => 
        a.id !== assetId && 
        (a.playerName === asset?.playerName || a.setName === asset?.setName)
      ).slice(0, 6); // Limit to 6 related items
    },
    enabled: !!asset && allAssets.length > 0
  });

  const primaryColor = settings?.primaryColor || '#0d9488';
  const accentColor = settings?.accentColor || '#14b8a6';
  const headingFont = settings?.headingFont || 'Inter';
  const fontStyle = settings?.fontStyle || 'Inter';
  const buttonRadius = settings?.buttonRadius || 16;
  const storeLogo = settings?.storeLogo;
  const storeName = settings?.storeName || 'Store';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(`/storefront/${userId}`);
    }
  };

  const handleAddToCart = () => {
    if (asset && onAddToCart) {
      onAddToCart(asset);
    }
  };

  const handleSaveToPhone = () => {
    if (asset?.psaImageFrontUrl) {
      // Open image in new tab so user can save it
      window.open(asset.psaImageFrontUrl, '_blank');
    }
  };

  const handleRelatedClick = (relatedAssetId: string) => {
    navigate(`/storefront/${userId}/asset/${relatedAssetId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto" 
            style={{ borderColor: `${primaryColor}40`, borderTopColor: primaryColor }} 
          />
          <p className="mt-4 text-gray-500" style={{ fontFamily: fontStyle }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: headingFont }}>Card Not Found</h1>
          <p className="text-gray-500 mb-6" style={{ fontFamily: fontStyle }}>This card is no longer available.</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              backgroundColor: primaryColor,
              borderRadius: `${buttonRadius}px`,
              fontFamily: headingFont,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Back to Store
          </button>
        </div>
      </div>
    );
  }
  
  // List price (preview mode: $0.00)
  const listPrice = 0; // TODO: Integrate with actual list pricing system

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showCloseIcon ? (
              <X className="h-5 w-5 text-gray-900" />
            ) : (
              <ArrowLeft className="h-5 w-5 text-gray-900" />
            )}
          </button>
          
          {storeLogo ? (
            <img src={storeLogo} alt={storeName} className="w-9 h-9 rounded-full border" />
          ) : (
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
            >
              {storeName.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          <div className="text-base font-bold text-gray-900" style={{ fontFamily: headingFont }}>
            {storeName}
          </div>
        </div>
        
        <button
          onClick={onCartClick}
          className="w-10 h-10 flex items-center justify-center text-white transition-opacity hover:opacity-90 rounded-lg relative"
          style={{ backgroundColor: primaryColor }}
        >
          <ShoppingCart className="h-5 w-5" />
          {cartItemCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-full"
              style={{ backgroundColor: '#ef4444' }}
            >
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Image */}
          <div className="bg-white rounded-xl p-6 lg:p-10 flex items-center justify-center">
            <img 
              src={asset.psaImageFrontUrl || PLACEHOLDER_IMAGE_URL}
              alt={asset.title || 'Card'}
              className="w-full max-w-md aspect-[2/3] object-contain rounded-lg"
            />
          </div>

          {/* Right Side - Details */}
          <div className="flex flex-col gap-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold" style={{ fontFamily: fontStyle }}>
              {asset.category || 'Trading Card'}
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight" style={{ fontFamily: headingFont }}>
              {asset.title}
            </h1>
            
            <div className="text-sm text-gray-400" style={{ fontFamily: fontStyle }}>
              Cert #{asset.certNumber || 'N/A'}
            </div>
            
            <div className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: headingFont }}>
              {formatCurrency(listPrice)}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAddToCart}
                className="w-full py-4 text-base font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
                style={{ 
                  backgroundColor: primaryColor,
                  borderRadius: `${buttonRadius}px`,
                  fontFamily: headingFont,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <ShoppingCart className="h-5 w-5" />
                Add To Cart
              </button>
              
              <button
                onClick={handleSaveToPhone}
                className="w-full py-4 text-base font-bold border-2 flex items-center justify-center gap-2 transition-colors hover:bg-gray-50"
                style={{ 
                  borderRadius: `${buttonRadius}px`,
                  color: primaryColor,
                  borderColor: primaryColor,
                  backgroundColor: 'transparent',
                  fontFamily: headingFont,
                  cursor: 'pointer',
                }}
              >
                <Download className="h-5 w-5" />
                Save To Phone
              </button>
            </div>

            {/* Details Table */}
            <div className="bg-white rounded-xl border overflow-hidden mt-4">
              <DetailRow label="Category" value={asset.category || 'Trading Card'} fontStyle={fontStyle} />
              <DetailRow label="Player Name" value={asset.playerName || '—'} fontStyle={fontStyle} />
              <DetailRow label="Year" value={asset.year?.toString() || '—'} fontStyle={fontStyle} />
              <DetailRow label="Set Name" value={asset.setName || '—'} fontStyle={fontStyle} />
              <DetailRow label="Card Number" value={asset.cardNumber?.toString() || '—'} fontStyle={fontStyle} />
              <DetailRow 
                label="Serial Numbered" 
                value={asset.serialNumbered ? `Yes (${asset.serialNumber}/${asset.serialMax})` : 'No'}
                fontStyle={fontStyle}
                isLast
              />
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedAssets.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: headingFont }}>
              Related Cards
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedAssets.map((related) => (
                <RelatedCard
                  key={related.id}
                  asset={related}
                  onClick={() => handleRelatedClick(related.id)}
                  primaryColor={primaryColor}
                  buttonRadius={buttonRadius}
                  fontStyle={fontStyle}
                  headingFont={headingFont}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Detail Row Component
function DetailRow({ 
  label, 
  value, 
  fontStyle,
  isLast = false 
}: { 
  label: string; 
  value: string;
  fontStyle: string;
  isLast?: boolean;
}) {
  return (
    <div className={`flex justify-between px-4 py-3 ${!isLast ? 'border-b' : ''}`}>
      <span className="text-sm text-gray-500 font-medium" style={{ fontFamily: fontStyle }}>{label}</span>
      <span className="text-sm text-gray-900 font-semibold text-right" style={{ fontFamily: fontStyle }}>{value}</span>
    </div>
  );
}

// Related Card Component
function RelatedCard({ 
  asset, 
  onClick,
  primaryColor,
  buttonRadius,
  fontStyle,
  headingFont
}: { 
  asset: Asset; 
  onClick: () => void;
  primaryColor: string;
  buttonRadius: number;
  fontStyle: string;
  headingFont: string;
}) {
  const listPrice = 0; // TODO: Integrate with pricing system
  
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg p-3 border transition-all duration-200 cursor-pointer hover:shadow-md"
      style={{ borderColor: '#e5e7eb' }}
    >
      <img 
        src={asset.psaImageFrontUrl || PLACEHOLDER_IMAGE_URL}
        alt={asset.title || 'Card'}
        className="w-full aspect-[2/3] object-contain rounded mb-2"
      />
      
      <div className="text-xs text-gray-500 mb-1 truncate" style={{ fontFamily: fontStyle }}>
        {asset.category || 'Card'}
      </div>
      
      <div className="text-xs font-bold text-gray-900 mb-1 line-clamp-2 leading-tight" style={{ fontFamily: headingFont }}>
        {asset.title}
      </div>
      
      <div className="text-xs text-gray-400 mb-1 truncate" style={{ fontFamily: fontStyle }}>
        #{asset.certNumber}
      </div>
      
      <div className="text-sm font-bold" style={{ color: primaryColor, fontFamily: headingFont }}>
        {formatCurrency(listPrice)}
      </div>
    </div>
  );
}
