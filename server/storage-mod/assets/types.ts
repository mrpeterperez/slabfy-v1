import type { GlobalAsset, UserAsset, InsertGlobalAsset, InsertUserAsset, Asset, InsertAsset } from "@shared/schema";

export interface IAssetsStorage {
  // New architecture
  createGlobalAsset(asset: InsertGlobalAsset & { id: string }): Promise<GlobalAsset>;
  findGlobalAssetByCert(certNumber: string): Promise<GlobalAsset | undefined>;
  findUserAssetByCertAndUser(certNumber: string, userId: string): Promise<UserAsset | undefined>;
  createUserAsset(userAsset: InsertUserAsset & { id: string }): Promise<UserAsset>;
  getUserAssetsByUserId(userId: string): Promise<UserAsset[]>;

  // Legacy compatibility
  createAsset(asset: InsertAsset & { id: string }): Promise<Asset>;
  getAssetsByUserId(userId: string, limit?: number, offset?: number): Promise<Asset[]>;
  getConsignmentAssetsByUserId?(userId: string): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  getAssetById(id: string): Promise<Asset | undefined>;
  getAssetByCertNumber(certNumber: string): Promise<Asset | undefined>;
  getAssetByPsaCert(certNumber: string): Promise<Asset | undefined>;
  updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset>;
  deleteAsset(id: string): Promise<void>;
}
