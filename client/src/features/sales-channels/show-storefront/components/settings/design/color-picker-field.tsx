// 🤖 INTERNAL NOTE:
// Purpose: Reusable color picker form field with hex input
// Exports: ColorPickerField component
// Feature: sales-channels/show-storefront
// Dependencies: react-hook-form, shadcn form components

import { FormControl, FormDescription, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface ColorPickerFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ColorPickerField({
  label,
  description,
  value,
  onChange,
  placeholder = "#000000",
}: ColorPickerFieldProps) {
  return (
    <FormItem>
      <FormLabel className="text-foreground text-sm">{label}</FormLabel>
      <FormControl>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 cursor-pointer border-0 rounded"
          />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="font-mono text-sm"
          />
        </div>
      </FormControl>
      <FormDescription className="text-xs">{description}</FormDescription>
    </FormItem>
  );
}
