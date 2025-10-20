/**
 * @file sold-items-tab.tsx
 * @description Displays sold consignment items in card-based layout with split % and house cut calculations
 *
 * INTERNAL NOTE:
 * Purpose: Dedicated SOLD tab view for consignments matching event inventory pattern
 * Shows sold items with sale price, owner split %, calculated house cut, and summary totals
 * Uses existing assets data filtered by status='sold'
 * Exports: SoldItemsTab
 */

import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";
import { Link } from "wouter";

interface ConsignmentAssetData {
  id: string;
  globalAssetId: string;
  playerName?: string | null;
  title?: string | null;
  setName?: string | null;
  year?: string | null;
  grade?: string | null;
  certNumber?: string | null;
  askingPrice?: number | null;
  soldPrice?: string | null;
  splitPercentage?: string | null;
  status: string | null;
  updatedAt?: Date | null;
  buyerName?: string | null;
  buyerContactId?: string | null;
}

interface Props {
  assets: ConsignmentAssetData[];
  defaultSplit: number;
}

export function SoldItemsTab({ assets, defaultSplit }: Props) {
  const soldAssets = assets.filter((a) => a.status === "sold");

  if (soldAssets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Sold Items</h3>
        <p className="text-muted-foreground max-w-md">
          Items sold from this consignment will appear here with split % and house cut details.
        </p>
      </div>
    );
  }

  // Calculate totals
  const totalSales = soldAssets.reduce((sum, asset) => {
    const salePrice = Number(asset.soldPrice || asset.askingPrice) || 0;
    return sum + salePrice;
  }, 0);

  const totalHouseCut = soldAssets.reduce((sum, asset) => {
    const salePrice = Number(asset.soldPrice || asset.askingPrice) || 0;
    const split = Number(asset.splitPercentage) ?? defaultSplit;
    const houseCut = (salePrice * (100 - split)) / 100;
    return sum + houseCut;
  }, 0);

  const totalOwnerCut = totalSales - totalHouseCut;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Items Sold</div>
            <div className="text-2xl font-bold">{soldAssets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Sales</div>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">House Revenue</div>
            <div className="text-2xl font-bold">${totalHouseCut.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sold Items Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Asset</th>
                  <th className="text-right p-4 font-medium">Sale Price</th>
                  <th className="text-right p-4 font-medium">Split %</th>
                  <th className="text-right p-4 font-medium">Owner Gets</th>
                  <th className="text-right p-4 font-medium">House Cut</th>
                  <th className="text-left p-4 font-medium">Buyer</th>
                  <th className="text-left p-4 font-medium">Sold At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {soldAssets.map((asset) => {
                  const salePrice = Number(asset.soldPrice || asset.askingPrice) || 0;
                  const split = Number(asset.splitPercentage) ?? defaultSplit;
                  const ownerCut = (salePrice * split) / 100;
                  const houseCut = (salePrice * (100 - split)) / 100;

                  return (
                    <tr key={asset.id} className="hover:bg-muted/25">
                      <td className="p-4">
                        <div className="font-medium">
                          {asset.playerName || asset.title || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {asset.year && `${asset.year} `}
                          {asset.setName}
                          {asset.grade && ` • PSA ${asset.grade}`}
                        </div>
                        {asset.certNumber && (
                          <div className="text-xs text-muted-foreground">
                            Cert: {asset.certNumber}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right font-medium">
                        ${salePrice.toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {split}%
                      </td>
                      <td className="p-4 text-right font-medium text-success">
                        ${ownerCut.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        ${houseCut.toFixed(2)}
                      </td>
                      <td className="p-4">
                        {asset.buyerContactId ? (
                          <Link href={`/contacts/${asset.buyerContactId}`}>
                            <span className="text-primary hover:underline cursor-pointer">
                              {asset.buyerName}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{asset.buyerName || "—"}</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {asset.updatedAt
                          ? new Date(asset.updatedAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Row */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Totals</div>
            <div className="flex items-center gap-8 text-sm">
              <div>
                <span className="text-muted-foreground">Sales: </span>
                <span className="font-bold">${totalSales.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Owner: </span>
                <span className="font-bold text-success">${totalOwnerCut.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">House: </span>
                <span className="font-bold">${totalHouseCut.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
