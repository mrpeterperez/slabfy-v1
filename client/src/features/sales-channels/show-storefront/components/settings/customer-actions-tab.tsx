// 🤖 INTERNAL NOTE:
// Purpose: Customer actions tab (feature toggles for storefront)
// Exports: CustomerActionsTab component
// Feature: sales-channels/show-storefront
// Dependencies: react-hook-form, shadcn form components

import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useCreateStorefrontSettings, useUpdateStorefrontSettings } from "../../hooks/use-storefront-settings";
import type { StorefrontSettings } from "@shared/schema";

interface CustomerActionsFormData {
  enableInventory: boolean;
  enableBuyingDesk: boolean;
  enablePriceChecker: boolean;
  enableCartHolds: boolean;
  defaultHoldMinutes: number;
  autoConfirmSales: boolean;
}

interface CustomerActionsTabProps {
  settings: StorefrontSettings | null | undefined;
  onPreviewChange?: (changes: Partial<StorefrontSettings>) => void;
}

export function CustomerActionsTab({ settings, onPreviewChange }: CustomerActionsTabProps) {
  const createSettings = useCreateStorefrontSettings();
  const updateSettings = useUpdateStorefrontSettings();
  const isInitialMount = useRef(true);

  const form = useForm<CustomerActionsFormData>({
    defaultValues: {
      enableInventory: settings?.enableInventory ?? true,
      enableBuyingDesk: settings?.enableBuyingDesk ?? true,
      enablePriceChecker: settings?.enablePriceChecker ?? true,
      enableCartHolds: settings?.enableCartHolds ?? true,
      defaultHoldMinutes: settings?.defaultHoldMinutes ?? 10,
      autoConfirmSales: settings?.autoConfirmSales ?? false,
    },
  });

  // Rehydrate on settings change so left panel values persist across reloads
  useEffect(() => {
    if (!settings) return;
    form.reset({
      enableInventory: settings.enableInventory ?? true,
      enableBuyingDesk: settings.enableBuyingDesk ?? true,
      enablePriceChecker: settings.enablePriceChecker ?? true,
      enableCartHolds: settings.enableCartHolds ?? true,
      defaultHoldMinutes: settings.defaultHoldMinutes ?? 10,
      autoConfirmSales: settings.autoConfirmSales ?? false,
    });
  }, [settings?.enableInventory, settings?.enableBuyingDesk, settings?.enablePriceChecker, settings?.enableCartHolds, settings?.defaultHoldMinutes, settings?.autoConfirmSales]);

  // Watch form changes and update preview
  const watchedValues = form.watch();
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (onPreviewChange) {
      onPreviewChange(watchedValues);
    }
  }, [watchedValues.enableInventory, watchedValues.enableBuyingDesk, watchedValues.enablePriceChecker, watchedValues.enableCartHolds, watchedValues.defaultHoldMinutes, watchedValues.autoConfirmSales]);

  return (
    <Form {...form}>
      <div className="space-y-8">
        <FormField
          control={form.control}
          name="enableInventory"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-foreground text-sm">View Inventory</FormLabel>
                  <FormDescription className="text-xs">
                    Allow customers to browse your available cards
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </div>
              <hr className="mt-4" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableBuyingDesk"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-foreground text-sm">Buying Desk</FormLabel>
                  <FormDescription className="text-xs">
                    Customers can scan their cards to get instant buy offers
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </div>
              <hr className="mt-4" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enablePriceChecker"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-foreground text-sm">Price Checker</FormLabel>
                  <FormDescription className="text-xs">
                    Customers can check current market prices for cards
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </div>
              <hr className="mt-4" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableCartHolds"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-foreground text-sm">Cart Holds</FormLabel>
                  <FormDescription className="text-xs">
                    Allow customers to temporarily hold items in their cart
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </div>
              <hr className="mt-4" />
            </FormItem>
          )}
        />

        {form.watch("enableCartHolds") && (
          <FormField
            control={form.control}
            name="defaultHoldMinutes"
            render={({ field }) => (
              <FormItem className="pl-4">
                <FormLabel className="text-foreground text-sm">Hold Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  How long items are held in cart before expiring (5-60 minutes)
                </FormDescription>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="autoConfirmSales"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-foreground text-sm">Auto-Confirm Sales</FormLabel>
                  <FormDescription className="text-xs">
                    Automatically mark items as sold when cart hold expires
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </div>
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}
