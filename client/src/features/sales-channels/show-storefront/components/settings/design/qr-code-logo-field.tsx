// 🤖 INTERNAL NOTE:
// Purpose: QR code logo overlay toggle field
// Exports: QRCodeLogoField component
// Feature: sales-channels/show-storefront
// Dependencies: react-hook-form, shadcn components

import { FormControl, FormDescription, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface QRCodeLogoFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function QRCodeLogoField({ value, onChange }: QRCodeLogoFieldProps) {
  return (
    <FormItem>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <FormLabel className="text-foreground text-sm">QR Code Center Logo</FormLabel>
          <FormDescription className="text-xs">
            Add your store logo to center of QR code
          </FormDescription>
        </div>
        <FormControl>
          <Switch checked={value} onCheckedChange={onChange} />
        </FormControl>
      </div>
      <hr className="mt-4" />
    </FormItem>
  );
}
