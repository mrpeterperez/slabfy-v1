import { Card, CardContent } from '@/components/ui/card';
import { Package, DollarSign, TrendingUp } from 'lucide-react';
import type { ConsignmentWithDetails, ConsignorWithContact } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface EarningsSectionProps {
  consignment: ConsignmentWithDetails;
  consignor: ConsignorWithContact;
}

export function EarningsSection({ consignment, consignor }: EarningsSectionProps) {
  const { data: assets = [], isLoading } = useQuery({
    queryKey: [`/api/consignments/${consignment.id}/assets`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/consignments/${consignment.id}/assets`);
      return response.json();
    },
  });

  const soldAssets = assets.filter((a: any) => a.status === "sold");
  const consignmentDefaultSplit = Number(consignment.defaultSplitPercentage) || 95;

  if (soldAssets.length === 0) {
    return (
      <div className="px-6 pt-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Sales Yet</h3>
          <p className="text-muted-foreground max-w-md">
            Sold items will appear here with detailed earnings breakdown.
          </p>
        </div>
      </div>
    );
  }

  const totalSales = soldAssets.reduce((sum: number, asset: any) => {
    const salePrice = Number(asset.soldPrice || asset.askingPrice) || 0;
    return sum + salePrice;
  }, 0);

  const totalHouseCut = soldAssets.reduce((sum: number, asset: any) => {
    const salePrice = Number(asset.soldPrice || asset.askingPrice) || 0;
    const split = Number(asset.splitPercentage) ?? consignmentDefaultSplit;
    const houseCut = (salePrice * (100 - split)) / 100;
    return sum + houseCut;
  }, 0);

  const totalOwnerCut = totalSales - totalHouseCut;

  return (
    <div className="px-6 pt-6 space-y-6">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">Earnings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sales breakdown for {consignor.contact.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Items Sold</span>
            </div>
            <p className="text-2xl font-bold mt-1">{soldAssets.length}</p>
            <p className="text-xs text-muted-foreground">sold assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Sales</span>
            </div>
            <p className="text-2xl font-bold mt-1">${totalSales.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">gross revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Owner Payout</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-success">${totalOwnerCut.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">seller earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Your Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">${totalHouseCut.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">house cut</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Asset</th>
                  <th className="text-right p-4 font-medium">Sale Price</th>
                  <th className="text-right p-4 font-medium">Seller %</th>
                  <th className="text-right p-4 font-medium">Owner Gets</th>
                  <th className="text-right p-4 font-medium">You Get</th>
                  <th className="text-left p-4 font-medium">Sold At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {soldAssets.map((asset: any) => {
                  const salePrice = Number(asset.soldPrice || asset.askingPrice) || 0;
                  const split = Number(asset.splitPercentage) ?? consignmentDefaultSplit;
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
                        {split.toFixed(1)}%
                      </td>
                      <td className="p-4 text-right font-medium text-success">
                        ${ownerCut.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium text-primary">
                        ${houseCut.toFixed(2)}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {asset.soldAt
                          ? new Date(asset.soldAt).toLocaleDateString()
                          : asset.updatedAt
                          ? new Date(asset.updatedAt).toLocaleDateString()
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
                <span className="font-bold text-primary">${totalHouseCut.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
