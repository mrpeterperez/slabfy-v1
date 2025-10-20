// 🤖 INTERNAL NOTE:
// Purpose: Side panel for bulk pricing adjustments (exact UI from consignment-settings-dialog.tsx)
// Exports: BulkPricingSidePanel
// Feature: my-consignments/assets-section
// Dependencies: @/components/ui, lucide-react

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, DollarSign, Percent, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface BulkPricingSidePanelProps {
  /**
   * Whether the side panel is open
   */
  isOpen: boolean;

  /**
   * Callback to close the panel
   */
  onClose: () => void;

  /**
   * Which sections to show: 'all' | 'list-only' | 'reserve-only' | 'split-only'
   */
  activeSection?: 'all' | 'list-only' | 'reserve-only' | 'split-only' | 'status-only';

  /**
   * Pricing mode: 'fixed' or 'market'
   */
  bulkPriceMode: 'fixed' | 'market';

  /**
   * Handler to change pricing mode
   */
  onPriceModeChange: (mode: 'fixed' | 'market') => void;

  /**
   * List percentage above market (0-200)
   */
  marketListPct: number;

  /**
   * Handler to change list percentage
   */
  onMarketListPctChange: (value: number) => void;

  /**
   * Reserve strategy: 'match' or 'percentage'
   */
  marketReserveMode: 'match' | 'percentage';

  /**
   * Handler to change reserve strategy
   */
  onMarketReserveModeChange: (mode: 'match' | 'percentage') => void;

  /**
   * Reserve percentage of market (50-150)
   */
  marketReservePct: number;

  /**
   * Handler to change reserve percentage
   */
  onMarketReservePctChange: (value: number) => void;

  /**
   * List price rounding step
   */
  listRoundStep: 1 | 5 | 10;

  /**
   * Handler to change list rounding
   */
  onListRoundStepChange: (value: 1 | 5 | 10) => void;

  /**
   * Reserve price rounding step
   */
  reserveRoundStep: 1 | 5;

  /**
   * Handler to change reserve rounding
   */
  onReserveRoundStepChange: (value: 1 | 5) => void;

  /**
   * Whether to apply list price in bulk update
   */
  bulkApplyList: boolean;

  /**
   * Handler to toggle list price application
   */
  onBulkApplyListChange: (value: boolean) => void;

  /**
   * Whether to apply reserve price in bulk update
   */
  bulkApplyReserve: boolean;

  /**
   * Handler to toggle reserve price application
   */
  onBulkApplyReserveChange: (value: boolean) => void;

  /**
   * Fixed list price for bulk update
   */
  bulkListPrice: number;

  /**
   * Handler to change fixed list price
   */
  onBulkListPriceChange: (value: number) => void;

  /**
   * Fixed reserve price for bulk update
   */
  bulkReservePrice: number;

  /**
   * Handler to change fixed reserve price
   */
  onBulkReservePriceChange: (value: number) => void;

  /**
   * Bulk split percentage (50-100)
   */
  bulkSplitPercentage: number;

  /**
   * Handler to change split percentage
   */
  onBulkSplitPercentageChange: (value: number) => void;

  /**
   * Bulk status value
   */
  bulkStatus: string;

  /**
   * Handler to change bulk status
   */
  onBulkStatusChange: (value: string) => void;

  /**
   * Callback when Apply button is clicked
   */
  onApply: () => void;

  /**
   * Callback when Reset to Defaults is clicked
   */
  onResetToDefaults: () => void;
}

/**
 * Side panel for bulk pricing adjustments
 * Exact same UI as consignment-settings-dialog.tsx pricing section
 * Slides in from right with backdrop
 */
