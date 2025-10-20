// 🤖 INTERNAL NOTE:
// Purpose: Main buying desk settings dialog (refactored into modular sections)
// Exports: BuyingDeskSettingsDialog component
// Feature: buying-desk-v0

import React, { useEffect, useRef } from "react";
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Accordion } from "@/components/ui/accordion";

// Import modular sections
import { 
  BuyPriceSection, 
  AutoAcceptRulesSection, 
  HouseProfitSection, 
  ExitStrategySection 
} from "./buying-desk-settings";

interface BuyingDeskSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const settingsSchema = z.object({
  defaultOfferPercentage: z.number().min(1).max(200),
  housePercentage: z.number().min(0).max(100),
  priceRounding: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  autoDenyEnabled: z.boolean(),
  minLiquidityLevel: z.enum(['fire', 'hot', 'warm', 'cool', 'cold']),
  minConfidenceLevel: z.number().min(0).max(100),
  minMarketValue: z.number().min(0).max(10000),
  targetFlipDays: z.number().min(1).max(365),
  minRoiPercentage: z.number().min(0).max(1000),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export const BuyingDeskSettingsDialog = ({ isOpen, onClose }: BuyingDeskSettingsDialogProps) => {
  const { toast } = useToast();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      defaultOfferPercentage: 90,
      housePercentage: 10,
      priceRounding: 5 as const,
      autoDenyEnabled: true,
      minLiquidityLevel: 'cold' as const,
      minConfidenceLevel: 40,
      minMarketValue: 10,
      targetFlipDays: 14,
      minRoiPercentage: 50,
    }
  });

  const watchedValues = form.watch();

  // Focus close button when dialog opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      loadSettings();
    }
  }, [isOpen]);

  // Prevent background scroll
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('buyingDeskSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        form.reset({
          defaultOfferPercentage: parsed.defaultOfferPercentage ?? 90,
          housePercentage: parsed.housePercentage ?? 10,
          priceRounding: parsed.priceRounding ?? 5,
          autoDenyEnabled: parsed.autoDenyEnabled ?? true,
          minLiquidityLevel: parsed.minLiquidityLevel ?? 'cold',
          minConfidenceLevel: parsed.minConfidenceLevel ?? 40,
          minMarketValue: parsed.minMarketValue ?? 10,
          targetFlipDays: parsed.targetFlipDays ?? 14,
          minRoiPercentage: parsed.minRoiPercentage ?? 50,
        });
      } catch (error) {
        console.error('Error loading buying desk settings:', error);
      }
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSave = async (data: SettingsFormData) => {
    try {
      const settings = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };

      // Save to localStorage
      localStorage.setItem('buyingDeskSettings', JSON.stringify(settings));
      
      // Save to database via API
      const response = await fetch('/api/buying-desk/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          defaultOfferPercentage: data.defaultOfferPercentage.toString(),
          housePercentage: data.housePercentage.toString(),
          priceRounding: data.priceRounding,
          autoDenyEnabled: data.autoDenyEnabled,
          minLiquidityLevel: data.minLiquidityLevel,
          minConfidenceLevel: data.minConfidenceLevel,
          minMarketValue: data.minMarketValue.toString(),
          targetFlipDays: data.targetFlipDays,
          minRoiPercentage: data.minRoiPercentage.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings to database');
      }
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('buyingDeskSettingsChanged', { detail: settings }));

      toast({ 
        title: "Settings Saved", 
        description: `Buy: ${data.defaultOfferPercentage}% of market, House: ${data.housePercentage}%, Auto-deny: ${data.autoDenyEnabled ? 'ON' : 'OFF'}` 
      });

      handleClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  return createPortal((
    <div className="fixed inset-0 z-[105] bg-background text-foreground" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          aria-label="Close dialog"
          ref={closeButtonRef}
          data-testid="button-close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>

        <Button
          size="lg"
          onClick={form.handleSubmit(onSave)}
          disabled={form.formState.isSubmitting}
          data-testid="button-save"
        >
          {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8 pb-24">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold font-heading text-foreground">Default Buying Desk Settings</h1>
          </div>

          <Form {...form}>
            <Accordion type="multiple" defaultValue={["buy-price"]} className="space-y-2">
              <BuyPriceSection form={form} watchedValues={watchedValues} />
              <AutoAcceptRulesSection form={form} watchedValues={watchedValues} />
              <HouseProfitSection form={form} watchedValues={watchedValues} />
              <ExitStrategySection form={form} watchedValues={watchedValues} />
            </Accordion>
          </Form>
        </div>
      </div>
    </div>
  ), document.body);
};

export default BuyingDeskSettingsDialog;
