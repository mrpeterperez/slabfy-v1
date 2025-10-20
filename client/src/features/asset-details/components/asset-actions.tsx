// 🤖 INTERNAL NOTE (LLM):
// This file defines the AssetActions component which provides a dropdown menu for asset-related actions.
// It renders edit, sell, and delete options for an asset.
// Part of the `asset-details` feature.
// Depends on EditAssetDialog from the edit-asset feature.

import { useState } from "react";
import { useLocation } from "wouter";
import { Asset } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateInput } from "@/components/ui/date-input";
import { MoreHorizontal, Edit, Trash, DollarSign, RefreshCw, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VerifiedEditAssetDialog } from "@/features/edit-asset";
import { ManualEditAssetDialog } from "@/features/edit-asset/components/manual-edit-asset-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshSales } from '@shared/api/sales-refresh';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { deleteAsset } from "@shared/api/asset-api";

// Cache invalidation
import { invalidateAfterManualRefresh, invalidateAssetPricing } from "@/lib/cache-invalidation";

type AssetActionsProps = {
  asset: Asset;
  isOwner?: boolean; // Whether user owns this asset (includes consignments)
  isSold?: boolean;  // Whether asset was sold
  // These will be implemented in the future
  onEdit?: () => void;
  onDelete?: () => void;
  onReview?: () => void;
};

/**
 * Asset actions dropdown component
 * Displays a 3-dot menu with various actions for the asset
 * For non-owned assets: only shows Refresh Sales
 * For owned assets: shows Edit, Delete, Refresh Sales, etc.
 */
