// 🤖 INTERNAL NOTE (LLM):
// This file defines the PurchaseInfoTab component.
// It renders the Purchase Info tab content for the Edit Asset dialog.
// Part of the `edit-asset` feature.
// Depends on PurchaseInfoSection from add-asset feature (to be migrated later).

import { useFormContext } from "react-hook-form";

// Import form sections from manual-asset-entry components
import { PurchaseInfoSection } from "@/features/add-asset/components/manual-asset-entry";

// Types
import { FormValues } from "../index";

/**
 * Renders the Purchase Info tab content for the Edit Asset dialog
 */
export const PurchaseInfoTab = () => {
  const form = useFormContext<FormValues>();

  return (
    <div className="space-y-6 p-4">
      <div className="border p-4 rounded-lg shadow-sm bg-card">
        <PurchaseInfoSection form={form} />
      </div>
    </div>
  );
};
