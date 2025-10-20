export interface IPortfolioStorage {
  getPortfolioSummary(userId: string): Promise<{
    totalAssets: number;
    totalPurchaseValue: number;
    totalMarketValue: number;
    totalConsignmentValue: number;
    breakdown: {
      owned: {
        count: number;
        purchaseValue: number;
        marketValue: number;
        personalValue: number;
      };
      consignment: {
        count: number;
        consignorValue: number;
        askingValue: number;
        marketValue: number;
      };
    };
  }>;
}
