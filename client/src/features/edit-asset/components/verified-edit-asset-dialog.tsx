import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, X, Lock, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { insertAssetSchema } from "@shared/schema";
import type { Asset } from "@shared/schema";
import { Form } from "@/components/ui/form";
import { SerialNumberSection } from "@/features/add-asset/components/manual-asset-entry/serial-number-section";
import { PurchaseInfoSection } from "@/features/add-asset/components/manual-asset-entry/purchase-info-section";
import { AdditionalInfoSection } from "@/features/add-asset/components/manual-asset-entry/additional-info-section";
import { Label } from "@/components/ui/label";

const formSchema = insertAssetSchema.extend({
  title: z.string().min(3).max(100),
});

type FormValues = z.infer<typeof formSchema>;

interface VerifiedEditAssetDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LOCKED_FIELDS: (keyof FormValues)[] = [
  "type",
  "title",
  "playerName",
  "setName",
  "year",
  "cardNumber",
  "variant",
  "grader",
  "grade",
  "certNumber",
];

export function VerifiedEditAssetDialog({ asset, open, onOpenChange }: VerifiedEditAssetDialogProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initialValues: FormValues = useMemo(() => ({
    userId: user?.id || "",
    type: asset?.type as any,
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
    ownershipStatus: (asset?.ownershipStatus as any) ?? "own",
    sourceSlug: asset?.sourceSlug ?? "psa",
    imageUrl: (asset as any)?.imageUrl ?? undefined,
    assetImages: (asset as any)?.assetImages ?? [],
    notes: asset?.notes ?? undefined,
    assetStatus: (asset as any)?.assetStatus ?? undefined,
  }), [asset, user?.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
    mode: "onSubmit",
  });

  useEffect(() => {
    if (open) form.reset(initialValues);
  }, [open, initialValues, form]);

  const updateAssetMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const sanitized: Partial<FormValues> = { ...data };
      LOCKED_FIELDS.forEach((key) => {
        (sanitized as any)[key] = (initialValues as any)[key];
      });
      const res = await apiRequest("PATCH", `/api/assets/${asset.id}`, sanitized);
      return res;
    },
    onSuccess: async () => {
      toast({ title: "Asset updated", description: "Your asset (verified) has been updated." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/assets`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/assets/${asset.id}`] }),
        // CRITICAL: Also invalidate the combined assets-or-global query key used on asset detail page
        queryClient.invalidateQueries({ 
          predicate: (q) => Array.isArray(q.queryKey) && 
            q.queryKey[0] === `/api/assets-or-global/${asset.id}`
        }),
        // CRITICAL: Asset edits can affect pricing/sparklines
  // Predicate invalidate to cover dynamic second segment keys
  queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'portfolio-pricing-v2' }),
        queryClient.invalidateQueries({ queryKey: [`/api/pricing/${asset.id}`] }),
        queryClient.invalidateQueries({ queryKey: [`sparkline-data-${asset.id}`] }),
      ]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update asset: ${error?.message || "Please try again."}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormValues) {
    updateAssetMutation.mutate(data);
  }

  const handleClose = () => {
    form.reset(initialValues);
    onOpenChange(false);
  };

  const handleSave = () => {
    form.handleSubmit(onSubmit)();
  };

  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99998] bg-background text-foreground" role="dialog" aria-modal="true" aria-labelledby="verified-edit-dialog-title" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <button onClick={handleClose} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Close dialog" disabled={updateAssetMutation.isPending}>
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <button
          onClick={handleSave}
          disabled={updateAssetMutation.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 min-w-[140px] shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2"
        >
          {updateAssetMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : ("Save Changes")}
        </button>
      </div>

      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h1 id="verified-edit-dialog-title" className="text-2xl font-semibold font-heading text-foreground flex items-center gap-2">
              Edit Verified Asset
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                <BadgeCheck className="h-4 w-4" /> Verified
              </span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Graded slab data is locked (pulled straight from the cert). Add serial details, purchase info, images, and notes below.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" /> Core Card Data (Read-only)</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LOCKED_FIELDS.filter(f => !["grader","grade","certNumber"].includes(f as string)).map((field) => {
                    const value = (form.getValues() as any)[field];
                    return (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-muted-foreground capitalize" htmlFor={`locked-${field}`}>{field}</Label>
                        <Input id={`locked-${field}`} size="md" value={value ?? ""} placeholder="-" disabled readOnly />
                      </div>
                    );
                  })}
                  {/* Additional PSA / grader sourced fields */}
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground" htmlFor="locked-category">Category</Label>
                    <Input id="locked-category" size="md" value={asset.category || ""} placeholder="-" disabled readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground" htmlFor="locked-pop-total">Population (Total)</Label>
                    <Input id="locked-pop-total" size="md" value={asset.totalPopulation?.toString() || ""} placeholder="-" disabled readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground" htmlFor="locked-pop-qualifier">Pop w/ Qualifier</Label>
                    <Input id="locked-pop-qualifier" size="md" value={asset.totalPopulationWithQualifier?.toString() || ""} placeholder="-" disabled readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground" htmlFor="locked-pop-higher">Population Higher</Label>
                    <Input id="locked-pop-higher" size="md" value={asset.populationHigher?.toString() || ""} placeholder="-" disabled readOnly />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" /> Grading Information</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(["grader","grade","certNumber"] as const).map(field => {
                    const value = (form.getValues() as any)[field];
                    return (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-muted-foreground capitalize" htmlFor={`locked-${field}`}>{field === 'certNumber' ? 'Cert Number' : field}</Label>
                        <Input id={`locked-${field}`} size="md" value={value ?? ""} placeholder="-" disabled readOnly />
                      </div>
                    );
                  })}
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground" htmlFor="locked-autograph-grade">Autograph Grade</Label>
                    <Input id="locked-autograph-grade" size="md" value={asset.autographGrade || ""} placeholder="-" disabled readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground" htmlFor="locked-psa-dna">PSA DNA</Label>
                    <Input id="locked-psa-dna" size="md" value={asset.isPsaDna ? "Yes" : "No"} disabled readOnly />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground" htmlFor="locked-dual-cert">Dual Cert</Label>
                    <Input id="locked-dual-cert" size="md" value={asset.isDualCert ? "Yes" : "No"} disabled readOnly />
                  </div>
                </div>
                {(asset.psaImageFrontUrl || asset.psaImageBackUrl) && (
                  <div className="mt-4 flex gap-4">
                    {asset.psaImageFrontUrl && <img src={asset.psaImageFrontUrl} alt="Front" className="h-40 w-auto rounded-md border object-cover" />}
                    {asset.psaImageBackUrl && <img src={asset.psaImageBackUrl} alt="Back" className="h-40 w-auto rounded-md border object-cover" />}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-medium text-foreground mb-4">Serial Numbering</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container">
                  <SerialNumberSection form={form as any} />
                </div>
              </section>

              <section>
                <h2 className="text-lg font-medium text-foreground mb-4">Purchase Information</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container">
                  <PurchaseInfoSection form={form as any} />
                </div>
              </section>

              <section>
                <h2 className="text-lg font-medium text-foreground mb-4">Additional Information</h2>
                <div className="border border-border p-4 rounded-lg shadow-sm bg-primary-container">
                  <AdditionalInfoSection form={form as any} />
                </div>
              </section>

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
