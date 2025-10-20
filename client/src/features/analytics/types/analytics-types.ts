// Analytics feature types - unified transaction interface
export interface AnalyticsTransaction {
  id: string;
  type: 'sales' | 'purchase';
  date: string;
  amount: number | string;
  paymentMethod: string;
  
  // Asset details
  assetTitle: string;
  assetPlayerName?: string;
  assetSetName?: string;
  assetYear?: string;
  assetGrade?: string;
  
  // Contact details
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactType: 'buyer' | 'seller';
  
  // Navigation context
  eventId?: string;
  eventName?: string;
  buyingSessionId?: string | null;
  
  // Additional metadata
  notes?: string;
  profit?: number;
}

export interface AnalyticsFilters {
  type?: 'sales' | 'purchase' | 'all';
  startDate?: string;
  endDate?: string;
  search?: string;
  eventId?: string; // Filter by specific event/show
}

export interface AnalyticsSummary {
  totalSales: number;
  totalPurchases: number;
  totalRevenue: number;
  totalSpent: number;
  netProfit: number;
  transactionCount: number;
}