// 🤖 INTERNAL NOTE (LLM):
// This file defines types used in the edit-asset feature.
// It exports interface types for component props.
// Part of the `edit-asset` feature.
// Depends on shared schema types.

import { Asset } from "@shared/schema";
import { ReactNode } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from 'zod';
import { insertAssetSchema } from "@shared/schema";

/**
 * Form values type based on the asset schema
 */
export type FormValues = z.infer<typeof insertAssetSchema>;

/**
 * Props for the EditAssetModal component
 */
export interface EditAssetModalProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPsaGraded?: boolean; // Indicates if the asset has PSA grading details that should be read-only
}

/**
 * Props for the DialogLayout component
 */
export interface DialogLayoutProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSubmit: () => void;
  form: UseFormReturn<FormValues>;
  isSubmitting: boolean;
  isPsaGraded?: boolean; // Flag for PSA graded assets to disable editing certain fields
}

/**
 * Structure for a tab item
 */
export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}