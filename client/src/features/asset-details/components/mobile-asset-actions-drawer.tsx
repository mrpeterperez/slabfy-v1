// 🤖 INTERNAL NOTE (LLM):
// Purpose: Mobile bottom drawer for asset actions
// Exports: MobileAssetActionsDrawer component
// Feature: asset-details
// Dependencies: react, lucide-react, @/components/ui

import { createPortal } from 'react-dom';
import { X, Edit, DollarSign, RefreshCw, Trash } from 'lucide-react';
import { Asset } from '@shared/schema';

interface MobileAssetActionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  isOwner?: boolean;
  isSold?: boolean;
  onEdit: () => void;
  onRefreshSales: () => void;
  onDelete: () => void;
  onAddToSale?: () => void;
  isRefreshing?: boolean;
}

export function MobileAssetActionsDrawer({
  isOpen,
  onClose,
  asset,
  isOwner = true,
  isSold = false,
  onEdit,
  onRefreshSales,
  onDelete,
  onAddToSale,
  isRefreshing = false,
}: MobileAssetActionsDrawerProps) {
  // Check if this is a consignment asset
  const isConsignmentAsset = asset.ownershipStatus === 'consignment' || 
                             (asset.ownershipStatus as any) === 'Cons' ||
                             !!asset.consignmentId;

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    onClose();
    // Small delay to let drawer close animation finish
    setTimeout(action, 150);
  };

  // Render drawer using portal to break out of any container constraints
  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="lg:hidden fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-[9999] bg-background rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle bar */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pb-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Actions</h2>
            <button
              onClick={onClose}
              className="min-w-[48px] min-h-[48px] flex items-center justify-center -mr-3"
              aria-label="Close actions menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Actions List */}
        <div className="flex-shrink-0 py-4 space-y-2">
          {/* Edit Action - Owner only */}
          {isOwner && (
            <button
              onClick={() => handleAction(onEdit)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors min-h-[56px]"
            >
              <Edit className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="text-base font-medium text-left">Edit Asset</span>
            </button>
          )}

          {/* Add to Sale - Owner only (disabled) */}
          {isOwner && (
            <button
              disabled
              className="w-full flex items-center gap-4 px-5 py-4 opacity-50 cursor-not-allowed min-h-[56px]"
            >
              <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="text-base font-medium text-left">Add to Sale</span>
            </button>
          )}

          {/* Refresh Sales - Available to everyone */}
          <button
            onClick={() => handleAction(onRefreshSales)}
            disabled={isRefreshing}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors disabled:opacity-50 min-h-[56px]"
          >
            <RefreshCw className={`h-5 w-5 text-muted-foreground flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-base font-medium text-left">Refresh Sales</span>
          </button>

          {/* Delete Action - Owner only */}
          {isOwner && (
            <>
              <div className="py-2 px-5">
                <div className="border-t" />
              </div>
              
              <button
                onClick={() => handleAction(onDelete)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-destructive/10 transition-colors min-h-[56px]"
              >
                <Trash className="h-5 w-5 text-destructive flex-shrink-0" />
                <span className="text-base font-medium text-left text-destructive">
                  {isConsignmentAsset ? 'Delete via Consignment →' : 'Delete Asset'}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Bottom safe area padding */}
        <div className="h-4 flex-shrink-0" />
      </div>
    </>,
    document.body
  );
}
