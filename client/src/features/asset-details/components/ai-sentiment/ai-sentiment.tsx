// 🤖 INTERNAL NOTE (LLM):
// This file defines the AiSentiment component that displays AI-generated market analysis.
// It renders insights about market trends, player performance, population data, and other factors.
// Part of the `asset-details` feature.
// Uses Lucide icons for visual indicators.

import React from "react";
import { TrendingUp, Flame, Droplets, LineChart } from "lucide-react";

/**
 * Component that displays AI-generated sentiment analysis for an asset
 */
const AiSentiment = () => {
  // This is dummy data - will be replaced with real API data in the future
  const sentimentData = {
    trend: "Trending Bullish",
    insights: [
      {
        type: "trend",
        icon: <TrendingUp className="h-4 w-4 text-success" />,
        text: "Draft hype building 🔥"
      },
      {
        type: "performance",
  icon: <Flame className="h-4 w-4 text-warning" />,
        text: "Flagg's DOMINANT performance at Duke is translating into hot collector sentiment"
      },
      {
        type: "population",
  icon: <Droplets className="h-4 w-4 text-brand" />,
        text: "Recent PSA 10 spikes indicate growing confidence among serious collectors"
      },
      {
        type: "market",
        icon: <LineChart className="h-4 w-4 text-purple-500" />,
        text: "Market metrics show sustained demand with limited supply hitting auctions"
      }
    ]
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="text-md font-medium font-heading mb-4">AI Sentiment</h3>
      
      {/* Trend Indicator */}
      <div className="flex items-center mb-4">
        <TrendingUp className="h-5 w-5 text-success mr-2" />
        <span className="font-medium text-success">{sentimentData.trend}</span>
      </div>
      
      {/* Insights List */}
      <div className="space-y-4">
        {sentimentData.insights.map((insight, index) => (
          <div key={index} className="flex">
            <div className="mr-3 mt-1">{insight.icon}</div>
            <p className="text-sm text-foreground">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiSentiment;