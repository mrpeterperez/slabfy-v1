// 🤖 INTERNAL NOTE:
// Purpose: Smart Auto-Accept Rules section for buying desk settings
// Exports: AutoAcceptRulesSection component
// Feature: buying-desk-v0

import { TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AutoAcceptRulesSectionProps {
  form: any;
  watchedValues: any;
}

export function AutoAcceptRulesSection({ form, watchedValues }: AutoAcceptRulesSectionProps) {
  const liquidityOptions: Array<'fire' | 'hot' | 'warm' | 'cool' | 'cold'> = ['fire', 'hot', 'warm', 'cool', 'cold'];
  const confidenceOptions = [30, 40, 50, 60, 70];
  const marketValueOptions = [5, 10, 25, 50, 100];

  return (
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
  );
}
