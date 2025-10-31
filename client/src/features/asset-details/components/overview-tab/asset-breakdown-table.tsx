  // 🤖 INTERNAL NOTE (LLM):
  // This file defines the AssetBreakdownTable component that shows detailed card inventory.
  // It renders a table with certification details, grades, purchase info, and performance metrics.
  // Part of the `asset-details` feature, under the overview-tab subfolder.
  // Uses Lucide icons for visual indicators.

  import React, { useMemo, useState } from "react";
  import {
  Award,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  Percent,
  Info,
  ExternalLink,
  Pencil,
  } from "lucide-react";
  import { Asset } from "@shared/schema";
  import { InlineEditableCell } from "./inline-editable-cell";
  import { useAssetUpdate } from "../../hooks/use-asset-update";
  import { useQuery } from "@tanstack/react-query";
  import { ResponsiveTooltip } from "@/components/ui/responsive-tooltip";
  import { OwnershipBadge, getOwnershipType } from "@/components/ui/ownership-badge";
  import { PortfolioSparkline } from "@/components/ui/metrics/sparkline/portfolio-sparkline";
  import { useAuth } from "@/components/auth-provider";
  import { PRICING_CACHE } from '@/lib/cache-tiers';
  import { queryKeys } from '@/lib/query-keys';
  import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Calendar as CalendarComponent } from "@/components/ui/calendar";
  import { format, isValid } from "date-fns";

  // SlabFy logo component for branded purchases
  function SlabfyLogo({ className = "" }: { className?: string }) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="45" height="14" viewBox="0 0 78 24" fill="none" className={className}>
        <g clipPath="url(#a)">
          <g clipPath="url(#b)">
            <path
              fill="currentColor"
              d="m17.82 7.74.1-.05-.06-.13.02-.11-.07.03.07-.04-.94-1.82-.06.04.06-.04-.11-.07-.02-.03L8.99 1l-.44.25.11.27h-.01l-.1-.27.43-.25-1.11.43-.44.25.32.32.95-.37-.02-.06.02.06-.31.18 7.58 4.38h-.01l.94 1.82-.94-1.82-7.58-4.38-.64.25.64-.25.32-.18-.95.37-.32-.32-.82 4.77.08.04.26.15 1.44.83.26.15.58-3.39-.58 3.39.26.15.58-3.37.02.02.26.15.08.04 5.17 2.98.02-.01h.01-.01l-.02.01-1.6 9.32-.01.03-.05.33-.02.1-.54-.31-1.09-.63-.04.26 1.7.99-1.7-.99-.06.34-.24 1.42-.06.33-.01.02 2.98 1.72 1.12-.43-.01-.01.01.01 2.08-12.15.03-.01-.02.01-2.09 12.15.44-.25 2.08-12.15-.1.05Z"
            />
            <path
              fill="currentColor"
              d="m11.37 18.45.24-1.42.06-.33.04-.26v-.1l.06-.25v-.08l.02-.02.78-4.56-.06-.13.02-.12-.93-1.83-.11-.06-.02-.04-2.19-1.26h-.02l-.06-.04-.2-.12-.06-.03h-.02v-.01l-.26-.15-.26-.15-1.44-.83-.26-.15-.08-.05-2.98-1.72-1.12.43-.44.25L0 17.56l.06.12-.02.12.94 1.83.11.07.02.04v-.02h.01v.02l7.81 4.52 1.12-.43-.23-.36.86-5.01v-.02l.06-.33.24-1.42.06-.33.04-.26V16l.06-.25v-.08l.02-.02v.02l-.02.08-.04.25v.08l-.02.02-.04.26-.06.33-.24 1.42-.06.33v.02l-.86 5.01.23.36.43-.25.82-4.76v-.02l.06-.33.01-.02ZM9.7 11.31h-.03l-.53 3.13v.02l-.02.08-.04.25v.08l-.02.02-.04.26-.06.33-.24 1.42-.06.33v.02l-.58 3.37v.02l-.06.33-.02.1-5.53-3.19L4.15 8.1v-.03h-.01v.03h.03l.26.16.08.04 1.63.94.08.05.26.15 1.44.83.26.15.26.15.02.01.06.03.2.12.06.03h-.02l.88.52h.02v.03Z"
            />
          </g>
          <path
            fill="currentColor"
            d="M36.283 3.054h-2.628l-3.565 16.24h3.74L37.09 4.45l-.806-1.395ZM46.361 11.307c.082-.45.12-.792.117-1.028-.017-.972-.456-1.69-1.316-2.155-.86-.464-2.204-.696-4.034-.696-.539 0-1.086.022-1.64.067a15.34 15.34 0 0 0-1.45.176l-.6 2.564.08.066c.269-.044.676-.088 1.223-.132a18.908 18.908 0 0 1 1.52-.067c.645 0 1.143.022 1.494.067.35.044.602.117.757.22a.494.494 0 0 1 .236.42c.003.133-.034.37-.109.708-.048.216-.104.491-.168.823a5.118 5.118 0 0 0-.926-.27 7.55 7.55 0 0 0-1.522-.133c-1.166 0-2.08.283-2.743.85-.663.568-1.119 1.397-1.369 2.486-.2.84-.25 1.565-.15 2.177.1.612.364 1.105.792 1.481.429.376 1.074.563 1.934.563.699 0 1.27-.132 1.716-.397.443-.266.795-.677 1.053-1.238h.086l.532 1.437h2.798l1.343-6.297c.149-.677.265-1.24.346-1.69v-.002Zm-4.76 5.123a3.03 3.03 0 0 1-.63.411c-.25.118-.535.177-.858.177-.234 0-.4-.044-.5-.133-.101-.088-.162-.232-.182-.43-.023-.2.018-.49.118-.873.115-.589.261-.98.437-1.172.175-.19.451-.287.829-.287.323 0 .573.004.754.011.149.007.324.015.523.026l-.493 2.268.001.002ZM56.282 7.728c-.415-.199-.902-.298-1.458-.298-.719 0-1.303.147-1.755.442-.451.295-.825.729-1.12 1.303h-.134c.34-1.09.568-1.892.684-2.408l.482-2.173-.888-1.539h-2.537l-3.564 16.24h2.77l1.002-1.414h.078c.081.546.334.95.76 1.216.426.265 1.016.397 1.77.397s1.468-.158 2.036-.475c.568-.316 1.069-.886 1.504-1.712.434-.825.816-1.996 1.15-3.513.18-.898.316-1.649.404-2.254a9.771 9.771 0 0 0 .12-1.569c-.008-.515-.124-.968-.347-1.36a2.137 2.137 0 0 0-.957-.883Zm-2.491 3.722-.897 4.154c-.03.294-.108.53-.23.707-.122.177-.267.31-.436.398-.17.088-.397.132-.683.132-.286 0-.553-.05-.797-.155a1.929 1.929 0 0 1-.405-.222l1.305-5.951c.147-.137.328-.242.547-.311.258-.082.54-.122.846-.122.287 0 .498.049.635.144.137.095.206.247.21.453.003.192-.028.449-.094.773h-.002ZM63.974 7.628l.275-1.26c.065-.367.208-.61.43-.728.223-.118.585-.177 1.088-.177.305 0 .627.007.968.022l.052-.066.55-2.454a12.69 12.69 0 0 0-.808-.077 15.907 15.907 0 0 0-1.077-.033c-1.49 0-2.619.276-3.39.829-.77.552-1.288 1.432-1.555 2.64l-.289 1.304h-1.304l-.598 2.719h1.302l-1.978 8.949h3.792l1.95-8.95h2.147l.003-.023.593-2.695h-2.153.002ZM76.908 7.628h-2.63l-3.404 8.395h-.485l-.301-8.395h-3.182l-.08.11.607 11.556h1.457l-2.479 4.662.055.044h3.955l7.228-15.093-.74-1.279ZM28.173 12.688c-.49-.325-.854-.586-1.09-.785-.236-.199-.374-.367-.413-.508a1.356 1.356 0 0 1-.01-.541c.05-.221.133-.383.247-.487.115-.103.297-.176.547-.22.25-.045.628-.067 1.129-.067.305 0 .627.004.968.011.341.009.647.033.916.078l.08-.067.494-2.52a23.516 23.516 0 0 0-2.855-.154c-1.47 0-2.632.247-3.484.74-.853.494-1.379 1.212-1.578 2.155-.117.502-.154.94-.111 1.315.042.376.191.734.448 1.072.257.338.632.678 1.12 1.017.545.324.926.585 1.144.784.218.199.352.394.4.586.05.192.031.435-.053.729a1.012 1.012 0 0 1-.272.586 1.26 1.26 0 0 1-.6.331c-.25.066-.563.1-.94.1a31.777 31.777 0 0 1-2.289-.11l-.08.021-.494 2.52.135.066c.88.103 1.895.154 3.043.154 1.489 0 2.645-.254 3.47-.762.825-.508 1.364-1.284 1.614-2.331.128-.825.098-1.525-.09-2.1-.19-.574-.656-1.112-1.4-1.613h.004Z"
          />
        </g>
        <defs>
          <clipPath id="a">
            <path fill="transparent" d="M0 0h77.649v24H0z" />
          </clipPath>
          <clipPath id="b">
            <path fill="transparent" d="M0 1h17.92v23.25H0z" />
          </clipPath>
        </defs>
      </svg>
    )
  }

  interface AssetBreakdownTableProps {
    asset: Asset;
    relatedAssets?: Asset[]; // Related assets with the same card but different cert numbers
  }

  interface BreakdownItem {
    id: string;
    certId: string;
    purchaseDate: string | null;
    purchasePrice: number | null;
    purchaseSource: string | null;
    buyOfferId: string | null;
    ownershipStatus?: string;
  }

  interface PricingData {
    averagePrice: number;
    confidence: number;
    liquidity: string;
  }

  // Component to display return with market data
  const ReturnCell: React.FC<{ assetId: string; purchasePrice: number | null }> = ({ 
    assetId, 
    purchasePrice 
  }) => {
    const { user, loading: authLoading } = useAuth();
    
    const { data: pricingData, isLoading, isFetching } = useQuery<PricingData>({
      queryKey: queryKeys.pricing.single(assetId),
      enabled: !!assetId && !authLoading,
      placeholderData: (previousData) => previousData,
      ...PRICING_CACHE,
    });

    if (isLoading) {
      return (
        <div className="animate-pulse">
          <div className="h-5 w-20 bg-skeleton rounded"></div>
        </div>
      );
    }

    if (!pricingData?.averagePrice || !purchasePrice) {
      return <span className="text-muted-foreground">-</span>;
    }

    const marketValue = pricingData.averagePrice;
    const profit = marketValue - purchasePrice;
    const returnPercentage = (profit / purchasePrice) * 100;
    const returnColorClass = returnPercentage >= 0 ? 'text-success' : 'text-destructive';

    // Tooltip content for return calculation
    const tooltipContent = (
      <div>
        <p className="font-medium mb-2">Return Calculation</p>
        <div className="space-y-1 text-xs">
          <p>Market Value: ${marketValue.toFixed(2)}</p>
          <p>Purchase Price: ${purchasePrice.toFixed(2)}</p>
          <p>Profit/Loss: {profit >= 0 ? '+' : ''}${profit.toFixed(2)}</p>
          <hr className="my-2 opacity-30" />
          <p>Confidence: {pricingData.confidence}%</p>
          <p>Liquidity: {pricingData.liquidity}</p>
          <p className="mt-2 text-muted-foreground">
            Based on recent marketplace activity
          </p>
        </div>
      </div>
    );

    return (
      <div className="flex items-center gap-1">
        <TrendingUp className={`${returnColorClass} mr-1`} size={16} />
        <span className={`font-medium ${returnColorClass}`}>
          {returnPercentage >= 0 ? '+' : ''}${profit.toFixed(2)}({returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%)
        </span>
        <ResponsiveTooltip
          title="Return Details"
          content={tooltipContent}
          trigger={<Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer ml-1" />}
        />
      </div>
    );
  };

  export const AssetBreakdownTable: React.FC<AssetBreakdownTableProps> = ({ 
    asset, 
    relatedAssets = [] 
  }) => {
    const { mutate: updateAsset } = useAssetUpdate();
    const [isMobile, setIsMobile] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingField, setEditingField] = useState<'date' | 'price' | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    // Detect mobile
    React.useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 1024);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Combine the current asset with any related assets that have the same card but different cert numbers
    const breakdownItems = useMemo(() => {
      const items: BreakdownItem[] = [{
        id: asset.id,
        certId: asset.certNumber || 'Unknown',
        purchaseDate: asset.purchaseDate || null,
        purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : null,
        purchaseSource: (asset as any).purchaseSource || null,
        buyOfferId: (asset as any).buyOfferId || null,
        ownershipStatus: asset.ownershipStatus || 'own',
      }];
      
      // Add related assets if provided
      if (relatedAssets && relatedAssets.length > 0) {
        relatedAssets.forEach(relatedAsset => {
          items.push({
            id: relatedAsset.id,
            certId: relatedAsset.certNumber || 'Unknown',
            purchaseDate: relatedAsset.purchaseDate || null,
            purchasePrice: relatedAsset.purchasePrice ? Number(relatedAsset.purchasePrice) : null,
            purchaseSource: (relatedAsset as any).purchaseSource || null,
            buyOfferId: (relatedAsset as any).buyOfferId || null,
            ownershipStatus: relatedAsset.ownershipStatus || 'own',
          });
        });
      }
      
      return items;
    }, [asset, relatedAssets]);

    
    // Helper function to calculate days since a date
    function calculateDaysSince(date: Date): number {
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }

    // Handle purchase price update
    const handlePurchasePriceUpdate = (assetId: string, newPrice: number | null) => {
      updateAsset({
        assetId,
        updates: { purchasePrice: newPrice }
      });
    };

    // Handle purchase date update
    const handlePurchaseDateUpdate = (assetId: string, newDate: string | null) => {
      console.log('📅 AssetBreakdownTable - handlePurchaseDateUpdate called:', { assetId, newDate });
      updateAsset({
        assetId,
        updates: { purchaseDate: newDate }
      });
    };

    // Open drawer for editing
    const openDateDrawer = (itemId: string, currentDate: string | null) => {
      setEditingItemId(itemId);
      setEditingField('date');
      // Format date as YYYY-MM-DD for calendar component (avoid timezone shifts)
      let formattedDate = '';
      if (currentDate) {
        try {
          const date = new Date(`${currentDate}T12:00:00`);
          if (isValid(date)) {
            formattedDate = date.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error('Invalid date format:', currentDate);
        }
      }
      setEditValue(formattedDate);
      setDrawerOpen(true);
    };

    const openPriceDrawer = (itemId: string, currentPrice: number | null) => {
      setEditingItemId(itemId);
      setEditingField('price');
      setEditValue(currentPrice?.toString() || '');
      setDrawerOpen(true);
    };

    const handleDrawerSave = () => {
      if (!editingItemId) return;
      
      if (editingField === 'date') {
        handlePurchaseDateUpdate(editingItemId, editValue || null);
      } else if (editingField === 'price') {
        handlePurchasePriceUpdate(editingItemId, editValue ? parseFloat(editValue) : null);
      }
      
      setDrawerOpen(false);
      setEditingItemId(null);
      setEditingField(null);
      setEditValue('');
    };

  return (
  <>
  <div className="">
  <div className="bg-card rounded-lg border overflow-hidden">

  {/* Main table */}
  <div className="overflow-x-auto">
  <table className="w-full">
  <thead>
  <tr className="bg-card border-b">
  <th className="text-left py-4 px-6 font-medium text-sm w-32">
  Cert ID
  </th>
  <th className="text-left py-4 px-4 font-medium text-sm w-24 min-w-24">
  Ownership
  </th>
  <th className="text-left py-4 px-4 font-medium text-sm w-40 min-w-40">
  Purchase Date
  </th>
  <th className="text-left py-4 px-4 font-medium text-sm w-auto">
  Purchase Price
  </th>
  <th className="text-left py-4 px-4 font-medium text-sm w-32 min-w-32">
  Source
  </th>
  <th className="text-left py-4 px-4 font-medium text-sm w-32 min-w-32">
  Return
  </th>
  <th className="text-left py-4 px-4 font-medium text-sm w-28 min-w-28">
  Trend
  </th>
  </tr>
  </thead>
  <tbody>
  {/* Map over breakdownItems to render rows */}
  {breakdownItems.map((item, index) => {
                  return (
  <tr key={index} className="border-b border-border hover:bg-hover-muted last:border-b-0">
  <td className="py-4 px-6 w-auto">
  <div className="flex items-center">
  <span className="font-medium">{item.certId}</span>
  </div>
  </td>
  <td className="py-4 px-4 w-24 min-w-24">
  <OwnershipBadge type={getOwnershipType({ ownershipStatus: item.ownershipStatus || 'own' })} />
  </td>
  <td className="py-4 px-4 w-40 min-w-40">
  {item.ownershipStatus === 'consignment' ? (
    <span className="text-muted-foreground">—</span>
  ) : item.buyOfferId ? (
    // SlabFy purchase - read-only with formatted date
    <div className="flex items-center gap-2">
      <Calendar className="text-muted-foreground flex-shrink-0" size={16} />
      <span className="text-muted-foreground">
        {item.purchaseDate 
          ? new Date(item.purchaseDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'No date set'}
      </span>
    </div>
  ) : isMobile ? (
    // Mobile - click calendar icon to open drawer
    <button
      onClick={() => openDateDrawer(item.id, item.purchaseDate)}
      className="flex items-center gap-2 text-left hover:text-primary transition-colors"
    >
      <Calendar className="text-muted-foreground flex-shrink-0" size={16} />
      <span className="text-muted-foreground">
        {item.purchaseDate 
          ? new Date(item.purchaseDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'No date set'}
      </span>
    </button>
  ) : (
    // Desktop - editable inline
    <div className="flex items-center gap-2 whitespace-nowrap">
      <Calendar className="text-muted-foreground flex-shrink-0" size={16} />
      <InlineEditableCell
        value={item.purchaseDate}
        type="date"
        onSave={(newDate) => handlePurchaseDateUpdate(item.id, newDate as string)}
        placeholder="No date set"
      />
    </div>
  )}
  </td>
  <td className="py-4 px-4">
  {item.ownershipStatus === 'consignment' ? (
    <span className="text-muted-foreground">—</span>
  ) : item.buyOfferId ? (
    // SlabFy purchase - read-only with dollar sign
    <div className="flex items-center">
      <DollarSign className="text-muted-foreground mr-1 flex-shrink-0" size={16} />
      <span className="text-muted-foreground">
        {item.purchasePrice ? item.purchasePrice.toFixed(2) : 'No price set'}
      </span>
    </div>
  ) : isMobile ? (
    // Mobile - click to open drawer
    <button
      onClick={() => openPriceDrawer(item.id, item.purchasePrice)}
      className="flex items-center gap-1 text-left hover:text-primary transition-colors"
    >
      <DollarSign className="text-muted-foreground flex-shrink-0" size={16} />
      <span className="text-muted-foreground">
        {item.purchasePrice ? item.purchasePrice.toFixed(2) : 'No price set'}
      </span>
      <Pencil className="text-muted-foreground flex-shrink-0" size={14} />
    </button>
  ) : (
    // Desktop - editable inline
    <div className="flex items-center">
      <DollarSign className="text-muted-foreground mr-1 flex-shrink-0" size={16} />
      <InlineEditableCell
        value={item.purchasePrice}
        type="price"
        onSave={(newPrice) => handlePurchasePriceUpdate(item.id, newPrice as number)}
        placeholder="No price set"
      />
    </div>
  )}
  </td>
  <td className="py-4 px-4 w-32 min-w-32">
    {item.buyOfferId ? (
      // SlabFy purchase - show logo with clickable link to session
      <a 
        href={`/buying-desk/${item.buyOfferId}`}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        title={`View buy session ${item.buyOfferId}`}
      >
        <SlabfyLogo className="text-foreground" />
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </a>
    ) : (
      // Regular purchase source text
      <span className="text-muted-foreground">{item.purchaseSource || '—'}</span>
    )}
  </td>
  <td className="py-4 px-4 w-32 min-w-32">
    <ReturnCell assetId={item.id} purchasePrice={item.purchasePrice} />
  </td>
  <td className="py-4 px-4 w-28 min-w-28">
    <div className="flex items-center justify-center">
      <PortfolioSparkline assetId={item.id} className="" />
    </div>
  </td>
  </tr>
                );
              })}
  </tbody>
  </table>
  </div>

  {/* Additional card info */}
  <div className="grid grid-cols-3 gap-2 p-6 bg-card border-t text-sm text-muted-foreground">
    {/* Holding Period */}
    <div>
      <div className="flex items-center mb-1">
        <span className="text-sm">Holding Period</span>
      </div>
      <span className="font-medium text-foreground">
        {(() => {
          // Calculate per asset based on individual purchase dates
          const ownedAssets = breakdownItems.filter(item => 
            item.ownershipStatus !== 'consignment' && item.purchaseDate
          );
          if (ownedAssets.length === 0) return 'Not specified';
          
          const avgDays = ownedAssets.reduce((total, item) => {
            const days = calculateDaysSince(new Date(item.purchaseDate!));
            return total + days;
          }, 0) / ownedAssets.length;
          
          return `${Math.round(avgDays)} days avg`;
        })()}
      </span>
    </div>
    
    {/* Population Data */}
    <div>
      <div className="flex items-center mb-1">
        <span className="text-sm">Population</span>
      </div>
      <span className="font-medium text-foreground">
        {asset.totalPopulation ? asset.totalPopulation.toLocaleString() : 'Unknown'}
      </span>
    </div>
    
    {/* Category Info */}
    <div>
      <div className="flex items-center mb-1">
        <span className="text-sm">{asset.category ? 'Category' : 'Last Updated'}</span>
      </div>
      <span className="font-medium text-foreground">
        {asset.category || 
          (asset.updatedAt ? 
            new Date(asset.updatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : 
            'Unknown')}
      </span>
    </div>
  </div>
  </div>
  </div>

  {/* Edit Drawer for Mobile */}
  <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>
          {editingField === 'date' ? 'Edit Purchase Date' : 'Edit Purchase Price'}
        </DrawerTitle>
      </DrawerHeader>
      <div className="p-4 space-y-4">
        {editingField === 'date' ? (
          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={
                  editValue && isValid(new Date(`${editValue}T12:00:00`))
                    ? new Date(`${editValue}T12:00:00`)
                    : undefined
                }
                onSelect={(date) => {
                  if (!date) return;
                  // Store as YYYY-MM-DD to avoid timezone issues
                  const isoDate = date.toISOString().split('T')[0];
                  setEditValue(isoDate);
                }}
                disabled={(date) => 
                  date > new Date() || date < new Date('1900-01-01')
                }
                initialFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="edit-value">Purchase Price ($)</Label>
            <Input
              id="edit-value"
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={handleDrawerSave} className="flex-1">
            Save
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </DrawerClose>
        </div>
      </div>
    </DrawerContent>
  </Drawer>
  </>
  );
  };

  // No default export needed as we're using named export