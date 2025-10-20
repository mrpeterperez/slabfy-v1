// 🤖 INTERNAL NOTE:
// Purpose: Unified analytics page displaying sales and purchase transactions with filtering and CSV export
// Exports: AnalyticsPage component
// Feature: analytics
// Dependencies: @/lib/queryClient, @/components/table/table-shell, status components, React Query

import React, { useState, useMemo } from "react";
import { Download, Search, Filter, TrendingUp, DollarSign, ShoppingBag, Wallet, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableShell } from "@/components/table/table-shell";
import { TransactionStatusPill } from "@/components/status/transaction-status-pill";
import { useAnalyticsData } from "../hooks/use-analytics-data";
import { queryClient } from "@/lib/queryClient";
import type { AnalyticsFilters, AnalyticsTransaction } from "../types/analytics-types";

const fmtUSD = new Intl.NumberFormat("en-US", { 
  style: "currency", 
  currency: "USD" 
});

const fmtDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric", 
  year: "numeric"
});

export function AnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    type: 'all',
    search: '',
  });

  const { data, isLoading, error } = useAnalyticsData(filters);
  const transactions = data?.transactions || [];
  const summary = data?.summary || {
    totalSales: 0,
    totalPurchases: 0,
    totalRevenue: 0,
    totalSpent: 0,
    netProfit: 0,
    transactionCount: 0,
  };

  // Update filters
  const handleTypeChange = (type: string) => {
    setFilters(prev => ({ ...prev, type: type as 'sales' | 'purchase' | 'all' }));
  };

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
  };

  const getTransactionLink = (transaction: AnalyticsTransaction) => {
    // For purchase transactions, always go to buy session details if available
    if (transaction.type === 'purchase' && transaction.buyingSessionId) {
      return `/buying-desk/${transaction.buyingSessionId}`;
    }
    
    // For sales transactions, go to the event/show if available
    if (transaction.type === 'sales' && transaction.eventId) {
      return `/events/${transaction.eventId}`;
    }

    // Fallback: purchases go to buying desk, sales go to portfolio
    if (transaction.type === 'purchase') {
      return '/buying-desk';
    }

    return '/portfolio';
  };

  // Clear cache and refresh data
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/analytics/transactions'] });
    queryClient.removeQueries({ queryKey: ['/api/analytics/transactions'] });
  };

  // CSV Export
  const handleExport = () => {
    if (!transactions.length) return;
    
    const headers = [
      "ID", "Date", "Type", "Asset", "Amount", "Contact", "Email", "Phone", "Payment Method", "Event", "Notes"
    ].join(",");
    
    const rows = transactions.map(t => [
      t.id,
      fmtDate.format(new Date(t.date)),
      t.type,
      t.assetTitle || "Unknown Asset",
      t.amount,
      t.contactName || "",
      t.contactEmail || "",
      t.contactPhone || "",
      t.paymentMethod || "",
      t.eventName || "",
      (t.notes || "").replace(/,/g, ";") // Clean commas for CSV
    ].join(","));
    
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `slabfy-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground mt-2">
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold font-heading">Analytics</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets, contacts, or events..."
                  value={filters.search || ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 w-72 h-9"
                />
              </div>
              
              <Select value={filters.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sales">Sales Only</SelectItem>
                  <SelectItem value="purchase">Purchases Only</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleRefresh}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 h-9"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>

              <Button 
                onClick={handleExport}
                disabled={!transactions.length}
                size="sm"
                className="flex items-center gap-2 h-9"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalSales}</div>
                <div className="text-xs text-muted-foreground">{fmtUSD.format(summary.totalRevenue)}</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalPurchases}</div>
                <div className="text-xs text-muted-foreground">{fmtUSD.format(summary.totalSpent)}</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtUSD.format(summary.netProfit)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {summary.netProfit >= 0 ? 'Profit' : 'Loss'}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.transactionCount}</div>
                <div className="text-xs text-muted-foreground">Transactions</div>
              </CardContent>
            </Card>
          </div>

          <TableShell 
            isLoading={isLoading}
            isEmpty={!transactions.length}
            emptyState={
              <div className="py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Filter className="h-6 w-6" />
                  </div>
                  <p>No transactions found</p>
                  <p className="text-sm text-muted-foreground">
                    {filters.search || filters.type !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Complete some sales or purchases to see data here'
                    }
                  </p>
                </div>
              </div>
            }
          >
            <table className="w-full min-w-full text-sm text-muted-foreground">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap hidden sm:table-cell">ID</th>
                  <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Date</th>
                  <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Type</th>
                  <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Asset</th>
                  <th className="text-right p-2 sm:p-3 font-medium whitespace-nowrap">Amount</th>
                  <th className="text-left p-2 sm:p-3 font-medium hidden md:table-cell whitespace-nowrap">Contact</th>
                  <th className="text-left p-2 sm:p-3 font-medium hidden lg:table-cell whitespace-nowrap">Payment</th>
                  <th className="text-left p-2 sm:p-3 font-medium hidden xl:table-cell whitespace-nowrap">Event</th>
                  <th className="text-right p-2 sm:p-3 pr-4 sm:pr-6 font-medium w-10 sm:w-14"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const normalizedAmount = Number(transaction.amount ?? 0);
                  const amountValue = Number.isFinite(normalizedAmount) ? normalizedAmount : 0;
                  const signedAmount = transaction.type === 'purchase' ? -Math.abs(amountValue) : Math.abs(amountValue);
                  const amountDisplay = signedAmount > 0 ? `+${fmtUSD.format(signedAmount)}` : fmtUSD.format(signedAmount);
                  const contactLabel = transaction.contactType === 'seller' ? 'Seller' : 'Buyer';
                  const linkTarget = getTransactionLink(transaction);

                  return (
                  <tr key={transaction.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                      <div className="text-muted-foreground font-mono text-xs">
                        {transaction.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="text-foreground font-medium">
                        {fmtDate.format(new Date(transaction.date))}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <TransactionStatusPill type={transaction.type} />
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="max-w-xs">
                        <div className="text-foreground font-medium truncate">
                          {transaction.assetTitle}
                        </div>
                        {transaction.assetPlayerName && (
                          <div className="text-xs text-muted-foreground truncate">
                            {transaction.assetPlayerName}
                            {transaction.assetYear && ` • ${transaction.assetYear}`}
                            {transaction.assetGrade && ` • ${transaction.assetGrade}`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 text-right">
                      <div className="text-foreground font-medium">
                        {amountDisplay}
                      </div>
                      {transaction.profit !== null && transaction.profit !== undefined && (
                        <div className={`text-xs ${transaction.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.profit >= 0 ? '+' : ''}{fmtUSD.format(transaction.profit)}
                        </div>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 hidden md:table-cell">
                      {transaction.contactId && transaction.contactName ? (
                        <a 
                          href={`/contacts/${transaction.contactId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-foreground font-medium hover:text-primary underline flex items-center gap-1"
                        >
                          {transaction.contactName}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : transaction.contactName ? (
                        <div className="text-foreground font-medium">
                          {transaction.contactName}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">-</div>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 hidden lg:table-cell">
                      <div className="text-foreground">
                        {transaction.paymentMethod || '-'}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 hidden xl:table-cell">
                      <div className="text-foreground">
                        {transaction.eventName || '-'}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 pr-4 sm:pr-6 text-right w-10 sm:w-14">
                      <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                        <a href={linkTarget} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        </div>
      </main>
    </div>
  );
}