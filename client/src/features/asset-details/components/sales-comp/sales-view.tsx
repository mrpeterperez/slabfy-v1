// SALES VIEW 📊  
// Main component that shows sales data - clean and fast

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SalesTable } from './sales-table'
import { RefreshButton } from './refresh-button'
import { AveragePriceCard } from './average-price-card'
import { LastSaleCard } from './last-sale-card'
import { SalesVolumeCard } from './sales-volume-card'
import { PriceRangeCard } from './price-range-card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

import { Asset } from '@shared/schema'

interface SalesViewProps {
  asset: Asset
  enabled?: boolean
}

export function SalesView({ asset, enabled = true }: SalesViewProps) {
  const assetId = asset.id; // Extract assetId for backwards compatibility with existing queries
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false) // Default to show all sales
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/sales-comp-universal', assetId],
    queryFn: async () => {
      const response = await fetch(`/api/sales/sales-comp-universal/${assetId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch sales data')
      }
      return response.json()
    },
    enabled: enabled && Boolean(assetId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev, // Keep previous data to prevent jank
  })

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold font-heading mb-4">
          Comps
        </h2>
        <Separator className="mb-6"/>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="text-xl font-semibold font-heading mb-4">
          Comps
        </h2>
        <Separator className="mb-6"/>
        
        <div className="space-y-6">
          <div className="text-center py-8 text-muted-foreground">
            Error loading sales data
          </div>
        </div>
      </div>
    )
  }

  const salesData = data?.sales_history || data || []
  
  // Filter sales by verification status if toggle is enabled
  const filteredSalesData = showVerifiedOnly 
    ? salesData.filter((sale: any) => sale.verified === true)
    : salesData
  
  // Sales table data comes pre-sorted from database (newest first)
  // Database query: ORDER BY sold_date DESC, created_at DESC
  const sortedSalesData = filteredSalesData

  return (
    <div>
      <h2 className="text-xl font-semibold font-heading mb-4">
        Comps
      </h2>
      <Separator className="mb-6"/>
      
      <div className="space-y-6">
        {/* Market analysis cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AveragePriceCard assetId={assetId} />
          <LastSaleCard assetId={assetId} />
          <SalesVolumeCard assetId={assetId} />
          <PriceRangeCard assetId={assetId} />
        </div>

        {/* Sales table */}
        {sortedSalesData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {showVerifiedOnly ? 'No verified sales data available' : 'No sales data available'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-lg font-semibold">
                  ({sortedSalesData.length} records)
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="verified-filter"
                    checked={showVerifiedOnly}
                    onCheckedChange={setShowVerifiedOnly}
                  />
                  <Label htmlFor="verified-filter" className="text-sm text-muted-foreground cursor-pointer">
                    Verified Only
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshButton asset={asset} />
              </div>
            </div>
            <SalesTable sales={sortedSalesData} />
          </div>
        )}
      </div>
    </div>
  )
}