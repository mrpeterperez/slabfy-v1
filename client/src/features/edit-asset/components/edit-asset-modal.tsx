// 🤖 INTERNAL NOTE (LLM):
// This file defines the EditAssetModal component.
// It allows users to edit the details of an existing asset in the collection using a tabbed interface.
// Part of the `edit-asset` feature.
// Depends on DialogLayout component and tab content components.

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { insertAssetSchema, OwnershipStatus, AssetStatus } from "@shared/schema";
import { z } from "zod";

// API
import { updateAsset } from "@shared/api/asset-api";

// Types for the form
import { FormValues } from "../index";

// Types
import { EditAssetModalProps, TabItem } from "../types";

// Layout Component
import { DialogLayout } from "./dialog-layout";

// Tab Content Components
import { BasicInfoTab } from "./basic-info-tab";
import { GradingInfoTab } from "./grading-info-tab";
import { PurchaseInfoTab } from "./purchase-info-tab";
import { AdditionalInfoTab } from "./additional-info-tab";

// Form Provider
import { Form } from "@/components/ui/form";

/**
 * Dialog component for editing an existing asset with a tabbed interface
 */
export const EditAssetModal = ({
  asset,
  open,
  onOpenChange,
  isPsaGraded = false,
}: EditAssetModalProps) => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  // Always initialize with basic-info as the default tab
  const [activeTab, setActiveTab] = useState("basic-info");

  // Form schema with validation
  const formSchema = insertAssetSchema.extend({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title is too long"),
  });

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: user?.id || "",
      type: "raw" as const,
      title: "",
      playerName: undefined,
      setName: undefined,
      year: undefined,
      cardNumber: undefined,
      variant: undefined,
      grader: undefined,
      grade: undefined,
      certNumber: undefined,
      serialNumbered: false,
      serialNumber: undefined,
      serialMax: undefined,
      purchasePrice: undefined,
      purchaseDate: undefined,
      purchaseSource: undefined,
      ownershipStatus: "own" as const,
      assetStatus: "not_for_sale" as const,
      sourceSlug: "manual" as const,
      imageUrl: undefined,
      notes: undefined,
    },
  });

  // Update form when asset changes
  useEffect(() => {
    if (asset) {
      // Reset to basic-info tab whenever an asset is loaded
      setActiveTab("basic-info");
      
      // Convert null values to undefined or defaults for form compatibility
      const formData = {
        userId: asset.userId,
        type: asset.type,
        title: asset.title,
        playerName: asset.playerName ?? undefined,
        setName: asset.setName ?? undefined,
        year: asset.year ?? undefined,
        cardNumber: asset.cardNumber ?? undefined,
        variant: asset.variant ?? undefined,
        grader: asset.grader ?? undefined,
        grade: asset.grade ?? undefined,
        certNumber: asset.certNumber ?? undefined,
        serialNumbered:
          asset.serialNumbered === null ? false : asset.serialNumbered,
        serialNumber:
          asset.serialNumber !== null ? Number(asset.serialNumber) : undefined,
        serialMax:
          asset.serialMax !== null ? Number(asset.serialMax) : undefined,
        purchasePrice:
          asset.purchasePrice !== null
            ? Number(asset.purchasePrice)
            : undefined,
        purchaseDate: asset.purchaseDate ?? undefined,
        purchaseSource: asset.purchaseSource ?? undefined,
        // Handle the ownership status for the new "own"/"consignment" values
        ownershipStatus: ((): OwnershipStatus => {
          // Get string value
          const status = String(asset.ownershipStatus || "");
          
          // Handle legacy data migration
          if (status === "owned" || status === "for_sale" || 
              status === "sold" || status === "pending_transfer") {
            return "own";
          }
          
          // Use the current value if it's already one of our new valid values
          if (status === "own" || status === "consignment") {
            return status as OwnershipStatus;
          }
          
          // Default fallback
          return "own";
        })(),
        
        // If we have assetStatus, use it, otherwise derive from ownershipStatus
        assetStatus: ((): AssetStatus => {
          // If assetStatus already exists, use it
          if (asset.assetStatus) {
            return asset.assetStatus as AssetStatus;
          }
          
          // Derive from old ownership status for data migration
          const status = String(asset.ownershipStatus || "");
          if (status === "for_sale") return "for_sale";
          if (status === "sold") return "sold";
          
          // Default fallback
          return "not_for_sale";
        })(),
        sourceSlug: asset.sourceSlug ?? "manual",
        imageUrl: asset.imageUrl ?? undefined,
        notes: asset.notes ?? undefined,
      };

      form.reset(formData);
    }
  }, [asset, form]);

  // Mutation for updating an asset
  const updateAssetMutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (!asset?.id) throw new Error("Asset ID is missing");
      return updateAsset(asset.id, data);
    },
    onSuccess: () => {
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/assets/${asset?.id}`] });
      toast({
        title: "Asset Updated",
        description: "Your asset has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update asset: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(data: FormValues) {
    console.log("Submitting data:", data);
    updateAssetMutation.mutate(data);
  }

  // Asset type for conditional tab display
  const assetType = form.watch("type");

  // Optional: Auto-navigate to grading tab if asset type is graded
  // Reset tab when dialog open state changes
  useEffect(() => {
    if (open) {
      setActiveTab("basic-info");
    }
  }, [open]);

  // Only enable/disable the grading tab based on asset type
  // No automatic switching to avoid overriding user selection
  // This effect is intentionally commented out
  /*
  useEffect(() => {
    if (assetType === "graded" && activeTab !== "grading-info") {
      setActiveTab("grading-info");
    }
  }, [assetType, activeTab]);
  */

  // Tab configuration without Form wrapper inside each tab
  const tabs: TabItem[] = [
    {
      id: "basic-info",
      label: "Basic Info",
      content: <BasicInfoTab isPsaGraded={isPsaGraded} />,
    },
    {
      id: "grading-info",
      label: "Grading Info",
      content: <GradingInfoTab isPsaGraded={isPsaGraded} />,
      disabled: assetType !== "graded",
    },
    {
      id: "purchase-info",
      label: "Purchase Info",
      content: <PurchaseInfoTab />,
    },
    {
      id: "additional-info",
      label: "Additional Info",
      content: <AdditionalInfoTab isPsaGraded={isPsaGraded} />,
    },
  ];

  return (
    <Form {...form}>
      <DialogLayout
        asset={asset}
        open={open}
        onOpenChange={onOpenChange}
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSubmit={form.handleSubmit(onSubmit)}
        form={form}
        isSubmitting={updateAssetMutation.isPending}
        isPsaGraded={isPsaGraded}
      />
    </Form>
  );
};
