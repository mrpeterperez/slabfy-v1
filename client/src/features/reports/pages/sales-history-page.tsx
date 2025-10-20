// Global Sales History Page - View all sales across all events
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar, Download, Filter, DollarSign, TrendingUp, ShoppingCart, AlertTriangle, RefreshCw } from "lucide-react";
import type { SalesTransaction } from "@shared/schema";

// Using shared schema types instead of local interfaces
interface SalesTransactionResponse {
  id: string;
  saleDate: string | null;
  salePrice: number;
  paymentMethod: string;
  buyerName?: string;
  eventName?: string;
  assetTitle?: string;
  assetPlayerName?: string;
  assetSetName?: string;
  assetYear?: string;
  assetGrade?: string;
  profit?: number | null;
}

interface SalesSummary {
  totalRevenue: number;
  totalSales: number;
  averageSaleAmount: number;
  topEvents: Array<{ eventName: string; revenue: number; salesCount: number }>;
}

export function SalesHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("30"); // days

  // Fetch global sales history with proper error handling
  const { 
    data: salesData = [], 
    isLoading: loadingSales, 
    error: salesError,
    refetch: refetchSales
  } = useQuery<SalesTransactionResponse[]>({
    queryKey: ['global-sales-history', dateRange, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange !== 'all') params.append('days', dateRange);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/sales-history/global?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return (await response.json()) as SalesTransactionResponse[];
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });

  // Calculate summary metrics
  const summary: SalesSummary = {
    totalRevenue: salesData.reduce((sum, sale) => sum + sale.salePrice, 0),
    totalSales: salesData.length,
    averageSaleAmount: salesData.length > 0 ? salesData.reduce((sum, sale) => sum + sale.salePrice, 0) / salesData.length : 0,
    topEvents: [],
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date not available';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Exporting sales data...', salesData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
          <p className="text-muted-foreground">
            View and analyze all your sales across events
          </p>
        </div>
        <Button 
          onClick={handleExport} 
          variant="outline" 
          disabled={salesData.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange === 'all' ? 'all time' : `${dateRange} days`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Number of transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.averageSaleAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesData.filter(sale => {
                if (!sale.saleDate) return false;
                try {
                  const saleDate = new Date(sale.saleDate);
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return saleDate >= monthAgo;
                } catch {
                  return false;
                }
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Sales this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Search buyers, assets, events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              {['7', '30', '90', 'all'].map((days) => (
                <Button
                  key={days}
                  variant={dateRange === days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateRange(days)}
                  data-testid={`button-filter-${days}${days === 'all' ? '-time' : '-days'}`}
                >
                  {days === 'all' ? 'All Time' : `${days} Days`}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Handling */}
      {salesError && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Sales Data</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p>
                {salesError.message.includes('401') || salesError.message.includes('Authentication')
                  ? 'You need to sign in to view sales data.'
                  : `Error: ${salesError.message}`}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchSales()}
                data-testid="button-retry"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
          <CardDescription>
            {loadingSales ? 'Loading...' : `${salesData.length} transactions found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSales ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : salesError ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="error-message">
              Unable to load sales data. Please try again.
            </div>
          ) : salesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-data-message">
              No sales found for the selected criteria
            </div>
          ) : (
            <div className="space-y-4">
              {salesData.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`sale-row-${sale.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">
                        {sale.assetPlayerName || sale.assetTitle || 'Unknown Asset'}
                      </h4>
                      {sale.assetGrade && (
                        <Badge variant="secondary" className="text-xs">
                          PSA {sale.assetGrade}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sale.assetYear} {sale.assetSetName}
                      {sale.eventName && ` • ${sale.eventName}`}
                      {sale.buyerName && ` • Sold to ${sale.buyerName}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(sale.saleDate)} • {sale.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatCurrency(sale.salePrice)}
                    </div>
                    {sale.profit !== undefined && sale.profit !== null && (
                      <div className={`text-sm ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {sale.profit >= 0 ? '+' : ''}{formatCurrency(sale.profit)} profit
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}