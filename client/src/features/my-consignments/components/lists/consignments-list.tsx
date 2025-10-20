import React, { useState } from "react";
import { MoreHorizontal, Trash2, Package, User, Calendar, TrendingUp, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useConsignments, useDeleteConsignment, useArchiveConsignment, useUnarchiveConsignment, useConsignmentSummaries } from "../../hooks/use-consignments";
import TableShell from "@/components/table/table-shell";
import { TableSkeleton } from "@/components/ui/skeletons/table-skeleton";
import { MobileListSkeleton } from "@/components/ui/skeletons/table-skeleton";
import { getConsignmentStatusBadgeClass, getConsignmentStatusLabel } from "../../utils/status";

interface ConsignmentsListProps {
  className?: string;
  archived?: boolean;
  // Bulk selection props
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
}

// Note: Using real API data instead of mock data

// Mobile card component for responsive design
function ConsignmentCard({ 
  consignmentData,
  onRowClick, 
  onDeleteClick,
  onArchiveClick,
  onUnarchiveClick,
  formatDate,
  isSelected,
  onToggleSelection
}: {
  consignmentData: any; // Real consignment data from API
  onRowClick: (id: string) => void;
  onDeleteClick: (id: string, title: string) => void;
  onArchiveClick: (id: string) => void;
  onUnarchiveClick: (id: string) => void;
  formatDate: (date: string) => string;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
}) {
  const isArchived = consignmentData.archived || false;
  
  const displayAssetValue = () => {
    const totalValue = consignmentData.totalValue || 0;
    const totalAssets = consignmentData.totalAssets || 0;
    return { value: totalValue, count: totalAssets };
  };

  const displayExpectedCommission = () => {
  const totalValue = consignmentData.totalValue || 0;
  const split = parseFloat(consignmentData.defaultSplitPercentage || "95.00");
  const houseRate = 100 - split;
  const expectedHouseShare = (totalValue * houseRate) / 100;
  return { amount: expectedHouseShare, rate: houseRate };
  };

  const assetInfo = displayAssetValue();
  const commissionInfo = displayExpectedCommission();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking checkbox or dropdown
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[role="menu"]') || target.closest('button')) {
      return;
    }
    onRowClick(consignmentData.id);
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {onToggleSelection && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection(consignmentData.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-medium truncate">
                {consignmentData.title}
              </CardTitle>
              {consignmentData.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {consignmentData.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <Badge className={getConsignmentStatusBadgeClass(consignmentData.status)}>
              {getConsignmentStatusLabel(consignmentData.status)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isArchived ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnarchiveClick(consignmentData.id);
                    }}
                  >
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Restore Consignment
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchiveClick(consignmentData.id);
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Consignment
                  </DropdownMenuItem>
                )}
                {isArchived && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick(consignmentData.id, consignmentData.title);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
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
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Asset Value</p>
                <p className="font-medium">
                  ${assetInfo.value.toFixed(2)} ({assetInfo.count})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Consignor</p>
                <p className="text-sm font-medium">
                  {consignmentData.consignorName || "Unknown Consignor"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Expected House Share</p>
                <p className="font-medium text-success">
                  ${commissionInfo.amount.toFixed(2)} ({commissionInfo.rate.toFixed(0)}%)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(consignmentData.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Individual row component using real API data structure
function ConsignmentRow({ 
  consignmentData,
  onRowClick, 
  onDeleteClick,
  onArchiveClick,
  onUnarchiveClick,
  formatDate, 
  setLocation 
}: {
  consignmentData: any; // Real consignment data from API
  onRowClick: (id: string) => void;
  onDeleteClick: (id: string, title: string) => void;
  onArchiveClick: (id: string) => void;
  onUnarchiveClick: (id: string) => void;
  formatDate: (date: string) => string;
  setLocation: (path: string) => void;
}) {
  const isArchived = consignmentData.archived || false;
  
  const displayAssetValue = () => {
    const totalValue = consignmentData.totalValue || 0;
    const totalAssets = consignmentData.totalAssets || 0;
    
    if (totalAssets === 0) {
      return <div className="text-muted-foreground text-sm">$0.00 (0)</div>;
    }
    
    return (
      <div className="font-medium">
        ${totalValue.toFixed(2)} ({totalAssets})
      </div>
    );
  };

  const displayExpectedHouseShare = () => {
    const totalValue = consignmentData.totalValue || 0;
    const split = parseFloat(consignmentData.defaultSplitPercentage || "95.00");
    const houseShareRate = 100 - split;
    if (totalValue === 0) {
      return <div className="text-muted-foreground text-sm">$0.00</div>;
    }
    const expectedHouseShare = (totalValue * houseShareRate) / 100;
    return (
      <div className="font-medium text-success">
        ${expectedHouseShare.toFixed(2)} ({houseShareRate.toFixed(0)}%)
      </div>
    );
  };

  return (
    <tr 
      className="border-b hover:bg-muted/25 cursor-pointer"
      onClick={() => onRowClick(consignmentData.id)}
    >
      <td className="p-3 lg:p-4">
        <div className="font-medium text-sm lg:text-base">{consignmentData.title}</div>
        {consignmentData.description && (
          <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
            {consignmentData.description}
          </div>
        )}
        {/* Show mobile-friendly status and contact info on tablet */}
        <div className="flex items-center gap-2 mt-2 lg:hidden">
          <Badge className={`${getConsignmentStatusBadgeClass(consignmentData.status)} text-xs px-2 py-1`}>
            {getConsignmentStatusLabel(consignmentData.status)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(consignmentData.createdAt)}
          </span>
        </div>
      </td>
      <td className="p-3 lg:p-4 text-sm text-muted-foreground hidden lg:table-cell">
        <div className="font-medium text-secondary">
          {consignmentData.consignorName || "Unknown Consignor"}
        </div>
      </td>
      <td className="p-3 lg:p-4 text-sm">
        {displayAssetValue()}
      </td>
      <td className="p-3 lg:p-4 text-sm">
        {displayExpectedHouseShare()}
      </td>
      <td className="p-3 lg:p-4 hidden lg:table-cell">
        <Badge className={getConsignmentStatusBadgeClass(consignmentData.status)}>
          {getConsignmentStatusLabel(consignmentData.status)}
        </Badge>
      </td>
      <td className="p-3 lg:p-4 text-sm text-muted-foreground hidden lg:table-cell">
        {formatDate(consignmentData.createdAt)} 
      </td>
      <td className="p-3 lg:p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isArchived ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onUnarchiveClick(consignmentData.id);
                }}
              >
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Restore Consignment
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onArchiveClick(consignmentData.id);
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Consignment
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(consignmentData.id, consignmentData.title);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Consignment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function ConsignmentsList({ 
  className, 
  archived,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  isAllSelected,
  isSomeSelected 
}: ConsignmentsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [consignmentToDelete, setConsignmentToDelete] = useState<{ id: string; title: string } | null>(null);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Use archived boolean for filtering
  const { data: consignments = [], isLoading } = useConsignments(archived);
  const { data: summaries = [] } = useConsignmentSummaries();

  const summaryById = React.useMemo(() => {
    const map = new Map<string, { revenue: number; pipelineValue: number; profit: number; assetsCount: number }>();
    for (const s of summaries || []) {
      map.set(s.consignmentId, {
        revenue: Number(s.revenue || 0),
        pipelineValue: Number(s.pipelineValue || 0),
        profit: Number(s.profit || 0),
        assetsCount: Number(s.assetsCount || 0),
      });
    }
    return map;
  }, [summaries]);
  const deleteConsignmentMutation = useDeleteConsignment();
  const archiveConsignmentMutation = useArchiveConsignment();
  const unarchiveConsignmentMutation = useUnarchiveConsignment();

  const formatDate = (dateInput: string | Date | null | undefined) => {
    try {
      if (!dateInput) return "—";
      const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  // status badge and label handled by shared helpers

  const handleRowClick = (id: string) => {
    setLocation(`/consignments/${id}`);
  };

  const handleDeleteClick = (id: string, title: string) => {
    setConsignmentToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!consignmentToDelete) return;

    try {
      await deleteConsignmentMutation.mutateAsync(consignmentToDelete.id);
      
      toast({
        title: "Success",
        description: "Consignment deleted successfully",
      });
      
      setDeleteDialogOpen(false);
      setConsignmentToDelete(null);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to delete consignment",
        variant: "destructive",
      });
    }
  };

  const handleArchiveClick = async (id: string) => {
    await archiveConsignmentMutation.mutateAsync(id);
  };

  const handleUnarchiveClick = async (id: string) => {
    await unarchiveConsignmentMutation.mutateAsync(id);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile Card Layout (hidden on md and up) */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <MobileListSkeleton rows={3} />
        ) : consignments.length === 0 ? (
          <div className="border rounded-lg p-8 text-center bg-card">
            {archived ? (
              <Archive className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            ) : (
              <Package className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            )}
            <h3 className="text-lg font-semibold font-heading mb-2">
              {archived ? 'No archived consignments' : 'No consignments yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {archived
                ? 'Use the Actions menu on a consignment to move it to Archived. You can restore it later.'
                : 'Create your first consignment to start managing collections for others.'}
            </p>
          </div>
        ) : (
          consignments.map((consignmentData) => (
            <ConsignmentCard
              key={consignmentData.id}
              consignmentData={consignmentData}
              onRowClick={handleRowClick}
              onDeleteClick={handleDeleteClick}
              onArchiveClick={handleArchiveClick}
              onUnarchiveClick={handleUnarchiveClick}
              formatDate={formatDate}
              isSelected={selectedIds?.has(consignmentData.id)}
              onToggleSelection={onToggleSelection}
            />
          ))
        )}
      </div>

      {/* Desktop Table Layout (hidden on mobile, shown on md and up) */}
      <TableShell
        isLoading={isLoading}
        isEmpty={!isLoading && consignments.length === 0}
        containerClassName="hidden md:block bg-card-muted"
        emptyState={archived ? (
          <div className="py-12 text-center">
            <Archive className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold font-heading mb-2">No archived consignments</h3>
            <p className="text-muted-foreground">
              Use the Actions menu on a consignment to move it to Archived. You can restore it later.
            </p>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Package className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold font-heading mb-2">No consignments yet</h3>
            <p className="text-muted-foreground">
              Create your first consignment to start managing collections for others.
            </p>
          </div>
        )}
      >
        <table className="w-full min-w-full text-xs sm:text-sm text-muted-foreground">
          <thead>
            <tr className="border-b bg-muted/50">
              {onSelectAll && (
                <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={() => {
                      const allIds = consignments.map(c => c.id);
                      onSelectAll(allIds);
                    }}
                    aria-label="Select all"
                    className={isSomeSelected && !isAllSelected ? "data-[state=checked]:bg-primary" : ""}
                  />
                </th>
              )}
              <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 pr-2 sm:pr-3 font-medium whitespace-nowrap">Consignment</th>
              <th className="text-left p-2 sm:p-3 font-medium hidden lg:table-cell whitespace-nowrap">Consignor</th>
              <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Status</th>
              <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Assets</th>
              <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Total Value</th>
              <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Revenue</th>
              <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Profit</th>
              <th className="text-left p-2 sm:p-3 font-medium hidden lg:table-cell whitespace-nowrap">Created</th>
              <th className="text-right p-2 sm:p-3 pr-4 sm:pr-6 font-medium w-10 sm:w-14"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={6} showAssetThumb={false} columns={["status","actions"]} includeSelectionCell={false} />
            ) : (
            consignments.map((consignmentData) => {
              const isArchived = consignmentData.archived;
              const isSelected = selectedIds?.has(consignmentData.id);
              
              const handleRowClickWithSelection = (e: React.MouseEvent) => {
                // Don't navigate if clicking checkbox or dropdown
                const target = e.target as HTMLElement;
                if (target.closest('[role="checkbox"]') || target.closest('[role="menu"]') || target.closest('button')) {
                  return;
                }
                handleRowClick(consignmentData.id);
              };
              
              return (
              <tr 
                key={consignmentData.id}
                className={`bg-card border-b hover:bg-muted/25 cursor-pointer group ${
                  isSelected ? 'ring-2 ring-inset ring-primary' : ''
                }`}
                onClick={handleRowClickWithSelection}
              >
                {onToggleSelection && (
                  <td className="p-2 sm:p-3 pl-4 sm:pl-6 w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(consignmentData.id)}
                      aria-label={`Select ${consignmentData.title}`}
                    />
                  </td>
                )}
                <td className="p-2 sm:p-3 pl-4 sm:pl-6 pr-2 sm:pr-3 align-top bg-card-muted group-hover:bg-muted/40 transition-colors">
                  <div className="font-medium text-sm lg:text-base text-secondary">{consignmentData.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                    {consignmentData.description || "—"}
                  </div>
                  <div className="flex items-center gap-2 mt-2 lg:hidden">
                    <Badge className={`${getConsignmentStatusBadgeClass(consignmentData.status)} text-xs px-2 py-1`}>
                      {getConsignmentStatusLabel(consignmentData.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(consignmentData.createdAt)}
                    </span>
                  </div>
                </td>
                <td className="p-2 sm:p-3 text-sm text-muted-foreground hidden lg:table-cell">
                  <div className="font-medium text-secondary">
                    {consignmentData.consignorName || "Unknown Consignor"}
                  </div>
                </td>
                <td className="p-2 sm:p-3 hidden lg:table-cell">
                  <Badge className={getConsignmentStatusBadgeClass(consignmentData.status)}>
                    {getConsignmentStatusLabel(consignmentData.status)}
                  </Badge>
                </td>
                <td className="p-2 sm:p-3 text-sm">
                  {(() => {
                    const totalAssets = summaryById.get(consignmentData.id)?.assetsCount ?? consignmentData.totalAssets ?? 0;
                    if (!totalAssets) return <div className="text-muted-foreground text-sm">0</div>;
                    return <div className="font-medium text-secondary">{totalAssets}</div>;
                  })()}
                </td>
                <td className="p-2 sm:p-3 text-sm">
                  {(() => {
                    const totalValue = summaryById.get(consignmentData.id)?.pipelineValue ?? consignmentData.totalValue ?? 0;
                    return (
                      <div className={totalValue ? "font-medium text-secondary" : "text-muted-foreground text-sm"}>
                        ${totalValue.toFixed(2)}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-2 sm:p-3 text-sm">
                  {(() => {
                    const revenue = summaryById.get(consignmentData.id)?.revenue ?? 0;
                    return (
                      <div className={revenue ? "font-medium text-secondary" : "text-muted-foreground text-sm"}>
                        ${revenue.toFixed(2)}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-2 sm:p-3 text-sm">
                  {(() => {
                    const profit = summaryById.get(consignmentData.id)?.profit ?? consignmentData.potentialProfit ?? 0;
                    return (
                      <div className={profit ? "font-medium text-secondary" : "text-muted-foreground text-sm"}>
                        ${profit.toFixed(2)}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-2 sm:p-3 text-sm text-muted-foreground hidden lg:table-cell">
                  {formatDate(consignmentData.createdAt)} 
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
                        {isArchived ? (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnarchiveClick(consignmentData.id);
                            }}
                          >
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Restore Consignment
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveClick(consignmentData.id);
                            }}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive Consignment
                          </DropdownMenuItem>
                        )}
                        {isArchived && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(consignmentData.id, consignmentData.title);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Permanently
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
            })
            )
            }
          </tbody>
        </table>
      </TableShell>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const currentConsignment = consignments.find(c => c.id === consignmentToDelete?.id);
                const isArchived = currentConsignment?.archived;
                return isArchived ? 'Delete Permanently' : 'Delete Consignment';
              })()}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const currentConsignment = consignments.find(c => c.id === consignmentToDelete?.id);
                const isArchived = currentConsignment?.archived;
                return isArchived
                  ? `Permanently delete "${consignmentToDelete?.title}"? This cannot be undone.`
                  : `Are you sure you want to delete "${consignmentToDelete?.title}"? This action cannot be undone and will remove all associated assets.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {(() => {
                const currentConsignment = consignments.find(c => c.id === consignmentToDelete?.id);
                const isArchived = currentConsignment?.archived;
                return isArchived ? 'Delete Permanently' : 'Delete';
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}