export const AssetActions = ({ asset, isOwner = true, isSold = false, onEdit, onDelete, onReview }: AssetActionsProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isManualEditDialogOpen, setIsManualEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState<'sold' | 'mistake' | 'other' | ''>(''); // No pre-selection
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleData, setSaleData] = useState({
    platform: '' as '' | 'in_person' | 'ebay' | 'other', // No pre-selection
    price: '',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
  });
  const [validationErrors, setValidationErrors] = useState({
    reason: false,
    platform: false,
    price: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Function to handle opening the edit dialog
  const handleEditClick = () => {
    // If an onEdit callback was provided, use it
    if (onEdit) {
      onEdit();
    } else {
      // Check if asset is manually added (no PSA cert number or sourceSlug is 'manual')
      const isManuallyAdded = !asset.certNumber || asset.sourceSlug === 'manual';
      
      if (isManuallyAdded) {
        setIsManualEditDialogOpen(true);
      } else {
        setIsEditDialogOpen(true);
      }
    }
  };
  
  // Sales refresh mutation - comprehensive cache invalidation
  const refreshSalesMutation = useMutation({
    mutationFn: async () => refreshSales(asset.id, true),
    onSuccess: async (data) => {
      // Comprehensive cache invalidation for manual refresh - NOW PASSES FULL ASSET OBJECT
      await invalidateAfterManualRefresh(asset);
      
      // Show appropriate toast based on whether new data was found
      if (data.new_records_added === 0) {
        toast({
          title: "Sales data up to date",
          description: `All ${data.total_cached_records} sales records are current - no new data available`,
        })
      } else {
        toast({
          title: "Sales data refreshed",
          description: `Found ${data.new_records_added} new records`,
        })
      }
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Unable to fetch fresh sales data",
        variant: "destructive"
      })
    },
    onMutate: () => {
      // Show loading toast
      toast({
        title: "Refreshing sales data",
        description: "Fetching latest data from marketplace...",
      })
    }
  });
  
  // Function to handle sales refresh
  const handleRefreshSales = () => {
    toast({
      title: "Refreshing sales data...",
      description: "Fetching latest marketplace data",
    });
    refreshSalesMutation.mutate();
  };

  // Simple delete flow (kept local to feature per slabfyrules)
  const deleteMutation = useMutation({
    mutationFn: async () => deleteAsset(asset.id),
    onSuccess: async () => {
      // Remove deleted asset from cache (don't refetch since it's deleted)
      queryClient.removeQueries({ 
        queryKey: [`/api/assets/${asset.id}`],
        exact: true 
      });
      
      // Invalidate portfolio query to remove deleted asset from table
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/user/${asset.userId}/assets`],
        refetchType: 'active'
      });
      
      // Invalidate pricing caches (don't use helper to avoid refetch attempts)
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key.some(k => typeof k === 'string' && k.includes(asset.id));
        }
      });
      
      // Close dialog first for instant feedback
      setIsDeleteDialogOpen(false);
      
      // Show success toast
      toast({ 
        title: 'Asset deleted', 
        description: `${asset.playerName || asset.title || 'Asset'} successfully deleted` 
      });
      
      // Redirect to portfolio after brief delay so user sees toast
      setTimeout(() => {
        navigate('/portfolio');
      }, 100);
    },
    onError: (error: any) => {
      console.error('Failed to delete asset:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete asset. Please try again.', 
        variant: 'destructive' 
      });
    }
  });

  // Manual sale mutation - records sale and deletes asset
  const manualSaleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        '/api/sales/manual',
        {
          userAssetId: asset.id,
          salePrice: parseFloat(saleData.price),
          saleDate: saleData.date,
          platform: saleData.platform,
        }
      );
      
      return response.json();
    },
    onSuccess: async () => {
      // Same cache invalidation as delete
      queryClient.removeQueries({ 
        queryKey: [`/api/assets/${asset.id}`],
        exact: true 
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/user/${asset.userId}/assets`],
        refetchType: 'active'
      });
      
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey as string[];
          return key.some(k => typeof k === 'string' && k.includes(asset.id));
        }
      });
      
      // Close dialogs
      setShowSaleForm(false);
      setIsDeleteDialogOpen(false);
      
      // Success toast
      toast({ 
        title: 'Sale recorded!', 
        description: `${asset.playerName || asset.title || 'Asset'} marked as sold` 
      });
      
      // Redirect
      setTimeout(() => {
        navigate('/portfolio');
      }, 100);
    },
    onError: (error: any) => {
      console.error('Failed to record sale:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to record sale. Please try again.', 
        variant: 'destructive' 
      });
    }
  });
  
  // Flag to determine if this asset is PSA-graded (used for special handling in the edit dialog)
  const isPsaGraded = asset.grader === 'PSA' && !!asset.certNumber;
  
  // Check if this is a consignment asset (handles multiple possible values)
  const isConsignmentAsset = asset.ownershipStatus === 'consignment' || 
                             (asset.ownershipStatus as any) === 'Cons' ||
                             !!asset.consignmentId;
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open asset actions menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          
          {/* Owner-only actions: Edit, Add to Sale, Delete */}
          {isOwner && (
            <>
              {/* Edit Asset Option */}
              <DropdownMenuItem onClick={handleEditClick}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Asset
              </DropdownMenuItem>
              
              {/* Add to Sale Option */}
              <DropdownMenuItem disabled onClick={onReview}>
                <DollarSign className="h-4 w-4 mr-2" />
                Add to Sale
              </DropdownMenuItem>
            </>
          )}
          
          {/* Refresh Sales Option - Available to everyone */}
          <DropdownMenuItem 
            onClick={handleRefreshSales}
            disabled={refreshSalesMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshSalesMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Sales
          </DropdownMenuItem>
          
          {/* Delete option - Only for owners */}
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              
              {/* Delete Asset Option - Different behavior for consignments */}
              {isConsignmentAsset ? (
                <DropdownMenuItem
                  onClick={() => {
                    const consignmentId = asset.consignmentId;
                    if (consignmentId) {
                      navigate(`/consignments/${consignmentId}`);
                    } else {
                      navigate('/consignments');
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete via Consignment →
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    if (onDelete) {
                      onDelete();
                    } else {
                      setIsDeleteDialogOpen(true);
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Asset
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Edit Dialog - will only render when open to avoid unnecessary renders */}
      {isEditDialogOpen && (
        <VerifiedEditAssetDialog
          asset={asset}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
      
      {/* Manual Edit Dialog - for manually added assets */}
      {isManualEditDialogOpen && (
        <ManualEditAssetDialog
          asset={asset}
          open={isManualEditDialogOpen}
          onOpenChange={setIsManualEditDialogOpen}
        />
      )}

      {/* Delete confirmation dialog with reason selection */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
          // Reset state when dialog closes
          setDeleteReason('');
          setShowSaleForm(false);
          setSaleData({
            platform: '',
            price: '',
            date: new Date().toISOString().split('T')[0],
          });
          setValidationErrors({
            reason: false,
            platform: false,
            price: false,
          });
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Why are you removing this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This helps us understand your collection better
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Reason Selection */}
            <div className="space-y-2">
              <RadioGroup value={deleteReason} onValueChange={(value) => {
                setDeleteReason(value as 'sold' | 'mistake' | 'other');
                setShowSaleForm(value === 'sold');
                setValidationErrors({ ...validationErrors, reason: false }); // Clear error on selection
                // Reset sale form when switching away from "sold"
                if (value !== 'sold') {
                  setSaleData({
                    platform: '',
                    price: '',
                    date: new Date().toISOString().split('T')[0],
                  });
                  setValidationErrors({
                    reason: false,
                    platform: false,
                    price: false,
                  });
                }
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sold" id="sold" />
                  <Label htmlFor="sold" className="cursor-pointer">
                    Sold It
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mistake" id="mistake" />
                  <Label htmlFor="mistake" className="cursor-pointer">
                    Added by mistake
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="cursor-pointer">
                    Other reason
                  </Label>
                </div>
              </RadioGroup>
              {validationErrors.reason && (
                <p className="text-sm text-destructive">Please select a reason</p>
              )}
            </div>

            {/* Conditional Sale Form */}
            {showSaleForm && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Where did you sell it?</Label>
                  <RadioGroup value={saleData.platform} onValueChange={(value) => {
                    setSaleData({ ...saleData, platform: value as 'in_person' | 'ebay' | 'other' });
                    setValidationErrors({ ...validationErrors, platform: false }); // Clear error on selection
                  }}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="in_person" id="in_person" />
                      <Label htmlFor="in_person" className="cursor-pointer">
                        In Person
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ebay" id="ebay" />
                      <Label htmlFor="ebay" className="cursor-pointer">
                        eBay (sold outside platform)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other_platform" />
                      <Label htmlFor="other_platform" className="cursor-pointer">
                        Other
                      </Label>
                    </div>
                  </RadioGroup>
                  {validationErrors.platform && (
                    <p className="text-sm text-destructive">Please select where you sold it</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale_price">Sale Price</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    placeholder="0.00"
                    value={saleData.price}
                    onChange={(e) => {
                      setSaleData({ ...saleData, price: e.target.value });
                      setValidationErrors({ ...validationErrors, price: false }); // Clear error on change
                    }}
                    min="0"
                    step="0.01"
                    className={validationErrors.price ? 'border-destructive' : ''}
                  />
                  {validationErrors.price && (
                    <p className="text-sm text-destructive">Please enter a valid price greater than $0</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale_date">Sale Date</Label>
                  <DateInput
                    id="sale_date"
                    value={saleData.date}
                    onChange={(value) => setSaleData({ ...saleData, date: value || new Date().toISOString().split('T')[0] })}
                    maxDate={new Date()}
                  />
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending || manualSaleMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={(e) => {
                e.preventDefault(); // Prevent default form submission
                
                // Validation: Must select a reason
                if (!deleteReason) {
                  setValidationErrors({ ...validationErrors, reason: true });
                  return;
                }

                if (deleteReason === 'sold') {
                  // Validate platform selection
                  if (!saleData.platform) {
                    setValidationErrors({ ...validationErrors, platform: true });
                    return;
                  }

                  // Validate sale price
                  if (!saleData.price || parseFloat(saleData.price) <= 0) {
                    setValidationErrors({ ...validationErrors, price: true });
                    return;
                  }

                  manualSaleMutation.mutate();
                } else {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending || manualSaleMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {(deleteMutation.isPending || manualSaleMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {deleteReason === 'sold' ? 'Recording...' : 'Deleting...'}
                </>
              ) : (
                deleteReason === 'sold' ? 'Record Sale & Remove' : 'Remove Asset'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AssetActions;
