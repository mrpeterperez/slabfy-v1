import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { safeFieldProps } from "./form-utils";
import { z } from "zod";
import { insertAssetSchema } from "@shared/schema";

type FormValues = z.infer<typeof insertAssetSchema>;

type SerialNumberSectionProps = {
  form: UseFormReturn<FormValues>;
};

export const SerialNumberSection = ({ form }: SerialNumberSectionProps) => {
  const isSerialNumbered = form.watch("serialNumbered");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium font-heading">Serial Numbering</h3>
      
      {/* Serial Numbered Checkbox */}
      <FormField
        control={form.control}
        name="serialNumbered"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md p-4 bg-muted/50">
            <FormControl>
              <Checkbox
                size="lg"
                checked={field.value || false}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-0 leading-none">
              <FormDescription>
                Is this item serial numbered? (e.g. 42/100)
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {/* Serial Number Fields - Show only if serialNumbered is true */}
      {isSerialNumbered && (
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input 
                    size="lg"
                    type="number" 
                    placeholder="e.g. 42" 
                    {...safeFieldProps(field)} 
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serialMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Out of</FormLabel>
                <FormControl>
                  <Input 
                    size="lg"
                    type="number" 
                    placeholder="e.g. 100" 
                    {...safeFieldProps(field)} 
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
};