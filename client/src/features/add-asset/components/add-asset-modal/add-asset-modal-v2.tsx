// 🤖 INTERNAL NOTE (LLM):
// This file defines the AddAssetModalV2 component - the upgraded version with PSA cert scanning.
// It renders a dialog for adding assets to a collection through certificate scanning.
// Part of the `add-asset` feature.
// Supports multi-certificate batch processing with table interface.

import { useState, useEffect, useRef, Suspense, lazy } from "react";
import {
  ScanLine,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";
import { ScannedCertsTable, type EnhancedCertListItem } from "./scanned-certs-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Cache invalidation
import { invalidateAfterAssetAddition } from "@/lib/cache-invalidation";
// PSA QR code processing functions
interface ScanResult {
  certNumber: string | null;
  isPSA: boolean;
  originalValue: string;
}

function extractPSANumber(url: string): string {
  return url.split('/cert/')[1].split('/')[0];
}

function processScanResult(scannedValue: string): ScanResult {
  const trimmed = scannedValue.trim();
  
  // Check if it's a PSA URL
  if (trimmed.includes('psacard.com/cert/')) {
    try {
      const certNumber = extractPSANumber(trimmed);
      return {
        certNumber,
        isPSA: true,
        originalValue: trimmed
      };
    } catch (error) {
      return {
        certNumber: null,
        isPSA: false,
        originalValue: trimmed
      };
    }
  }
  
  // If it's just a number (direct cert number entry)
  const numberMatch = trimmed.match(/^\d+$/);
  if (numberMatch) {
    return {
      certNumber: trimmed,
      isPSA: false,
      originalValue: trimmed
    };
  }
  
  // Return original value if not a PSA URL or pure number
  return {
    certNumber: trimmed,
    isPSA: false,
    originalValue: trimmed
  };
}

// Dynamically import the ManualAddAssetDialog component
const ManualAddAssetDialog = lazy(() =>
  import("../../components/manual-asset-entry").then((module) => ({
    default: module.ManualAddAssetDialog,
  })),
);

// Define types for certificate status
type CertStatus = "pending" | "success" | "error" | "duplicate";

// Define type for certificate metadata (adapted to work with PSA API response)
interface CertMetadata {
  player: string;
  year: string;
  set: string;
  grade: string;
  title: string;
}

// Define type for certificate in the list
interface CertListItem extends EnhancedCertListItem {}

/**
 * Dialog component that provides PSA slab scanning functionality:
 * - Scanning PSA slabs via certificate number
 * - Entering cert number for BGS, SGC, and others manually
 * - Manual entry option
 * - Batch processing of multiple certificates
 */
interface AddAssetModalV2Props {
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Buy offer support
  buyOfferId?: string;
  // Consignment support
  consignmentId?: string;
  mode?: 'portfolio' | 'buyOffer' | 'consignment';
}

// PSA API scanner function (adapted to use existing endpoint)
const scanPSASlab = async (certNumber: string) => {
  const response = await fetch(`/api/psa-cert/${certNumber}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to lookup PSA certificate');
  }
  
  // Extract the actual PSA data from the response
  const psaData = data.data || data;
  
  // Return the full PSA data for complete asset creation
  return {
    metadata: {
      player: psaData?.playerName || 'Unknown Player',
      year: psaData?.year || 'Unknown Year',
      set: psaData?.setName || 'Unknown Set',
      grade: psaData?.grade || 'Unknown Grade',
      title: psaData?.title || `PSA Cert #${certNumber}`,
    },
    fullData: psaData // Include complete PSA response for asset creation
  };
};

