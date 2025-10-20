// Purpose: Full-screen dialog for buying desk default settings - EXACT clone of consignment-settings-dialog.tsx
// Feature: buying-desk-v0
import React, { useEffect, useRef } from "react";
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Settings, DollarSign, Percent, TrendingDown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface BuyingDeskSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const settingsSchema = z.object({
  defaultOfferPercentage: z.number().min(1).max(200), // Allow 1-200% for flexibility
  housePercentage: z.number().min(0).max(100), // Allow 0-100% house cut
  priceRounding: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  autoDenyEnabled: z.boolean(),
  minLiquidityLevel: z.enum(['fire', 'hot', 'warm', 'cool', 'cold']),
  minConfidenceLevel: z.number().min(0).max(100), // Already good
  minMarketValue: z.number().min(0).max(10000), // Wider range for high-value cards
  targetFlipDays: z.number().min(1).max(365), // Up to 1 year
  minRoiPercentage: z.number().min(0).max(1000), // Allow crazy ROI targets
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
  const sellerShare = Math.max(0, Math.min(100, 100 - (watchedValues.housePercentage || 0)));

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

  // Quick select options
  const buyPercentOptions = [70, 80, 90, 95];
  const housePercentOptions = [5, 10, 15, 20];
  const liquidityOptions: Array<'fire' | 'hot' | 'warm' | 'cool' | 'cold'> = ['fire', 'hot', 'warm', 'cool', 'cold'];
  const confidenceOptions = [30, 40, 50, 60, 70];
  const marketValueOptions = [5, 10, 25, 50, 100];
  const flipDaysOptions = [7, 14, 21, 30];
  const roiOptions = [25, 50, 75, 100];

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

      {/* Content with extra bottom padding for easy scroll */}
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8 pb-24">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold font-heading text-foreground">Default Buying Desk Settings</h1>
          </div>

          <Form {...form}>
            <Accordion type="multiple" defaultValue={["buy-price"]} className="space-y-2">
              {/* Buy Price Strategy */}
              <AccordionItem value="buy-price">
                <AccordionTrigger>
                  <div className="flex items-center gap-2 w-full">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-medium">Buy Price Strategy</span>
                    <div className="ml-auto flex items-center gap-3">
                      <Badge variant="secondary" data-testid="badge-buy-percent">{watchedValues.defaultOfferPercentage}%</Badge>
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">of market value</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {/* Quick Select Buttons */}
                    <FormField
                      control={form.control}
                      name="defaultOfferPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex gap-2">
                              {buyPercentOptions.map((percent) => (
                                <Button
                                  key={percent}
                                  type="button"
                                  variant={field.value === percent ? "default" : "outline"}
                                  size="default"
                                  onClick={() => field.onChange(percent)}
                                  className="flex-1 h-11"
                                  data-testid={`button-buy-${percent}`}
                                >
                                  {percent}%
                                </Button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Slider for fine-tuning */}
                    <FormField
                      control={form.control}
                      name="defaultOfferPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Slider 
                                  value={[field.value]} 
                                  onValueChange={(v) => field.onChange(v[0])} 
                                  max={200} 
                                  min={1} 
                                  step={1} 
                                  className="flex-1" 
                                  data-testid="slider-buy-percent"
                                />
                                <div className="relative">
                                  <Input
                                    type="number"
                                    value={field.value}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val)) field.onChange(Math.max(1, Math.min(200, val)));
                                    }}
                                    className="w-20 pr-7"
                                    min={1}
                                    max={200}
                                    step={1}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                                </div>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>1%</span>
                                <span>200%</span>
                              </div>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Price Rounding */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Round buy prices to:</Label>
                      <FormField
                        control={form.control}
                        name="priceRounding"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex gap-2">
                                {[1, 5, 10].map((value) => (
                                  <Button
                                    key={value}
                                    type="button"
                                    variant={field.value === value ? "default" : "outline"}
                                    size="default"
                                    onClick={() => field.onChange(value as 1 | 5 | 10)}
                                    className="flex-1 h-10"
                                    data-testid={`button-rounding-${value}`}
                                  >
                                    ${value}
                                  </Button>
                                ))}
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Offer {watchedValues.defaultOfferPercentage}% of market value, rounded to nearest ${watchedValues.priceRounding}.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Smart Auto-Accept Rules */}
              <AccordionItem value="auto-accept">
                <AccordionTrigger>
                  <div className="flex items-center gap-2 w-full">
                    <TrendingDown className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-medium">Smart Auto-Accept Rules</span>
                    <div className="ml-auto flex items-center gap-3">
                      <Badge variant={watchedValues.autoDenyEnabled ? "default" : "secondary"}>
                        {watchedValues.autoDenyEnabled ? 'ON' : 'OFF'}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    {/* Enable Auto-Deny Toggle */}
                    <FormField
                      control={form.control}
                      name="autoDenyEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox 
                              checked={field.value} 
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                              data-testid="checkbox-auto-deny"
                            />
                          </FormControl>
                          <FormLabel className="font-medium">Enable smart filtering</FormLabel>
                        </FormItem>
                      )}
                    />

                    {watchedValues.autoDenyEnabled && (
                      <>
                        {/* Minimum Liquidity Level */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Minimum Liquidity Level</Label>
                          <FormField
                            control={form.control}
                            name="minLiquidityLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="flex gap-2 flex-wrap">
                                    {liquidityOptions.map((level) => (
                                      <Button
                                        key={level}
                                        type="button"
                                        variant={field.value === level ? "default" : "outline"}
                                        size="default"
                                        onClick={() => field.onChange(level)}
                                        className="flex-1 h-10 min-w-[70px]"
                                        data-testid={`button-liquidity-${level}`}
                                      >
                                        {level.charAt(0).toUpperCase() + level.slice(1)}
                                      </Button>
                                    ))}
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <p className="text-xs text-muted-foreground">
                            Auto-deny cards with lower liquidity than selected level
                          </p>
                        </div>

                        {/* Minimum Confidence Level */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Minimum Confidence Level</Label>
                          <FormField
                            control={form.control}
                            name="minConfidenceLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="flex gap-2 flex-wrap mb-3">
                                    {confidenceOptions.map((level) => (
                                      <Button
                                        key={level}
                                        type="button"
                                        variant={field.value === level ? "default" : "outline"}
                                        size="default"
                                        onClick={() => field.onChange(level)}
                                        className="flex-1 h-10 min-w-[60px]"
                                        data-testid={`button-confidence-${level}`}
                                      >
                                        {level}%
                                      </Button>
                                    ))}
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="minConfidenceLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                      <Slider 
                                        value={[field.value]} 
                                        onValueChange={(v) => field.onChange(v[0])} 
                                        max={100} 
                                        min={0} 
                                        step={1} 
                                        className="flex-1" 
                                      />
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          value={field.value}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) field.onChange(Math.max(0, Math.min(100, val)));
                                          }}
                                          className="w-20 pr-7"
                                          min={0}
                                          max={100}
                                          step={1}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>0%</span>
                                      <span>100%</span>
                                    </div>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <p className="text-xs text-muted-foreground">
                            Auto-deny cards with confidence below {watchedValues.minConfidenceLevel}%
                          </p>
                        </div>

                        {/* Minimum Market Value */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Minimum Market Value</Label>
                          <FormField
                            control={form.control}
                            name="minMarketValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="flex gap-2 flex-wrap mb-3">
                                    {marketValueOptions.map((value) => (
                                      <Button
                                        key={value}
                                        type="button"
                                        variant={field.value === value ? "default" : "outline"}
                                        size="default"
                                        onClick={() => field.onChange(value)}
                                        className="flex-1 h-10 min-w-[65px]"
                                        data-testid={`button-market-${value}`}
                                      >
                                        ${value}
                                      </Button>
                                    ))}
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="minMarketValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                      <Slider 
                                        value={[field.value]} 
                                        onValueChange={(v) => field.onChange(v[0])} 
                                        max={10000} 
                                        min={0} 
                                        step={5} 
                                        className="flex-1" 
                                      />
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
                                        <Input
                                          type="number"
                                          value={field.value}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) field.onChange(Math.max(0, Math.min(10000, val)));
                                          }}
                                          className="w-24 pl-6"
                                          min={0}
                                          max={10000}
                                          step={5}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                      <span>$0</span>
                                      <span>$10,000</span>
                                    </div>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <p className="text-xs text-muted-foreground">
                            Auto-deny cards with market value below ${watchedValues.minMarketValue}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* House Percentage */}
              <AccordionItem value="house">
                <AccordionTrigger>
                  <div className="flex items-center gap-2 w-full">
                    <Percent className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-medium">House Profit Margin</span>
                    <div className="ml-auto flex items-center gap-3">
                      <Badge variant="secondary" data-testid="badge-house-percent">{watchedValues.housePercentage}%</Badge>
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Seller gets {sellerShare}%</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {/* Quick Select Buttons */}
                    <FormField
                      control={form.control}
                      name="housePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex gap-2">
                              {housePercentOptions.map((percent) => (
                                <Button
                                  key={percent}
                                  type="button"
                                  variant={field.value === percent ? "default" : "outline"}
                                  size="default"
                                  onClick={() => field.onChange(percent)}
                                  className="flex-1 h-11"
                                  data-testid={`button-house-${percent}`}
                                >
                                  {percent}%
                                </Button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Slider for fine-tuning */}
                    <FormField
                      control={form.control}
                      name="housePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Slider 
                                  value={[field.value]} 
                                  onValueChange={(v) => field.onChange(v[0])} 
                                  max={100} 
                                  min={0} 
                                  step={1} 
                                  className="flex-1" 
                                  data-testid="slider-house-percent"
                                />
                                <div className="relative">
                                  <Input
                                    type="number"
                                    value={field.value}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val)) field.onChange(Math.max(0, Math.min(100, val)));
                                    }}
                                    className="w-20 pr-7"
                                    min={0}
                                    max={100}
                                    step={1}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                                </div>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>0%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <p className="text-sm text-muted-foreground">
                      You get {watchedValues.housePercentage}% profit margin. Seller gets {sellerShare}%.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Exit Strategy */}
              <AccordionItem value="exit">
                <AccordionTrigger>
                  <div className="flex items-center gap-2 w-full">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-medium">Exit Strategy Preferences</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    {/* Target Flip Days */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Target Flip Time (Days)</Label>
                      <FormField
                        control={form.control}
                        name="targetFlipDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex gap-2 flex-wrap mb-3">
                                {flipDaysOptions.map((days) => (
                                  <Button
                                    key={days}
                                    type="button"
                                    variant={field.value === days ? "default" : "outline"}
                                    size="default"
                                    onClick={() => field.onChange(days)}
                                    className="flex-1 h-10 min-w-[65px]"
                                    data-testid={`button-flip-${days}`}
                                  >
                                    {days}d
                                  </Button>
                                ))}
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="targetFlipDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Slider 
                                    value={[field.value]} 
                                    onValueChange={(v) => field.onChange(v[0])} 
                                    max={365} 
                                    min={1} 
                                    step={1} 
                                    className="flex-1" 
                                  />
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      value={field.value}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) field.onChange(Math.max(1, Math.min(365, val)));
                                      }}
                                      className="w-20 pr-6"
                                      min={1}
                                      max={365}
                                      step={1}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">d</span>
                                  </div>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>1 day</span>
                                  <span>365 days</span>
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Flag cards that may take longer than {watchedValues.targetFlipDays} days to sell
                      </p>
                    </div>

                    {/* Minimum ROI Percentage */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Minimum ROI Target (%)</Label>
                      <FormField
                        control={form.control}
                        name="minRoiPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex gap-2 flex-wrap mb-3">
                                {roiOptions.map((roi) => (
                                  <Button
                                    key={roi}
                                    type="button"
                                    variant={field.value === roi ? "default" : "outline"}
                                    size="default"
                                    onClick={() => field.onChange(roi)}
                                    className="flex-1 h-10 min-w-[65px]"
                                    data-testid={`button-roi-${roi}`}
                                  >
                                    {roi}%
                                  </Button>
                                ))}
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="minRoiPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Slider 
                                    value={[field.value]} 
                                    onValueChange={(v) => field.onChange(v[0])} 
                                    max={1000} 
                                    min={0} 
                                    step={5} 
                                    className="flex-1" 
                                  />
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      value={field.value}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) field.onChange(Math.max(0, Math.min(1000, val)));
                                      }}
                                      className="w-20 pr-7"
                                      min={0}
                                      max={1000}
                                      step={5}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                                  </div>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>0%</span>
                                  <span>1000%</span>
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Flag cards with expected ROI below {watchedValues.minRoiPercentage}%
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Form>
        </div>
      </div>
    </div>
  ), document.body);
};

export default BuyingDeskSettingsDialog;
