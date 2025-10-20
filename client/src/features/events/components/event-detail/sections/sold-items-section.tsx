import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event } from "shared/schema";
import { Loader2, RotateCcw, Package, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface Props {
  event: Event;
}

interface SoldSale {
  id: string;
  eventInventoryId: string;
  salePrice: number;
  paymentMethod: string;
  buyerName: string;
  buyerEmail: string | null;
  buyerPhone: string | null;
  buyerId: string | null;
  sourceType: string | null;
  receiptSent: boolean;
  receiptChannel: string | null;
  orderId: string | null;
  saleDate: string;
  // Asset details
  globalAssetId: string;
  assetTitle: string | null;
  assetPlayerName: string | null;
  assetSetName: string | null;
  assetYear: string | null;
  assetGrade: string | null;
  assetCertNumber: string | null;
}

export function SoldItemsSection({ event }: Props) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedItem, setSelectedItem] = useState<SoldSale | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Use sales endpoint which includes buyer info
  const { data: soldSales = [], isLoading } = useQuery<SoldSale[]>({
    queryKey: [`/api/events/${event.id}/sales`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/events/${event.id}/sales`);
      return res.json();
    },
  });

  const revertMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      const res = await apiRequest("PATCH", `/api/events/${event.id}/inventory/${inventoryId}`, {
        status: "available",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/inventory`], exact: false });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/sales`], exact: false });
      toast({
        title: "Item Restored",
        description: "The item has been moved back to available inventory.",
      });
      setSelectedItem(null);
      setConfirmed(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore item",
        variant: "destructive",
      });
    },
  });

  const handleRevert = (sale: SoldSale) => {
    setSelectedItem(sale);
    setConfirmed(false);
  };

  const handleConfirmRevert = () => {
    if (selectedItem && confirmed) {
      revertMutation.mutate(selectedItem.eventInventoryId);
    }
  };

  const handleAssetClick = (sale: SoldSale) => {
    // Navigate to PUBLIC asset view (no ownership data)
    navigate(`/storefront/${event.userId}/asset/${sale.globalAssetId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (soldSales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Sold Items</h3>
        <p className="text-muted-foreground max-w-md">
          Items sold through checkout will appear here with buyer details.
        </p>
      </div>
    );
  }

  const totalRevenue = soldSales.reduce((sum, sale) => sum + sale.salePrice, 0);

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Sold</div>
            <div className="text-2xl font-bold">{soldSales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sold Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sold Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Asset</th>
                  <th className="text-right p-4 font-medium">Sale Price</th>
                  <th className="text-left p-4 font-medium">Buyer</th>
                  <th className="text-left p-4 font-medium">Sold At</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {soldSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/25">
                    <td className="p-4">
                      <button
                        onClick={() => handleAssetClick(sale)}
                        className="text-left hover:underline"
                      >
                        <div className="font-medium">
                          {sale.assetPlayerName || sale.assetTitle || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {sale.assetYear && `${sale.assetYear} `}
                          {sale.assetSetName}
                          {sale.assetGrade && ` • PSA ${sale.assetGrade}`}
                        </div>
                        {sale.assetCertNumber && (
                          <div className="text-xs text-muted-foreground">
                            Cert: {sale.assetCertNumber}
                          </div>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-right font-medium">
                      ${sale.salePrice.toFixed(2)}
                    </td>
                    <td className="p-4">
                      {sale.buyerId ? (
                        <Link href={`/contacts/${sale.buyerId}`}>
                          <span className="text-primary hover:underline cursor-pointer">
                            {sale.buyerName}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{sale.buyerName}</span>
                      )}
                      {sale.buyerEmail && (
                        <div className="text-xs text-muted-foreground">{sale.buyerEmail}</div>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(sale.saleDate).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevert(sale)}
                        data-testid={`button-revert-${sale.id}`}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Move to Available
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Revert Dialog */}
      <AlertDialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Back to Available Inventory</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to move <strong>"{selectedItem?.assetPlayerName || selectedItem?.assetTitle}"</strong> back
                to available inventory.
              </p>
              <p className="text-destructive font-medium">
                ⚠️ Warning: This action will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Mark the item as available for sale again</li>
                <li>Allow the item to appear in storefront and inventory</li>
                <li>NOT delete the sales transaction record (history is preserved)</li>
                <li>This action can be reversed by marking it as sold again</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to proceed? Consider if the sale was actually completed before
                reversing the sold status.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center space-x-2 pb-4">
            <Checkbox
              id="confirm-revert"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              data-testid="checkbox-confirm-revert"
            />
            <label
              htmlFor="confirm-revert"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand and confirm this action
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedItem(null);
              setConfirmed(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRevert}
              disabled={!confirmed || revertMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-confirm-revert"
            >
              {revertMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                "Yes, Move to Available"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
