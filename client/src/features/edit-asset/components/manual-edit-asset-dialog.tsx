import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, X } from "lucide-react";

// API
import { apiRequest } from "@/lib/queryClient";

// Shared schema + types (match ManualAddAssetDialog)
import {
  insertAssetSchema,
} from "@shared/schema";
import type { Asset } from "@shared/schema";

// UI
import { Form } from "@/components/ui/form";

// Sections (same components used by ManualAddAssetDialog)
import { BasicInfoSection } from "../../add-asset/components/manual-asset-entry/basic-info-section";
import { GradingInfoSection } from "../../add-asset/components/manual-asset-entry/grading-info-section";
import { SerialNumberSection } from "../../add-asset/components/manual-asset-entry/serial-number-section";
import { PurchaseInfoSection } from "../../add-asset/components/manual-asset-entry/purchase-info-section";
import { AdditionalInfoSection } from "../../add-asset/components/manual-asset-entry/additional-info-section";

// --------------------
// Types & Schema
// --------------------
// Keep parity with ManualAddAssetDialog: extend shared schema only where tighter
// validations are needed (e.g., title length). All other transformations are in the
// shared schema already (coercions, empty-string handling, etc.).
const formSchema = insertAssetSchema.extend({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title is too long"),
});

type FormValues = z.infer<typeof formSchema>;

interface ManualEditAssetDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualEditAssetDialog({ asset, open, onOpenChange }: ManualEditAssetDialogProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initialValues: FormValues = useMemo(() => ({
    userId: user?.id || "",
    type: (asset?.type as FormValues["type"]) ?? "raw",
    title: asset?.title ?? "",
    playerName: asset?.playerName ?? undefined,
    setName: asset?.setName ?? undefined,
    year: (asset?.year as any) ?? undefined,
    cardNumber: (asset?.cardNumber as any) ?? undefined,
    variant: asset?.variant ?? undefined,
    grader: asset?.grader ?? undefined,
    grade: (asset?.grade as any) ?? undefined,
    certNumber: asset?.certNumber ?? undefined,
    serialNumbered: asset?.serialNumbered ?? false,
    serialNumber: (asset?.serialNumber as any) ?? undefined,
    serialMax: (asset?.serialMax as any) ?? undefined,
    purchasePrice: (asset as any)?.purchasePrice ?? undefined,
    purchaseDate: (asset as any)?.purchaseDate ?? undefined,
    purchaseSource: (asset as any)?.purchaseSource ?? undefined,
    ownershipStatus: (asset?.ownershipStatus as FormValues["ownershipStatus"]) ?? "own",
    sourceSlug: "manual",
    imageUrl: (asset as any)?.imageUrl ?? undefined,
    assetImages: (asset as any)?.assetImages ?? [],
    notes: asset?.notes ?? undefined,
  }), [asset, user?.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
    mode: "onSubmit",
  });

  // Keep the form in sync whenever the dialog opens for a different asset
  useEffect(() => {
    if (open) {
      form.reset(initialValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  const updateAssetMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Use PATCH to update with the validated payload
      const res = await apiRequest("PATCH", `/api/assets/${asset.id}`, data);
      return res;
    },
    onSuccess: async () => {
      toast({
        title: "Asset updated",
        description: "Your asset has been updated.",
      });
      // match invalidations from add dialog + pricing caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/assets`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/assets/${asset.id}`] }),
        // CRITICAL: Asset edits can affect pricing/sparklines
  // Predicate invalidate to cover dynamic second segment keys
  queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'portfolio-pricing-v2' }),
        queryClient.invalidateQueries({ queryKey: [`/api/pricing/${asset.id}`] }),
        queryClient.invalidateQueries({ queryKey: [`sparkline-data-${asset.id}`] }),
      ]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Failed to update asset:", error);
      toast({
        title: "Error",
        description: `Failed to update asset: ${error?.message || "Please try again."}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormValues) {
    // Shared schema handles transformations; just patch
    updateAssetMutation.mutate(data);
  }

  const assetType = form.watch("type");

  const handleClose = () => {
    form.reset(initialValues);
    onOpenChange(false);
  };

  const handleSave = () => {
    form.handleSubmit(onSubmit)();
  };

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99998] bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dialog-title"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Header - mirrors ManualAddAssetDialog */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Close dialog"
          disabled={updateAssetMutation.isPending}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <button
          onClick={handleSave}
          disabled={updateAssetMutation.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 min-w-[140px] shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2"
        >
          {updateAssetMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>

      {/* Scrollable content container - same sizing as add dialog */}
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Title */}
          <h1 id="edit-dialog-title" className="text-2xl font-semibold font-heading text-foreground mb-6 sm:mb-8">
            Edit Asset
          </h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
              {/* Basic Information */}
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4">Basic Information</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container">
                  <BasicInfoSection form={form} />
                </div>
              </section>

              {/* Grading Info - only when graded */}
              {assetType === "graded" && (
                <section>
                  <h2 className="text-lg font-medium text-foreground mb-4">Grading Information</h2>
                  <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container">
                    <GradingInfoSection form={form} />
                  </div>
                </section>
              )}

              {/* Serial Numbering */}
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4">Serial Numbering</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container">
                  <SerialNumberSection form={form} />
                </div>
              </section>

              {/* Purchase Information */}
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4">Purchase Information</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container">
                  <PurchaseInfoSection form={form} />
                </div>
              </section>

              {/* Additional Information */}
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4">Additional Information</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container">
                  <AdditionalInfoSection form={form} />
                </div>
              </section>

              {/* Bottom padding so nothing is hidden under the header */}
              <div className="pb-8" />
            </form>
          </Form>
        </div>
      </div>
    </div>
  );

  // Render modal content in a portal to escape any container constraints  
  return createPortal(modalContent, document.body);
}
