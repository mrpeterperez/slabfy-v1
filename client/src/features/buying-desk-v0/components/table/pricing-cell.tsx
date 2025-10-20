// 🤖 INTERNAL NOTE:
// Purpose: Price input cell component with controlled debounced updates
// Exports: PricingCell component
// Feature: buying-desk-v0
// Dependencies: ui components, react hooks

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface PricingCellProps {
  itemId: string;
  assetId?: string;
  currentPrice: number;
  isEditing: boolean;
  isPurchased: boolean;
  onPriceUpdate: (itemId: string, price: number, assetId?: string) => void;
  formatCurrency: (amount: number) => string;
}

export function PricingCell({
  itemId,
  assetId,
  currentPrice,
  isEditing,
  isPurchased,
  onPriceUpdate,
  formatCurrency
}: PricingCellProps) {
  const [inputValue, setInputValue] = useState(currentPrice.toFixed(2));
  const [hasChanges, setHasChanges] = useState(false);

  // Reset input when current price changes externally
  useEffect(() => {
    if (!hasChanges) {
      setInputValue(currentPrice.toFixed(2));
    }
  }, [currentPrice, hasChanges]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setHasChanges(true);
    // Do not call server on every keystroke; commit on blur
  };

  const handleBlur = () => {
    const num = parseFloat(inputValue);
    const validPrice = !isNaN(num) ? Math.max(0, num) : 0;
    
    setInputValue(validPrice.toFixed(2));
    setHasChanges(false);
    onPriceUpdate(itemId, validPrice, assetId);
  };

  if (!isEditing || isPurchased) {
    return (
      <div className={`font-medium text-sm ${isPurchased ? 'text-success font-semibold' : 'text-foreground'}`}>
        {formatCurrency(currentPrice)}
      </div>
    );
  }

  return (
    <div className="relative w-24 ml-auto">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
        $
      </span>
      <Input 
        type="text" 
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleBlur}
        className="h-10 text-sm font-medium text-center pl-6 pr-2 border bg-card text-foreground w-24 placeholder:text-muted-foreground/50" 
        placeholder="0.00" 
      />
    </div>
  );
}