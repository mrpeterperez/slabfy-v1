import type { Collection, InsertCollection, UpdateCollection, CollectionAsset, InsertCollectionAsset, CollectionWithDetails } from "@shared/schema";

export interface ICollectionsStorage {
  getCollectionsByUserId(userId: string, archived?: boolean): Promise<CollectionWithDetails[]>;
  getCollectionById(collectionId: string): Promise<Collection | undefined>;
  createCollection(userId: string, collection: InsertCollection): Promise<Collection>;
  updateCollection(collectionId: string, data: UpdateCollection): Promise<Collection | undefined>;
  deleteCollection(collectionId: string): Promise<boolean>;
  archiveCollection(collectionId: string): Promise<Collection | undefined>;
  unarchiveCollection(collectionId: string): Promise<Collection | undefined>;
  getCollectionAssets(collectionId: string): Promise<any[]>;
  getCollectionAssetsWithOwnership(collectionId: string, userId: string): Promise<any[]>;
  addAssetToCollection(data: InsertCollectionAsset): Promise<CollectionAsset>;
  removeAssetFromCollection(collectionId: string, globalAssetId: string): Promise<boolean>;
  getCollectionsSummary(userId: string): Promise<{ totalCollections: number; totalAssets: number; favoriteCollections: number; publicCollections: number; }>;
  getContactsSummary(userId: string, archived?: boolean): Promise<{ totalContacts: number; recentContacts: number; contactsWithEmail: number; contactsWithPhone: number; }>;
}