// Asset mapping function (comprehensive PSA data mapping)
const mapPSACertDataToAsset = (psaData: any) => {
  return {
    type: 'graded',
    grader: 'PSA',
    title: psaData.title,
    playerName: psaData.playerName,
    setName: psaData.setName,
    year: psaData.year,
    cardNumber: psaData.cardNumber,
    variant: psaData.variant,
    grade: psaData.grade,
    category: psaData.category,
    labelType: psaData.labelType,
    specId: psaData.specId,
    specNumber: psaData.specNumber,
    reverseBarCode: psaData.reverseBarCode,
    psaImageFrontUrl: psaData.psaImageFrontUrl,
    psaImageBackUrl: psaData.psaImageBackUrl,
    isPsaDna: psaData.isPsaDna,
    isDualCert: psaData.isDualCert,
    primarySigners: psaData.primarySigners || [],
    otherSigners: psaData.otherSigners || [],
    autographGrade: psaData.autographGrade,
    totalPopulationWithQualifier: psaData.totalPopulationWithQualifier,
    t206PopulationAllBacks: psaData.t206PopulationAllBacks,
    t206PopulationHigherAllBacks: psaData.t206PopulationHigherAllBacks,
    itemStatus: psaData.itemStatus,
    serialNumber: psaData.serialNumber,
    serialMax: psaData.serialMax,
    totalPopulation: psaData.totalPopulation,
    populationHigher: psaData.populationHigher,
  };
};

