// REFRESH BUTTON ⚡
// Just a button that refreshes sales data - clean and simple

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { refreshSales } from '@shared/api/sales-refresh'
import { useToast } from '@/hooks/use-toast'
import { Asset } from '@shared/schema'

// Cache invalidation
import { invalidateAfterManualRefresh } from '@/lib/cache-invalidation'

interface RefreshButtonProps {
  asset: Asset
}

export function RefreshButton({ asset }: RefreshButtonProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const refreshMutation = useMutation({
    mutationFn: async () => refreshSales(asset.id, true),
    onSuccess: async (data) => {
      // Comprehensive cache invalidation using centralized function - FIXED TO USE FULL ASSET OBJECT
      await invalidateAfterManualRefresh(asset);
      
      // Handle both success response formats
      const savedCount = data?.savedCount ?? data?.new_records_added ?? 0;
      const totalInDatabase = data?.totalSalesInDatabase ?? data?.total_cached_records ?? 0;
      const rawFetched = data?.salesCount ?? 0;
      
      if (savedCount === 0) {
        toast({
          title: "You're all up to date",
          description: `${totalInDatabase} sales records - no new data found`,
        })
      } else {
        toast({
          title: "Sales data refreshed",
          description: `${savedCount} new records added from ${rawFetched} marketplace listings`,
        })
      }
    },
    onError: (error) => {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Unable to refresh",
        variant: "destructive"
      })
    }
  })

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => refreshMutation.mutate()}
      disabled={refreshMutation.isPending}
      className="text-xs h-7 px-2"
    >
      <RefreshCw className={`w-3 h-3 mr-1 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
      {refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}
    </Button>
  )
}