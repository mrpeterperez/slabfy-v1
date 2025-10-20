import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type SentimentPoint = { text: string; emoji: string };
type SentimentData = {
  trend: "BULLISH" | "BEARISH";
  trendDetail: string;
  trendEmoji: string;
  points: SentimentPoint[];
};

const AISentimentSimple: React.FC<{ sentiment?: SentimentData }> = ({ sentiment }) => {
  // This would be populated from your schema/AI analysis
  const sentimentData = sentiment || {
    trend: "BULLISH", // Could be "BULLISH" or "BEARISH"
    trendDetail: "Draft hype building",
    trendEmoji: "🔥",
    points: [
      {
        text: "Flagg's DOMINANT performance at Duke is translating into hot collector sentiment",
        emoji: "🔥",
      },
      {
        text: "Recent PSA 10 spikes indicate growing confidence among serious collectors",
        emoji: "💎",
      },
      {
        text: "Market metrics show sustained demand with limited supply hitting auctions",
        emoji: "📈",
      },
    ],
  };

  const isBullish = sentimentData.trend === "BULLISH";

  return (
    <div className="bg-card rounded-lg border">
      <h2 className="text-2xl font-bold font-heading mb-4">AI Sentiment</h2>

  <div className="border-t border-border pt-4 pb-4">
        <div className="flex items-center">
          {isBullish ? (
            <TrendingUp className="text-success mr-3" size={24} />
          ) : (
            <TrendingDown className="text-destructive mr-3" size={24} />
          )}
          <div>
            <div className="text-foreground font-bold text-lg">
              TRENDING {sentimentData.trend}
            </div>
            <div className="text-muted-foreground">
              {sentimentData.trendDetail} {sentimentData.trendEmoji}
            </div>
          </div>
        </div>
      </div>

      {sentimentData.points.map((point: SentimentPoint, index: number) => (
        <React.Fragment key={index}>
          <div className="border-t border-border py-4">
            <div className="flex">
              <span className="text-xl mr-3">{point.emoji}</span>
              <p className="text-foreground">{point.text}</p>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default AISentimentSimple;
