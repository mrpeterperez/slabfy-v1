// Purpose: Full-screen dialog for consignment default settings following add-collection-dialog UI
// Feature: my-consignments
import React, { useEffect, useRef } from "react";
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Settings, TrendingUp, Percent, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ConsignmentSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const settingsSchema = z.object({
  pricingMode: z.enum(['fixed', 'market']),
  listPercentAboveMarket: z.number().min(0).max(200),
  enableReserveStrategy: z.boolean(),
  reserveStrategy: z.enum(['match', 'percentage']),
  reservePercentOfMarket: z.number().min(50).max(150),
  listRounding: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  reserveRounding: z.union([z.literal(1), z.literal(5)]),
  defaultSplitPercentage: z.number().min(50).max(100),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export const ConsignmentSettingsDialog = ({ isOpen, onClose }: ConsignmentSettingsDialogProps) => {
  const { toast } = useToast();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      pricingMode: 'market' as const,
      listPercentAboveMarket: 20,
      enableReserveStrategy: true,
      reserveStrategy: 'match' as const,
      reservePercentOfMarket: 100,
      listRounding: 5 as const,
      reserveRounding: 1 as const,
      defaultSplitPercentage: 95,
    }
  });

  const watchedValues = form.watch();
  const houseShare = Math.max(0, Math.min(100, 100 - (watchedValues.defaultSplitPercentage || 0)));

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
    // Prefer camelCase key but fall back to legacy hyphenated key for compatibility
    const savedSettings = localStorage.getItem('consignmentSettings') || localStorage.getItem('consignment-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        form.reset({
          pricingMode: parsed.pricingMode ?? 'market',
          listPercentAboveMarket: parsed.listPercentAboveMarket ?? 20,
          enableReserveStrategy: parsed.enableReserveStrategy ?? true,
          reserveStrategy: parsed.reserveStrategy ?? 'match',
          reservePercentOfMarket: parsed.reservePercentOfMarket ?? 100,
          listRounding: parsed.listRounding ?? 5,
          reserveRounding: parsed.reserveRounding ?? 1,
          defaultSplitPercentage: parsed.defaultSplitPercentage ?? 95,
        });
      } catch (error) {
        console.error('Error loading consignment settings:', error);
      }
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSave = (data: SettingsFormData) => {
    const settings = {
      ...data,
      lastUpdated: new Date().toISOString(),
    };

  // Write to both keys for forward/backward compatibility across modules
  const payload = JSON.stringify(settings);
  localStorage.setItem('consignmentSettings', payload);
  localStorage.setItem('consignment-settings', payload);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('consignmentSettingsChanged', { detail: settings }));

    toast({ 
      title: "Settings Saved", 
      description: `Pricing: ${data.pricingMode === 'market' ? `Market +${data.listPercentAboveMarket}%` : 'Fixed'}, Split: ${data.defaultSplitPercentage}%` 
    });

    handleClose();
  };

  // Quick select options
  const listPercentOptions = [0, 10, 20, 40, 60, 100];
  const splitOptions = [90, 92, 95, 97];
  const roundingOptions = [1, 5, 10] as const;

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
            <h1 className="text-2xl font-semibold font-heading text-foreground">Default Consignment Settings</h1>
          </div>

          <Form {...form}>
            <Accordion type="multiple" defaultValue={["pricing-mode"]} className="space-y-2">
              {/* Pricing Mode */}
              <AccordionItem value="pricing-mode">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-medium">Pricing Mode</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <FormField
                    control={form.control}
                    name="pricingMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              variant={field.value === 'fixed' ? "default" : "outline"}
                              size="lg"
                              onClick={() => field.onChange('fixed')}
                              className="flex-1 h-12"
                              data-testid="button-pricing-fixed"
                            >
                              Fixed values
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === 'market' ? "default" : "outline"}
                              size="lg"
                              onClick={() => field.onChange('market')}
                              className="flex-1 h-12"
                              data-testid="button-pricing-market"
                            >
                              Market-based
                            </Button>
                          </div>
                        </FormControl>
                        <p className="text-sm text-muted-foreground mt-2">
                          {field.value === 'market' 
                            ? "Market mode computes pricing from each item's market comps." 
                            : "Use fixed pricing rules for all items."}
                        </p>
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Market-Based Controls */}
              {watchedValues.pricingMode === 'market' && (
                <>
                  {/* List Price Strategy */}
                  <AccordionItem value="list-price">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <span className="text-lg font-medium">List Price Strategy</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Checkbox checked={true} disabled className="data-[state=checked]:bg-primary" />
                          <Label className="font-medium">List: % above market</Label>
                        </div>

                        {/* Quick Select Buttons */}
                        <FormField
                          control={form.control}
                          name="listPercentAboveMarket"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="flex gap-2 flex-wrap">
                                  {listPercentOptions.map((percent) => (
                                    <Button
                                      key={percent}
                                      type="button"
                                      variant={field.value === percent ? "default" : "outline"}
                                      size="default"
                                      onClick={() => field.onChange(percent)}
                                      className="min-w-[80px] h-10"
                                      data-testid={`button-list-percent-${percent}`}
                                    >
                                      +{percent}%
                                    </Button>
                                  ))}
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* Custom Slider */}
                        <FormField
                          control={form.control}
                          name="listPercentAboveMarket"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="space-y-3">
                                  <Slider 
                                    value={[field.value]} 
                                    onValueChange={(v) => field.onChange(v[0])} 
                                    max={200} 
                                    min={0} 
                                    step={5} 
                                    className="w-full" 
                                    data-testid="slider-list-percent"
                                  />
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">0%</span>
                                    <Badge variant="secondary" data-testid="badge-list-percent">+{field.value}%</Badge>
                                    <span className="text-sm text-muted-foreground">200%</span>
                                  </div>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* List Rounding */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Round list prices to:</Label>
                          <FormField
                            control={form.control}
                            name="listRounding"
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
                                        data-testid={`button-list-rounding-${value}`}
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
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Reserve Strategy */}
                  <AccordionItem value="reserve">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        <span className="text-lg font-medium">Reserve Strategy</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <FormField
                        control={form.control}
                        name="enableReserveStrategy"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 mb-4">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={(checked) => field.onChange(checked === true)}
                                data-testid="checkbox-reserve-strategy"
                              />
                            </FormControl>
                            <FormLabel className="font-medium">Enable reserve strategy</FormLabel>
                          </FormItem>
                        )}
                      />

                      {watchedValues.enableReserveStrategy && (
                        <div className="space-y-4">
                          {/* Reserve Strategy Toggle */}
                          <FormField
                            control={form.control}
                            name="reserveStrategy"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="flex gap-3">
                                    <Button
                                      type="button"
                                      variant={field.value === 'match' ? "default" : "outline"}
                                      size="default"
                                      onClick={() => field.onChange('match')}
                                      className="flex-1 h-11"
                                      data-testid="button-reserve-match"
                                    >
                                      Match market
                                    </Button>
                                    <Button
                                      type="button"
                                      variant={field.value === 'percentage' ? "default" : "outline"}
                                      size="default"
                                      onClick={() => field.onChange('percentage')}
                                      className="flex-1 h-11"
                                      data-testid="button-reserve-percentage"
                                    >
                                      % of market
                                    </Button>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* Reserve Percentage Slider */}
                          {watchedValues.reserveStrategy === 'percentage' && (
                            <FormField
                              control={form.control}
                              name="reservePercentOfMarket"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="space-y-3">
                                      <Slider 
                                        value={[field.value]} 
                                        onValueChange={(v) => field.onChange(v[0])} 
                                        max={150} 
                                        min={50} 
                                        step={5} 
                                        className="w-full" 
                                        data-testid="slider-reserve-percent"
                                      />
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">50%</span>
                                        <Badge variant="secondary" data-testid="badge-reserve-percent">{field.value}%</Badge>
                                        <span className="text-sm text-muted-foreground">150%</span>
                                      </div>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Reserve Rounding */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Round reserve prices to:</Label>
                            <FormField
                              control={form.control}
                              name="reserveRounding"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant={field.value === 1 ? "default" : "outline"}
                                        size="default"
                                        onClick={() => field.onChange(1)}
                                        className="flex-1 h-10"
                                        data-testid="button-reserve-rounding-1"
                                      >
                                        $1
                                      </Button>
                                      <Button
                                        type="button"
                                        variant={field.value === 5 ? "default" : "outline"}
                                        size="default"
                                        onClick={() => field.onChange(5)}
                                        className="flex-1 h-10"
                                        data-testid="button-reserve-rounding-5"
                                      >
                                        $5
                                      </Button>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </>
              )}

              {/* Default Split Percentage */}
              <AccordionItem value="split">
                <AccordionTrigger>
                  <div className="flex items-center gap-2 w-full">
                    <Percent className="h-5 w-5 text-muted-foreground" />
                    <span className="text-lg font-medium">Default Consignor Split</span>
                    <div className="ml-auto flex items-center gap-3">
                      <Badge variant="secondary" data-testid="badge-split-percent">{watchedValues.defaultSplitPercentage}%</Badge>
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">You get {houseShare}%</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {/* Quick Select Buttons */}
                    <FormField
                      control={form.control}
                      name="defaultSplitPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex gap-2">
                              {splitOptions.map((rate) => (
                                <Button
                                  key={rate}
                                  type="button"
                                  variant={field.value === rate ? "default" : "outline"}
                                  size="default"
                                  onClick={() => field.onChange(rate)}
                                  className="flex-1 h-11"
                                  data-testid={`button-split-${rate}`}
                                >
                                  {rate}%
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
                      name="defaultSplitPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-3">
                              <Slider 
                                value={[field.value]} 
                                onValueChange={(v) => field.onChange(v[0])} 
                                max={100} 
                                min={50} 
                                step={1} 
                                className="w-full" 
                                data-testid="slider-split-percent"
                              />
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>50%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <p className="text-sm text-muted-foreground">
                      Used as the default consignor split for new consignments. Seller gets {watchedValues.defaultSplitPercentage}%.
                    </p>
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

export default ConsignmentSettingsDialog;