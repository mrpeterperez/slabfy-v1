// 🤖 INTERNAL NOTE:
// Purpose: Modal component showing full card details with PSA data and add to cart
// Exports: CardDetailsModal component
// Feature: show-storefront (public)
// Dependencies: ShadCN Dialog, Badge, Button, Asset type

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, ExternalLink, Award, Users, TrendingUp } from "lucide-react";
import type { Asset } from "@shared/schema";

interface CardDetailsModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  enableCartHolds: boolean;
  primaryColor: string;
  onAddToCart?: (asset: Asset) => void;
}

export function CardDetailsModal({
  asset,
  isOpen,
  onClose,
  enableCartHolds,
  primaryColor,
  onAddToCart,
}: CardDetailsModalProps) {
  const [selectedImage, setSelectedImage] = useState<"front" | "back">("front");

  if (!asset) return null;

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(asset);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {asset.playerName || "Card Details"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {asset.year} {asset.setName} #{asset.cardNumber}
            {asset.variant && ` - ${asset.variant}`}
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Left: Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              {selectedImage === "front" ? (
                asset.psaImageFrontUrl || asset.assetImages?.[0] ? (
                  <img
                    src={selectedImage === "front" ? (asset.psaImageFrontUrl || asset.assetImages?.[0] || "") : (asset.psaImageBackUrl || "")}
                    alt={`${asset.playerName} - ${selectedImage}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image Available
                  </div>
                )
              ) : (
                asset.psaImageBackUrl ? (
                  <img
                    src={asset.psaImageBackUrl}
                    alt={`${asset.playerName} - back`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Back Image
                  </div>
                )
              )}
            </div>

            {/* Image Selector */}
            {asset.psaImageBackUrl && (
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedImage("front")}
                  className={`flex-1 aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === "front" ? "border-primary" : "border-muted"
                  }`}
                >
                  {asset.psaImageFrontUrl || asset.assetImages?.[0] ? (
                    <img
                      src={asset.psaImageFrontUrl || asset.assetImages?.[0] || ""}
                      alt="Front thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                      Front
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setSelectedImage("back")}
                  className={`flex-1 aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === "back" ? "border-primary" : "border-muted"
                  }`}
                >
                  {asset.psaImageBackUrl ? (
                    <img
                      src={asset.psaImageBackUrl}
                      alt="Back thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                      Back
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            {/* Grade Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                GRADING
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  <Award className="h-5 w-5 mr-2" />
                  {asset.grader} {asset.grade}
                </Badge>
                {asset.autographGrade && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    Auto: {asset.autographGrade}
                  </Badge>
                )}
              </div>
              {asset.certNumber && (
                <p className="text-sm text-muted-foreground mt-2">
                  Certificate: {asset.certNumber}
                </p>
              )}
            </div>

            <Separator />

            {/* Card Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                CARD DETAILS
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year:</span>
                  <span className="font-semibold">{asset.year || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Set:</span>
                  <span className="font-semibold">{asset.setName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card #:</span>
                  <span className="font-semibold">{asset.cardNumber || "N/A"}</span>
                </div>
                {asset.variant && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variant:</span>
                    <span className="font-semibold">{asset.variant}</span>
                  </div>
                )}
                {asset.category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sport:</span>
                    <span className="font-semibold">{asset.category}</span>
                  </div>
                )}
                {asset.serialNumbered && asset.serialNumber && asset.serialMax && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial #:</span>
                    <span className="font-semibold">
                      {asset.serialNumber}/{asset.serialMax}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Population Data */}
            {(asset.totalPopulation || asset.populationHigher) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    PSA POPULATION
                  </h3>
                  <div className="space-y-2 text-sm">
                    {asset.totalPopulation && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Graded:</span>
                        <span className="font-semibold">
                          {asset.totalPopulation.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {asset.totalPopulationWithQualifier && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">With Qualifier:</span>
                        <span className="font-semibold">
                          {asset.totalPopulationWithQualifier.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {asset.populationHigher && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Higher Grades:</span>
                        <span className="font-semibold">
                          {asset.populationHigher.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Special Attributes */}
            {(asset.isPsaDna || asset.isDualCert) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    SPECIAL ATTRIBUTES
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {asset.isPsaDna && (
                      <Badge variant="outline">PSA/DNA Certified</Badge>
                    )}
                    {asset.isDualCert && (
                      <Badge variant="outline">Dual Certified</Badge>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              {enableCartHolds && (
                <Button
                  className="flex-1"
                  size="lg"
                  style={{ backgroundColor: primaryColor }}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
