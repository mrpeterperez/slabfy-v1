// Purpose: Session detail page (v0) with adjusted routing for /buying-desk-v0
// Feature: buying-desk-v0

import React from "react";
import { useParams, useLocation } from "wouter";
import { BuyingDeskSection } from "../components/sections/buying-desk-section";
import { 
  DetailPageHeader, 
  type DetailNavItem, 
  type DetailActionItem 
} from "@/components/layout/detail-page-header";
import { Notebook, Handshake, Settings, ShoppingCart, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSessionV0, useDeleteSessionV0 } from "../hooks/use-sessions";
import { BuySessionStatusPill, type BuySessionStatus } from "@/components/status/buy-session-status-pill";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuyingDeskNotesSectionV0 } from "../components/sections/notes-section";
import { BuyingDeskSettingsSectionV0 } from "../components/sections/settings-section";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { CartPanel } from "../components/panels/cart-panel";
import { useSessionAssets } from "../hooks/use-assets";
import { useCartState } from "../hooks/use-cart-state";

export function SessionDetailPageV0() {
  const { id, tab } = useParams<{ id: string; tab?: string }>();
  const [location, navigate] = useLocation();
  const currentTab = tab || "assets"; // assets is default when no tab in URL
  const { data: assets = [] } = useSessionAssets(id || "");
  const { data: session } = useSessionV0(id || "");
  const deleteSession = useDeleteSessionV0();
  const { toast } = useToast();
  
  // Determine basePath based on current route (supports /buying-desk)
  const basePath = `/buying-desk/${id}`;
  
  // Use React Query for cart state persistence
  const { isCartOpen, setCartOpen, toggleCart } = useCartState(id || "");

  // Cart count for display
  const cartCount = useMemo(() => assets.filter((a: any) => a.status === "ready").length, [assets]);

  // Navigation items for buying desk
  const navigationItems: DetailNavItem[] = [
    { id: "assets", label: "Buying Desk", path: "", icon: Handshake }, // empty path = root
    { id: "notes", label: "Notes", path: "/notes", icon: Notebook },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
  ];

  // Action items for buying desk
  const actionItems: DetailActionItem[] = [
    {
      id: 'delete',
      label: 'Delete Session', 
      icon: Trash2, 
      variant: 'destructive' as const,
      onClick: () => {
        if (confirm('Are you sure you want to delete this session?')) {
          deleteSession.mutate(id || "", {
            onSuccess: () => {
              navigate("/buying-desk");
              toast({ title: "Session deleted successfully" });
            },
            onError: () => {
              toast({ title: "Failed to delete session", variant: "destructive" });
            }
          });
        }
      }
    }
  ];

  const sessionNumber = session?.sessionNumber || "—";
  const createdLabel = useMemo(() => {
    try {
      const d = session?.createdAt ? new Date(session.createdAt) : null;
      return d ? format(d, "MMM d, yyyy") : "";
    } catch {
      return "";
    }
  }, [session?.createdAt]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Unified Header with Navigation */}
      <DetailPageHeader 
        title={`Buy Session: ${sessionNumber}`}
        subtitle={createdLabel ? `Created ${createdLabel}` : undefined}
        statusPill={<BuySessionStatusPill status={(session?.status as BuySessionStatus) ?? "active"} />}
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
                onClick={toggleCart}
                className="relative"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cart ({cartCount})
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.1rem] items-center justify-center rounded-full bg-success px-1 text-[10px] font-semibold text-white ring-2 ring-background">
                    {cartCount}
                  </span>
                )}
              </Button>

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

      <div className="flex-1 overflow-auto">
        {currentTab === "assets" ? (
          <ResizablePanelGroup 
            direction="horizontal" 
            className="h-full" 
            autoSaveId={`buying-desk-split:${id}`}
          >
            <ResizablePanel 
              defaultSize={isCartOpen ? 70 : 100} 
              minSize={30}
            >
              <BuyingDeskSection sessionId={id || ""} onOpenCart={() => setCartOpen(true)} />
            </ResizablePanel>
            {isCartOpen && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={30} 
                  minSize={18}
                >
                  <CartPanel onClose={() => setCartOpen(false)} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        ) : currentTab === "notes" && id ? (
          <div className="flex-1 min-w-0 w-full max-w-full">
            {/* Section Title Toolbar */}
            <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px]">
              <div className="flex items-center justify-between gap-4 w-full">
                <h2 className="font-heading text-lg font-semibold text-foreground">Session Notes</h2>
              </div>
            </div>
            {/* Content */}
            <div className="p-6">
              <BuyingDeskNotesSectionV0 sessionId={id} />
            </div>
          </div>
        ) : currentTab === "settings" && id ? (
          <div className="flex-1 min-w-0 w-full max-w-full">
            {/* Section Title Toolbar */}
            <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px]">
              <div className="flex items-center justify-between gap-4 w-full">
                <h2 className="font-heading text-lg font-semibold text-foreground">Settings</h2>
              </div>
            </div>
            {/* Content */}
            <div className="p-6">
              <BuyingDeskSettingsSectionV0 sessionId={id} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default SessionDetailPageV0;
