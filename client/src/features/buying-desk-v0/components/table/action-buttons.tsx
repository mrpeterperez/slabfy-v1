// 🤖 INTERNAL NOTE:
// Purpose: Action buttons for table rows (add to cart, dropdown menu)
// Exports: TableRowActions component
// Feature: buying-desk-v0
// Dependencies: ui components, icons

import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink } from "lucide-react";
import { AddToCartIconButton } from "@/components/ui/add-to-cart-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface TableRowActionsProps {
  itemId: string;
  asset: any;
  status: string;
  isPurchased: boolean;
  onMoveToCart: () => void;
  onMoveToEvaluating: () => void;
  onViewAsset: () => void;
  onRemoveFromSession: () => void;
}

export function TableRowActions({
  itemId,
  asset,
  status,
  isPurchased,
  onMoveToCart,
  onMoveToEvaluating,
  onViewAsset,
  onRemoveFromSession
}: TableRowActionsProps) {
  if (isPurchased) {
    return <div />;
  }

  const isInCart = status === 'ready';

  return (
    <div className="flex items-center justify-end gap-2">
      <AddToCartIconButton 
        aria-label="Move to Buy List" 
        onClick={(e) => { 
          e.stopPropagation(); 
          onMoveToCart(); 
        }} 
        disabled={isInCart}
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0" 
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onViewAsset}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Asset
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={onMoveToEvaluating}>
            Move to Evaluating
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={onMoveToCart}>
            Move to Buy List
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="text-destructive" 
            onClick={onRemoveFromSession}
          >
            Remove from Session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}