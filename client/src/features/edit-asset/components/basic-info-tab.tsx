// 🤖 INTERNAL NOTE (LLM):
// This file defines the BasicInfoTab component.
// It renders the Basic Info tab content for the Edit Asset dialog, including basic information and serial numbering.
// Part of the `edit-asset` feature.
// Depends on form section components from add-asset feature (to be migrated later).

import { useFormContext } from "react-hook-form";
import { FormValues } from "../index";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Import form sections from manual-asset-entry components
import { BasicInfoSection, SerialNumberSection } from "@/features/add-asset/components/manual-asset-entry";

interface BasicInfoTabProps {
  isPsaGraded?: boolean;
}

/**
 * Renders the Basic Info tab content for the Edit Asset dialog,
 * which includes both basic information and serial numbering fields
 */
export const BasicInfoTab = ({ isPsaGraded = false }: BasicInfoTabProps) => {
  const form = useFormContext<FormValues>();
  const grader = form.watch("grader");
  const certNumber = form.watch("certNumber");

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

      {/* Basic Information */}
      <div className="border p-4 rounded-lg shadow-sm bg-card">
        {isPsaCard ? (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            {/* PSA Read-Only Fields */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                  PSA Card Details (Read-only)
                </CardTitle>
                <CardDescription>
                  These fields are populated from PSA certification data and cannot be edited
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50">{form.getValues("title")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Player Name</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50">{form.getValues("playerName")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Set Name</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50">{form.getValues("setName")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Year</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50">{form.getValues("year")}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Card Number</Label>
                  <div className="py-2 px-3 border rounded-md bg-muted/50">{form.getValues("cardNumber")}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <BasicInfoSection form={form} />
        )}
      </div>

      {/* Serial Numbering */}
      <div className="border p-4 rounded-lg shadow-sm bg-card">
        <SerialNumberSection form={form} />
      </div>
    </div>
  );
};
