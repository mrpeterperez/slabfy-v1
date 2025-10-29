// 🤖 INTERNAL NOTE (LLM):
// This file defines the MobileChartLayout component that manages shared hover state
// between the AssetHeader and ChartComponent for mobile responsive design.
// Part of the `asset-details` feature.
import { useState } from "react";
import { Asset } from "@shared/schema";
import { AssetImages } from "./asset-images";
import { ChartComponent } from "./overview-tab";

interface MobileChartLayoutProps {
  asset: Asset;
}

export const MobileChartLayout: React.FC<MobileChartLayoutProps> = ({ asset }) => {
  // Shared hover state between header and chart
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoveredChange, setHoveredChange] = useState<{
    value: number;
    percent: number;
  } | null>(null);

  // Handler to update hover state from chart
  const handleChartHover = (price: number | null, date: string | null, change: { value: number; percent: number } | null) => {
    setHoveredPrice(price);
    setHoveredDate(date);
    setHoveredChange(change);
  };

  return (
    <div className="w-full">
      <ChartComponent cardData={asset} />
    </div>
  );
};