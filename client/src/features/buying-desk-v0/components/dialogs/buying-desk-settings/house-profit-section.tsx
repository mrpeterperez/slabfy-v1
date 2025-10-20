// 🤖 INTERNAL NOTE:
// Purpose: House Profit Margin section for buying desk settings
// Exports: HouseProfitSection component
// Feature: buying-desk-v0

import { Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface HouseProfitSectionProps {
  form: any;
  watchedValues: any;
}

export function HouseProfitSection({ form, watchedValues }: HouseProfitSectionProps) {
  const housePercentOptions = [5, 10, 15, 20];
  const sellerShare = Math.max(0, Math.min(100, 100 - (watchedValues.housePercentage || 0)));

  return (
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

          {/* Slider + Custom Input */}
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
  );
}
