import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";

import { UseFormReturn } from "react-hook-form";
import { safeFieldProps } from "./form-utils";
import { z } from "zod";
import { insertAssetSchema } from "@shared/schema";

type FormValues = z.infer<typeof insertAssetSchema>;

type PurchaseInfoSectionProps = {
  form: UseFormReturn<FormValues>;
};

export const PurchaseInfoSection = ({ form }: PurchaseInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium font-heading">Purchase Information</h3>
      
      {/* Purchase Price */}
      <FormField
        control={form.control}
        name="purchasePrice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Purchase Price</FormLabel>
            <FormControl>
              <Input 
                size="lg"
                type="number" 
                placeholder="e.g. 199.99" 
                step="0.01"
                {...safeFieldProps(field)} 
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Purchase Date */}
      <FormField
        control={form.control}
        name="purchaseDate"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Purchase Date</FormLabel>
            <FormControl>
              <DateInput
                size="lg"
                value={field.value ?? undefined}
                onChange={(v) => field.onChange(v)}
                placeholder="Pick a date"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Purchase Source */}
      <FormField
        control={form.control}
        name="purchaseSource"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Purchase Source</FormLabel>
            <FormControl>
              <Input size="lg" placeholder="e.g. eBay, card show, hobby shop" {...safeFieldProps(field)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};