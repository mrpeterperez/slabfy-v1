// 🤖 INTERNAL NOTE:
// Purpose: Buy Price Strategy section for buying desk settings
// Exports: BuyPriceSection component
// Feature: buying-desk-v0

import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface BuyPriceSectionProps {
  form: any;
  watchedValues: any;
}

export function BuyPriceSection({ form, watchedValues }: BuyPriceSectionProps) {
  const buyPercentOptions = [70, 80, 90, 95];

  return (
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

          {/* Slider + Custom Input */}
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
  );
}
