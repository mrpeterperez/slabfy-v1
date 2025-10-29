/**
 * @file asset-details-tabs.tsx
 * @description Component that displays tabs for navigating between different asset detail views with actions menu
 * @exports AssetDetailsTabs
 * @feature asset-details
 */

import React from "react";
import { Link } from "wouter";
import AssetActions from "./asset-actions";
import type { Asset } from "@shared/schema";

interface AssetDetailsTabsProps {
  assetId: string;
  currentTab: string;
  asset: Asset; // Now required for AssetActions
  isOwner?: boolean;
  isSold?: boolean;
}

const AssetDetailsTabs: React.FC<AssetDetailsTabsProps> = ({
  assetId,
  currentTab = "overview",
  asset,
  isOwner,
  isSold,
}) => {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "sales-comp", label: "Comps" },
    { id: "variations", label: "Variations" },
  ];

  return (
    <div className="sticky">
      <div className="flex justify-between items-center">
        {/* Tab navigation */}
        <nav className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={`/assets/${assetId}/${tab.id}`}
                className={`
                  whitespace-nowrap py-4 px-4 text-md font-medium flex-shrink-0
                  ${
                    isActive
                      ? "border-b-4 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground hover:border-border"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        
        {/* Actions menu after tabs - desktop only */}
        <div className="hidden lg:flex flex-shrink-0 ml-4">
          <AssetActions asset={asset} isOwner={isOwner} isSold={isSold} />
        </div>
      </div>
    </div>
  );
};

export default AssetDetailsTabs;
