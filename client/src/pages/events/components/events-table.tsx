// 🤖 INTERNAL NOTE:
// Purpose: Main events table with responsive design and CRUD actions
// Exports: EventsTable component  
// Feature: events
// Dependencies: @/components/table/table-shell, events cell components, dialog components

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Settings, Trash2, Archive, ArchiveRestore, Calendar, Plus } from "lucide-react";
import { TableShell } from "@/components/table/table-shell";
import { EventStatusPill, type EventStatus } from "@/components/status/event-status-pill";
import { InventoryCountCell, SessionStatsCell, PurchasedCell, RevenueCell } from "./events-table-cells";
import { AddEventDialog } from "@/features/events/components/add-event/add-event-dialog";
import { EditEventDialog } from "@/features/events/components/edit-event/edit-event-dialog";
import { DeleteEventDialog } from "@/features/events/components/delete-event/delete-event-dialog";
import { useUpdateEvent } from "@/features/events/hooks/use-events";
import type { Event } from "@/features/events/types/event-types";

interface EventsTableProps {
  events: Event[];
  loading: boolean;
  archived?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
}

// Status display configuration - now handled by EventStatusPill component

export function EventsTable({ 
  events, 
  loading,
  archived,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  isAllSelected,
  isSomeSelected 
}: EventsTableProps) {
  const [, setLocation] = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);
  const updateEventMutation = useUpdateEvent();

  const formatEventDateRange = (startDate: string, endDate?: string | null) => {
    const start = new Date(startDate);
    const startFormatted = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    
    if (!endDate) return startFormatted;
    
    const end = new Date(endDate);
    const endFormatted = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    
    return startFormatted === endFormatted ? startFormatted : `${startFormatted} - ${endFormatted}`;
  };

  const goto = (id: string) => setLocation(`/events/${id}`);

  const handleArchiveClick = async (id: string) => {
    await updateEventMutation.mutateAsync({ id, data: { archived: true } });
  };

  const handleUnarchiveClick = async (id: string) => {
    await updateEventMutation.mutateAsync({ id, data: { archived: false } });
  };

  return (
    <>
      <TableShell
        isLoading={loading}
        isEmpty={!events || events.length === 0}
        emptyState={
          archived ? (
            <div className="py-12 text-center">
              <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No archived shows</h3>
              <p className="text-muted-foreground">
                Use the Actions menu on a show to move it to Archived. You can restore it later.
              </p>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No shows yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first show to start tracking your events and sales.
              </p>
            </div>
          )
        }
        containerClassName="bg-card-muted mt-6"
      >
        <table className="w-full min-w-full text-xs sm:text-sm text-muted-foreground">
          <thead>
            <tr className="border-b bg-muted/50">
              {onSelectAll && (
                <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={() => {
                      const allIds = events.map(e => e.id);
                      onSelectAll(allIds);
                    }}
                    aria-label="Select all"
                    className={isSomeSelected && !isAllSelected ? "data-[state=checked]:bg-primary" : ""}
                  />
                </th>
              )}
              <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 pr-2 sm:pr-3 font-medium whitespace-nowrap">Title</th>
              <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Date</th>
              <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Status</th>
              <th className="text-left p-2 sm:p-3 font-medium hidden md:table-cell whitespace-nowrap">Buy Sessions</th>
              <th className="text-left p-2 sm:p-3 font-medium hidden md:table-cell whitespace-nowrap">Inventory</th>
              <th className="text-left p-2 sm:p-3 font-medium hidden lg:table-cell whitespace-nowrap">Purchased</th>
              <th className="text-left p-2 sm:p-3 font-medium hidden lg:table-cell whitespace-nowrap">Revenue</th>
              <th className="text-right p-2 sm:p-3 pr-4 sm:pr-6 font-medium w-10 sm:w-14"></th>
            </tr>
          </thead>
          <tbody>
            {events?.map((ev) => {
              const isSelected = selectedIds?.has(ev.id);
              
              const handleRowClick = (e: React.MouseEvent) => {
                const target = e.target as HTMLElement;
                if (target.closest('[role="checkbox"]') || target.closest('[role="menu"]') || target.closest('button')) {
                  return;
                }
                goto(ev.id);
              };
              
              return (
                <tr
                  key={ev.id}
                  className={`bg-card border-b hover:bg-muted/50 cursor-pointer group transition-colors ${
                    isSelected ? 'ring-2 ring-inset ring-primary' : ''
                  }`}
                  onClick={handleRowClick}
                >
                  {onToggleSelection && (
                    <td className="p-2 sm:p-3 pl-4 sm:pl-6 w-12" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelection(ev.id)}
                        aria-label={`Select ${ev.name}`}
                      />
                    </td>
                  )}
                <td className="p-2 sm:p-3 pl-4 sm:pl-6 pr-2 sm:pr-3 align-top">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="border bg-secondary/5 h-12 w-12 sm:h-14 sm:w-14 rounded-md overflow-hidden bg-muted flex items-center justify-center text-sm sm:text-base font-medium text-muted-foreground shrink-0"
                      aria-label={ev.logoUrl ? undefined : `Placeholder for ${ev.name}`}
                    >
                      {ev.logoUrl ? (
                        <img
                          src={ev.logoUrl}
                          alt={ev.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        (ev.name?.trim()?.charAt(0)?.toUpperCase() || "E")
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate text-secondary">{ev.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {ev.location || "—"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-2 sm:p-3 text-sm">
                  {formatEventDateRange(ev.dateStart, ev.dateEnd)}
                </td>
                <td className="p-2 sm:p-3">
                  <EventStatusPill status={ev.status as EventStatus} />
                </td>
                <td className="p-2 sm:p-3 text-sm hidden md:table-cell">
                  <SessionStatsCell id={ev.id} />
                </td>
                <td className="p-2 sm:p-3 text-sm hidden md:table-cell">
                  <InventoryCountCell id={ev.id} />
                </td>
                <td className="p-2 sm:p-3 text-sm hidden lg:table-cell">
                  <PurchasedCell event={ev} />
                </td>
                <td className="p-2 sm:p-3 text-sm hidden lg:table-cell">
                  <RevenueCell event={ev} />
                </td>
                <td className="p-2 sm:p-3 pr-4 sm:pr-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => goto(ev.id)}>
                          <Settings className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {!archived && (
                          <DropdownMenuItem onClick={() => { setSelected(ev); setEditOpen(true); }}>
                            Edit Event
                          </DropdownMenuItem>
                        )}
                        {!archived ? (
                          <DropdownMenuItem onClick={() => handleArchiveClick(ev.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleUnarchiveClick(ev.id)}>
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { setSelected(ev); setDelOpen(true); }} 
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Event
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>

      {/* Dialogs */}
      <AddEventDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditEventDialog open={editOpen} onOpenChange={setEditOpen} event={selected} />
      <DeleteEventDialog open={delOpen} onOpenChange={setDelOpen} event={selected} />
    </>
  );
}