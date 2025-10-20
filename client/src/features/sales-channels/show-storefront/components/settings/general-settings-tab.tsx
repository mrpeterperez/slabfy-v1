// 🤖 INTERNAL NOTE:
// Purpose: General settings tab for storefront (name, logo, contact info)
// Exports: GeneralSettingsTab component
// Feature: sales-channels/show-storefront
// Dependencies: react-hook-form, shadcn form components

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Removed direct settings mutations to prevent autosave; persistence happens only via parent Save
import type { StorefrontSettings } from "@shared/schema";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const generalSettingsSchema = z.object({
  storeLogo: z.string().optional().or(z.literal("")),
  storeName: z.string().min(1, "Store name is required").max(50, "Store name too long (max 50 characters)"),
  contactEmail: z.string().email("Invalid email address").max(100).optional().or(z.literal("")),
  contactPhone: z.string().max(20).optional().or(z.literal("")),
  description: z.string().max(200, "Description too long (max 200 characters)").optional().or(z.literal("")),
  welcomeMessage: z.string().max(100, "Welcome message too long (max 100 characters)").optional().or(z.literal("")),
  eventDateText: z.string().max(100, "Date text too long (max 100 characters)").optional().or(z.literal("")),
  eventLocationText: z.string().max(100, "Location text too long (max 100 characters)").optional().or(z.literal("")),
});

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

interface GeneralSettingsTabProps {
  settings: StorefrontSettings | null | undefined;
  onPreviewChange?: (changes: Partial<StorefrontSettings>) => void;
  // Stage a new logo file for preview; parent defers upload until Save
  onStageLogo?: (file: File | null, previewUrl: string | null) => void;
}

export function GeneralSettingsTab({ settings, onPreviewChange, onStageLogo }: GeneralSettingsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const isInitialMount = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) {
    return <div className="p-4 text-center text-muted-foreground">Please sign in to continue.</div>;
  }

  const form = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      storeLogo: settings?.storeLogo || "",
      storeName: settings?.storeName || "",
      contactEmail: settings?.contactEmail || "",
      contactPhone: settings?.contactPhone || "",
      description: settings?.description || "",
      welcomeMessage: settings?.welcomeMessage || "",
      eventDateText: settings?.eventDateText || "<show-date>",
      eventLocationText: settings?.eventLocationText || "<show-location>",
    },
  });

  // Rehydrate the form whenever upstream settings change (e.g., after save/refetch)
  useEffect(() => {
    if (!settings) return;
    form.reset({
      storeLogo: settings.storeLogo || "",
      storeName: settings.storeName || "",
      contactEmail: settings.contactEmail || "",
      contactPhone: settings.contactPhone || "",
      description: settings.description || "",
      welcomeMessage: settings.welcomeMessage || "",
      eventDateText: settings.eventDateText || "<show-date>",
      eventLocationText: settings.eventLocationText || "<show-location>",
    });
  }, [settings?.storeLogo, settings?.storeName, settings?.contactEmail, settings?.contactPhone, settings?.description, settings?.welcomeMessage, settings?.eventDateText, settings?.eventLocationText]);

  // Watch form changes and update preview in real-time
  const watchedValues = form.watch();
  
  // Update preview whenever form changes (skip initial mount to prevent flash)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (onPreviewChange) {
      onPreviewChange({
        storeLogo: watchedValues.storeLogo || null,
        storeName: watchedValues.storeName || settings?.storeName,
        contactEmail: watchedValues.contactEmail || null,
        contactPhone: watchedValues.contactPhone || null,
        description: watchedValues.description || null,
        welcomeMessage: watchedValues.welcomeMessage || null,
        eventDateText: watchedValues.eventDateText || null,
        eventLocationText: watchedValues.eventLocationText || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues.storeLogo, watchedValues.storeName, watchedValues.contactEmail, watchedValues.contactPhone, watchedValues.description, watchedValues.welcomeMessage, watchedValues.eventDateText, watchedValues.eventLocationText]);

  // Handle logo selection: stage locally for preview; parent will upload on Save
  const handleLogoSelect = async (file: File) => {
    setIsUploading(true);
    try {
      // Create a local preview URL for instant feedback
      const previewUrl = URL.createObjectURL(file);
      form.setValue("storeLogo", previewUrl);
      onStageLogo?.(file, previewUrl);
      toast({
        title: "Logo selected",
        description: "This will be uploaded when you click Save.",
      });
    } catch (error) {
      console.error('Logo stage error:', error);
      toast({
        title: "Logo select failed",
        description: "There was an error selecting your logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    // Clear local preview and staged file
    onStageLogo?.(null, null);
    form.setValue("storeLogo", "");
    toast({
      title: "Logo removed",
      description: "Your store logo has been removed. Click Save to persist.",
    });
  };

  return (
    <Form {...form}>
      <div className="space-y-8">
        {/* Store Logo Upload */}
        <FormField
          control={form.control}
          name="storeLogo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-sm">Store Logo</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {field.value ? (
                    <div className="relative inline-block">
                      <img
                        src={field.value}
                        alt="Store Logo"
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                        onClick={handleRemoveLogo}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Upload Store Logo
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Recommended: 512x512px, square image
                      </p>
                      <div className="relative inline-block">
                        {/* Invisible input overlays the button for native picker */}
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void handleLogoSelect(file);
                            }
                          }}
                          disabled={isUploading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => {
                            // Fallback: programmatically open file picker if overlay fails
                            fileInputRef.current?.click();
                          }}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Choose File
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Upload a logo for your storefront (appears in preview and public page)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="storeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-sm">Store Name</FormLabel>
              <FormControl>
                <Input placeholder="My Card Show Collection" {...field} maxLength={50} />
              </FormControl>
              <FormDescription className="text-xs">
                This is how your store will appear to customers ({field.value?.length || 0}/50)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-sm">Store Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Premium graded cards and collectibles at <show-title>. Sports, Pokemon, TCG and more." 
                  {...field} 
                  rows={3}
                  maxLength={200}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Brief description of your store ({field.value?.length || 0}/200)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="welcomeMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-sm">Welcome Message</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Welcome To <show-title>" 
                  {...field} 
                  rows={2}
                  maxLength={100}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Greeting message ({field.value?.length || 0}/100) - use: &lt;show-title&gt;, &lt;show-date&gt;, &lt;show-location&gt;
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="eventDateText"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-sm">Event Date Display</FormLabel>
              <FormControl>
                <Input 
                  placeholder="<show-date>" 
                  {...field} 
                  maxLength={100}
                />
              </FormControl>
              <FormDescription className="text-xs">
                How date appears below welcome message ({field.value?.length || 0}/100) - use &lt;show-date&gt; for auto-fill
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="eventLocationText"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-sm">Event Location Display</FormLabel>
              <FormControl>
                <Input 
                  placeholder="<show-location>" 
                  {...field} 
                  maxLength={100}
                />
              </FormControl>
              <FormDescription className="text-xs">
                How location appears below date ({field.value?.length || 0}/100) - use &lt;show-location&gt; for auto-fill
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-sm">Contact Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="pete@slabfy.com" {...field} maxLength={100} />
              </FormControl>
              <FormDescription className="text-xs">
                Customers can reach you at this email (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-sm">Contact Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="555-0123" {...field} maxLength={20} />
              </FormControl>
              <FormDescription className="text-xs">
                Display a phone number for customers to call (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}
