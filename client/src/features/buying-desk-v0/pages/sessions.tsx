// Purpose: Buying Desk v0 main page (dashboard) with v0 routing
// Feature: buying-desk-v0

import React, { useMemo, useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings } from "lucide-react";
import AddOfferDialog from "../components/dialogs/add-offer-dialog";
import { SessionsListTable } from "../components/session/sessions-list";
import { useSessionsList } from "../hooks/use-sessions-list";
import { useSellersV0 as useSellers } from "../hooks/use-sellers";
import { BuyingDeskSettingsDialog } from "../components/dialogs/settings-dialog";

export function SessionsListV0() {
  usePageTitle("Buying Desk");
  const [addOfferOpen, setAddOfferOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: buyOffers = [], isLoading: offersLoading } = useSessionsList();
  // Sellers are optional context; don't block page render if they're slow/erroring
  const { data: sellers = [] } = useSellers();

  const loading = offersLoading;

  const { totalCartValue, totalExpectedProfit, profitPercentage, activeSessions } = useMemo(() => {
    const list = (Array.isArray(buyOffers) ? buyOffers : []) as any[];
    const totals = list.reduce(
      (acc, item) => {
        // Handle both old format (cartSummary) and new format (direct properties)
        const totalValue = item?.totalValue ?? item?.cartSummary?.totalValue ?? 0;
        const expectedProfit = item?.expectedProfit ?? item?.cartSummary?.expectedProfit ?? 0;
        
        acc.totalCartValue += Number(totalValue);
        acc.totalExpectedProfit += Number(expectedProfit);
        if (item?.session?.status === "active" || item?.status === "active") acc.active += 1;
        return acc;
      },
      { totalCartValue: 0, totalExpectedProfit: 0, active: 0 }
    );
    const profitPct = totals.totalCartValue > 0 ? (totals.totalExpectedProfit / totals.totalCartValue) * 100 : 0;
    return {
      totalCartValue: totals.totalCartValue,
      totalExpectedProfit: totals.totalExpectedProfit,
      profitPercentage: profitPct,
      activeSessions: totals.active,
    };
  }, [buyOffers]);

  const fmtCurrency = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }),
    []
  );

  const summaryCards = [
    { title: "Total Buy List Value", value: loading ? null : fmtCurrency.format(totalCartValue) },
    {
      title: "Expected Profit",
      value: loading ? null : `${fmtCurrency.format(totalExpectedProfit)} (${profitPercentage.toFixed(0)}%)`,
    },
    { title: "Active Sessions", value: loading ? null : activeSessions.toString() },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 space-y-6">
          <div className="mt-2 flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold font-heading">Buying Desk</h1>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 p-0 sm:inline-flex"
                title="Buying Desk Settings"
                disabled={loading}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex sm:ml-auto">
              <Button onClick={() => setAddOfferOpen(true)} disabled={loading} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {summaryCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-8 bg-muted rounded animate-pulse" />
                  ) : (
                    <div className="text-2xl font-bold">{card.value}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {loading ? <div className="h-96 bg-muted rounded animate-pulse" /> : <SessionsListTable archived={false} />}
        </div>
      </main>

      <AddOfferDialog isOpen={addOfferOpen} onClose={() => setAddOfferOpen(false)} />
      <BuyingDeskSettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default SessionsListV0;
