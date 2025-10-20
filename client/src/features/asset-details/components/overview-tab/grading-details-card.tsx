import React from "react";
import { Asset as BaseAsset } from "@shared/schema";

// Extend the base Asset type with PSA-specific optional fields that may be present
type PsaExtras = {
  specNumber?: string | number | null;
  specId?: string | number | null;
  t206PopulationAllBacks?: number | null;
  t206PopulationHigherAllBacks?: number | null;
  labelType?: string | null;
  reverseBarCode?: boolean | null;
  isPsaDna?: boolean | null;
  isDualCert?: boolean | null;
  autographGrade?: string | null;
  primarySigners?: string[] | null;
  otherSigners?: string[] | null;
  itemStatus?: string | null;
  totalPopulationWithQualifier?: number | null;
};

type Asset = BaseAsset & Partial<PsaExtras>;

interface GradingDetailsBoxProps {
  asset: Asset;
}

const GradingDetailsBox = ({ asset }: GradingDetailsBoxProps) => {
  // Use the directly provided asset data
  const gradingData = asset;
  const isPsaGraded = gradingData.grader === 'PSA';

  return (
    <div className="bg-card p-6 rounded-lg border">
      <div className="pb-4 border-b">
        <div className="text-md font-bold">Grading Details</div>
      </div>

      <div className="py-2 border-b flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Grading Company</div>
        <div className="font-semibold text-right text-sm">
          {gradingData.grader || "-"}
        </div>
      </div>

      <div className="py-2 border-b flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Grade</div>
        <div className="font-semibold text-right text-sm">
          {gradingData.grade || "-"}
        </div>
      </div>

      {/* PSA-specific population data */}
      {isPsaGraded && typeof gradingData.totalPopulation === 'number' && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Population</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.totalPopulation.toLocaleString()}
          </div>
        </div>
      )}

      {isPsaGraded && typeof gradingData.populationHigher === 'number' && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Higher Grade</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.populationHigher.toLocaleString()}
          </div>
        </div>
      )}

      <div className="py-2 border-b flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Authentication</div>
        <div className="font-semibold text-right text-sm">
          {gradingData.isPsaDna ? "PSA/DNA" : "-"}
        </div>
      </div>

      <div className="py-2 border-b flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Dual Certified</div>
        <div className="font-semibold text-right text-sm">
          {gradingData.isDualCert ? "Yes" : "-"}
        </div>
      </div>

      {/* PSA-specific label information */}
      {gradingData.labelType && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Label Type</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.labelType}
          </div>
        </div>
      )}

      {isPsaGraded && gradingData.reverseBarCode !== undefined && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Reverse Barcode</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.reverseBarCode ? "Yes" : "No"}
          </div>
        </div>
      )}

      {/* PSA Spec Number - only show if available */}
      {isPsaGraded && gradingData.specNumber && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Spec Number</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.specNumber}
          </div>
        </div>
      )}

      {/* PSA Spec ID - only show if available */}
      {isPsaGraded && gradingData.specId && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Spec ID</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.specId.toString()}
          </div>
        </div>
      )}

      {/* Population with qualifier - only show if greater than 0 */}
      {isPsaGraded && typeof gradingData.totalPopulationWithQualifier === 'number' && gradingData.totalPopulationWithQualifier > 0 && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Pop. w/ Qualifier</div>
          <div className="font-semibold text-right">
            {gradingData.totalPopulationWithQualifier.toLocaleString()}
          </div>
        </div>
      )}

      {/* T206 Population All Backs - only show if available */}
      {isPsaGraded && typeof gradingData.t206PopulationAllBacks === 'number' && gradingData.t206PopulationAllBacks > 0 && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">T206 Pop. All Backs</div>
          <div className="font-semibold text-right">
            {gradingData.t206PopulationAllBacks.toLocaleString()}
          </div>
        </div>
      )}

      {/* T206 Population Higher All Backs - only show if available */}
      {isPsaGraded && typeof gradingData.t206PopulationHigherAllBacks === 'number' && gradingData.t206PopulationHigherAllBacks > 0 && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">T206 Higher All Backs</div>
          <div className="font-semibold text-right">
            {gradingData.t206PopulationHigherAllBacks.toLocaleString()}
          </div>
        </div>
      )}

      {/* Label Type - only show if available */}
      {isPsaGraded && gradingData.labelType && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Label Type</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.labelType}
          </div>
        </div>
      )}

      {/* PSA/DNA Status - only show if true */}
      {isPsaGraded && gradingData.isPsaDna && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">PSA/DNA</div>
          <div className="font-semibold text-right text-sm">
            Yes
          </div>
        </div>
      )}

      {/* Dual Certificate - only show if true */}
      {isPsaGraded && gradingData.isDualCert && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Dual Certificate</div>
          <div className="font-semibold text-right text-sm">
            Yes
          </div>
        </div>
      )}

      {/* Autograph Grade - only show if available */}
      {isPsaGraded && gradingData.autographGrade && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Autograph Grade</div>
          <div className="font-semibold text-right">
            {gradingData.autographGrade}
          </div>
        </div>
      )}

      {/* Primary Signers - only show if available */}
      {isPsaGraded && gradingData.primarySigners && gradingData.primarySigners.length > 0 && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Primary Signers</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.primarySigners.join(', ')}
          </div>
        </div>
      )}

      {/* Other Signers - only show if available */}
      {isPsaGraded && gradingData.otherSigners && gradingData.otherSigners.length > 0 && (
        <div className="py-2 border-b flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Other Signers</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.otherSigners.join(', ')}
          </div>
        </div>
      )}

      {/* Item Status - only show if available */}
      {isPsaGraded && gradingData.itemStatus && (
        <div className="py-2 flex justify-between items-center">
          <div className="text-muted-foreground text-sm">Item Status</div>
          <div className="font-semibold text-right text-sm">
            {gradingData.itemStatus}
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingDetailsBox;
