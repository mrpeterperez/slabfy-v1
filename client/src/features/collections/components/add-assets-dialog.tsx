import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Plus, Check, Image as ImageIcon, ChevronDown, ChevronRight, ExternalLink, ArrowUpDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { OwnershipBadge, getOwnershipType } from '@/components/ui/ownership-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddAssetToCollection } from '../hooks/use-collections';
import { type Asset, type CollectionWithDetails } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';

interface AddAssetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collection: CollectionWithDetails;
  userAssets: Asset[];
  existingAssets: any[]; // Assets already in the collection
}

// Combined asset type for display
interface CombinedAsset {
  id: string;
  globalAssetId: string;
  title?: string | null;
  playerName?: string | null;
  setName?: string | null;
  year?: number | string | null;
  grade?: string | null;
  cardNumber?: string | null;
  variant?: string | null;
  certNumber?: string | null;
  type: 'portfolio' | 'consignment';
  consignmentTitle?: string; // For consignment assets
  psaImageFrontUrl?: string | null;
  imageUrl?: string | null;
  ownershipStatus?: string | null;
}

// Grouped asset type for display
interface GroupedAsset {
  key: string;
  assets: CombinedAsset[];
  representativeAsset: CombinedAsset;
  count: number;
}

export function AddAssetsDialog({
  open,
  onOpenChange,
  collectionId,
  collection,
  userAssets,
  existingAssets
}: AddAssetsDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<'asset' | 'qty' | 'value' | 'type'>('asset');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const addAssetToCollection = useAddAssetToCollection();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Effect to manage focus when dialog opens
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  // Fetch all consignments to get their assets
  const { data: consignments = [] } = useQuery({
    queryKey: ['/api/consignments/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/consignments/user/${user.id}`);
      return response.json();
    },
    enabled: open && !!user?.id && !authLoading // Only fetch when dialog is open and user is authenticated
  });

  // Fetch all consignment assets from all consignments
  const { data: allConsignmentAssets = [] } = useQuery({
    queryKey: ['/api/consignments/assets', consignments.map((c: any) => c.id)],
    queryFn: async () => {
      if (!consignments.length) return [];
      
      console.log('Fetching consignment assets from consignments:', consignments.length);
      
      const assetPromises = consignments.map(async (consignment: any) => {
        const response = await apiRequest("GET", `/api/consignments/${consignment.id}/assets`);
        const assets = await response.json();
        console.log(`Consignment ${consignment.title} has ${assets.length} assets`);
        return assets.map((asset: any) => ({
          ...asset,
          consignmentTitle: consignment.title,
          type: 'consignment' as const
        }));
      });
      
      const allAssets = await Promise.all(assetPromises);
      const flattenedAssets = allAssets.flat();
      console.log('Total consignment assets fetched:', flattenedAssets.length);
      return flattenedAssets;
    },
    enabled: open && consignments.length > 0
  });

  // Filter out assets that are already in the collection
  const existingAssetIds = new Set(existingAssets.map(asset => asset.globalAssetId));
  
  // Combine portfolio and consignment assets (with deduplication)
  const allAvailableAssets = useMemo((): CombinedAsset[] => {
    const portfolioAssets: CombinedAsset[] = userAssets
      .filter(asset => {
        // Use the globalAssetId from the asset (now properly included from backend)
        return asset.globalAssetId && !existingAssetIds.has(asset.globalAssetId);
      })
      .map(asset => ({
        id: asset.id,
        globalAssetId: asset.globalAssetId!, // Non-null assertion safe after filter
        title: asset.title,
        playerName: asset.playerName,
        setName: asset.setName,
        year: asset.year,
        grade: asset.grade,
        cardNumber: asset.cardNumber,
        variant: asset.variant,
        certNumber: asset.certNumber,
        type: 'portfolio' as const,
        psaImageFrontUrl: asset.psaImageFrontUrl,
        imageUrl: asset.imageUrl,
        ownershipStatus: asset.ownershipStatus
      }));

    const consignmentAssetsFiltered: CombinedAsset[] = allConsignmentAssets
      .filter(asset => asset.globalAssetId && !existingAssetIds.has(asset.globalAssetId))
      .map(asset => ({
        id: asset.id,
        globalAssetId: asset.globalAssetId,
        title: asset.title,
        playerName: asset.playerName,
        setName: asset.setName,
        year: asset.year,
        grade: asset.grade,
        cardNumber: asset.cardNumber,
        variant: asset.variant,
        certNumber: asset.certNumber,
        type: 'consignment' as const,
        consignmentTitle: asset.consignmentTitle,
        psaImageFrontUrl: asset.psaImageFrontUrl,
        imageUrl: asset.imageUrl,
        ownershipStatus: 'consignment'
      }));

    // Combine and deduplicate by globalAssetId (prefer portfolio over consignment)
    const allAssets = [...portfolioAssets, ...consignmentAssetsFiltered];
    const seenGlobalIds = new Set<string>();
    const deduplicatedAssets = allAssets.filter(asset => {
      if (seenGlobalIds.has(asset.globalAssetId)) {
        return false; // Skip duplicate
      }
      seenGlobalIds.add(asset.globalAssetId);
      return true;
    });

    console.log('Portfolio assets available:', portfolioAssets.length);
    console.log('Consignment assets available:', consignmentAssetsFiltered.length);
    console.log('Total combined assets (before dedup):', allAssets.length);
    console.log('Total combined assets (after dedup):', deduplicatedAssets.length);

    return deduplicatedAssets;
  }, [userAssets, allConsignmentAssets, existingAssetIds]);

  // Memoize the global asset IDs to prevent unnecessary refetching
  const globalAssetIds = useMemo(() => {
    if (!allAvailableAssets?.length) return [];
    return allAvailableAssets.map((a: CombinedAsset) => a.globalAssetId).filter(Boolean).sort();
  }, [allAvailableAssets]);

  // Fetch pricing data for assets
  const { data: pricingData = {}, isLoading: isPricingLoading, isFetching: isPricingFetching } = useQuery({
    queryKey: ['api/pricing/batch', globalAssetIds],
    queryFn: async () => {
      if (!globalAssetIds.length) return {};
      
      console.log('Requesting pricing for globalAssetIds:', globalAssetIds);
      
      const response = await fetch('/api/pricing/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalAssetIds }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch pricing');
      const data = await response.json();
      console.log('Received pricing data structure:', data);
      console.log('Pricing data keys:', Object.keys(data));
      console.log('Sample pricing entry:', data[globalAssetIds[0]]);
      return data;
    },
    enabled: globalAssetIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on component mount if data exists
  });

  // Helper function to render pricing cell value with loading state
  const formatPriceCell = (pricingInfo: any, isLoading: boolean = false) => {
    // Show loading state while pricing is being fetched
    if (isLoading || isPricingLoading || isPricingFetching || !pricingData) {
      return (
        <div className="flex items-center">
          <div className="w-12 h-4 bg-muted animate-pulse rounded"></div>
        </div>
      );
    }
    
    if (!pricingInfo) {
      return '-';
    }
    
    if (typeof pricingInfo.averagePrice !== 'number') {
      return '-';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(pricingInfo.averagePrice);
  };

  // Helper function to generate asset title
  const generateAssetTitle = (asset: CombinedAsset) => {
    const parts = [];
    if (asset.playerName) parts.push(asset.playerName);
    if (asset.year) parts.push(asset.year);
    if (asset.setName) parts.push(asset.setName);
    if (asset.cardNumber) parts.push(`#${asset.cardNumber}`);
    if (asset.variant && asset.variant !== "BASE") parts.push(`(${asset.variant})`);
    return parts.join(' ') || asset.title || 'Untitled Asset';
  };

  // Helper function to format PSA grade
  const formatPSAGrade = (grade: string | null) => {
    if (!grade) return '';
    if (grade.toLowerCase().includes('gem mt')) return 'PSA GEM MT 10';
    if (grade.toLowerCase().includes('mint')) return `PSA MINT ${grade.replace(/[^0-9]/g, '')}`;
    if (grade.match(/^\d+$/)) return `PSA ${grade}`;
    return `PSA ${grade}`;
  };

  // Group assets by card identity (similar to my assets page)
  const groupAssets = (assets: CombinedAsset[]): GroupedAsset[] => {
    const groups = new Map<string, CombinedAsset[]>();
    
    assets.forEach(asset => {
      const key = [
        asset.playerName?.toLowerCase() || '',
        asset.year || '',
        asset.setName?.toLowerCase() || '',
        asset.cardNumber || '',
        asset.variant?.toLowerCase() || 'base'
      ].join('|');
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(asset);
    });

    return Array.from(groups.entries()).map(([key, groupAssets]) => ({
      key,
      assets: groupAssets,
      representativeAsset: groupAssets[0],
      count: groupAssets.length
    }));
  };

  // Get unique grades for filter dropdown
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    allAvailableAssets.forEach(asset => {
      if (asset.grade) {
        // Extract grade number/rating for cleaner display
        const grade = asset.grade.toLowerCase();
        if (grade.includes('gem mt') || grade.includes('10')) grades.add('PSA 10');
        else if (grade.includes('mint') && grade.includes('9')) grades.add('PSA 9');
        else if (grade.includes('8')) grades.add('PSA 8');
        else if (grade.includes('7')) grades.add('PSA 7');
        else if (grade.includes('6')) grades.add('PSA 6');
        else grades.add(asset.grade);
      }
    });
    return Array.from(grades).sort();
  }, [allAvailableAssets]);

  // Filter assets based on search term, type, and grade, then group them
  const filteredAndGroupedAssets = useMemo(() => {
    let filtered = allAvailableAssets;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.title?.toLowerCase().includes(searchLower) ||
        asset.playerName?.toLowerCase().includes(searchLower) ||
        asset.setName?.toLowerCase().includes(searchLower) ||
        asset.year?.toString().includes(searchLower) ||
        asset.consignmentTitle?.toLowerCase().includes(searchLower)
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(asset => asset.type === filterType);
    }
    
    // Grade filter
    if (filterGrade !== 'all') {
      filtered = filtered.filter(asset => {
        if (!asset.grade) return false;
        const grade = asset.grade.toLowerCase();
        return grade.includes(filterGrade.toLowerCase());
      });
    }
    
    const grouped = groupAssets(filtered);
    
    // Sort groups
    return grouped.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortColumn) {
        case 'asset':
          aValue = a.representativeAsset.playerName?.toLowerCase() || '';
          bValue = b.representativeAsset.playerName?.toLowerCase() || '';
          break;
        case 'qty':
          aValue = a.count;
          bValue = b.count;
          break;
        case 'value':
          const aPricing = pricingData[a.representativeAsset.globalAssetId];
          const bPricing = pricingData[b.representativeAsset.globalAssetId];
          aValue = aPricing?.averagePrice || 0;
          bValue = bPricing?.averagePrice || 0;
          break;
        case 'type':
          aValue = a.representativeAsset.type || '';
          bValue = b.representativeAsset.type || '';
          break;
        default:
          aValue = '';
          bValue = '';
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allAvailableAssets, searchTerm, filterType, filterGrade, sortColumn, sortDirection, pricingData]);

  const handleAssetToggle = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleGroupToggle = (group: GroupedAsset) => {
    const newSelected = new Set(selectedAssets);
    const allAssetsInGroup = group.assets.map(a => a.id);
    const allSelected = allAssetsInGroup.every(id => newSelected.has(id));
    
    if (allSelected) {
      // Deselect all assets in group
      allAssetsInGroup.forEach(id => newSelected.delete(id));
    } else {
      // Select all assets in group
      allAssetsInGroup.forEach(id => newSelected.add(id));
    }
    setSelectedAssets(newSelected);
  };

  const handleGroupExpansion = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSelectAll = () => {
    const allFilteredAssetIds = filteredAndGroupedAssets.flatMap(group => group.assets.map(a => a.id));
    const allSelected = allFilteredAssetIds.every(id => selectedAssets.has(id));
    
    if (allSelected) {
      // Deselect all filtered assets
      const newSelected = new Set(selectedAssets);
      allFilteredAssetIds.forEach(id => newSelected.delete(id));
      setSelectedAssets(newSelected);
    } else {
      // Select all filtered assets
      const newSelected = new Set(selectedAssets);
      allFilteredAssetIds.forEach(id => newSelected.add(id));
      setSelectedAssets(newSelected);
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    const allFilteredAssetIds = filteredAndGroupedAssets.flatMap(group => group.assets.map(a => a.id));
    return allFilteredAssetIds.length > 0 && allFilteredAssetIds.every(id => selectedAssets.has(id));
  }, [filteredAndGroupedAssets, selectedAssets]);

  const isSomeFilteredSelected = useMemo(() => {
    const allFilteredAssetIds = filteredAndGroupedAssets.flatMap(group => group.assets.map(a => a.id));
    return allFilteredAssetIds.some(id => selectedAssets.has(id));
  }, [filteredAndGroupedAssets, selectedAssets]);

  const handleAddSelected = async () => {
    const promises = Array.from(selectedAssets).map(assetId => {
      const asset = allAvailableAssets.find(a => a.id === assetId);
      if (!asset) return Promise.resolve();
      
      // Use the globalAssetId - this should now be properly included from the backend
      const globalAssetId = asset.globalAssetId;
      if (!globalAssetId) {
        console.error('Asset missing globalAssetId:', asset);
        return Promise.resolve();
      }
      
      return addAssetToCollection.mutateAsync({
        collectionId,
        globalAssetId,
        notes: null
      });
    });

    try {
      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: `${selectedAssets.size} asset${selectedAssets.size !== 1 ? 's' : ''} added to collection`,
      });

      handleClose();
    } catch (error) {
      console.error('Error adding assets:', error);
      toast({
        title: "Error",
        description: "Failed to add assets to collection",
        variant: "destructive",
      });
    }
  };

  const handleAssetClick = (asset: CombinedAsset) => {
    // Open asset details in new tab
    const url = `/assets/${asset.globalAssetId}?from=collections`;
    window.open(url, '_blank');
  };

  const handleClose = () => {
    setSelectedAssets(new Set());
    setSearchTerm('');
    setExpandedGroups(new Set());
    setFilterType('all');
    setFilterGrade('all');
    setSortColumn('asset');
    setSortDirection('asc');
    onOpenChange(false);
  };

  const handleSort = (column: 'asset' | 'qty' | 'value' | 'type') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ column, children }: { column: 'asset' | 'qty' | 'value' | 'type'; children: React.ReactNode }) => (
    <th 
      className="px-2 sm:px-3 py-3 text-left font-medium text-foreground whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        <span className="truncate">{children}</span>
        {sortColumn === column ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        )}
      </div>
    </th>
  );

  if (!open) return null;

  // Debug logging to see what props we're getting
  console.log('🐛 AddAssetsDialog Debug:', {
    open,
    collectionId,
    userAssetsLength: userAssets?.length,
    existingAssetsLength: existingAssets?.length,
    allAvailableAssetsLength: allAvailableAssets?.length,
    filteredAndGroupedAssetsLength: filteredAndGroupedAssets?.length
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      ref={dialogRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border lg:grid lg:grid-cols-3">
        <div className="flex items-center gap-3 lg:justify-start">
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            aria-label="Close dialog"
            ref={closeButtonRef}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
          
          <h1 id="dialog-title" className="font-heading text-lg sm:text-xl font-semibold text-foreground truncate lg:hidden">
            Add Assets to {collection.name}
          </h1>
        </div>

        <h1 id="dialog-title" className="hidden lg:block font-heading text-lg sm:text-xl font-semibold text-foreground text-center truncate">
          Add Assets to {collection.name}
        </h1>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleAddSelected}
            disabled={selectedAssets.size === 0 || addAssetToCollection.isPending}
            className="whitespace-nowrap"
          >
            {addAssetToCollection.isPending ? (
              'Adding...'
            ) : (
              <>
                <span className="lg:hidden">+</span>
                <span className="hidden lg:flex lg:items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Assets
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Search and Filter Section */}
          <section className="mb-6 sm:mb-8">
            {/* Search and Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Input
                  type="text"
                  placeholder="Search assets by player, set, year, or consignment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="lg"
                  className="pl-12"
                  aria-label="Search assets"
                />
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
              </div>

              {/* Type Filter */}
              <select
                id="type-filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-11 px-3 border border-border rounded-lg bg-card text-card-foreground text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none w-full sm:w-auto"
              >
                <option value="all">All Types</option>
                <option value="portfolio">Portfolio</option>
                <option value="consignment">Consignment</option>
              </select>

              {/* Grade Filter */}
              <select
                id="grade-filter"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="h-11 px-3 border border-border rounded-lg bg-card text-card-foreground text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none w-full sm:w-auto"
              >
                <option value="all">All Grades</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>

              {/* Clear All Filters */}
              {(filterType !== 'all' || filterGrade !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType('all');
                    setFilterGrade('all');
                  }}
                  className="text-xs whitespace-nowrap"
                >
                  Clear All
                </Button>
              )}
            </div>
          </section>

          {/* Selected count */}
          {selectedAssets.size > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <span className="text-sm font-medium text-foreground">
                  {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
                </span>
                <Button 
                  onClick={() => setSelectedAssets(new Set())} 
                  variant="ghost" 
                  size="sm"
                  className="text-primary hover:text-primary hover:bg-primary/20"
                >
                  Clear selection
                </Button>
              </div>
            </section>
          )}

          {/* Assets List Section */}
          <section>
            {filteredAndGroupedAssets.length === 0 ? (
              <div className="text-center py-12">
                <div className="space-y-4">
                  <p className="text-muted-foreground text-lg">
                    {allAvailableAssets.length === 0 
                      ? "All your assets are already in this collection"
                      : "No assets found matching your search"
                    }
                  </p>
                  {allAvailableAssets.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      All assets from your portfolio and consignments are already included in this collection.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* List View - Table */
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y-2 divide-border">
                  <thead className="sticky top-0 bg-background border-b border-border">
                    <tr>
                      <th className="px-2 sm:px-3 py-3 text-left font-medium text-foreground whitespace-nowrap w-12">
                        <div 
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          isAllFilteredSelected
                            ? 'bg-primary border-primary'
                            : isSomeFilteredSelected
                            ? 'bg-primary/20 border-primary'
                            : 'border-border bg-background'
                        }`}
                          onClick={handleSelectAll}
                          title={isAllFilteredSelected ? 'Deselect all' : 'Select all'}
                        >
                          {isAllFilteredSelected && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                          {isSomeFilteredSelected && !isAllFilteredSelected && (
                            <div className="w-2 h-2 bg-primary rounded-sm" />
                          )}
                        </div>
                      </th>
                      <SortableHeader column="asset">Asset</SortableHeader>
                      <SortableHeader column="qty">
                        <span className="hidden sm:inline">Qty</span>
                        <span className="sm:hidden">#</span>
                      </SortableHeader>
                      <SortableHeader column="value">
                        <span className="hidden sm:inline">Market Value</span>
                        <span className="sm:hidden">Value</span>
                      </SortableHeader>
                      <SortableHeader column="type">Type</SortableHeader>
                      <th className="sticky right-0 bg-background px-2 sm:px-3 py-3 text-left font-medium text-foreground whitespace-nowrap w-12">
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndGroupedAssets.map((group) => {
                      const asset = group.representativeAsset;
                      const allAssetsInGroup = group.assets.map(a => a.id);
                      const allSelected = allAssetsInGroup.every(id => selectedAssets.has(id));
                      const someSelected = allAssetsInGroup.some(id => selectedAssets.has(id));
                      const pricing = pricingData[asset.globalAssetId];
                      const isExpanded = expandedGroups.has(group.key);
                      const rows: React.ReactNode[] = [];

                      rows.push(
                          <tr 
                            key={`group-${group.key}`}
                            className={`border-b hover:bg-muted/25 transition-colors cursor-pointer ${
                              allSelected ? 'bg-primary/5' : someSelected ? 'bg-primary/2' : ''
                            }`}
                            onClick={(e) => {
                              // Don't expand if clicking on checkbox or external link
                              const target = e.target as HTMLElement;
                              if (target.closest('[data-no-expand]') || target.closest('button') || target.closest('a')) {
                                return;
                              }
                              if (group.count > 1) {
                                handleGroupExpansion(group.key);
                              }
                            }}
                          >
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap w-12">
                              <div 
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                                allSelected
                                  ? 'bg-primary border-primary'
                                  : someSelected
                                  ? 'bg-primary/20 border-primary'
                                  : 'border-border bg-background'
                              }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGroupToggle(group);
                                }}
                                data-no-expand="true"
                              >
                                {allSelected && (
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                )}
                                {someSelected && !allSelected && (
                                  <div className="w-2 h-2 bg-primary rounded-sm" />
                                )}
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap min-w-0">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="h-16 sm:h-20 lg:h-24 rounded-sm bg-muted overflow-hidden flex-shrink-0">
                                  {(asset.psaImageFrontUrl || asset.imageUrl) ? (
                                    <img
                                      src={asset.psaImageFrontUrl || asset.imageUrl || ''}
                                      alt="Asset thumbnail"
                                      className="h-full w-auto object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full w-12 sm:w-14 lg:w-16 text-xs text-muted-foreground">
                                      No Image
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground truncate text-sm sm:text-base">{asset.playerName || 'Unknown Player'}</p>
                                  <div 
                                    className="font-bold text-foreground text-xs sm:text-sm truncate cursor-pointer link-brand flex items-center gap-1 group"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAssetClick(asset);
                                    }}
                                    data-no-expand="true"
                                  >
                                    <span className="truncate">
                                      {asset.year} {asset.setName}
                                    </span>
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    #{asset.cardNumber} • {formatPSAGrade(asset.grade ?? null)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {group.count} card{group.count !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">
                                {group.count}
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                              <div>
                                <div className="font-medium text-sm sm:text-base">
                                  {formatPriceCell(pricing) || "-"}
                                </div>
                                <div className="text-xs text-muted-foreground hidden sm:block">
                                  Market Value
                                </div>
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                              <OwnershipBadge type={getOwnershipType(asset)} className="w-fit" />
                              {asset.type === 'consignment' && asset.consignmentTitle && (
                                <div className="text-xs text-muted-foreground truncate max-w-20 mt-1 hidden sm:block">
                                  {asset.consignmentTitle}
                                </div>
                              )}
                            </td>
                            <td className="sticky right-0 bg-background px-2 sm:px-3 py-3 whitespace-nowrap">
                              {group.count > 1 ? (
                                <div
                                  className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                                  title={isExpanded ? "Collapse" : "Expand"}
                                  data-no-expand="true"
                                >
                                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                              ) : (
                                <div className="w-6 h-6"></div>
                              )}
                            </td>
                          </tr>
                      );

                      // Individual rows if expanded
                      if (isExpanded && group.count > 1) {
                        for (const individualAsset of group.assets) {
                          const individualPricing = pricingData[individualAsset.globalAssetId];
                          rows.push(
                            <tr 
                              key={`asset-${individualAsset.id}`}
                              className={`border-b bg-muted/20 hover:bg-muted/40 transition-colors ${
                                selectedAssets.has(individualAsset.id) ? 'bg-primary/10' : ''
                              }`}
                            >
                              <td className="px-2 sm:px-3 py-3 whitespace-nowrap w-12">
                                <div 
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                                  selectedAssets.has(individualAsset.id)
                                    ? 'bg-primary border-primary'
                                    : 'border-border bg-background'
                                }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssetToggle(individualAsset.id);
                                  }}
                                >
                                  {selectedAssets.has(individualAsset.id) && (
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-3 whitespace-nowrap min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3 pl-4">
                                  <div className="h-12 sm:h-14 lg:h-16 rounded-sm bg-muted overflow-hidden flex-shrink-0">
                                    {(individualAsset.psaImageFrontUrl || individualAsset.imageUrl) ? (
                                      <img
                                        src={individualAsset.psaImageFrontUrl || individualAsset.imageUrl || ''}
                                        alt="Asset thumbnail"
                                        className="h-full w-auto object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full w-10 sm:w-12 text-xs text-muted-foreground">
                                        No Image
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {individualAsset.certNumber && (
                                      <div 
                                        className="text-xs sm:text-sm text-foreground cursor-pointer link-brand flex items-center gap-1 group"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssetClick(individualAsset);
                                        }}
                                      >
                                        <span className="truncate">
                                          Cert# {individualAsset.certNumber}
                                        </span>
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                      </div>
                                    )}
                                    {individualAsset.grade && (
                                      <div className="text-xs text-muted-foreground">
                                        {formatPSAGrade(individualAsset.grade)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                                <div className="text-sm text-muted-foreground">1</div>
                              </td>
                              <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                                <div>
                                  <div className="font-medium text-sm sm:text-base">
                                    {formatPriceCell(individualPricing) || "-"}
                                  </div>
                                  <div className="text-xs text-muted-foreground hidden sm:block">
                                    Market Value
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                                <OwnershipBadge type={getOwnershipType(individualAsset)} className="w-fit" />
                              </td>
                              <td className="sticky right-0 bg-background px-2 sm:px-3 py-3 whitespace-nowrap">
                                <div></div>
                              </td>
                            </tr>
                          );
                        }
                      }

                      return rows;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>


        </div>
      </div>
    </div>
  );
}