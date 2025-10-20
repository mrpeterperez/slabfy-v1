// 🤖 INTERNAL NOTE (LLM):
// This file defines the GradingInfoTab component.
// It renders the Grading Info tab content for the Edit Asset dialog.
// Part of the `edit-asset` feature.
// Depends on GradingInfoSection from add-asset feature.
// Special handling for PSA-graded assets to make certain fields read-only.

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import form sections from manual-asset-entry components
import { GradingInfoSection } from "@/features/add-asset/components/manual-asset-entry";

// Types
import { FormValues } from "../index";

interface GradingInfoTabProps {
  isPsaGraded?: boolean;
}

/**
 * Renders the Grading Info tab content for the Edit Asset dialog
 * Only shown when asset type is "graded"
 * Special handling for PSA-graded assets to make certain fields read-only
 */
export const GradingInfoTab = ({ isPsaGraded = false }: GradingInfoTabProps) => {
  const form = useFormContext<FormValues>();
  const assetType = form.watch("type");
  const grader = form.watch("grader");
  const certNumber = form.watch("certNumber");

  // Check if this is a PSA graded card with a cert number
  const isPsaCard = isPsaGraded || (grader === "PSA" && !!certNumber);

  if (assetType !== "graded") {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>Grading information is only available for graded assets.</p>
      </div>
    );
  }

  // If it's a PSA card, display a banner and read-only fields
  if (isPsaCard) {
    return (
      <div className="space-y-6 p-4">
  <Alert className="mb-6 bg-brand/subtle border-brand">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>PSA Graded Card</AlertTitle>
          <AlertDescription>
            This is a PSA-graded card with certification data. Some fields are read-only to preserve PSA verification.
          </AlertDescription>
        </Alert>

        <div className="border p-4 rounded-lg shadow-sm bg-card">
          <div className="space-y-6">
            {/* PSA Read-Only Fields */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                  PSA Certification Details (Read-only)
                </CardTitle>
                <CardDescription>
                  These fields are populated from PSA certification data and cannot be edited
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Grader</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50">{form.getValues("grader")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Certificate Number</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50">{form.getValues("certNumber")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Grade</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50">{form.getValues("grade")}</div>
                </div>
              </CardContent>
            </Card>
            
            {/* Editable Fields */}
            <div className="mt-6">
              <h3 className="text-md font-medium mb-4">Additional Grading Information</h3>
              <GradingInfoSection form={form} readOnlyFields={["grader", "certNumber", "grade"]} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular non-PSA grading info tab
  return (
    <div className="space-y-6 p-4">
      <div className="border p-4 rounded-lg shadow-sm bg-card">
        <GradingInfoSection form={form} />
      </div>
    </div>
  );
};
