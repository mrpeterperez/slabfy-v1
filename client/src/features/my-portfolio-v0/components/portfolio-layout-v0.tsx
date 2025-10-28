// 🤖 INTERNAL NOTE:
// Purpose: Main layout component for portfolio v0 with search, filters, and view modes
// Exports: PortfolioLayoutV0 component
// Feature: my-portfolio-v0
// Dependencies: react, lucide-react, @/components/ui, ./filters/filter-provider-v0

import { useState, useMemo, useEffect } from 'react';
import { Grid3X3, List, ListFilter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Asset } from '@shared/schema';
import { useAssetsV0 } from './data/asset-provider-v0';
import { MobilePageWrapper } from '@/components/layout/mobile-page-wrapper';
import { MobileSearchBar } from '@/components/layout/mobile-search-bar';
import { MobileFiltersDrawer } from './filters/mobile-filters-drawer';
import { MobilePortfolioList } from './mobile-portfolio-list';
// Use v0 components
import { FilterProviderV0, useFiltersV0 } from '@/features/my-portfolio-v0/components/filters/filter-provider-v0';
import { FiltersSidebarV0 as FiltersSidebar } from '@/features/my-portfolio-v0/components/filters/filters-sidebar-v0';
import { PortfolioSummaryV0 as PortfolioSummary } from '@/features/my-portfolio-v0/components/portfolio-summary-v0';
import { PortfolioAssetsTable } from '@/components/table/portfolio-assets-table';
import { GroupedPortfolioTableV0 } from './grouped-table/grouped-table';
import { PortfolioV0ColumnsPopover } from './columns/portfolio-v0-columns-popover';
import { GridViewV0 } from './grid-view/grid-view-v0';
import { NewUserPromptV0 } from './new-user-prompt/new-user-prompt-v0';
import { AddAssetModalSimple } from '@/features/add-asset/components/add-asset-modal/add-asset-modal-simple';

type ViewMode = 'table' | 'grid';

interface PortfolioLayoutV0Props {
  userId: string;
  onViewAsset?: (asset: Asset) => void;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (asset: Asset) => void;
  onAddAsset?: () => void;
}

