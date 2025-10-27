import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine, YAxis } from 'recharts';
import { useSparklineData } from './use-sparkline-data';
import { SparklineTooltip } from './sparkline-tooltip';
import { useQuery } from '@tanstack/react-query';

interface PortfolioSparklineProps { assetId: string; fallbackAssetId?: string; className?: string; }
interface PricingData { averagePrice: number; highestPrice: number; lowestPrice: number; liquidity: string; confidence: number; lastSaleDate: string | null; salesCount: number; exitTime: string; }

export const PortfolioSparkline: React.FC<PortfolioSparklineProps> = ({ assetId, fallbackAssetId, className = '' }) => {
  const { data: sparklineResult, isLoading, error } = useSparklineData(assetId, { fallbackAssetId });
  const sparklineData = sparklineResult?.data;
  const isUsingAllTime = sparklineResult?.isUsingAllTime;
  const { data: pricingData } = useQuery<PricingData>({ queryKey: [`/api/pricing/${assetId}`], enabled: !!assetId, staleTime: 300000, gcTime: 600000 });
  const actualApiAverage = pricingData?.averagePrice;
  if (isLoading) return <div className={`w-24 h-16 bg-muted rounded animate-pulse ${className}`} />;
  if (error || !sparklineData || sparklineData.length === 0) return <div className={`w-24 h-16 bg-muted rounded flex items-center justify-center ${className}`}><span className="text-xs text-muted-foreground font-medium">No Data</span></div>;
  const firstPrice = sparklineData[0]?.price || 0; const lastPrice = sparklineData[sparklineData.length - 1]?.price || 0; const isUpTrend = lastPrice >= firstPrice; const strokeColor = isUpTrend ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  const prices = sparklineData.map(p => p.price); const minPrice = Math.min(...prices); const maxPrice = Math.max(...prices); const range = maxPrice - minPrice; const padding = range * 0.30; const yMin = Math.max(0, minPrice - padding); const yMax = maxPrice + padding;
  const averagePrice = actualApiAverage || (sparklineData.reduce((s, p) => s + p.price, 0) / sparklineData.length);
  return (<div className={`h-16 ${className}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={sparklineData} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}><YAxis hide domain={[yMin, yMax]} /><ReferenceLine y={averagePrice} stroke="hsl(var(--muted-foreground))" strokeWidth={0.8} strokeDasharray="1 1" strokeOpacity={0.4} /><Line type="monotone" dataKey="price" stroke={strokeColor} strokeWidth={2.5} dot={false} activeDot={{ r: 3, fill: strokeColor, strokeWidth: 0 }} /><Tooltip content={<SparklineTooltip actualApiAverage={actualApiAverage} isUsingAllTime={isUsingAllTime} />} cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '2 2' }} position={{ x: undefined, y: -10 }} offset={5} allowEscapeViewBox={{ x: true, y: true }} /></LineChart></ResponsiveContainer></div>);
};

export default PortfolioSparkline;
