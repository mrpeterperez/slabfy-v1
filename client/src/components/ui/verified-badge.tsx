import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { Asset } from "@shared/schema";

interface VerifiedBadgeProps {
  asset: Asset;
  className?: string;
}

/**
 * Determines if an asset is PSA verified based on certificate number and grader
 */
export const isPsaVerified = (asset: Asset): boolean => {
  return !!(asset.certNumber && asset.grader === 'PSA');
};

/**
 * Blue verified badge component for PSA-verified assets
 */
export const VerifiedBadge = ({ asset, className = "" }: VerifiedBadgeProps) => {
  if (!isPsaVerified(asset)) {
    return null;
  }

  return (
    <span title="PSA Verified - Data sourced from PSA API">
      <CheckBadgeIcon 
  className={`h-4 w-4 text-brand inline-block ${className}`}
      />
    </span>
  );
};