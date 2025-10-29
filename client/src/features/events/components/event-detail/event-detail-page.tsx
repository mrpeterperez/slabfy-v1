// 🤖 INTERNAL NOTE:
// Purpose: Event detail page with EventCart component for cart functionality
// Exports: EventDetailPage component
// Feature: events
// Dependencies: wouter for routing, Header component, sections, EventCart

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useEvents } from "../../hooks/use-events";
import { 
  DetailPageHeader, 
  type DetailNavItem as PageNavItem, 
  type DetailActionItem,
  MobilePageTitle
} from "@/components/layout/detail-page-header";
import { MobilePageTitleWithSearch } from "@/components/layout/mobile-page-title-with-search";
import { MobileDetailBottomNav, type DetailNavTab, type DetailNavMoreItem } from "@/components/layout/mobile-detail-bottom-nav";
import { Loader2, Package, Handshake, Settings, BarChart3, Archive, ArchiveRestore, Trash2, ShoppingCart, MoreHorizontal, Share2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareStorefrontDialog } from "./share-storefront-dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EventStatusPill } from "@/components/status/event-status-pill";
import type { EventStatus } from "@/components/status/event-status-pill";
import { EventStatsCards } from "./event-stats";
import { EventSummarySection } from "./sections/event-summary-section";
import { InventoryTableV2 } from "./sections/inventory-management/inventory-table-v2";
import { BuyingDeskSection } from "./sections/buying-desk-section";
import { SalesHistorySection } from "./sections/sales-history-section";
import { SoldItemsSection } from "./sections/sold-items-section";
import { EventConfigurationSection } from "./sections/event-configuration-section";
import { EventCheckoutDialog } from "../checkout/EventCheckoutDialog";
import { EventCart, type CartItem } from "./event-cart";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { EventOrdersPage } from "../EventOrdersPage";
export function EventDetailPage() {
  const { id, tab } = useParams<{ id: string; tab?: string }>();
  const currentTab = (tab === "storefront" ? "inventory" : tab) || "inventory";
  const [, navigate] = useLocation();
  const { data: events, isLoading } = useEvents();

  // Search state for inventory
  const [inventorySearch, setInventorySearch] = useState("");

  // Cart state
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // Checkout dialog
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // Share storefront dialog
  const [shareOpen, setShareOpen] = useState(false);
  // Totals from cart for discount-aware checkout
  const [cartTotals, setCartTotals] = useState<{
    totalSell: number;
    discountedSell: number;
  finalSell: number;
    totalMarket: number;
    totalPurchase: number;
    discountAmount: number;
    showDiscount: boolean;
    discountType: 'percent' | 'amount';
    discountValue: number;
  } | null>(null);


  const queryClient = useQueryClient();
  
  // Cart operations
  const isInCart = (iid: string) => cartItems.some((ci) => ci.id === iid);
  const handleAddToCart = (item: any) => {
    const currentListPrice = Number(item?.askingPrice || 0) || 0;
    setCartItems((prev) => (isInCart(item.id) ? prev : [...prev, { id: item.id, item, price: currentListPrice }]));
    setCartOpen(true);
  };
  const removeFromCart = (iid: string) => setCartItems((prev) => prev.filter((ci) => ci.id !== iid));

  // Memoized callback to prevent infinite re-renders
  const handleTotalsChange = useCallback((totals: {
    totalSell: number;
    discountedSell: number;
    finalSell: number;
    totalMarket: number;
    totalPurchase: number;
    discountAmount: number;
    showDiscount: boolean;
    discountType: 'percent' | 'amount';
    discountValue: number;
  }) => {
    setCartTotals(totals);
  }, []);

  // Redirect to inventory tab if no tab or if using old /storefront route
  useEffect(() => {
    if (id && (!tab || tab === "storefront")) {
      navigate(`/events/${id}/inventory`, { replace: true });
    }
  }, [tab, id, navigate]);

  if (!id) return <div>Event not found</div>;
  const event = events?.find((e) => e.id === id);
  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Navigation items for events
  const navigationItems: PageNavItem[] = [
    { id: "inventory", label: "Inventory", path: "/inventory", icon: Package },
    { id: "orders", label: "Orders", path: "/orders", icon: Receipt },
    { id: "buy-sessions", label: "Buy Sessions", path: "/buy-sessions", icon: Handshake },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
  ];

  // Action items for events
  const actionItems: DetailActionItem[] = event ? [
    // Events might have archive/delete functionality - placeholder for now
    { 
      id: 'archive',
      label: 'Archive Event', 
      icon: Archive, 
      onClick: () => {/* TODO: implement archive */}
    }
  ] : [];

  const renderSection = () => {
    switch (currentTab) {
      case "inventory":
        return (
          <InventoryTableV2
            event={event}
            search={inventorySearch}
            onSearchChange={setInventorySearch}
            onToggleCart={() => setCartOpen(!cartOpen)}
            cartCount={cartItems.length}
            onAddToCart={handleAddToCart}
            isInCart={isInCart}
            onRemoveFromCart={removeFromCart}
          />
        );
      case "orders":
        return <EventOrdersPage />;
      case "sold-items":
        return <SoldItemsSection event={event} />;
      case "buy-sessions":
        return <BuyingDeskSection event={event} />;
      case "overview":
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Show Page</h2>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      // removed sales-history and analytics tab for backward compatibility
      case "settings":
        return <EventConfigurationSection event={event} />;
      default:
        return (
          <InventoryTableV2
            event={event}
            onToggleCart={() => setCartOpen(!cartOpen)}
            cartCount={cartItems.length}
            onAddToCart={handleAddToCart}
            isInCart={isInCart}
            onRemoveFromCart={removeFromCart}
          />
        );
    }
  };



  // Checkout/Reserve actions
  const handleCheckout = () => setCheckoutOpen(true);
  const handleCheckoutComplete = async (method: any, details?: any) => {
    let buyerContactId = details?.buyer?.id;
    
    // If buyer exists but has no ID, create contact first
    if (details?.buyer && !details.buyer.id) {
      try {
        console.log("Creating new contact for buyer:", details.buyer.name);
        const contactData = {
          name: details.buyer.name,
          companyName: details.buyer.companyName || null,
          email: details.buyer.email || null,
          phone: details.buyer.phone || null,
        };
        
        const contactResponse = await apiRequest("POST", "/api/contacts", contactData);
        const newContact = await contactResponse.json();
        buyerContactId = newContact.id;
        console.log("Created contact with ID:", buyerContactId);
      } catch (error) {
        console.error("Failed to create buyer contact:", error);
        // Continue with sale but without buyer linkage
      }
    }

    for (const ci of cartItems) {
      try {
        // Create sales transaction for each item
        const salePrice = ci.item?.askingPrice || ci.price || 0;
        
        // Fetch current market price for this asset
        let marketPriceAtSale = null;
        if (ci.item?.globalAssetId) {
          try {
            const pricingResponse = await apiRequest("GET", `/api/pricing/${ci.item.globalAssetId}`);
            const pricingData = await pricingResponse.json();
            marketPriceAtSale = pricingData?.averagePrice || pricingData?.medianPrice || null;
          } catch (pricingError) {
            console.warn("Failed to fetch market price for asset:", pricingError);
          }
        }
        
        // Get seller contact ID for consignments
        let sellerContactId = null;
        if (ci.item?.sourceType === 'consignment' && ci.item?.consignmentId) {
          try {
            const consignmentResponse = await apiRequest("GET", `/api/consignments/${ci.item.consignmentId}`);
            const consignmentData = await consignmentResponse.json();
            sellerContactId = consignmentData?.consignorContactId || null;
          } catch (consignmentError) {
            console.warn("Failed to fetch consignor contact ID:", consignmentError);
          }
        }
        
        const salesData = {
          eventInventoryId: ci.id,
          globalAssetId: ci.item?.globalAssetId || null,
          salePrice: String(Number(salePrice)), // Convert to string as required by numeric schema
          paymentMethod: method,
          orderId: details?.orderId || null,
          buyerName: details?.buyer?.name || null,
          buyerEmail: details?.buyer?.email || null,
          buyerPhone: details?.buyer?.phone || null,
          buyerId: buyerContactId || null, // Use the contact ID (existing or newly created)
          sellerId: sellerContactId || null, // Consignor's contact ID for consignment sales
          sourceType: ci.item?.sourceType || ci.item?.ownershipType || "portfolio",
          receiptSent: details?.receipt?.channel !== "none",
          receiptChannel: details?.receipt?.channel || null,
          costBasis: (ci.item?.costBasis !== undefined && ci.item?.costBasis !== null) ? String(ci.item.costBasis) 
                   : (ci.item?.purchasePrice !== undefined && ci.item?.purchasePrice !== null) ? String(ci.item.purchasePrice) 
                   : null,
          marketPriceAtSale: (marketPriceAtSale !== undefined && marketPriceAtSale !== null) ? String(marketPriceAtSale) : null, // Convert to string
          notes: `Sold via ${method} payment`,
        };

        // Create the sales transaction (this also marks the item as sold)
        await apiRequest("POST", `/api/events/${event.id}/sales`, salesData);
      } catch (e) {
        console.error("Failed to create sales transaction:", e);
        // Fallback to just marking as sold
        try {
          await apiRequest("PATCH", `/api/events/${event.id}/inventory/${ci.id}`, { status: "sold" });
        } catch (fallbackError) {
          console.error("Failed to mark item as sold:", fallbackError);
        }
      }
    }
    setCartItems([]);
    setCartOpen(false);
    setCheckoutOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "inventory"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "sales"] });
    // Also invalidate portfolio/consignment asset lists so sold items update ownership status immediately
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey as unknown as Array<string | unknown>;
        if (!Array.isArray(key) || key.length === 0) return false;
        const k0 = key[0];
        return typeof k0 === 'string' && (
          k0 === '/api/assets/user' || k0.startsWith('/api/assets/user') ||
          k0 === '/api/user' || k0.includes('/assets') ||
          k0 === '/api/consignments/user' || k0.startsWith('/api/consignments/user') ||
          k0 === '/api/consignments' || k0.startsWith('/api/consignments') ||
          k0 === '/api/analytics/transactions' // Ensure analytics refreshes too
        );
      }
    });
  };
  const handleReserve = async () => {
    for (const ci of cartItems) {
      try {
        await apiRequest("PATCH", `/api/events/${event.id}/inventory/${ci.id}`, { status: "reserved" });
      } catch (e) {
        console.error("Failed to reserve", e);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "inventory"] });
  };

  const basePath = `/events/${id}`;

  // Get page title based on current tab
  const getPageTitle = () => {
    const navItem = navigationItems.find(item => item.id === currentTab);
    return navItem ? navItem.label : 'Inventory';
  };

  // Mobile bottom nav config
  const mobileNavTabs: DetailNavTab[] = [
    {
      key: 'inventory',
      label: 'Inventory',
      icon: Package,
      onClick: () => navigate(`${basePath}/inventory`),
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: Receipt,
      badge: 0, // TODO: fetch order count
      onClick: () => navigate(`${basePath}/orders`),
    },
    {
      key: 'buy-sessions',
      label: 'Buy Sessions',
      icon: Handshake,
      onClick: () => navigate(`${basePath}/buy-sessions`),
    },
    {
      key: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      badge: cartItems.length,
      onClick: () => setCartOpen(true),
    },
  ];

  const mobileNavMoreItems: DetailNavMoreItem[] = [
    {
      key: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: () => navigate(`${basePath}/settings`),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Unified Header with Navigation */}
      <DetailPageHeader 
        title={event.name}
        thumbnailUrl={event.logoUrl || undefined}
        statusPill={<EventStatusPill status={event.status as EventStatus} />}
        basePath={basePath}
        currentTab={currentTab}
        navigationItems={navigationItems}
        actionItems={actionItems}
        rightContent={
          <div className="flex items-center flex-1">
            {/* Centered Navigation Tabs */}
            <div className="hidden md:flex items-center justify-center flex-1">
              <div className="flex items-center space-x-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const fullPath = item.path === '' ? basePath : `${basePath}${item.path}`;
                        navigate(fullPath);
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        "hover:bg-muted hover:text-foreground text-muted-foreground",
                        isActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right-aligned Actions */}
            <div className="flex items-center space-x-2">
              {/* Cart Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCartOpen(!cartOpen)}
              >
                <ShoppingCart className="w-4 w-4 mr-2" />
                Cart ({cartItems.length})
              </Button>

              {/* Share Storefront Button - Only visible for "live" events */}
              {event.status === 'live' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}

              {/* Actions Menu */}
              {actionItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actionItems.map((action) => {
                      const Icon = action.icon;
                      return (
                        <DropdownMenuItem 
                          key={action.id}
                          onClick={action.onClick}
                          disabled={action.disabled}
                          className={action.variant === 'destructive' ? 
                            "text-destructive focus:text-destructive" : undefined
                          }
                        >
                          {Icon && <Icon className="mr-2 h-4 w-4" />}
                          {action.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        }
      />

      {/* Mobile Page Title - outside header */}
      {currentTab === 'inventory' ? (
        <MobilePageTitleWithSearch
          title={getPageTitle()}
          searchValue={inventorySearch}
          onSearchChange={setInventorySearch}
          searchPlaceholder="Search inventory…"
        />
      ) : (
        <MobilePageTitle title={getPageTitle()} />
      )}

      {/* Main content area with EventCart */}
      <EventCart
        event={event}
        cartOpen={cartOpen}
        onCartOpenChange={setCartOpen}
        cartItems={cartItems}
        onCartItemsChange={setCartItems}
        onCheckout={handleCheckout}
        onReserve={handleReserve}
        onTotalsChange={handleTotalsChange}
      >
        <div 
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden h-full w-full"
        >
          {currentTab === "analytics" && (
            <div className="mb-6">
              <EventStatsCards event={event} />
            </div>
          )}
          {renderSection()}
        </div>
      </EventCart>

    {checkoutOpen && (
        <EventCheckoutDialog
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          amount={cartTotals?.totalSell ?? cartItems.reduce((s, ci) => s + (Number(ci.price) || 0), 0)}
          discountedAmount={cartTotals?.finalSell ?? cartItems.reduce((s, ci) => s + (Number(ci.price) || 0), 0)}
          itemDescription={`${cartItems.length} item${cartItems.length === 1 ? "" : "s"}`}
          onPaymentComplete={(method, details) => handleCheckoutComplete(method, details)}
          onNavigate={(route) => {
            // TODO: implement route flows (trade-only, mixed-payment, external)
            console.log("navigate", route);
          }}
        />
      )}

      {/* Share Storefront Dialog */}
      <ShareStorefrontDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        event={event}
      />

      {/* Mobile Detail Bottom Nav */}
      <MobileDetailBottomNav
        tabs={mobileNavTabs}
        moreItems={mobileNavMoreItems}
        activeTab={currentTab}
      />
    </div>
  );
}
