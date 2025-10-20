// 🤖 INTERNAL NOTE (LLM):
// This file defines the AdditionalInfoTab component.
// It renders the Additional Info tab content for the Edit Asset dialog.
// Part of the `edit-asset` feature.
// Depends on AdditionalInfoSection from add-asset feature (to be migrated later).

import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

// Import form sections from manual-asset-entry components
import { AdditionalInfoSection } from "@/features/add-asset/components/manual-asset-entry";
import { safeFieldProps } from "@/features/add-asset/components/manual-asset-entry/form-utils";

// Types
import { FormValues } from "../index";

interface AdditionalInfoTabProps {
  isPsaGraded?: boolean;
}

/**
 * Renders the Additional Info tab content for the Edit Asset dialog
 */
export const AdditionalInfoTab = ({ isPsaGraded = false }: AdditionalInfoTabProps) => {
  const form = useFormContext<FormValues>();
  const grader = form.watch('grader' as keyof FormValues) as any;
  const certNumber = form.watch('certNumber' as keyof FormValues) as any;
  // These fields might not be in the form schema; fetch via getValues safely
  const psaImageFrontUrl = (form.getValues() as any)?.psaImageFrontUrl as string | undefined;
  const psaImageBackUrl = (form.getValues() as any)?.psaImageBackUrl as string | undefined;

  // Check if this is a PSA graded card with a cert number
  const isPsaCard = isPsaGraded || (grader === "PSA" && !!certNumber);

  return (
    <div className="space-y-6 p-4">
      {/* PSA Banner for PSA cards */}
      {isPsaCard && (
  <Alert className="mb-6 bg-brand/subtle border-brand">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>PSA Graded Card</AlertTitle>
          <AlertDescription>
            This is a PSA-graded card with certification data. Some fields are read-only to preserve PSA verification.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="border p-4 rounded-lg shadow-sm bg-card">
        {isPsaCard ? (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Additional Information</h3>
            
            {/* PSA Read-Only Fields */}
            <Card className="border-dashed mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                  Images (Read-only)
                </CardTitle>
                <CardDescription>
                  For PSA-graded cards, image fields cannot be edited to preserve verification
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                {/* Always show image URL field as read-only for PSA cards */}
                <div>
                  <Label className="text-muted-foreground">Image URL</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50 break-all text-xs">
                    {form.getValues("imageUrl") || "No custom image URL"}
                  </div>
                </div>
                
                {/* Show PSA images if available */}
                {psaImageFrontUrl && (
                  <div>
                    <Label className="text-muted-foreground">PSA Front Image URL</Label>
                    <div className="py-2 px-3 border rounded-md bg-muted/50 break-all text-xs">{psaImageFrontUrl}</div>
                  </div>
                )}
                {psaImageBackUrl && (
                  <div>
                    <Label className="text-muted-foreground">PSA Back Image URL</Label>
                    <div className="py-2 px-3 border rounded-md bg-muted/50 break-all text-xs">{psaImageBackUrl}</div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Notes - still editable */}
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
        ) : (
          <AdditionalInfoSection form={form} />
        )}
      </div>
    </div>
  );
};
