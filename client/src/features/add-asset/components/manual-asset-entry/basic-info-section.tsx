import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { safeFieldProps } from "./form-utils";
import { z } from "zod";
import { insertAssetSchema } from "@shared/schema";

type FormValues = z.infer<typeof insertAssetSchema>;

type BasicInfoSectionProps = {
  form: UseFormReturn<FormValues>;
};

export const BasicInfoSection = ({ form }: BasicInfoSectionProps) => {
  const assetType = form.watch("type");

  return (
    <div className="space-y-4">
      
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input size="lg" placeholder="e.g. 2018 Topps Chrome Shohei Ohtani Rookie" {...safeFieldProps(field)} />
            </FormControl>
            <FormDescription>
              A descriptive title for your asset
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Player Name - Show for cards */}
      {(assetType === "graded" || assetType === "raw") && (
        <FormField
          control={form.control}
          name="playerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Player Name</FormLabel>
              <FormControl>
                <Input size="lg" placeholder="e.g. Shohei Ohtani" {...safeFieldProps(field)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Set Name */}
      <FormField
        control={form.control}
        name="setName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Set Name</FormLabel>
            <FormControl>
              <Input size="lg" placeholder="e.g. Topps Chrome" {...safeFieldProps(field)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Year */}
      <FormField
        control={form.control}
        name="year"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Year</FormLabel>
            <FormControl>
              <Input size="lg" placeholder="e.g. 2018" {...safeFieldProps(field)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Card Number */}
      <FormField
        control={form.control}
        name="cardNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Card Number</FormLabel>
            <FormControl>
              <Input size="lg" placeholder="e.g. 150" {...safeFieldProps(field)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Variant */}
      <FormField
        control={form.control}
        name="variant"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Variant</FormLabel>
            <FormControl>
              <Input size="lg" placeholder="e.g. Refractor, Parallel, 1st Edition" {...safeFieldProps(field)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};