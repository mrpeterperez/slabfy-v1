import React from "react";

export type CollectionTab = "assets" | "settings";

interface CollectionTabsProps {
  currentTab: CollectionTab;
  onChange: (tab: CollectionTab) => void;
  className?: string;
}

// Horizontal tabs styled like AssetDetailsTabs (border-bottom active indicator)
export const CollectionTabs: React.FC<CollectionTabsProps> = ({ currentTab, onChange, className }) => {
  const tabs: Array<{ id: CollectionTab; label: string }> = [
    { id: "assets", label: "Assets" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className={`sticky bg-background ${className || ""}`}>
      <nav className="flex overflow-x-auto scrollbar-hide border-b border-border">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap py-2 px-4 text-md font-medium flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded-sm ${
                isActive
                  ? "border-b-4 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default CollectionTabs;
