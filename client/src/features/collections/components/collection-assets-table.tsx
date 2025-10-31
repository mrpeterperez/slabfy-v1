import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { PRICING_CACHE } from '@/lib/cache-tiers';
import { Badge } from '@/components/ui/badge';
import { OwnershipBadge, getOwnershipType } from '@/components/ui/ownership-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MoreHorizontal, 
  Package,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';

// Pricing data interface (matching backend structure)
interface PricingData {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: "fire" | "hot" | "warm" | "cool" | "cold";
  confidence: number;
  lastSaleDate: string | null;
  salesCount: number;
  exitTime: string;
}

// Asset type for collection assets
interface CollectionAsset {
  id: string;
  globalAssetId: string;
  title?: string | null;
  playerName?: string | null;
  setName?: string | null;
  year?: string | null;
  cardNumber?: string | null;
  variant?: string | null;
  grader?: string | null;
  grade?: string | null;
  certNumber?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  notes?: string | null;
  psaImageFrontUrl?: string | null;
  psaImageBackUrl?: string | null;
  imageUrl?: string | null;
  type?: 'portfolio' | 'consignment';
  consignmentTitle?: string;
  globalAsset?: {
    playerName?: string | null;
    setName?: string | null;
    year?: string | null;
    cardNumber?: string | null;
    variant?: string | null;
    grader?: string | null;
    grade?: string | null;
    title?: string | null;
    psaImageFrontUrl?: string | null;
    psaImageBackUrl?: string | null;
  };
}

interface CollectionAssetsTableProps {
  assets: CollectionAsset[];
  isLoading: boolean;
  onRemoveAsset?: (globalAssetId: string) => void;
}

type SortColumn = 'asset' | 'value' | 'confidence' | 'ownership' | 'added';
type SortDirection = 'asc' | 'desc';

export const CollectionAssetsTable = ({ 
  assets, 
  isLoading, 
  onRemoveAsset
}: CollectionAssetsTableProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('asset');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    assetId: string | null;
    assetTitle: string;
  }>({
    open: false,
    assetId: null,
    assetTitle: '',
  });
  
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const getOwnershipColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "consignment":
  return "bg-purple-background text-purple-primary border-purple-primary";
      case "portfolio":
  return "bg-blue-background text-blue-primary border-blue-primary";
      default:
  return "bg-muted text-muted-foreground";
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(assets.map((asset: any) => asset.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteAsset = (assetId: string, assetTitle: string) => {
    setDeleteDialog({
      open: true,
      assetId,
      assetTitle,
    });
  };

  const confirmDelete = () => {
    if (deleteDialog.assetId && onRemoveAsset) {
      onRemoveAsset(deleteDialog.assetId);
    }
    setDeleteDialog({
      open: false,
      assetId: null,
      assetTitle: '',
    });
  };

  const handleAssetClick = (asset: any) => {
    // Open asset details in new tab
    const url = `/assets/${asset.globalAssetId}?from=collections`;
    window.open(url, '_blank');
  };

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th 
      className="px-3 py-3 text-left font-medium text-foreground whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </th>
  );

  const headerCheckboxChecked = selectedItems.size === assets.length;
  const headerCheckboxIndeterminate = selectedItems.size > 0 && selectedItems.size < assets.length;

  const sortedAssets = [...assets].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'asset':
        aValue = a.globalAsset?.title || a.title || '';
        bValue = b.globalAsset?.title || b.title || '';
        break;
      case 'ownership':
        aValue = (a as any).ownershipType || 'portfolio';
        bValue = (b as any).ownershipType || 'portfolio';
        break;
      case 'added':
        aValue = new Date((a as any).addedAt || (a as any).createdAt || 0);
        bValue = new Date((b as any).addedAt || (b as any).createdAt || 0);
        break;
      default:
        aValue = '';
        bValue = '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">No assets in this collection</p>
        <p className="text-sm text-muted-foreground">
          Click "Add Assets" to add cards to this collection.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-h-full overflow-auto">
        <table className="min-w-full divide-y-2 divide-border">
          <thead className="sticky top-0 bg-background border-b border-border">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-foreground whitespace-nowrap w-12">
                <Checkbox
                  checked={headerCheckboxChecked}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className="data-[state=indeterminate]:bg-primary/50"
                />
              </th>
              <SortableHeader column="asset">Asset</SortableHeader>
              <SortableHeader column="value">Market Value</SortableHeader>
              <SortableHeader column="confidence">Conf.</SortableHeader>
              <SortableHeader column="ownership">Ownership</SortableHeader>
              <SortableHeader column="added">Added</SortableHeader>
              <th className="sticky right-0 bg-background px-3 py-3 text-left font-medium text-foreground whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map((asset) => (
              <CollectionAssetRow
                key={asset.id}
                asset={asset}
                isSelected={selectedItems.has(asset.id)}
                onSelectChange={() => handleSelectItem(asset.id)}
                onAssetClick={() => handleAssetClick(asset)}
                onDeleteClick={() => handleDeleteAsset(asset.globalAssetId, asset.globalAsset?.title || asset.title || 'Asset')}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Asset from Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteDialog.assetTitle}" from this collection?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Individual row component