function PortfolioLayoutV0Inner({
  userId,
  onViewAsset,
  onEditAsset,
  onDeleteAsset,
  onAddAsset,
}: PortfolioLayoutV0Props) {
  const { assets, isLoading } = useAssetsV0();
  const { filterAssets, activeCount } = useFiltersV0();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const gridSizeKey = 'slabfy_v0_grid_size';
  const [gridSize, setGridSize] = useState<'xs'|'s'|'m'|'l'>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem(gridSizeKey);
      if (v === 'xs' || v === 's' || v === 'm' || v === 'l') return v;
    }
    return 'm';
  });
  const updateGridSize = (s: 'xs'|'s'|'m'|'l') => {
    setGridSize(s);
    try { localStorage.setItem(gridSizeKey, s); } catch {}
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  // Auto-collapse filters on tablet portrait, show on landscape desktop
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Start collapsed if viewport is less than 1024px (tablet)
    return window.innerWidth < 1024;
  });
  
  // Handle responsive filter sidebar on resize
  useEffect(() => {
    const handleResize = () => {
      const isTablet = window.innerWidth < 1024;
      // Auto-collapse on tablet, auto-expand on desktop
      setFiltersCollapsed(isTablet);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for add asset event from mobile bottom nav
  useEffect(() => {
    const handleAddAsset = () => {
      if (onAddAsset) {
        onAddAsset();
      } else {
        setAddAssetOpen(true);
      }
    };

    window.addEventListener('slabfy:add-asset', handleAddAsset);
    return () => window.removeEventListener('slabfy:add-asset', handleAddAsset);
  }, [onAddAsset]);
  
  // Column visibility (independent from main portfolio)
  const defaultCols = {
    ownership: true,
    type: true,
    qty: true,
    price: true,
    current: true,
    unrealized: true,
    confidence: true,
    liquidity: true,
    trend: true,
  } as const;
  type ColKey = keyof typeof defaultCols;
  const storageKey = 'slabfy_v0_portfolio_columns_v1';
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultCols, ...parsed };
      }
    } catch {}
    return { ...defaultCols };
  });
  const toggleColumn = (k: string) => {
    setVisibleCols(prev => {
      if (!(k in prev)) return prev;
      const next = { ...prev, [k]: !prev[k as ColKey] } as Record<ColKey, boolean>;
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const resetColumns = () => {
    setVisibleCols({ ...defaultCols });
    try { localStorage.setItem(storageKey, JSON.stringify(defaultCols)); } catch {}
  };
  const columnDefs = [
    { key: 'ownership', label: 'Owner', visible: visibleCols.ownership },
    { key: 'type', label: 'Type', visible: visibleCols.type },
    { key: 'qty', label: 'Qty', visible: visibleCols.qty },
    { key: 'price', label: 'Buy Price', visible: visibleCols.price },
    { key: 'unrealized', label: 'Unrealized', visible: visibleCols.unrealized },
    { key: 'confidence', label: 'Confidence', visible: visibleCols.confidence },
    { key: 'liquidity', label: 'Liquidity', visible: visibleCols.liquidity },
    { key: 'current', label: 'Price', visible: visibleCols.current },
    { key: 'trend', label: 'Trend', visible: visibleCols.trend, locked: true },
  ];

  // Apply search filter (includes cert number search)
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter((asset) => {
      const searchText = `${asset.playerName} ${asset.year} ${asset.setName} ${asset.cardNumber} ${asset.certNumber || ''}`.toLowerCase();
      return searchText.includes(query);
    });
  }, [assets, searchQuery]);

  // Apply category filters
  const filteredAssets = useMemo(() => {
    return filterAssets(searchFiltered);
  }, [filterAssets, searchFiltered]);

  const handleAddAssetClick = () => {
    if (onAddAsset) {
      onAddAsset();
    } else {
      setAddAssetOpen(true);
    }
  };

  // Show new user prompt if no assets BUT keep modal mounted so Add Asset button works
  if (!isLoading && assets.length === 0) {
    return (
      <MobilePageWrapper onSearchClick={() => setIsSearchOpen(true)}>
        <MobileSearchBar
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search by player, set, cert #..."
        />
        <NewUserPromptV0 onAddAsset={handleAddAssetClick} />
        <AddAssetModalSimple open={addAssetOpen} onOpenChange={setAddAssetOpen} />
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper onSearchClick={() => setIsSearchOpen(true)}>
      <MobileSearchBar
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search by player, set, cert #..."
      />
      <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-4rem)] bg-background text-foreground">
        <div className="flex w-full h-full">
          {/* Filters Sidebar */}
          {!filtersCollapsed && (
            <FiltersSidebar assets={assets} onHide={() => setFiltersCollapsed(true)} />
          )}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
            {/* Top Bar matching main portfolio - scrolls with content on mobile, sticky on desktop */}
            <div className="flex-shrink-0 w-full border-b border-border bg-background lg:sticky lg:top-0 z-20">
              <div className="mx-auto max-w-full px-4 sm:px-6 pt-4 pb-4 flex flex-row items-center justify-between">
                <div className="flex items-start">
                  <PortfolioSummary
                    userId={userId}
                    inline
                    title="My Portfolio"
                    prefix={filtersCollapsed ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Mobile: open drawer, Desktop: toggle sidebar
                          if (window.innerWidth < 1024) {
                            setIsFiltersDrawerOpen(true);
                          } else {
                            setFiltersCollapsed(false);
                          }
                        }}
                        className="relative flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Show filters"
                      >
                        <div className="relative">
                          <ListFilter className="h-6 w-6 lg:h-4 lg:w-4" />
                          {activeCount > 0 && (
                            <span className="lg:hidden absolute -top-2 -right-2 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground rounded-full px-0.5">
                              {activeCount}
                            </span>
                          )}
                        </div>
                        <span className="hidden lg:inline">Show Filters</span>
                      </button>
                    ) : null}
                  />
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <div className="hidden lg:block">
                    <PortfolioV0ColumnsPopover
                      columns={columnDefs}
                      onToggle={toggleColumn}
                      onReset={resetColumns}
                    />
                  </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Table view"
                      aria-pressed={viewMode === 'table'}
                      onClick={() => setViewMode('table')}
                      className={`h-10 w-10 p-0 flex items-center justify-center rounded-full [&_svg]:!h-6 [&_svg]:!w-6 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${viewMode === 'table' ? 'text-primary bg-muted/25' : 'text-muted-foreground hover:bg-accent/30'}`}
                    >
                      <List className="h-8 w-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                      onClick={() => setViewMode('grid')}
                      className={`h-10 w-10 p-0 flex items-center justify-center rounded-full [&_svg]:!h-6 [&_svg]:!w-6 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${viewMode === 'grid' ? 'text-primary bg-muted/25' : 'text-muted-foreground hover:bg-accent/30'}`}
                    >
                      <Grid3X3 className="h-6 w-6" />
                    </Button>
                    {viewMode === 'grid' && (
                      <>
                        {/* Mobile: XS and S only */}
                        <div className="lg:hidden flex rounded-full overflow-hidden border border-border ml-1">
                          {(['xs', 's'] as const).map(sz => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => updateGridSize(sz)}
                              className={`h-10 w-10 flex items-center justify-center text-[11px] font-semibold tracking-wide transition-colors ${gridSize === sz ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                              aria-pressed={gridSize === sz}
                            >
                              {sz.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        {/* Desktop: S, M, L */}
                        <div className="hidden lg:flex rounded-full overflow-hidden border border-border ml-1">
                          {(['s','m','l'] as const).map(sz => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => updateGridSize(sz)}
                              className={`h-10 w-10 flex items-center justify-center text-[11px] font-semibold tracking-wide transition-colors ${gridSize === sz ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                              aria-pressed={gridSize === sz}
                            >
                              {sz.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  {/* Add Asset trigger removed from toolbar - FAB handles context actions on mobile */}
                </div>
              </div>
            </div>
            {/* Content - part of the same scroll container */}
            <div className="flex-1 min-h-0">
              <div className="mx-auto max-w-full px-0 sm:px-0 pt-0 h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Loading assets...</div>
                ) : filteredAssets.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="text-center text-muted-foreground">
                      <p className="text-lg font-medium">No assets found</p>
                      <p className="text-sm mt-1">{assets.length === 0 ? 'Add your first asset to get started' : 'Try adjusting your search or filters'}</p>
                    </div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <GridViewV0 assets={filteredAssets} onEdit={onEditAsset} onDelete={onDeleteAsset} size={gridSize} visible={visibleCols as any} />
                ) : (
                  <>
                    {/* Mobile: Card-based list view */}
                    <MobilePortfolioList 
                      assets={filteredAssets as any}
                      onViewAsset={onViewAsset}
                    />
                    {/* Desktop: Grouped table */}
                    <div className="hidden lg:block">
                      <GroupedPortfolioTableV0
                        assets={filteredAssets as any}
                        visible={visibleCols as any}
                        onEdit={onEditAsset}
                        onDelete={onDeleteAsset}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Add Asset Modal */}
      <AddAssetModalSimple open={addAssetOpen} onOpenChange={setAddAssetOpen} />
      
      {/* Mobile Filters Drawer */}
      <MobileFiltersDrawer
        isOpen={isFiltersDrawerOpen}
        onClose={() => setIsFiltersDrawerOpen(false)}
        assets={assets}
      />
    </MobilePageWrapper>
  );
}

export function PortfolioLayoutV0(props: PortfolioLayoutV0Props) {
  return (
    <FilterProviderV0>
      <PortfolioLayoutV0Inner {...props} />
    </FilterProviderV0>
  );
}