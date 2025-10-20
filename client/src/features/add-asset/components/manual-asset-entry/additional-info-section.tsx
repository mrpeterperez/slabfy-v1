import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { safeFieldProps } from "./form-utils";
import { AssetImageUpload } from "./asset-image-upload";
import { z } from "zod";
import { insertAssetSchema } from "@shared/schema";

type FormValues = z.infer<typeof insertAssetSchema>;

type AdditionalInfoSectionProps = {
  form: UseFormReturn<FormValues>;
};

export const AdditionalInfoSection = ({ form }: AdditionalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium font-heading">Additional Information</h3>
      
      {/* Asset Images Upload */}
      <FormField
        control={form.control}
        name="assetImages"
        render={({ field }) => (
          <FormItem>
            <AssetImageUpload
              images={field.value || []}
              onChange={field.onChange}
              maxImages={10}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Image URL */}
      <FormField
        control={form.control}
        name="imageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Image URL</FormLabel>
            <FormControl>
              <Input size="lg" placeholder="https://example.com/my-card-image.jpg" {...safeFieldProps(field)} />
            </FormControl>
            <FormDescription>
              Direct link to an image of your asset (alternative to uploading images above)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Notes */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Any additional information or personal notes about this asset"
                className="min-h-[100px]"
                {...safeFieldProps(field)} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};