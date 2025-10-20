// 🤖 INTERNAL NOTE:
// Purpose: Desktop table component for sessions display
// Exports: SessionsTable component
// Feature: buying-desk-v0
// Dependencies: session data, table components, session hooks

import React from "react";
import { MoreHorizontal, Plus, Trash2, Archive, ArchiveRestore, Settings, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import TableShell from "@/components/table/table-shell";
import { BuySessionStatusPill, type BuySessionStatus } from "@/components/status/buy-session-status-pill";
import { latestNoteText } from "../../../lib/notes";

interface SessionsTableProps {
  sessions: any[];
  isLoading: boolean;
  archived?: boolean;
  onRowClick: (id: string) => void;
  onDeleteClick: (id: string, sessionNumber: string) => void;
  onArchiveClick?: (id: string) => void;
  onRestoreClick?: (id: string) => void;
  formatDate: (date: string) => string;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
}

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function SessionsTable({ 
  sessions, 
  isLoading, 
  archived,
  onRowClick, 
  onDeleteClick,
  onArchiveClick,
  onRestoreClick,
  formatDate,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  isAllSelected,
  isSomeSelected
}: SessionsTableProps) {
  return (
    <TableShell
      isLoading={isLoading}
      isEmpty={!sessions || sessions.length === 0}
      containerClassName="hidden md:block bg-card-muted"
      emptyState={
        archived ? (
          <div className="py-12 text-center">
            <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No archived sessions</h3>
            <p className="text-muted-foreground">
              Use the Actions menu on a session to move it to Archived. You can restore it later.
            </p>
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-6 w-6" />
              </div>
              <p>No buying sessions yet</p>
              <p className="text-sm text-muted-foreground">Start a new session to evaluate and make offers</p>
            </div>
          </div>
        )
      }
    >
      <table className="w-full min-w-full text-xs sm:text-sm text-muted-foreground">
        <thead>
          <tr className="border-b bg-muted/50">
            {onSelectAll && (
              <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={() => {
                    const allIds = sessions.map((item: any) => {
                      const session = item.session || item;
                      return session.id;
                    });
                    onSelectAll(allIds);
                  }}
                  aria-label="Select all"
                  className={isSomeSelected && !isAllSelected ? "data-[state=checked]:bg-primary" : ""}
                />
              </th>
            )}
            <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 pr-2 sm:pr-3 font-medium whitespace-nowrap">Session & Seller</th>
            <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap hidden lg:table-cell">Show</th>
            <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Buy List</th>
            <th className="text-left p-2 sm:p-3 font-medium hidden sm:table-cell whitespace-nowrap">Created</th>
            <th className="text-left p-2 sm:p-3 font-medium hidden sm:table-cell whitespace-nowrap">Status</th>
            <th className="text-right p-2 sm:p-3 pr-4 sm:pr-6 font-medium w-10 sm:w-14"></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((item: any) => {
            // Handle both old cartSummary format and new session format
            const session = item.session || item;
            const contact = item.contact || item.seller;
            const event = item.event;
            const cartSummary = item.cartSummary;
            
            if (!session) return null;
            
            // Use session data directly for new format, fallback to cartSummary for old format
            const cartCount = session.cartCount ?? (cartSummary?.count ?? 0);
            const totalValue = session.totalValue ?? (cartSummary?.totalValue ?? 0);
            
            const isSelected = selectedIds?.has(session.id);

            const handleRowClick = (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              if (target.closest('[role="checkbox"]') || target.closest('[role="menu"]') || target.closest('button')) {
                return;
              }
              onRowClick(session.id);
            };

            return (
              <tr 
                key={session.id} 
                className={`bg-card border-b hover:bg-muted/25 cursor-pointer group ${
                  isSelected ? 'ring-2 ring-inset ring-primary' : ''
                }`}
                onClick={handleRowClick}
              >
                {onToggleSelection && (
                  <td className="p-2 sm:p-3 pl-4 sm:pl-6 w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(session.id)}
                      aria-label={`Select ${session.sessionNumber}`}
                    />
                  </td>
                )}
                
                {/* Session + Seller combined */}
                <td className="p-2 sm:p-3 pl-4 sm:pl-6 pr-2 sm:pr-3">
                  <div className="font-medium text-sm">{session.sessionNumber}</div>
                  {contact ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/contacts/${contact.id}`;
                      }}
                      className="text-xs text-muted-foreground mt-0.5 hover:text-primary hover:underline transition-colors text-left"
                    >
                      {contact.name}
                    </button>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-0.5">Unknown Seller</div>
                  )}
                </td>

                {/* Show/Event */}
                <td className="p-2 sm:p-3 text-sm hidden lg:table-cell">
                  {event ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/events/${event.id}`;
                      }}
                      className="text-sm hover:text-primary hover:underline transition-colors text-left"
                    >
                      {event.name}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Buy List $ and count */}
                <td className="p-2 sm:p-3 text-sm">
                  {cartCount === 0 ? (
                    <div className="text-muted-foreground text-sm">{fmtUSD.format(0)} (0)</div>
                  ) : (
                    <div>
                      <div className="font-medium">{fmtUSD.format(totalValue)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{cartCount} item{cartCount !== 1 ? 's' : ''}</div>
                    </div>
                  )}
                </td>

                {/* Created date */}
                <td className="p-2 sm:p-3 text-sm hidden sm:table-cell">
                  <div className="text-muted-foreground">{formatDate(session.createdAt)}</div>
                </td>

                {/* Status */}
                <td className="p-2 sm:p-3 text-sm hidden sm:table-cell">
                  <BuySessionStatusPill status={session.status as BuySessionStatus} />
                </td>

                {/* Actions */}
                <td className="text-right p-2 sm:p-3 pr-4 sm:pr-6 w-10 sm:w-14" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(session.id);
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                      </DropdownMenuItem>
                      {!archived && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowClick(session.id);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
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
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            <span>Restore</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClick(session.id, session.sessionNumber);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
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
                          <span>Archive</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}