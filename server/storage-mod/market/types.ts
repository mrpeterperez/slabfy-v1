import type { SalesHistory, InsertSalesHistory } from "@shared/schema";

export interface IMarketStorage {
  getSalesRecords(cardIdentifier: string): Promise<SalesHistory[]>;
  createSalesRecord(record: InsertSalesHistory): Promise<SalesHistory>;
  getSalesFetch(cardIdentifier: string): Promise<any>;
  upsertSalesFetch(data: any): Promise<any>;
}