export function BulkPricingSidePanel({
  isOpen,
  onClose,
  activeSection = 'all',
  bulkPriceMode,
  onPriceModeChange,
  marketListPct,
  onMarketListPctChange,
  marketReserveMode,
  onMarketReserveModeChange,
  marketReservePct,
  onMarketReservePctChange,
  listRoundStep,
  onListRoundStepChange,
  reserveRoundStep,
  onReserveRoundStepChange,
  bulkApplyList,
  onBulkApplyListChange,
  bulkApplyReserve,
  onBulkApplyReserveChange,
  bulkListPrice,
  onBulkListPriceChange,
  bulkReservePrice,
  onBulkReservePriceChange,
  bulkSplitPercentage,
  onBulkSplitPercentageChange,
  bulkStatus,
  onBulkStatusChange,
  onApply,
  onResetToDefaults
}: BulkPricingSidePanelProps) {
  const listPercentOptions = [0, 10, 20, 40, 60, 100];
  const splitOptions = [90, 92, 95, 97];
  const houseShare = Math.max(0, Math.min(100, 100 - (bulkSplitPercentage || 0)));

  // Local state for fixed price inputs
  const [localListPrice, setLocalListPrice] = useState(bulkListPrice?.toString() || '');
  const [localReservePrice, setLocalReservePrice] = useState(bulkReservePrice?.toString() || '');

  // Track initial state when panel opens for change detection
  const [initialState, setInitialState] = useState({
    bulkPriceMode,
    marketListPct,
    marketReserveMode,
    marketReservePct,
    bulkListPrice,
    bulkReservePrice,
    bulkSplitPercentage,
    bulkStatus,
    listRoundStep,
    reserveRoundStep
  });

  // Capture initial state when panel opens
  useEffect(() => {
    if (isOpen) {
      setInitialState({
        bulkPriceMode,
        marketListPct,
        marketReserveMode,
        marketReservePct,
        bulkListPrice,
        bulkReservePrice,
        bulkSplitPercentage,
        bulkStatus,
        listRoundStep,
        reserveRoundStep
      });
    }
  }, [isOpen]); // Only capture when panel opens

  // Compute if anything changed
  const hasChanges = 
    bulkPriceMode !== initialState.bulkPriceMode ||
    marketListPct !== initialState.marketListPct ||
    marketReserveMode !== initialState.marketReserveMode ||
    marketReservePct !== initialState.marketReservePct ||
    bulkListPrice !== initialState.bulkListPrice ||
    bulkReservePrice !== initialState.bulkReservePrice ||
    bulkSplitPercentage !== initialState.bulkSplitPercentage ||
    bulkStatus !== initialState.bulkStatus ||
    listRoundStep !== initialState.listRoundStep ||
    reserveRoundStep !== initialState.reserveRoundStep;

  // Sync with prop changes
  useEffect(() => {
    setLocalListPrice(bulkListPrice?.toString() || '');
  }, [bulkListPrice]);

  useEffect(() => {
    setLocalReservePrice(bulkReservePrice?.toString() || '');
  }, [bulkReservePrice]);

  // Wrap reset to update initial state after reset completes
  const handleResetToDefaults = () => {
    onResetToDefaults();
    // Update initial state after a tick so new values become the baseline
    setTimeout(() => {
      setInitialState({
        bulkPriceMode,
        marketListPct,
        marketReserveMode,
        marketReservePct,
        bulkListPrice,
        bulkReservePrice,
        bulkSplitPercentage,
        bulkStatus,
        listRoundStep,
        reserveRoundStep
      });
    }, 0);
  };

  // Handle fixed price changes
  const handleListPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalListPrice(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onBulkListPriceChange(num);
    }
  };

  const handleReservePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalReservePrice(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onBulkReservePriceChange(num);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-card border-l border-border z-[101]',
          'animate-in slide-in-from-right duration-300',
          'overflow-y-auto'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div>
            <h2 id="panel-title" className="text-lg font-semibold">
              {activeSection === 'list-only' && 'List Price'}
              {activeSection === 'reserve-only' && 'Reserve Price'}
              {activeSection === 'split-only' && 'Split %'}
              {activeSection === 'status-only' && 'Change Status'}
              {activeSection === 'all' && 'Bulk Pricing Adjustments'}
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* LIST PRICE ONLY - Show pricing mode toggle + list price controls */}
          {activeSection === 'list-only' && (
            <>
              {/* Pricing Mode Toggle */}
              <div className="space-y-3">
                <Label className="text-base font-medium">List Price Mode</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={bulkPriceMode === 'fixed' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => onPriceModeChange('fixed')}
                    className="flex-1 h-12"
                  >
                    Fixed Values
                  </Button>
                  <Button
                    type="button"
                    variant={bulkPriceMode === 'market' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => onPriceModeChange('market')}
                    className="flex-1 h-12"
                  >
                    Market-Based
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {bulkPriceMode === 'market'
                    ? "Calculate list price as a percentage above market value."
                    : 'Set a fixed list price for all selected assets.'}
                </p>
              </div>

              {/* FIXED MODE - List Price Input */}
              {bulkPriceMode === 'fixed' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">List Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={localListPrice}
                      onChange={handleListPriceChange}
                      placeholder="0.00"
                      className="pl-9"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              {/* MARKET MODE - List Price Controls */}
              {bulkPriceMode === 'market' && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">List Price %</Label>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={bulkApplyList}
                        onCheckedChange={(checked) => onBulkApplyListChange(checked === true)}
                      />
                      <Label className="font-medium">% above market</Label>
                    </div>

                    {bulkApplyList && (
                      <>
                        {/* Quick Select Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {listPercentOptions.map((percent) => (
                            <Button
                              key={percent}
                              type="button"
                              variant={marketListPct === percent ? 'default' : 'outline'}
                              size="default"
                              onClick={() => onMarketListPctChange(percent)}
                              className="min-w-[80px] h-10"
                            >
                              +{percent}%
                            </Button>
                          ))}
                        </div>

                        {/* Custom Slider */}
                        <div className="space-y-3">
                          <Slider
                            value={[marketListPct]}
                            onValueChange={(v) => onMarketListPctChange(v[0])}
                            max={200}
                            min={0}
                            step={5}
                            className="w-full"
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">0%</span>
                            <Badge variant="secondary">+{marketListPct}%</Badge>
                            <span className="text-sm text-muted-foreground">200%</span>
                          </div>
                        </div>

                        {/* List Rounding */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Round list prices to:
                          </Label>
                          <div className="flex gap-2">
                            {[1, 5, 10].map((value) => (
                              <Button
                                key={value}
                                type="button"
                                variant={listRoundStep === value ? 'default' : 'outline'}
                                size="default"
                                onClick={() => onListRoundStepChange(value as 1 | 5 | 10)}
                                className="flex-1 h-10"
                              >
                                ${value}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* RESERVE ONLY - Show pricing mode toggle + reserve controls */}
          {activeSection === 'reserve-only' && (
            <>
              {/* Pricing Mode Toggle */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Reserve Price Mode</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={bulkPriceMode === 'fixed' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => onPriceModeChange('fixed')}
                    className="flex-1 h-12"
                  >
                    Fixed Values
                  </Button>
                  <Button
                    type="button"
                    variant={bulkPriceMode === 'market' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => onPriceModeChange('market')}
                    className="flex-1 h-12"
                  >
                    Market-Based
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {bulkPriceMode === 'market'
                    ? "Calculate reserve price based on market value."
                    : 'Set a fixed reserve price for all selected assets.'}
                </p>
              </div>

              {/* FIXED MODE - Reserve Price Input */}
              {bulkPriceMode === 'fixed' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reserve Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={localReservePrice}
                      onChange={handleReservePriceChange}
                      placeholder="0.00"
                      className="pl-9"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              {/* MARKET MODE - Reserve Strategy */}
              {bulkPriceMode === 'market' && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">Reserve Price %</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={bulkApplyReserve}
                      onCheckedChange={(checked) => onBulkApplyReserveChange(checked === true)}
                    />
                    <Label className="font-medium">Enable reserve pricing</Label>
                  </div>

                  {bulkApplyReserve && (
                    <div className="space-y-4">
                      {/* Reserve Strategy Toggle */}
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={marketReserveMode === 'match' ? 'default' : 'outline'}
                          size="default"
                          onClick={() => onMarketReserveModeChange('match')}
                          className="flex-1 h-11"
                        >
                          Match market
                        </Button>
                        <Button
                          type="button"
                          variant={marketReserveMode === 'percentage' ? 'default' : 'outline'}
                          size="default"
                          onClick={() => onMarketReserveModeChange('percentage')}
                          className="flex-1 h-11"
                        >
                          % of market
                        </Button>
                      </div>

                      {/* Reserve Percentage Slider */}
                      {marketReserveMode === 'percentage' && (
                        <div className="space-y-3">
                          <Slider
                            value={[marketReservePct]}
                            onValueChange={(v) => onMarketReservePctChange(v[0])}
                            max={150}
                            min={50}
                            step={5}
                            className="w-full"
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">50%</span>
                            <Badge variant="secondary">{marketReservePct}%</Badge>
                            <span className="text-sm text-muted-foreground">150%</span>
                          </div>
                        </div>
                      )}

                      {/* Reserve Rounding */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Round reserve prices to:
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={reserveRoundStep === 1 ? 'default' : 'outline'}
                            size="default"
                            onClick={() => onReserveRoundStepChange(1)}
                            className="flex-1 h-10"
                          >
                            $1
                          </Button>
                          <Button
                            type="button"
                            variant={reserveRoundStep === 5 ? 'default' : 'outline'}
                            size="default"
                            onClick={() => onReserveRoundStepChange(5)}
                            className="flex-1 h-10"
                          >
                            $5
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Pricing Mode - only show when activeSection is 'all' */}
          {activeSection === 'all' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Pricing Strategy</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={bulkPriceMode === 'market' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => onPriceModeChange('market')}
                  className="flex-1 h-12"
                >
                  Market-Based
                </Button>
                <Button
                  type="button"
                  variant={bulkPriceMode === 'fixed' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => onPriceModeChange('fixed')}
                  className="flex-1 h-12"
                >
                  Fixed Pricing
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {bulkPriceMode === 'market'
                  ? "Market mode computes pricing from each item's market comps."
                  : 'Use fixed pricing rules for all items.'}
              </p>
            </div>
          )}

          {/* Split % Controls - show when 'split-only' */}
          {activeSection === 'split-only' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-medium">Consignor Split</Label>
                  <div className="ml-auto flex items-center gap-3">
                    <Badge variant="secondary">{bulkSplitPercentage}%</Badge>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">You get {houseShare}%</span>
                  </div>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex gap-2 mb-4">
                  {splitOptions.map((rate) => (
                    <Button
                      key={rate}
                      type="button"
                      variant={bulkSplitPercentage === rate ? "default" : "outline"}
                      size="default"
                      onClick={() => onBulkSplitPercentageChange(rate)}
                      className="flex-1 h-11"
                    >
                      {rate}%
                    </Button>
                  ))}
                </div>

                {/* Slider for fine-tuning */}
                <div className="space-y-3">
                  <Slider 
                    value={[bulkSplitPercentage]} 
                    onValueChange={(v) => onBulkSplitPercentageChange(v[0])} 
                    max={100} 
                    min={50} 
                    step={1} 
                    className="w-full" 
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Seller gets {bulkSplitPercentage}% of the sale price. You get {houseShare}%.
                </p>
              </div>
            </div>
          )}

          {/* Status Controls - show when 'status-only' */}
          {activeSection === 'status-only' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-medium">Change Status</Label>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select new status for all selected assets:</Label>
                  <Select value={bulkStatus} onValueChange={onBulkStatusChange}>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      sideOffset={5} 
                      className="z-[9999]"
                      align="start"
                      avoidCollisions={true}
                      sticky="always"
                    >
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="text-sm text-muted-foreground mt-4">
                    All selected assets will be updated to <strong className="capitalize">{bulkStatus.replace('_', ' ')}</strong> status.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4 space-y-2">
          {/* Only show Reset for market mode and split sections, hide for fixed pricing */}
          {activeSection !== 'status-only' && 
           !(bulkPriceMode === 'fixed' && (activeSection === 'list-only' || activeSection === 'reserve-only')) && (
            <Button
              onClick={handleResetToDefaults}
              variant="outline"
              className="w-full"
            >
              Reset to Defaults
            </Button>
          )}
          <Button
            onClick={onApply}
            disabled={!hasChanges}
            className="w-full"
          >
            Apply Changes
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}
