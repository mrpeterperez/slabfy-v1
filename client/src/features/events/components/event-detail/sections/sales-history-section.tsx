// 🤖 INTERNAL NOTE:
// Purpose: Sales History section for Event Detail matching Purchased tab layout
// Exports: SalesHistorySection component
// Feature: events

import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Event } from "shared/schema";

interface Props { event: Event }

interface SaleTransaction {
  id: string;
  salePrice: number;
  paymentMethod: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  saleDate: string;
  asset: {
    title: string | null;
    playerName: string | null;
    setName: string | null;
    year: string | null;
    grade: string | null;
    certNumber: string | null;
  };
  profit: number | null;
  costBasis: number | null;
  buyer: {
    id: string;
    name: string;
  } | null;
}

export function SalesHistorySection({ event }: Props) {
  const { data: sales = [], isLoading } = useQuery<SaleTransaction[]>({
    queryKey: [`/api/events/${event.id}/sales`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/events/${event.id}/sales`);
      return res.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold mb-2">No Sales Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Sold items will appear here when purchases are completed through checkout.
        </p>
      </div>
    );
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.salePrice, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Sales</div>
            <div className="text-2xl font-bold">{sales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Profit</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Asset</th>
                  <th className="text-right p-4 font-medium">List Price</th>
                  <th className="text-right p-4 font-medium">Market Price</th>
                  <th className="text-right p-4 font-medium">Profit</th>
                  <th className="text-left p-4 font-medium">Buyer</th>
                  <th className="text-left p-4 font-medium">Sold Date</th>
                  <th className="text-left p-4 font-medium">Payment</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.map((sale) => {
                  const marketPrice = sale.costBasis || 0;
                  
                  return (
                    <tr key={sale.id} className="hover:bg-muted/25">
                      <td className="p-4">
                        <div className="font-medium">
                          {sale.asset.playerName || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {sale.asset.year} {sale.asset.setName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sale.asset.grade ? `PSA ${sale.asset.grade}` : ''} 
                          {sale.asset.certNumber ? ` • Cert# ${sale.asset.certNumber}` : ''}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-medium text-foreground">
                          {formatCurrency(sale.salePrice)}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-medium text-foreground">
                          {marketPrice > 0 ? formatCurrency(marketPrice) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {sale.profit !== null ? (
                          <span className={`font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(sale.profit))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {sale.buyer?.id ? (
                          <a 
                            className="text-primary hover:underline font-medium" 
                            href={`/contacts/${sale.buyer.id}`} 
                            target="_blank" 
                            rel="noreferrer"
                          >
                            {sale.buyer.name || 'Unknown'}
                          </a>
                        ) : (
                          <div className="font-medium">{sale.buyerName || 'Anonymous'}</div>
                        )}
                        {sale.buyerEmail && (
                          <div className="text-sm text-muted-foreground">{sale.buyerEmail}</div>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className="capitalize">
                          {sale.paymentMethod.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              data-testid={`menu-sale-${sale.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                // View sale details
                                console.log('View sale:', sale.id);
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                // Send receipt
                                console.log('Send receipt:', sale.id);
                              }}
                            >
                              Send Receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
