// 🤖 INTERNAL NOTE (LLM):
// This file serves as the public API for the edit-asset feature.
// It exports the EditAssetModal component, tab components, API functions, and types.
// Part of the `edit-asset` feature.
// Depends on types from the types folder.

// Export all types from types folder
export type { FormValues, EditAssetModalProps, DialogLayoutProps, TabItem } from "./types";

// Export main component - renamed for clarity to avoid naming confusion
export { EditAssetModal as EditAssetDialog } from "./components/edit-asset-modal";
export { ManualEditAssetDialog } from "./components/manual-edit-asset-dialog";
export { VerifiedEditAssetDialog } from "./components/verified-edit-asset-dialog";

// Export tab components for internal use
export { BasicInfoTab } from "./components/basic-info-tab";
export { GradingInfoTab } from "./components/grading-info-tab";
export { PurchaseInfoTab } from "./components/purchase-info-tab";
export { AdditionalInfoTab } from "./components/additional-info-tab";

// Export layout component for internal use
export { DialogLayout } from "./components/dialog-layout";

// Export API functions from shared
export { updateAsset } from "@shared/api/asset-api";