function CollectionAssetRow({
  asset,
  isSelected,
  onSelectChange,
  onAssetClick,
  onDeleteClick,
}: {
  asset: CollectionAsset;
  isSelected: boolean;
  onSelectChange: () => void;
  onAssetClick: () => void;
  onDeleteClick: () => void;
}) {
  // Fetch pricing data for this asset
  const { data: pricingData, isLoading: isPricingLoading } = useQuery<PricingData>({
    queryKey: queryKeys.pricing.single(asset.globalAssetId!),
    queryFn: async () => {
      const response = await fetch(`/api/pricing/${asset.globalAssetId}`);
      if (!response.ok) throw new Error('Pricing fetch failed');
      return response.json();
    },
    enabled: !!asset.globalAssetId,
    placeholderData: (previousData) => previousData,
    ...PRICING_CACHE,
  });

  // Get asset display data
  const displayData = {
    title: asset.globalAsset?.title || asset.title,
    playerName: asset.globalAsset?.playerName || asset.playerName,
    setName: asset.globalAsset?.setName || asset.setName,
    year: asset.globalAsset?.year || asset.year,
    cardNumber: asset.globalAsset?.cardNumber || asset.cardNumber,
    variant: asset.globalAsset?.variant || asset.variant,
    grader: asset.globalAsset?.grader || asset.grader,
    grade: asset.globalAsset?.grade || asset.grade,
    psaImageFrontUrl: asset.globalAsset?.psaImageFrontUrl,
  };

  // Build enhanced title
  const buildTitle = () => {
    const parts = [];
    if (displayData.playerName) parts.push(displayData.playerName);
    if (displayData.year) parts.push(displayData.year);
    if (displayData.setName) parts.push(displayData.setName);
    if (displayData.cardNumber) parts.push(`#${displayData.cardNumber}`);
    if (displayData.variant && displayData.variant !== "BASE") parts.push(`(${displayData.variant})`);
    
    return parts.join(' ') || displayData.title || 'Untitled Asset';
  };

  const marketValue = pricingData?.averagePrice || 0;
  const confidence = pricingData?.confidence || 0;
  const ownershipType = getOwnershipType(asset);

  return (
    <tr className="group border-b hover:bg-muted/50 transition-colors">
      <td className="px-3 py-3 whitespace-nowrap w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectChange}
        />
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="h-24 rounded-sm bg-muted overflow-hidden flex-shrink-0">
            {displayData.psaImageFrontUrl ? (
              <img 
                src={displayData.psaImageFrontUrl} 
                alt="Card"
                className="h-full w-auto object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-16 text-xs text-muted-foreground">
                No Image
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground truncate">{displayData.playerName || 'Unknown Player'}</p>
            <div 
              className="font-bold text-foreground text-sm truncate cursor-pointer hover:text-brand flex items-center gap-1 group"
              onClick={onAssetClick}
            >
              <span className="truncate">
                {displayData.year} {displayData.setName}
              </span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
            <div className="text-sm text-muted-foreground truncate">
              #{displayData.cardNumber} • {displayData.grader} {displayData.grade}
            </div>
            {asset.certNumber && (
              <div className="text-xs text-muted-foreground truncate">
                Cert: {asset.certNumber}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        {isPricingLoading ? (
          <div>
            <div className="h-5 w-16 bg-skeleton rounded mb-1"></div>
            <div className="h-3 w-12 bg-skeleton rounded"></div>
          </div>
        ) : (
          <div>
            <div className="font-medium">
              {marketValue > 0 ? formatCurrency(marketValue) : "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              Market Value
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        {isPricingLoading ? (
          <div className="h-5 w-16 bg-skeleton rounded"></div>
        ) : (
          <div className="text-sm">
            <Badge variant={confidence >= 70 ? "default" : confidence >= 40 ? "secondary" : "outline"}>
              {confidence}%
            </Badge>
          </div>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <OwnershipBadge type={ownershipType} />
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
        {(asset as any).addedAt ? new Date((asset as any).addedAt).toLocaleDateString() : 
         (asset as any).createdAt ? new Date((asset as any).createdAt).toLocaleDateString() : "-"}
      </td>
      <td className="sticky right-0 bg-background px-3 py-3 whitespace-nowrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAssetClick}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDeleteClick}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove from Collection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}