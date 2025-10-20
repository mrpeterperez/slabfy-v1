// 🤖 INTERNAL NOTE:
// Purpose: Exit Strategy Preferences section for buying desk settings
// Exports: ExitStrategySection component
// Feature: buying-desk-v0

import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ExitStrategySectionProps {
  form: any;
  watchedValues: any;
}

export function ExitStrategySection({ form, watchedValues }: ExitStrategySectionProps) {
  const flipDaysOptions = [7, 14, 21, 30];
  const roiOptions = [25, 50, 75, 100];

  return (
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
  );
}
