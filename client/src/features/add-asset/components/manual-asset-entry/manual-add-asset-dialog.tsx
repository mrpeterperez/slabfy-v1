import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import {
  insertAssetSchema,
  graderOptions,
  ownershipStatusOptions,
} from "@shared/schema";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { SlabIcon } from "@/components/ui/slab-icon";
import { ProgressStepper } from "@/components/ui/progress-stepper";
import { Button } from "@/components/ui/button";

// API
import { createAsset } from "@shared/api/asset-api";

// Cache invalidation
import { invalidateAfterAssetAddition } from "@/lib/cache-invalidation";

// Components
import { Form } from "@/components/ui/form";
import { BasicInfoSection } from "./basic-info-section";
import { GradingInfoSection } from "./grading-info-section";
import { SerialNumberSection } from "./serial-number-section";
import { PurchaseInfoSection } from "./purchase-info-section";
import { AdditionalInfoSection } from "./additional-info-section";

type FormValues = z.infer<typeof insertAssetSchema>;

interface ManualAddAssetDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ManualAddAssetDialog = ({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ManualAddAssetDialogProps = {}) => {
  // Use internal state if not controlled externally
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errorSteps, setErrorSteps] = useState<number[]>([]);

  // Use controlled props if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = setControlledOpen || setUncontrolledOpen;

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form schema with validation - use the shared schema to ensure consistency
  // We only need to extend with tighter validations where needed
  const formSchema = insertAssetSchema.extend({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title is too long"),
    // All other fields are already correctly defined in the shared schema with proper type transformations
  });

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: user?.id || "",
      type: "graded" as const, // Default to graded type
      title: "",
      playerName: undefined,
      setName: undefined,
      year: undefined,
      cardNumber: undefined,
      variant: undefined,
  grader: "PSA",
      grade: undefined,
      certNumber: undefined,
      serialNumbered: false,
      serialNumber: undefined,
      serialMax: undefined,
      purchasePrice: undefined,
      purchaseDate: undefined,
      purchaseSource: undefined,
      ownershipStatus: "own" as const,
      sourceSlug: "manual" as const,
      imageUrl: undefined,
      notes: undefined,
    },
  });

  // Mutation for creating a new asset
  const createAssetMutation = useMutation({
    mutationFn: (data: FormValues) => {
      return createAsset(data);
    },
    onSuccess: async (createdAsset) => {
      // Comprehensive cache invalidation for the new asset
      if (createdAsset?.id) {
        await invalidateAfterAssetAddition([createdAsset.id]);
      }
      
      setOpen(false);
      form.reset();
      
      toast({
        title: "Asset Added",
        description: "Your asset has been added to your collection.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add asset: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Clear errors and error markers when asset type changes
  const handleAssetTypeChange = (newType: FormValues["type"]) => {
    form.clearErrors();
    setErrorSteps([]);
    form.setValue("type", newType, { shouldDirty: true, shouldTouch: true });
  };

  // Form submission handler
  function onSubmit(data: FormValues) {
    // All data transformations will be handled by the Zod schema
    // No need for manual data cleaning here - formSchema and insertAssetSchema
    // already have transformations to handle empty strings and type conversions
    console.log("Submitting data:", data);
    createAssetMutation.mutate(data);
  }

  // Used to conditionally show fields based on type
  const assetType = form.watch("type");

  // Handle close with form reset
  const handleClose = () => {
    form.reset();
    setCurrentStep(1);
  setErrorSteps([]);
    setOpen(false);
  };

  // Handle form save
  const handleSave = async () => {
    const values = form.getValues();
    const type = values.type;

    const isEmpty = (v: unknown) => {
      if (v === null || v === undefined) return true;
      if (typeof v === 'string') return v.trim() === '';
      return false;
    };

    // Determine required fields by type
    // Assumptions: 
    // - graded: all basic (including playerName) + grader, grade, certNumber
    // - raw: all basic (including playerName)
    // - sealed: basic (excluding playerName since UI doesn't show it)
    // - other: title only
    const basicFieldsCommon = ['title', 'setName', 'year', 'cardNumber', 'variant'] as const;
    const basicWithPlayer = ['playerName', ...basicFieldsCommon] as const;
    const basicNoPlayer = [...basicFieldsCommon] as const;

    const requiredBasic: string[] =
      type === 'graded' || type === 'raw' ? [...basicWithPlayer] : type === 'sealed' ? [...basicNoPlayer] : ['title'];
    const requiredGraded: string[] = type === 'graded' ? ['grader', 'grade', 'certNumber'] : [];

    const missingBasic = requiredBasic.filter((f) => isEmpty((values as any)[f]));
    const missingGraded = requiredGraded.filter((f) => isEmpty((values as any)[f]));

    // Set errors on missing fields so they show under inputs
    [...missingBasic, ...missingGraded].forEach((field) => {
      form.setError(field as any, { type: 'manual', message: 'This field is required' });
    });

    if (missingBasic.length > 0) {
      setCurrentStep(2);
      setErrorSteps((prev) => Array.from(new Set([...prev, 2])));
      // Focus first missing field in Basic Info
      const first = missingBasic[0];
      const el = document.querySelector(`[name="${first}"]`) as HTMLElement | null;
      el?.focus();
      toast({ title: 'Missing information', description: 'Please complete all required Basic Info fields.', variant: 'destructive' });
      return;
    }
    if (missingGraded.length > 0) {
      setCurrentStep(3);
      setErrorSteps((prev) => Array.from(new Set([...prev, 3])));
      const first = missingGraded[0];
      const el = document.querySelector(`[name="${first}"]`) as HTMLElement | null;
      el?.focus();
      toast({ title: 'Missing information', description: 'Please complete all required Graded Info fields.', variant: 'destructive' });
      return;
    }

    // If everything checks out, submit via resolver
    form.handleSubmit(onSubmit)();
  };

  // Step navigation helper for bottom action bar
  const goNext = () => {
    const values = form.getValues();
    const isEmpty = (v: unknown) => (v === null || v === undefined || (typeof v === 'string' && v.trim() === ''));

    if (currentStep === 1) {
      // Require type selection
      if (!values.type) {
        toast({ title: 'Select an asset type', description: 'Choose Graded, Raw, Sealed, or Other to continue.', variant: 'destructive' });
        setErrorSteps((prev) => Array.from(new Set([...prev, 1])));
        return;
      }
      setErrorSteps((prev) => prev.filter((s) => s !== 1));
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      const basicCommon = ['title', 'setName', 'year', 'cardNumber', 'variant'] as const;
      const basicWithPlayer = ['playerName', ...basicCommon] as const;
      const basicNoPlayer = [...basicCommon] as const;
      const requiredBasic = values.type === 'graded' || values.type === 'raw' ? basicWithPlayer : values.type === 'sealed' ? basicNoPlayer : (['title'] as const);
      const missing = (requiredBasic as readonly string[]).filter((f) => isEmpty((values as any)[f]));
      if (missing.length) {
        missing.forEach((f) => form.setError(f as any, { type: 'manual', message: 'This field is required' }));
        toast({ title: 'Complete Basic Info', description: 'Please fill all required Basic Info fields.', variant: 'destructive' });
        setErrorSteps((prev) => Array.from(new Set([...prev, 2])));
        const first = missing[0];
        const el = document.querySelector(`[name="${first}"]`) as HTMLElement | null;
        el?.focus();
        return;
      }
      setErrorSteps((prev) => prev.filter((s) => s !== 2));
      // If moving into Grading step and no grader set, default to PSA
      if ((values.type === 'graded') && !values.grader) {
        form.setValue('grader', 'PSA', { shouldDirty: true, shouldTouch: true });
      }
      setCurrentStep(values.type === 'graded' ? 3 : 4);
      return;
    }
    if (currentStep === 3) {
      const requiredGraded = ['grader', 'grade', 'certNumber'] as const;
      const missing = requiredGraded.filter((f) => isEmpty((values as any)[f]));
      if (missing.length) {
        missing.forEach((f) => form.setError(f as any, { type: 'manual', message: 'This field is required' }));
        toast({ title: 'Complete Graded Info', description: 'Please fill all required Graded Info fields.', variant: 'destructive' });
        setErrorSteps((prev) => Array.from(new Set([...prev, 3])));
        const first = missing[0];
        const el = document.querySelector(`[name="${first}"]`) as HTMLElement | null;
        el?.focus();
        return;
      }
      setErrorSteps((prev) => prev.filter((s) => s !== 3));
      setCurrentStep(4);
      return;
    }
    if (currentStep === 4) {
      setCurrentStep(5);
      return;
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 w-full h-full z-[99998] bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Header */}
      <div className="flex items-center p-4 sm:p-6 border-b border-border">
        <div className="w-36 sm:w-44 flex items-center">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close dialog"
            disabled={createAssetMutation.isPending}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <h2 id="dialog-title" className="text-2xl font-heading font-semibold">Add Asset Manually</h2>
        </div>
        <div className="w-36 sm:w-44 flex justify-end">
          {currentStep < 5 ? (
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={goNext}
              disabled={createAssetMutation.isPending}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={handleSave}
              disabled={createAssetMutation.isPending}
            >
              {createAssetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Asset"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content Container */}
  <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          
          {/* Progress Stepper (clickable for going back) */}
          <ProgressStepper 
            currentStep={currentStep} 
            assetType={assetType}
            errorSteps={errorSteps}
            onStepClick={(stepId)=> {
              if (stepId === currentStep) return;
              // Forward navigation guard: reuse goNext validations
              if (stepId > currentStep) {
                // Attempt to move forward step-by-step to trigger validations
                const tryAdvance = () => {
                  let localStep = currentStep;
                  while (localStep < stepId) {
                    const before = localStep;
                    goNext();
                    if (currentStep === before) {
                      // validation blocked advancement
                      return;
                    }
                    localStep = currentStep;
                  }
                };
                tryAdvance();
              } else {
                setCurrentStep(stepId);
              }
            }}
          />
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
              
              {/* Step 1: Asset Type Selection */}
              {currentStep === 1 && (
                <section>
                  <h2 className="text-lg font-medium text-foreground mb-6">What type of asset are you adding?</h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Graded Card */}
                    <button
                      type="button"
                      onClick={() => handleAssetTypeChange('graded')}
                      className={`p-6 border-2 rounded-lg transition-all ${
                        assetType === 'graded' 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <SlabIcon className="w-10 h-16" />
                        <span className="font-medium text-foreground">Graded</span>
                      </div>
                    </button>
                    
                    {/* Raw Card */}
                    <button
                      type="button"
                      onClick={() => handleAssetTypeChange('raw')}
                      className={`p-6 border-2 rounded-lg transition-all ${
                        assetType === 'raw' 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-10 h-14 border-2 border-foreground bg-card rounded-sm bg-background" />
                        <span className="font-medium text-foreground">Raw</span>
                      </div>
                    </button>
                  </div>
                  
                  {/* Sealed Pack Option */}
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => handleAssetTypeChange('sealed')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        assetType === 'sealed' 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <span className="font-medium text-foreground">Sealed</span>
                      </div>
                    </button>
                  </div>
                  
                  {/* Other Option */}
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      type="button"
                      onClick={() => handleAssetTypeChange('other')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        assetType === 'other' 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <span className="font-medium text-foreground">Other</span>
                      </div>
                    </button>
                  </div>
                </section>
              )}

              {/* Step 2: Basic Information (includes Serial Numbering) */}
              {currentStep === 2 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-foreground">Basic Information</h2>
                  </div>
                  <div>
                    <BasicInfoSection form={form} />
                  </div>
                  <div className="mt-6">
                    <SerialNumberSection form={form} />
                  </div>
                </section>
              )}

              {/* Step 3: Grading Info - Show only for graded items */}
              {currentStep === 3 && assetType === "graded" && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-foreground">Grading Information</h2>
                  </div>
                  <div>
                    <GradingInfoSection form={form} />
                  </div>
                </section>
              )}

              {/* Step 4: Purchase Information */}
              {currentStep === 4 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-foreground">Purchase Information</h2>
                  </div>
                  <div>
                    <PurchaseInfoSection form={form} />
                  </div>
                </section>
              )}

      {/* Step 5: Images & Notes */}
      {currentStep === 5 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-foreground">Images & Notes</h2>
                  </div>
                  <div>
        <p className="text-sm text-muted-foreground mb-4">Image upload functionality coming soon...</p>
        <AdditionalInfoSection form={form} />
                  </div>
                </section>
              )}


              {/* Bottom padding to ensure content isn't hidden */}
              <div className="pb-24"></div>
            </form>
          </Form>
        </div>
      </div>

  {/* Top-right button above replaces bottom action bar */}
    </div>
  );
};