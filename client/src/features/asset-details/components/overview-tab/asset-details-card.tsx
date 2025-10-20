import React from "react";
import { Asset } from "@shared/schema";

interface AssetDetailsBoxProps {
  asset: Asset;
}

const AssetDetailsBox = ({ asset }: AssetDetailsBoxProps) => {
  // Use the directly provided asset data
  const cardData = asset;

  return (
    <div className="bg-card p-6 rounded-lg border">
      <div className="pb-4 border-b">
        <div className="text-md font-bold">Asset Details</div>
      </div>

      <div className="py-2 border-b flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Category</div>
        <div className="font-semibold text-right">
          {cardData.category || "-"}
        </div>
      </div>

      <div className="py-2 border-b flex justify-between items-center">
        <div className="text-muted-foreground text-sm ">Player Name</div>
        <div className="font-semibold text-right text-sm">
          {cardData.playerName || "-"}
        </div>
      </div>

      <div className="py-2 border-b flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Year</div>
        <div className="font-semibold text-right text-sm">{cardData.year || "-"}</div>
      </div>

      <div className="py-2 border-b flex justify-between items-center ">
        <div className="text-muted-foreground text-sm">Set Name</div>
        <div className="font-semibold text-right text-sm">
          {cardData.setName || "-"}
        </div>
      </div>

      <div className="py-2 border-b flex justify-between items-center ">
        <div className="text-muted-foreground text-sm">Card Number</div>
        <div className="font-semibold text-right text-sm">
          {cardData.cardNumber || "-"}
        </div>
      </div>

      {/* Variant field for PSA cards with parallels/variations */}
      {cardData.variant && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Variant</div>
          <div className="font-semibold text-right text-sm">
            {cardData.variant}
          </div>
        </div>
      )}

      <div className="py-2 flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Serial Numbered</div>
        <div className="font-semibold text-right text-sm">
          {cardData.serialNumbered
            ? `${cardData.serialNumber || "?"} / ${cardData.serialMax || "?"}`
            : "No"}
        </div>
      </div>

      {/* Certificate Number */}
      {cardData.certNumber && (
        <div className="py-2 border-t flex justify-between items-center mt-2">
          <div className="text-muted-foreground text-sm">Certificate Number</div>
          <div className="font-semibold text-right text-sm">
            {cardData.certNumber}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetDetailsBox;