export const AddAssetModalV2 = ({
  triggerButton,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  buyOfferId,
  consignmentId,
  mode = 'portfolio',
}: AddAssetModalV2Props = {}) => {
  // Support both controlled and uncontrolled modes
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  // Wrap the setOpen function to reset state when closing
  const setOpen = (newOpenState: boolean) => {
    // Reset state when closing the modal
    if (!newOpenState) {
      setCertNumber("");
      setCertList([]);
      setIsScanning(false);
    }

    // Call the appropriate setter
    if (setControlledOpen) {
      setControlledOpen(newOpenState);
    } else {
      setUncontrolledOpen(newOpenState);
    }
  };

  // State for the certificate scanning flow
  const [certNumber, setCertNumber] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [certList, setCertList] = useState<CertListItem[]>([]);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [isAddingAssets, setIsAddingAssets] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  // State for ownership detection dialog
  const [ownershipDialog, setOwnershipDialog] = useState<{
    open: boolean;
    certNumber: string;
    existingAssetId: string | null;
    pendingCert: CertListItem | null;
  }>({
    open: false,
    certNumber: "",
    existingAssetId: null,
    pendingCert: null,
  });
  
  // Check if user already owns this certificate
  const checkOwnership = async (certNumber: string): Promise<{ isOwned: boolean; assetId: string | null }> => {
    try {
      const response = await apiRequest("GET", `/api/user/${user?.id}/assets/check-duplicate/${certNumber}`);
      const result = await response.json();
      return {
        isOwned: result.exists,
        assetId: result.assetId || null,
      };
    } catch (error) {
      console.error("Error checking ownership:", error);
      return { isOwned: false, assetId: null };
    }
  };

  // Handle user choice in ownership dialog
  const handleOwnershipChoice = async (choice: 'view' | 'addAnyway' | 'cancel') => {
    const { pendingCert, existingAssetId } = ownershipDialog;
    
    // Close the dialog first
    setOwnershipDialog({
      open: false,
      certNumber: "",
      existingAssetId: null,
      pendingCert: null,
    });

    if (choice === 'cancel' && pendingCert) {
      // Remove the certificate from the list
      setCertList((prevList) => prevList.filter(c => c.id !== pendingCert.id));
      return;
    }

    if (choice === 'view' && existingAssetId) {
      // Close the add-asset modal and navigate to existing asset
      setOpen(false);
      navigate(`/assets/${existingAssetId}`);
      toast({
        title: "Viewing Existing Asset",
        description: "Redirected to your existing asset.",
      });
      return;
    }

    if (choice === 'addAnyway' && pendingCert) {
      // Continue with normal processing, bypassing ownership check
      await continueProcessing(pendingCert, true);
    }
  };

  // Continue processing after ownership dialog choice
  const continueProcessing = async (cert: CertListItem, bypassOwnershipCheck = false) => {
    try {
      // Fetch certificate data from the PSA API
      const result = await scanPSASlab(cert.certNumber);

      // Create global asset immediately after PSA scan
      const assetData = mapPSACertDataToAsset(result.fullData);
      const globalAssetData = {
        ...assetData,
        certNumber: cert.certNumber,
        psaImageFrontUrl: result.fullData?.psaImageFrontUrl || null,
        psaImageBackUrl: result.fullData?.psaImageBackUrl || null,
      };

      const globalAssetResponse = await apiRequest("POST", "/api/global-assets", globalAssetData);
      const globalAsset = await globalAssetResponse.json();
      result.fullData.globalAssetId = globalAsset.id;
      console.log(`✅ Global asset created: ${globalAsset.id}`);

      // Mark as success since user chose to add anyway
      setCertList((prevList) =>
        prevList.map((c) =>
          c.id === cert.id
            ? {
                ...c,
                status: "success",
                metadata: result.metadata,
                fullData: result.fullData,
              }
            : c,
        ),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process certificate";
      setCertList((prevList) =>
        prevList.map((c) =>
          c.id === cert.id
            ? {
                ...c,
                status: "error",
                error: errorMessage,
              }
            : c,
        ),
      );
      
      toast({
        title: "Certificate Processing Failed",
        description: `${cert.certNumber}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Removed complex queue management - certificates process immediately

  // Auto-focus the input when modal opens and after cert operations
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Re-focus the input when the certList changes (for continued scanning)
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [certList.length, open]);

  const handleManualEntryClick = () => {
    setOpen(false); // Close the current dialog
    // We'll show the manual dialog with a small delay to allow the first dialog to close
    setTimeout(() => {
      setManualDialogOpen(true); // Open the manual dialog
    }, 100);
  };

  const handleAddCert = async () => {
    if (certNumber.trim() === "") return;

    // Process the scanned/entered value to extract cert number
    const scanResult = processScanResult(certNumber.trim());
    
    // Use extracted cert number if it's a PSA QR code, otherwise use the original input
    const finalCertNumber = scanResult.certNumber || certNumber.trim();
    
    // Check if this certificate is already in the current list
    const isDuplicate = certList.some(cert => cert.certNumber === finalCertNumber);
    if (isDuplicate) {
      toast({
        title: "Duplicate Certificate",
        description: `Certificate #${finalCertNumber} is already in your list`,
        variant: "destructive",
      });
      setCertNumber(""); // Clear the input field
      // Re-focus immediately for next scan
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return;
    }
    
    // Show a toast if we detected and processed a PSA QR code
    if (scanResult.isPSA && scanResult.certNumber) {
      toast({
        title: "PSA QR Code Detected",
        description: `Extracted certificate number: ${finalCertNumber}`,
      });
    }

    // Add the new certificate to the list with pending status
    const newCert: CertListItem = {
      id: `cert-${Date.now()}`,
      certNumber: finalCertNumber,
      status: "pending",
      timestamp: Date.now(),
      ownershipType: 'personal',
    };

    const updatedList = [...certList, newCert];
    setCertList(updatedList);
    setCertNumber(""); // Clear the input field

    // Process immediately instead of using queue
    processCertificate(newCert);

    // Re-focus the input for the next scan with a small delay
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Removed queue processing - certificates process immediately

  // Process individual certificate with immediate PSA scanning (no sales delays)
  const processCertificate = async (cert: CertListItem) => {
    try {
      console.log(`🔄 Processing certificate ${cert.certNumber} - checking ownership first`);
      
      // Check ownership FIRST before doing any PSA API calls (skip only for consignment mode)
      const ownershipCheck = mode !== 'consignment' 
        ? await checkOwnership(cert.certNumber) 
        : { isOwned: false, assetId: null };
      
      if (ownershipCheck.isOwned) {
        console.log(`🔍 User already owns certificate ${cert.certNumber}`);
        
        // Show the ownership dialog instead of processing
        setOwnershipDialog({
          open: true,
          certNumber: cert.certNumber,
          existingAssetId: ownershipCheck.assetId,
          pendingCert: cert,
        });
        
        // Mark as duplicate for now (will be updated based on user choice)
        setCertList((prevList) =>
          prevList.map((c) =>
            c.id === cert.id
              ? {
                  ...c,
                  status: "duplicate",
                  metadata: {
                    player: "Already Owned",
                    year: "",
                    set: "",
                    grade: "",
                    title: `Certificate #${cert.certNumber}`,
                  },
                }
              : c,
          ),
        );
        
        return; // Stop processing here - dialog will handle next steps
      }

      // If not owned, continue with normal processing
      await continueProcessing(cert);
      
    } catch (error) {
      // Handle API errors
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to retrieve certificate information";

      setCertList((prevList) =>
        prevList.map((c) =>
          c.id === cert.id
            ? {
                ...c,
                status: "error",
                error: errorMessage,
              }
            : c,
        ),
      );

      toast({
        title: "Certificate Lookup Failed",
        description: `${cert.certNumber}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddCert();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Allow default paste behavior, but process after a short delay
    setTimeout(() => {
      const pastedValue = e.clipboardData.getData('text');
      const scanResult = processScanResult(pastedValue);
      
      if (scanResult.isPSA && scanResult.certNumber) {
        // Auto-submit if it's a PSA QR code
        setTimeout(() => {
          handleAddCert();
        }, 100);
      }
    }, 50);
  };

  const handleRemoveCert = (id: string) => {
    setCertList(certList.filter((cert) => cert.id !== id));
  };

  const getStatusIcon = (status: CertStatus) => {
    switch (status) {
      case "pending":
        return <Loader size={16} className="text-primary animate-spin" />;
      case "success":
        return <CheckCircle size={16} className="text-success" />;
      case "error":
        return <AlertCircle size={16} className="text-destructive" />;
      case "duplicate":
        return <AlertCircle size={16} className="text-orange-500" />;
      default:
        return null;
    }
  };

  const handleAddAssets = async () => {
    // Filter out only successful certs (exclude duplicates)
    const successfulCerts = certList.filter(
      (cert) => cert.status === "success" && cert.metadata,
    );

    if (successfulCerts.length === 0) {
      toast({
        title: "No valid assets",
        description: "There are no valid assets to add.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingAssets(true);
    
    try {
      // Array to store newly created asset IDs
      const newAssetIds: string[] = [];
      
      // Process each certificate sequentially with delays to prevent API rate limiting
      for (let i = 0; i < successfulCerts.length; i++) {
        const cert = successfulCerts[i];
        if (!cert.fullData) continue;

        // Add delay between API calls (except for the first one)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }

        // Transform cert data to asset data using the full PSA response
        const assetData = mapPSACertDataToAsset(cert.fullData);
        
        // Add user ID and cert number to the asset data
        const purchasePriceNumber = cert.purchasePrice ? parseFloat(cert.purchasePrice) : null;
        const completeAssetData: any = {
          ...assetData,
          userId: user?.id,
          certNumber: cert.certNumber,
          // Ensure required fields are present
          type: "graded", // PSA certificates are always graded
          title: cert.fullData?.title || `${cert.fullData?.playerName || "Unknown"} ${cert.fullData?.year || ""} ${cert.fullData?.setName || ""} ${cert.fullData?.cardNumber ? `#${cert.fullData.cardNumber}` : ""} ${cert.fullData?.variant ? `(${cert.fullData.variant})` : ""} ${cert.fullData?.grade || ""}`.trim(),
          // Ensure PSA images are included in the asset creation request
          psaImageFrontUrl: cert.fullData?.psaImageFrontUrl || null,
          psaImageBackUrl: cert.fullData?.psaImageBackUrl || null,
          // NEW FIELDS (only if personal ownership)
          purchasePrice: cert.ownershipType === 'personal' ? purchasePriceNumber : null,
          purchaseDate: cert.ownershipType === 'personal' ? (cert.purchaseDate || null) : null,
          serialNumber: cert.serialNumber ?? cert.fullData?.serialNumber ?? null,
          serialMax: cert.serialMax ?? cert.fullData?.serialMax ?? null,
          // Map UI ownership types to API enum (server expects 'own' | 'consignment')
          ownershipStatus: cert.ownershipType === 'personal' ? 'own' : 'consignment',
        };
        
        if (!user?.id) {
          throw new Error("User ID not found. Please log in again.");
        }

        // Send the asset to the appropriate API based on mode
        let response;
        if (mode === 'buyOffer' && buyOfferId) {
          // For buy offers: create global asset first, then add to staging
          const globalAssetResponse = await apiRequest("POST", "/api/global-assets", {
            ...completeAssetData,
            // Remove userId for global asset creation
            userId: undefined,
          });
          
          if (!globalAssetResponse.ok) {
            throw new Error("Failed to create global asset");
          }
          
          const globalAsset = await globalAssetResponse.json();
          
          // Add to buy offer staging assets
          response = await apiRequest("POST", `/api/buy-mode/buy-offers/${buyOfferId}/staging-assets`, {
            assetId: globalAsset.id,
            notes: `Added via PSA scan - Certificate #${cert.certNumber}`,
          });
        } else if (mode === 'consignment' && consignmentId) {
          // For consignments: create global asset first, then add to consignment
          const globalAssetResponse = await apiRequest("POST", "/api/global-assets", {
            ...completeAssetData,
            // Remove userId for global asset creation
            userId: undefined,
          });
          
          if (!globalAssetResponse.ok) {
            throw new Error("Failed to create global asset");
          }
          
          const globalAsset = await globalAssetResponse.json();
          
          // Add to consignment assets
          response = await apiRequest("POST", `/api/consignments/${consignmentId}/assets`, {
            globalAssetId: globalAsset.id,
            askingPrice: null, // Can be set later via the UI
          });
        } else {
          // For portfolio: always use complete asset data (global asset linking happens server-side)
          response = await apiRequest("POST", "/api/assets", completeAssetData);
        }
        
        // Parse the response regardless of status
        const responseData = await response.json();
        
        if (response.ok) {
          // If successful, add the new asset ID
          if (responseData && responseData.id) {
            newAssetIds.push(responseData.id);
          }
        } else {
          // Handle error response
          let errorMessage = "Failed to add asset";
          
          // Check for duplicate certification number error
          if (responseData.code === "DUPLICATE_CERT_NUMBER") {
            errorMessage = responseData.error || "This card has already been added to your collection";
          } else if (responseData.error) {
            // Use the error message from the server if available
            errorMessage = typeof responseData.error === 'string' 
              ? responseData.error 
              : JSON.stringify(responseData.error);
          }
          
          // Show error toast and throw to stop processing
          toast({
            title: "Error Adding Asset",
            description: errorMessage,
            variant: "destructive",
          });
          
          // Throw an error to stop processing
          throw new Error(errorMessage);
        }
      }

      // Invalidate and refetch queries based on mode
      if (mode === 'buyOffer' && buyOfferId) {
        // Invalidate buy offer queries using the correct query keys that match useAssets hook
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['evaluationAssets', buyOfferId] }),
          queryClient.invalidateQueries({ queryKey: ['cartAssets', buyOfferId] }),
          queryClient.refetchQueries({ queryKey: ['evaluationAssets', buyOfferId] }),
          queryClient.refetchQueries({ queryKey: ['cartAssets', buyOfferId] }),
        ]);
      } else if (mode === 'consignment' && consignmentId) {
        // Invalidate consignment queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] }),
          queryClient.refetchQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] }),
        ]);
      } else if (user?.id) {
        // Comprehensive cache invalidation for all new assets
        if (newAssetIds.length > 0) {
          await invalidateAfterAssetAddition(newAssetIds);
        }
      }
      
      // Show success message based on mode
      const destination = mode === 'buyOffer' ? 'buy offer' : mode === 'consignment' ? 'consignment' : 'collection';
      toast({
        title: "Assets Added",
        description: `Successfully added ${successfulCerts.length} asset${successfulCerts.length !== 1 ? "s" : ""} to your ${destination}. Pricing data is ready!`,
      });

      // Clear the cert list and close the dialog
      setCertList([]);
      setOpen(false);
      
      // Navigate based on mode - only navigate for portfolio mode
      if (mode === 'portfolio') {
        navigate("/portfolio");
      }
    } catch (error) {
      toast({
        title: "Failed to add assets",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAddingAssets(false);
    }
  };

  // Add a separate close button ref for focus management
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Render trigger button if provided */}
      {triggerButton && (
        <div onClick={() => setOpen(true)} className="inline-block">
          {triggerButton}
        </div>
      )}

      {/* Full-screen modal overlay */}
      {open && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 w-full h-full z-[99998] bg-background text-foreground"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close dialog"
              ref={closeButtonRef}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Action button on the right */}
            <div className="flex items-center gap-2">
              {certList.length > 0 && (
                <Button
                  onClick={handleAddAssets}
                  disabled={
                    isAddingAssets ||
                    certList.some((cert) => cert.status === "pending") ||
                    !certList.some((cert) => cert.status === "success")
                  }
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingAssets ? (
                    <>
                      <Loader size={16} className="animate-spin mr-2" />
                      Adding Assets...
                    </>
                  ) : (
                    <>
                      Add{" "}
                      {
                        certList.filter((cert) => cert.status === "success")
                          .length
                      }{" "}
                      Asset
                      {certList.filter((cert) => cert.status === "success")
                        .length !== 1
                        ? "s"
                        : ""}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
            <div className="w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
              {/* Title */}
              <h1 id="dialog-title" className="text-2xl font-semibold font-heading text-foreground mb-6 sm:mb-8">
                {mode === 'buyOffer' ? 'Add Asset to Buy Offer' : 'Add Asset'}
              </h1>

              <div className="flex flex-col space-y-4">
                {/* If no certificates yet, show the scan UI */}
                {certList.length === 0 ? (
                  <>
                    <div className="text-center space-y-4">
                      <h3 className="text-lg font-medium font-heading">Scan PSA Slabs</h3>
                      <div
                        className={`p-6 border-2 border-dashed ${
                          isScanning
                            ? "border-primary bg-primary-subtle"
                            : "border-border"
                        } rounded-lg inline-block mx-auto`}
                      >
                        <ScanLine
                          className={`h-12 w-12 ${
                            isScanning ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Scan PSA QR codes or enter certificate numbers below.
                      </p>
                    </div>

                 

                    <div className="text-center space-y-4 w-full">
                      
                      <div className="flex mx-auto">
                        <Input
                          ref={inputRef}
                          type="text"
                          placeholder="Scan QR Code or Enter Cert #"
                          className="rounded-r-none"
                          value={certNumber}
                          onChange={(e) => setCertNumber(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onPaste={handlePaste}
                          autoComplete="off"
                          autoFocus
                        />
                        <Button
                          onClick={handleAddCert}
                          disabled={certNumber.trim() === ""}
                          className="px-4 py-6 rounded-l-none"
                        >
                          <Plus size={18} />
                        </Button>
                      </div>
                    </div>

                    <div className="text-center w-full">
                      <Button
                        onClick={handleManualEntryClick}
                        variant="link"
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        Enter Manually
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* When certificates exist, show input field with + button */}
                    <div className="flex w-full">
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Scan QR Code or Enter Cert #"
                        className="rounded-r-none"
                        value={certNumber}
                        onChange={(e) => setCertNumber(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onPaste={handlePaste}
                        autoComplete="off"
                        autoFocus
                      />
                      <Button
                        onClick={handleAddCert}
                        disabled={certNumber.trim() === ""}
                        className="px-3 py-2 h-12 rounded-l-none"
                      >
                        <Plus size={18} />
                      </Button>
                    </div>

                    <ScannedCertsTable
                      certs={certList}
                      onChange={setCertList}
                      onRemove={handleRemoveCert}
                      disableActions={isAddingAssets}
                    />
                  </>
                )}

                {/* Bottom spacing */}
                <div className="h-16"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Only render the manual dialog when needed */}
      {manualDialogOpen && (
        <Suspense fallback={<div>Loading...</div>}>
          <ManualAddAssetDialog
            open={manualDialogOpen}
            onOpenChange={setManualDialogOpen}
          />
        </Suspense>
      )}

      {/* Ownership Detection Dialog */}
      <AlertDialog 
        open={ownershipDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setOwnershipDialog({
              open: false,
              certNumber: "",
              existingAssetId: null,
              pendingCert: null,
            });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You Already Own This Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Certificate #{ownershipDialog.certNumber} is already in your collection. 
              What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel onClick={() => handleOwnershipChoice('cancel')}>
              Cancel
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => handleOwnershipChoice('addAnyway')}
            >
              Add Anyway
            </Button>
            <AlertDialogAction onClick={() => handleOwnershipChoice('view')}>
              View My Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};