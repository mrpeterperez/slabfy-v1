// Shared metrics: thresholds, labels, colors and helpers
export type ConfidenceLevel = "low" | "medium" | "high";
export type Liquidity = "fire" | "hot" | "warm" | "cool" | "cold" | "unknown";

export const clampPct = (v: number) =>
  Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

export const getConfidenceLevel = (v: number): ConfidenceLevel => {
  const pct = clampPct(v);
  if (pct >= 80) return "high";
  if (pct >= 60) return "medium";
  return "low";
};

export const confidenceLabel: Record<
  ConfidenceLevel,
  "High" | "Medium" | "Low"
> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const confidenceBarColor: Record<ConfidenceLevel, string> = {
  high: "bg-success",
  medium: "bg-warning",
  low: "bg-destructive",
};

export const confidenceTextColor: Record<ConfidenceLevel, string> = {
  high: "text-success",
  medium: "text-warning",
  low: "text-destructive",
};

export const liquidityLevel: Record<Liquidity, number> = {
  fire: 5,
  hot: 4,
  warm: 3,
  cool: 2,
  cold: 1,
  unknown: 0,
};

export const liquidityPercent: Record<Liquidity, number> = {
  fire: 85,
  hot: 70,
  warm: 50,
  cool: 30,
  cold: 15,
  unknown: 0,
};

export const liquidityExitTime: Record<Liquidity, string> = {
  fire: "1-2 weeks",
  hot: "2-3 weeks",
  warm: "3-4 weeks",
  cool: "4-6 weeks",
  cold: "6-8 weeks",
  unknown: "—",
};

export const liquidityLabel: Record<Liquidity, "High" | "Medium" | "Low" | "Unknown"> = {
  fire: "High",
  hot: "High",
  warm: "Medium",
  cool: "Low",
  cold: "Low",
  unknown: "Unknown",
};
