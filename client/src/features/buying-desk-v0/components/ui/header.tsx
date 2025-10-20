// Purpose: Buying Desk v0 session detail header with v0 routing
// Feature: buying-desk-v0

import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { MoreHorizontal, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MobileTopNav } from "@/components/layout/mobile-top-nav";
import { useAuth } from "@/components/auth-provider";
import { useSessionV0, useDeleteSessionV0 } from "../../hooks/use-sessions";
import { useSessionAssets } from "../../hooks/use-assets";
import { BuySessionStatusPill, type BuySessionStatus } from "@/components/status/buy-session-status-pill";

interface DetailHeaderProps { onOpenCart?: () => void }

export function DetailHeaderV0({ onOpenCart }: DetailHeaderProps) {
  const [, setLocation] = useLocation();
  const { signOut } = useAuth();
  const { id } = useParams<{ id: string }>();

  const { data: session } = useSessionV0(id || "");
  const { data: assets = [] } = useSessionAssets(id || "");
  const deleteSession = useDeleteSessionV0();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const cartCount = useMemo(() => assets.filter((a: any) => a.status === "ready").length, [assets]);

  const handleDeleteSession = () => setDeleteDialogOpen(true);
  const handleConfirmDelete = () => {
    deleteSession.mutate(id || "", {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setLocation("/buying-desk");
      },
    });
  };

  const createdLabel = useMemo(() => {
    try {
      const d = session?.createdAt ? new Date(session.createdAt) : null;
      return d ? format(d, "MMM d, yyyy") : "";
    } catch {
      return "";
    }
  }, [session?.createdAt]);

  const sessionNumber = session?.sessionNumber || "—";

  return (
    <header className="bg-background md:border-b md:border-border">
      <div className="mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex md:h-16 items-center w-full">
          {/* Desktop */}
          <div className="hidden md:contents">
            <div className="flex items-center gap-3 flex-none min-w-0">
              <div className="hidden lg:flex items-center min-w-0 gap-3">
                <div className="font-heading text-2xl font-bold text-foreground truncate max-w-[32rem]">
                  Buy Session: {sessionNumber}
                </div>
                <span className="text-muted-foreground">|</span>
                <BuySessionStatusPill status={(session?.status as BuySessionStatus) ?? "active"} />
                <span className="text-muted-foreground">|</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground truncate max-w-[36rem]">
                  {createdLabel && <span className="whitespace-nowrap">Created {createdLabel}</span>}
                </div>
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center space-x-2 flex-none">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 flex items-center gap-2 rounded-full relative"
                aria-label="Buy List"
                onClick={() => { try { onOpenCart && onOpenCart(); } catch {} }}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm">Buy List</span>
                {(cartCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-success px-1 text-[11px] font-semibold text-white ring-2 ring-background">
                    {cartCount}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDeleteSession} className="text-destructive">
                    Delete Session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden w-full">
            <MobileTopNav
              title={`Buy Session: ${sessionNumber}`}
              right={
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    className="h-12 w-12 min-h-[3rem] min-w-[3rem] p-0 rounded-full relative"
                    aria-label="Buy List"
                    onClick={() => { try { onOpenCart && onOpenCart(); } catch {} }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {(cartCount ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.1rem] items-center justify-center rounded-full bg-success px-1 text-[10px] font-semibold text-white ring-2 ring-background">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-12 w-12 min-h-[3rem] min-w-[3rem] p-0"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={handleDeleteSession}
                        className="h-12 text-base text-destructive"
                      >
                        Delete Session
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* Delete Session Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Buy Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete session {sessionNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteSession.isPending}
            >
              {deleteSession.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

export default DetailHeaderV0;
