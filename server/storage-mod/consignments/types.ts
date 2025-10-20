import type {
  Consignment,
  InsertConsignment,
  UpdateConsignment,
  Consignor,
  UpdateConsignor,
  ConsignmentWithDetails,
  ConsignmentAsset,
  InsertConsignmentAsset,
  InsertContact,
  ConsignorWithContact,
  UpdateConsignmentAsset
} from "@shared/schema";

export interface IConsignmentsStorage {
  generateNextConsignmentTitle(userId: string): Promise<string>;
  createConsignment(consignment: InsertConsignment & { userId: string }, consignor: InsertContact): Promise<Consignment>;
  createConsignmentAsset(data: InsertConsignmentAsset): Promise<ConsignmentAsset>;
  getConsignmentsByUserId(userId: string, archived?: boolean): Promise<ConsignmentWithDetails[]>;
  getConsignmentById(consignmentId: string): Promise<Consignment | undefined>;
  getConsignmentWithDetails(consignmentId: string): Promise<ConsignmentWithDetails | undefined>;
  getConsignmentAssets(consignmentId: string): Promise<any[]>;
  addAssetToConsignment(consignmentId: string, globalAssetId: string, askingPrice?: number): Promise<any>;
  updateConsignmentAsset(consignmentId: string, assetId: string, data: Partial<UpdateConsignmentAsset>): Promise<any>;
  removeAssetFromConsignment(consignmentId: string, assetId: string): Promise<boolean>;
  updateConsignment(consignmentId: string, data: UpdateConsignment): Promise<Consignment | undefined>;
  deleteConsignment(consignmentId: string): Promise<boolean>;
  getConsignorByConsignmentId(consignmentId: string): Promise<ConsignorWithContact | undefined>;
  updateConsignor(consignmentId: string, data: UpdateConsignor): Promise<ConsignorWithContact | undefined>;
  archiveConsignment(consignmentId: string): Promise<Consignment | undefined>;
  unarchiveConsignment(consignmentId: string): Promise<Consignment | undefined>;
  bulkArchiveConsignments(consignmentIds: string[]): Promise<number>;
  bulkUnarchiveConsignments(consignmentIds: string[]): Promise<number>;
}
