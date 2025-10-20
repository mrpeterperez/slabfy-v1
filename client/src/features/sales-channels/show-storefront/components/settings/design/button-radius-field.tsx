// 🤖 INTERNAL NOTE:
// Purpose: Button radius slider form field
// Exports: ButtonRadiusField component
// Feature: sales-channels/show-storefront
// Dependencies: react-hook-form, shadcn components

import { FormControl, FormDescription, FormItem, FormLabel } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";

interface ButtonRadiusFieldProps {
  value: number;
  onChange: (value: number) => void;
}

export function ButtonRadiusField({ value, onChange }: ButtonRadiusFieldProps) {
  return (
    <FormItem>
      <FormLabel className="text-foreground text-sm">Button Roundness</FormLabel>
      <FormControl>
        <div className="space-y-2">
          <Slider
            min={0}
            max={32}
            step={2}
            value={[value]}
            onValueChange={([val]) => onChange(val)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sharp</span>
            <span>{value}px</span>
            <span>Rounded</span>
          </div>
        </div>
      </FormControl>
      <FormDescription className="text-xs">
        Adjust button corner roundness (0 = square, 32 = very rounded)
      </FormDescription>
    </FormItem>
  );
}
