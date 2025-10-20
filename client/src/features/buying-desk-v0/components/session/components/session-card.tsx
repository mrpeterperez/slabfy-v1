// 🤖 INTERNAL NOTE:
// Purpose: Mobile card component for session display
// Exports: SessionCard component
// Feature: buying-desk-v0
// Dependencies: session data, contact info, card UI components

import React, { useMemo } from "react";
import { MoreHorizontal, User, Calendar, Package, Trash2, Clock, ArchiveRestore, Settings, Edit, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BuySessionStatusPill, type BuySessionStatus } from "@/components/status/buy-session-status-pill";
import { latestNoteText } from "../../../lib/notes";

interface SessionCardProps {
  session: any;
  contact: any;
  event?: any;
  cartSummary: any;
  archived?: boolean;
  onRowClick: (id: string) => void;
  onDeleteClick: (id: string, sessionNumber: string) => void;
  onArchiveClick?: (id: string) => void;
  onRestoreClick?: (id: string) => void;
  formatDate: (date: string) => string;
}

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function SessionCard({ session, contact, event, cartSummary, archived = false, onRowClick, onDeleteClick, onArchiveClick, onRestoreClick, formatDate }: SessionCardProps) {
  const notePreview = useMemo(() => latestNoteText(session?.notes) || null, [session?.notes]);
  
  // Handle both old cartSummary format and new session format
  const cartCount = session.cartCount ?? (cartSummary?.count ?? 0);
  const totalValue = session.totalValue ?? (cartSummary?.totalValue ?? 0);

  const cartValue = useMemo(() => ({ value: Number(totalValue), count: Number(cartCount) }), [totalValue, cartCount]);

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onRowClick(session.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-medium">{session.sessionNumber}</CardTitle>
            {notePreview && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notePreview}</p>}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <BuySessionStatusPill status={session.status as BuySessionStatus} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRowClick(session.id); }}>
                  <Settings className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {!archived && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRowClick(session.id); }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {archived ? (
                  // Archive tab: Show Restore + Delete options
                  <>
                    <DropdownMenuItem 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onRestoreClick?.(session.id);
                      }}
                    >
                      <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDeleteClick(session.id, session.sessionNumber); }} 
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  // Active tab: Show Archive option
                  <DropdownMenuItem 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onArchiveClick?.(session.id);
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Seller</p>
                {contact ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/contacts/${contact.id}`;
                    }}
                    className="font-medium text-sm hover:text-primary hover:underline transition-colors text-left"
                  >
                    {contact.name}
                  </button>
                ) : (
                  <p className="font-medium text-sm">Unknown Seller</p>
                )}
              </div>
            </div>
            {event && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Show</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/events/${event.id}`;
                    }}
                    className="font-medium text-sm hover:text-primary hover:underline transition-colors text-left"
                  >
                    {event.name}
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Buy List</p>
                <p className="font-medium">{fmtUSD.format(cartValue.value)} ({cartValue.count})</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(session.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
        {session.expiryDate && (
          <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Expires {formatDate(session.expiryDate)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}