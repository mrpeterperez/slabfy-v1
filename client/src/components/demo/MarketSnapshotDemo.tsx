import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMarketSnapshot, useSingleMarketSnapshot, useBatchMarketSnapshot } from '@/hooks/use-market-snapshot';

// Demo component for single asset
function SingleAssetDemo() {
  const [assetId, setAssetId] = useState('3527b359-a762-41d1-a574-567a022dba59'); // Caitlin Clark card
  
  const { snapshot, isLoading, isPending, refetch } = useSingleMarketSnapshot(assetId, {
    refetchInterval: 10000, // 10 seconds for demo
    staleTime: 5000, // 5 seconds for demo
  });

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'fire': return 'bg-red-500';
      case 'hot': return 'bg-orange-500';
      case 'warm': return 'bg-yellow-500';
      case 'cool': return 'bg-blue-500';
      case 'cold': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Single Asset Demo
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending && <Badge variant="outline">Updating...</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Asset ID:</div>
          <div className="font-mono text-xs break-all">{assetId}</div>
        </div>
        
        {snapshot ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Average Price:</span>
              <span className="font-semibold text-lg">
                ${snapshot.averagePrice.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Confidence:</span>
              <Badge variant={snapshot.confidence > 70 ? 'default' : 'secondary'}>
                {snapshot.confidence}%
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Sales Count:</span>
              <span className="font-medium">{snapshot.salesCount}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Liquidity:</span>
              <Badge className={getLiquidityColor(snapshot.liquidity)}>
                {snapshot.liquidity}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No data available
          </div>
        )}
        
        <Button 
          onClick={() => refetch()} 
          variant="outline" 
          size="sm" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Demo component for batch assets
function BatchAssetsDemo() {
  const assetIds = [
    '3527b359-a762-41d1-a574-567a022dba59', // Caitlin Clark
    '2c5c37de-5fdc-4ad4-ae61-1ffcc8a1cdff', // Luka Doncic
    '440460d5-d522-446a-b7a5-6e88d1cca521', // Clayton Kershaw
  ];

  const { 
    marketData, 
    isLoading, 
    hasPendingAssets, 
    getAllSnapshots,
    refetch 
  } = useBatchMarketSnapshot(assetIds, {
    refetchInterval: 15000, // 15 seconds
  });

  const snapshots = getAllSnapshots();

  const getPriceIcon = (price: number) => {
    if (price > 1000) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (price > 100) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Batch Assets Demo ({assetIds.length} assets)
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {hasPendingAssets && <Badge variant="outline">Fetching updates...</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {snapshots.length > 0 ? (
            snapshots.map((snapshot, index) => (
              <div 
                key={snapshot.assetId}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs bg-background px-2 py-1 rounded">
                    Asset {index + 1}
                  </div>
                  <div className="text-sm">
                    Sales: {snapshot.salesCount}
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                  >
                    {snapshot.liquidity}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  {getPriceIcon(snapshot.averagePrice)}
                  <span className="font-semibold">
                    ${snapshot.averagePrice.toLocaleString()}
                  </span>
                  <Badge variant={snapshot.confidence > 70 ? 'default' : 'secondary'}>
                    {snapshot.confidence}%
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Loading market data...
            </div>
          )}
        </div>
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Total snapshots: {snapshots.length}</span>
          <span>Cache status: {Object.keys(marketData).length} cached</span>
        </div>
        
        <Button 
          onClick={() => refetch()} 
          variant="outline" 
          size="sm" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh All Data'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Advanced demo with history
function AdvancedDemo() {
  const [includeHistory, setIncludeHistory] = useState(false);
  const assetId = '3527b359-a762-41d1-a574-567a022dba59';

  const { snapshot, isLoading, query } = useSingleMarketSnapshot(assetId, {
    includeHistory,
    historyPoints: 30,
    enabled: true,
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Advanced Features Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include-history"
            checked={includeHistory}
            onChange={(e) => setIncludeHistory(e.target.checked)}
            data-testid="checkbox-include-history"
          />
          <label htmlFor="include-history" className="text-sm">
            Include price history
          </label>
        </div>

        {snapshot && (
          <div className="space-y-2">
            <div className="text-sm">
              Price: ${snapshot.averagePrice.toLocaleString()}
            </div>
            
            {snapshot.history && (
              <div className="text-sm">
                History points: {snapshot.history.length}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Query status: {query.status}</div>
          <div>Fetch status: {query.fetchStatus}</div>
          <div>Is stale: {query.isStale ? 'Yes' : 'No'}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main demo component
export function MarketSnapshotDemo() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Market Snapshot Hook Demo</h1>
        <p className="text-muted-foreground">
          Testing the unified useMarketSnapshot hook with real API data
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SingleAssetDemo />
        <AdvancedDemo />
      </div>

      <div className="w-full">
        <BatchAssetsDemo />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          This demo uses actual API endpoints and real asset data from the application.
          <br />
          Check the browser dev tools to see the network requests and React Query cache.
        </p>
      </div>
    </div>
  );
}

export default MarketSnapshotDemo;