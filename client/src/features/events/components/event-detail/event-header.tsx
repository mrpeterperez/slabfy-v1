// 🤖 INTERNAL NOTE:
// Purpose: Event detail header with hamburger navigation matching wireframe design
// Exports: EventDetailHeader component
// Feature: events
// Dependencies: @/components/ui for dropdown, lucide-react for icons, wouter for navigation

import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import {
  Home,
  Calendar,
  User,
  LogOut,
  MoreHorizontal,
  ShoppingCart,
  Handshake,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { Event } from "@shared/schema";
import { format } from "date-fns";
import { EditEventDialog } from "../edit-event/edit-event-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MobileTopNav } from "@/components/layout/mobile-top-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareStorefrontDialog } from "./share-storefront-dialog";
// Legacy buy-mode offers removed; buying-desk is the new surface

interface EventDetailHeaderProps {
  event: Event;
  onToggleCart?: () => void;
  cartCount?: number;
}

export function EventDetailHeader({
  event,
  onToggleCart,
  cartCount,
}: EventDetailHeaderProps) {
  const [, setLocation] = useLocation();
  const { signOut } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const offers: any[] = [];

  // Count offers associated with this show
  const offerCount = useMemo(() => {
    try {
      if (!Array.isArray(offers)) return 0;
      return offers.filter((o: any) => o?.buyOffer?.eventId === event.id)
        .length;
    } catch {
      return 0;
    }
  }, [offers, event.id]);

  const handleLogout = async () => {
    await signOut();
    setLocation("/signin");
  };

  // Parse a YYYY-MM-DD string as a local Date (no timezone shift)
  const parseDateOnly = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const formatEventDate = (startDate: string, endDate?: string | null) => {
    const start = parseDateOnly(startDate);

    if (!endDate || endDate === startDate) {
      return format(start, "MMM d, yyyy");
    }

    const end = parseDateOnly(endDate);
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto px-4 sm:px-6 lg:px-4">
          <div className="flex h-16 items-center w-full">
            {/* Desktop Layout */}
            <div className="hidden md:contents">
              {/* Left Side - Logo and Event Details (one-line) */}
              <div className="flex items-center gap-3 flex-none min-w-0">
                {/* Show Logo */}
                <Avatar className="h-10 w-10">
                  {event.logoUrl ? (
                    <AvatarImage src={event.logoUrl} alt={event.name} className="object-cover" />
                  ) : (
                    <AvatarFallback>
                      {(event.name || "").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                  <AvatarFallback>
                    {(event.name || "").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Event Title and Date (single line) */}
                <div className="hidden md:flex items-center min-w-0 gap-3">
                  <div
                    className="font-heading text-2xl font-bold text-foreground truncate max-w-[28rem]"
                    title={event.name}
                  >
                    {event.name}
                  </div>
                  <span className="text-muted-foreground">|</span>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatEventDate(event.dateStart, event.dateEnd)}
                  </div>
                </div>
              </div>
              {/* Center - empty to align layout */}
              <div className="flex-1" />

              {/* Right Side - Actions */}
              <div className="flex items-center space-x-2 flex-none">
                {/* Share Storefront Button - Only visible for "live" events */}
                {event.status === 'live' && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-9 px-3 rounded-full"
                    onClick={() => setShareOpen(true)}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    <span className="text-sm">Share</span>
                  </Button>
                )}
                
                {/* Offers indicator (tablet-style) */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-full relative"
                  onClick={() => setLocation("/buying-desk")}
                  aria-label="Offers"
                >
                  <span className="inline-flex items-center gap-2">
                    <Handshake className="w-4 h-4" />
                    <span className="text-sm">Offers</span>
                  </span>
                  {offerCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground ring-2 ring-background">
                      {offerCount}
                    </span>
                  )}
                </Button>
                {typeof cartCount === "number" && onToggleCart && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleCart}
                    className="h-9 px-3 flex items-center gap-2 rounded-full relative"
                    aria-label="Toggle cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-sm">In Cart</span>
                    {(cartCount ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-success px-1 text-[11px] font-semibold text-white ring-2 ring-background">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                )}

                {/* 3-dot Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      Edit Show
                    </DropdownMenuItem>
                    <DropdownMenuItem>Duplicate Show</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Delete Show
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {/* Mobile Layout - sticky reusable top nav (no back) */}
            <div className="md:hidden w-full">
              <MobileTopNav
                title={event.name}
                onInfo={() => setInfoOpen(true)}
                right={
                  <div className="flex items-center">
                    {/* Offers count */}
                    <Button
                      variant="outline"
                      className="h-12 w-12 min-h-[3rem] min-w-[3rem] p-0 rounded-full relative"
                      onClick={() => setLocation("/buying-desk")}
                      aria-label="Offers"
                    >
                      <Handshake className="h-4 w-4" />
                      {offerCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-background">
                          {offerCount}
                        </span>
                      )}
                    </Button>
                    {onToggleCart && (
                      <Button
                        variant="outline"
                        className="h-12 w-12 min-h-[3rem] min-w-[3rem] p-0 rounded-full relative"
                        onClick={onToggleCart}
                        aria-label="Toggle cart"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {(cartCount ?? 0) > 0 && (
                          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.1rem] items-center justify-center rounded-full bg-success px-1 text-[10px] font-semibold text-white ring-2 ring-background">
                            {cartCount}
                          </span>
                        )}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-12 w-12 min-h-[3rem] min-w-[3rem] p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="h-12 text-base"
                          onClick={() => setEditOpen(true)}
                        >
                          Edit Show
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-12 text-base">
                          Duplicate Show
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="h-12 text-base text-destructive">
                          Delete Show
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </header>
      {/* Info Sheet for mobile */}
      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent
          side="bottom"
          className="pb-safe-bottom rounded-t-3xl pt-3 sm:pt-4"
        >
          {/* Grab handle for modern drawer UX */}
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">
              Event Information
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1 text-sm">
            <div className="font-medium">{event.name}</div>
            <div className="text-muted-foreground">
              {formatEventDate(event.dateStart, event.dateEnd)}
            </div>
            {event.location && (
              <div className="text-muted-foreground">{event.location}</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <EditEventDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
      />
      <ShareStorefrontDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        event={event}
      />
    </>
  );
}
