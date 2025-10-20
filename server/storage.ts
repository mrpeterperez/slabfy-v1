// 🤖 INTERNAL NOTE:
// Purpose: Primary database storage implementation covering user, asset, contacts, and related domain data access
// Exports: DatabaseStorage class and storage singleton used across server routes
// Feature: infrastructure
// Dependencies: @shared/schema, drizzle-orm, ./db, crypto

import {
  users, salesHistory, globalAssets, userAssets, events, cardShows, psaCertCache, salesFetches,
  consignments, contacts, consignors, consignmentAssets, collections, collectionAssets,
  sellers, buyers, buyOffers, salesTransactions,
  storefrontSettings, eventStorefrontSettings, storefrontAnalytics, storefrontCartHolds,
  storefrontOrders, storefrontOrderItems,
  buyingDeskSettings, counterOffers,
  type User, type InsertUser, type SalesHistory, type InsertSalesHistory, type GlobalAsset, type UserAsset,
  type InsertGlobalAsset, type InsertUserAsset, type Asset, type InsertAsset, type Event, type InsertEvent,
  type UpdateEvent, type CardShow, type InsertCardShow, type SalesRecord, type InsertSalesRecord, 
  type SalesFetch, type InsertSalesFetch, type Consignment, type InsertConsignment, type UpdateConsignment,
  type Consignor, type InsertConsignor, type UpdateConsignor, type ConsignmentWithDetails,
  type ConsignorWithContact,
  type ConsignmentAsset, type InsertConsignmentAsset, type UpdateConsignmentAsset,
  type Contact, type InsertContact, type Collection, type InsertCollection, type UpdateCollection,
  type CollectionAsset, type InsertCollectionAsset, type CollectionWithDetails
} from "@shared/schema";
import { sql, and, or, isNull, ne, inArray, eq, desc, type SQL } from "drizzle-orm";
import { db as defaultDb } from "./db";
import crypto from "crypto";
import { type ModularStorage } from "./storage-mod";

type ContactInsert = typeof contacts.$inferInsert;

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseNumeric = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapConsignmentAsset = (consignmentAsset: ConsignmentAsset, globalAsset?: GlobalAsset | null) => ({
  ...consignmentAsset,
  title: globalAsset?.title ?? null,
  playerName: globalAsset?.playerName ?? null,
  setName: globalAsset?.setName ?? null,
  year: globalAsset?.year ?? null,
  cardNumber: globalAsset?.cardNumber ?? null,
  variant: globalAsset?.variant ?? null,
  grade: globalAsset?.grade ?? null,
  grader: globalAsset?.grader ?? null,
  certNumber: globalAsset?.certNumber ?? null,
  assetImages: globalAsset?.assetImages ?? null,
  psaImageFrontUrl: (globalAsset as any)?.psaImageFrontUrl ?? null,
  psaImageBackUrl: (globalAsset as any)?.psaImageBackUrl ?? null,
  liquidityRating: globalAsset?.liquidityRating ?? null,
  category: globalAsset?.category ?? null,
  type: globalAsset?.type ?? null,
  asset: globalAsset ?? undefined,
});

export class DatabaseStorage implements ModularStorage {
  constructor(private _db: any = defaultDb) {}
  
  // TEMPORARY: Stub implementations for ModularStorage interface
  // User and market methods have been migrated to modular storage (see storage-mod/user/user-storage.ts and storage-mod/market/market-storage.ts)
  // All other domain methods should be re-added here as needed.
  
  // User methods - TODO: delegate to UserStorage
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this._db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this._db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this._db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user || undefined;
  }
  
  async createUser(insertUser: InsertUser & { id: string }): Promise<User> {
    const [user] = await this._db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUserCollections(userId: string, collections: string[]): Promise<User> {
    const [updatedUser] = await this._db.update(users).set({ collections }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }
  
  async updateOnboardingStatus(userId: string, completed: boolean): Promise<User> {
    const [updatedUser] = await this._db.update(users).set({ onboardingComplete: completed ? "true" : "false" }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }
  
  async updateUserProfile(userId: string, profile: { name?: string; bio?: string; avatarUrl?: string | null }): Promise<User> {
    const [updatedUser] = await this._db.update(users).set(profile).where(eq(users.id, userId)).returning();
    return updatedUser;
  }
  
  async updateUsername(userId: string, username: string): Promise<User> {
    const lowerUsername = username.toLowerCase();
    const existingUser = await this.getUserByUsername(lowerUsername);
    if (existingUser && existingUser.id !== userId) {
      throw new Error("Username already taken");
    }
    const [updatedUser] = await this._db.update(users).set({ username: lowerUsername }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }
  
  async getUserPreferences(userId: string): Promise<any> {
    const [user] = await this._db.select().from(users).where(eq(users.id, userId));
    return (user as any)?.preferences || {};
  }
  
  async updateUserPreferences(userId: string, prefs: any): Promise<any> {
    const [updatedUser] = await this._db.update(users).set({ preferences: prefs }).where(eq(users.id, userId)).returning();
    return (updatedUser as any)?.preferences || {};
  }
  
  // Asset methods - TODO: delegate to AssetsStorage
  async createGlobalAsset(asset: InsertGlobalAsset & { id: string }): Promise<GlobalAsset> {
    const [newAsset] = await this._db.insert(globalAssets).values(asset).returning();
    return newAsset;
  }
  
  async findGlobalAssetByCert(certNumber: string): Promise<GlobalAsset | undefined> {
    const [asset] = await this._db.select().from(globalAssets).where(eq(globalAssets.certNumber, certNumber));
    return asset || undefined;
  }
  
  async findUserAssetByCertAndUser(certNumber: string, userId: string): Promise<UserAsset | undefined> {
    const globalAsset = await this.findGlobalAssetByCert(certNumber);
    if (!globalAsset) return undefined;
    const [userAsset] = await this._db.select().from(userAssets).where(and(eq(userAssets.globalAssetId, globalAsset.id), eq(userAssets.userId, userId)));
    return userAsset || undefined;
  }
  
  async createUserAsset(userAsset: InsertUserAsset & { id: string }): Promise<UserAsset> {
    const [newUserAsset] = await this._db.insert(userAssets).values(userAsset).returning();
    return newUserAsset;
  }
  
  async getUserAssetsByUserId(userId: string): Promise<UserAsset[]> {
    return await this._db.select().from(userAssets).where(and(
      eq(userAssets.userId, userId), 
      eq(userAssets.isActive, true),
      or(
        isNull(userAssets.ownershipStatus),
        ne(userAssets.ownershipStatus, "sold")
      ),
      or(
        isNull(userAssets.status),
        sql`LOWER(${userAssets.status}) != 'sold'`
      )
    ));
  }
  
  // Asset methods implementation
  async createAsset(asset: InsertAsset & { id: string }): Promise<Asset> {
    // For backward compatibility, we'll create both global asset and user asset
    const globalAssetId = crypto.randomUUID();
    
    // Create global asset
    const globalAssetData = {
      id: globalAssetId,
      type: asset.type,
      grader: asset.grader,
      certNumber: asset.certNumber,
      cardId: asset.certNumber || `${asset.year}-${asset.setName}-${asset.cardNumber}`.replace(/\s+/g, '-').toLowerCase(),
      playerName: asset.playerName,
      setName: asset.setName,
      year: asset.year,
      cardNumber: asset.cardNumber,
      variant: asset.variant,
      grade: asset.grade,
      assetImages: asset.assetImages || [],
      title: asset.title,
      category: asset.type,
      liquidityRating: "cold" as const
    };
    
    const [globalAsset] = await this._db.insert(globalAssets).values(globalAssetData).returning();
    
    // Create user asset
    const userAssetData = {
      id: asset.id,
      userId: asset.userId || '',
      globalAssetId: globalAssetId,
      personalValue: asset.purchasePrice ? Number(asset.purchasePrice) : null,
      purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : null,
      purchaseDate: asset.purchaseDate || null,
      purchaseSource: asset.purchaseSource || null,
      notes: asset.notes,
      ownershipStatus: asset.ownershipStatus || "own",
      serialNumbered: asset.serialNumbered || false,
      serialNumber: asset.serialNumber,
      serialMax: asset.serialMax,
      tags: [],
      favorited: false
    };
    
    await this._db.insert(userAssets).values(userAssetData);
    
    // Return legacy asset format
    return {
      id: asset.id,
      userId: asset.userId || '',
      type: asset.type,
      title: asset.title,
      playerName: asset.playerName,
      setName: asset.setName,
      year: asset.year,
      cardNumber: asset.cardNumber,
      variant: asset.variant,
      grader: asset.grader,
      grade: asset.grade,
      certNumber: asset.certNumber,
      purchasePrice: asset.purchasePrice,
      purchaseDate: asset.purchaseDate,
      purchaseSource: asset.purchaseSource,
      notes: asset.notes,
      serialNumbered: asset.serialNumbered,
      serialNumber: asset.serialNumber,
      serialMax: asset.serialMax,
      ownershipStatus: asset.ownershipStatus,
      assetStatus: asset.assetStatus,
      sourceSlug: asset.sourceSlug,
      imageUrl: asset.imageUrl,
      assetImages: asset.assetImages,
      globalAssetId: globalAssetId
    };
  }
  
  async getAssetsByUserId(userId: string, limit?: number, offset?: number): Promise<Asset[]> {
    const query = this._db
      .select({
        userAsset: userAssets,
        globalAsset: globalAssets
      })
      .from(userAssets)
      .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
      .where(and(eq(userAssets.userId, userId), eq(userAssets.isActive, true)));
      
    if (limit) query.limit(limit);
    if (offset) query.offset(offset);
    
    const results = await query;
    
    return results.map(({ userAsset, globalAsset }: { userAsset: any, globalAsset: any }) => ({
      id: userAsset.id,
      userId: userAsset.userId,
      type: globalAsset.type as any,
      title: globalAsset.title || '',
      playerName: globalAsset.playerName,
      setName: globalAsset.setName,
      year: globalAsset.year,
      cardNumber: globalAsset.cardNumber,
      variant: globalAsset.variant,
      grader: globalAsset.grader as any,
      grade: globalAsset.grade,
      certNumber: globalAsset.certNumber,
      purchasePrice: userAsset.purchasePrice ? Number(userAsset.purchasePrice) : null,
      purchaseDate: userAsset.purchaseDate ? (userAsset.purchaseDate instanceof Date ? userAsset.purchaseDate.toISOString() : userAsset.purchaseDate) : null,
      purchaseSource: userAsset.purchaseSource,
      notes: userAsset.notes,
      serialNumbered: userAsset.serialNumbered,
      serialNumber: userAsset.serialNumber,
      serialMax: userAsset.serialMax,
      ownershipStatus: userAsset.ownershipStatus as any,
      assetImages: globalAsset.assetImages as string[],
      globalAssetId: globalAsset.id,
      category: globalAsset.category,
      psaImageFrontUrl: globalAsset.psaImageFrontUrl,
      psaImageBackUrl: globalAsset.psaImageBackUrl,
      totalPopulation: globalAsset.totalPopulation,
      totalPopulationWithQualifier: globalAsset.totalPopulationWithQualifier,
      populationHigher: globalAsset.populationHigher,
      isPsaDna: globalAsset.isPsaDna,
      isDualCert: globalAsset.isDualCert,
      autographGrade: globalAsset.autographGrade
    }));
  }
  
  async getPortfolioValue(userId: string): Promise<number> {
    // This would require market pricing logic, return 0 for now
    return 0;
  }
  
  async getAsset(id: string): Promise<Asset | undefined> {
    const [result] = await this._db
      .select({
        userAsset: userAssets,
        globalAsset: globalAssets
      })
      .from(userAssets)
      .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
      .where(eq(userAssets.id, id));
      
    if (!result) return undefined;
    
    const { userAsset, globalAsset } = result;
    return {
      id: userAsset.id,
      userId: userAsset.userId,
      type: globalAsset.type as any,
      title: globalAsset.title || '',
      playerName: globalAsset.playerName,
      setName: globalAsset.setName,
      year: globalAsset.year,
      cardNumber: globalAsset.cardNumber,
      variant: globalAsset.variant,
      grader: globalAsset.grader as any,
      grade: globalAsset.grade,
      certNumber: globalAsset.certNumber,
      purchasePrice: userAsset.purchasePrice ? Number(userAsset.purchasePrice) : null,
      purchaseDate: userAsset.purchaseDate?.toISOString(),
      purchaseSource: userAsset.purchaseSource,
      notes: userAsset.notes,
      serialNumbered: userAsset.serialNumbered,
      serialNumber: userAsset.serialNumber,
      serialMax: userAsset.serialMax,
      ownershipStatus: userAsset.ownershipStatus as any,
      assetImages: globalAsset.assetImages as string[],
      globalAssetId: globalAsset.id,
      category: globalAsset.category,
      psaImageFrontUrl: globalAsset.psaImageFrontUrl,
      psaImageBackUrl: globalAsset.psaImageBackUrl,
      totalPopulation: globalAsset.totalPopulation,
      totalPopulationWithQualifier: globalAsset.totalPopulationWithQualifier,
      populationHigher: globalAsset.populationHigher,
      isPsaDna: globalAsset.isPsaDna,
      isDualCert: globalAsset.isDualCert,
      autographGrade: globalAsset.autographGrade
    };
  }
  
  async getAssetById(id: string): Promise<Asset | undefined> {
    return this.getAsset(id);
  }
  
  async getAssetByCertNumber(certNumber: string): Promise<Asset | undefined> {
    const [result] = await this._db
      .select({
        userAsset: userAssets,
        globalAsset: globalAssets
      })
      .from(userAssets)
      .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
      .where(eq(globalAssets.certNumber, certNumber));
      
    if (!result) return undefined;
    
    const { userAsset, globalAsset } = result;
    return {
      id: userAsset.id,
      userId: userAsset.userId,
      type: globalAsset.type as any,
      title: globalAsset.title || '',
      playerName: globalAsset.playerName,
      setName: globalAsset.setName,
      year: globalAsset.year,
      cardNumber: globalAsset.cardNumber,
      variant: globalAsset.variant,
      grader: globalAsset.grader as any,
      grade: globalAsset.grade,
      certNumber: globalAsset.certNumber,
      purchasePrice: userAsset.purchasePrice ? Number(userAsset.purchasePrice) : null,
      purchaseDate: userAsset.purchaseDate?.toISOString(),
      purchaseSource: userAsset.purchaseSource,
      notes: userAsset.notes,
      serialNumbered: userAsset.serialNumbered,
      serialNumber: userAsset.serialNumber,
      serialMax: userAsset.serialMax,
      ownershipStatus: userAsset.ownershipStatus as any,
      assetImages: globalAsset.assetImages as string[],
      globalAssetId: globalAsset.id,
      category: globalAsset.category,
      psaImageFrontUrl: globalAsset.psaImageFrontUrl,
      psaImageBackUrl: globalAsset.psaImageBackUrl,
      totalPopulation: globalAsset.totalPopulation,
      totalPopulationWithQualifier: globalAsset.totalPopulationWithQualifier,
      populationHigher: globalAsset.populationHigher,
      isPsaDna: globalAsset.isPsaDna,
      isDualCert: globalAsset.isDualCert,
      autographGrade: globalAsset.autographGrade
    };
  }
  
  async getAssetByPsaCert(certNumber: string): Promise<Asset | undefined> {
    return this.getAssetByCertNumber(certNumber);
  }
  
  async updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset> {
    // Update both user asset and global asset as needed
    const existingAsset = await this.getAsset(id);
    if (!existingAsset) {
      throw new Error(`Asset with id ${id} not found`);
    }
    
    // Update user asset
    const userAssetUpdates: any = {};
    if (asset.purchasePrice !== undefined) userAssetUpdates.purchasePrice = asset.purchasePrice;
    if (asset.purchaseDate !== undefined) userAssetUpdates.purchaseDate = asset.purchaseDate;
    if (asset.notes !== undefined) userAssetUpdates.notes = asset.notes;
    if (asset.ownershipStatus !== undefined) userAssetUpdates.ownershipStatus = asset.ownershipStatus;
    if (asset.serialNumbered !== undefined) userAssetUpdates.serialNumbered = asset.serialNumbered;
    if (asset.serialNumber !== undefined) userAssetUpdates.serialNumber = asset.serialNumber;
    if (asset.serialMax !== undefined) userAssetUpdates.serialMax = asset.serialMax;
    
    if (Object.keys(userAssetUpdates).length > 0) {
      userAssetUpdates.updatedAt = new Date();
      await this._db.update(userAssets).set(userAssetUpdates).where(eq(userAssets.id, id));
    }
    
    // Update global asset
    const globalAssetUpdates: any = {};
    if (asset.title !== undefined) globalAssetUpdates.title = asset.title;
    if (asset.playerName !== undefined) globalAssetUpdates.playerName = asset.playerName;
    if (asset.setName !== undefined) globalAssetUpdates.setName = asset.setName;
    if (asset.year !== undefined) globalAssetUpdates.year = asset.year;
    if (asset.cardNumber !== undefined) globalAssetUpdates.cardNumber = asset.cardNumber;
    if (asset.variant !== undefined) globalAssetUpdates.variant = asset.variant;
    if (asset.grader !== undefined) globalAssetUpdates.grader = asset.grader;
    if (asset.grade !== undefined) globalAssetUpdates.grade = asset.grade;
    if (asset.certNumber !== undefined) globalAssetUpdates.certNumber = asset.certNumber;
    if (asset.assetImages !== undefined) globalAssetUpdates.assetImages = asset.assetImages;
    
    if (Object.keys(globalAssetUpdates).length > 0 && existingAsset.globalAssetId) {
      globalAssetUpdates.updatedAt = new Date();
      await this._db.update(globalAssets).set(globalAssetUpdates).where(eq(globalAssets.id, existingAsset.globalAssetId));
    }
    
    // Return updated asset
    const updatedAsset = await this.getAsset(id);
    if (!updatedAsset) {
      throw new Error(`Failed to retrieve updated asset with id ${id}`);
    }
    return updatedAsset;
  }
  
  async deleteAsset(id: string): Promise<void> {
    // Soft delete by setting isActive to false
    await this._db.update(userAssets).set({ 
      isActive: false, 
      removedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(userAssets.id, id));
  }
  
  // Market methods - implemented below
  
  // Events methods - implemented below
  
  // Contacts methods - implemented below
  
  // Consignment methods implementation
  private _mapConsignmentWithStats(row: {
    consignment: Consignment;
    consignor: Consignor | null;
    contact: Contact | null;
    totalAssets?: unknown;
    totalValue?: unknown;
    pipelineValue?: unknown;
    potentialProfit?: unknown;
  }): ConsignmentWithDetails {
    const { consignment, consignor, contact } = row;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔍 [_mapConsignmentWithStats] consignment=${consignment.id}, consignor=${consignor ? 'exists' : 'null'}, contact=${contact ? 'exists' : 'null'}`);
    }
    
    const consignorName = contact?.name ?? (consignor ? "Unknown Consignor" : "");
    // Only include consignor if BOTH consignor AND contact exist
    // This prevents validation errors when contact is missing
    const consignorWithContact = (consignor && contact)
      ? { ...consignor, contact }
      : null;

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ [_mapConsignmentWithStats] returning consignorWithContact=${consignorWithContact ? 'object' : 'null'}`);
    }

    return {
      ...consignment,
      consignor: consignorWithContact,
      consignorName,
      totalAssets: parseNumeric(row.totalAssets),
      totalValue: parseNumeric(row.totalValue),
      pipelineValue: parseNumeric(row.pipelineValue),
      potentialProfit: parseNumeric(row.potentialProfit),
    };
  }

  async generateNextConsignmentTitle(userId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const existingConsignments = await this._db
      .select({ title: consignments.title })
      .from(consignments)
      .where(and(
        eq(consignments.userId, userId),
        sql`${consignments.title} LIKE ${'C-' + currentYear + '-%'}`
      ));
    
    // Extract numbers and find the next available
    const numbers = existingConsignments
      .map((c: any) => {
        const match = c.title.match(/C-\d{4}-(\d{4})/);
        return match ? parseInt(match[1]) : 0;
      })
      .sort((a: number, b: number) => b - a);
    
    const nextNumber = numbers.length > 0 ? numbers[0] + 1 : 1;
    return `C-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  }
  
  async createConsignment(consignment: InsertConsignment & { userId: string }, consignor: InsertContact): Promise<Consignment> {
    let contactId: string;
    
    // Check if a contact with this email already exists for this user
    const normalizedEmail = normalizeOptionalString(consignor.email);
    if (normalizedEmail) {
      const existingContact = await this._db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, consignment.userId),
            eq(contacts.email, normalizedEmail),
            eq(contacts.archived, false)
          )
        )
        .limit(1);
      
      if (existingContact.length > 0) {
        // Reuse existing contact
        contactId = existingContact[0].id;
      } else {
        // Create new contact
        contactId = crypto.randomUUID();
        const contactData: ContactInsert = {
          ...consignor,
          id: contactId,
          userId: consignment.userId,
          email: normalizedEmail,
          phone: normalizeOptionalString(consignor.phone),
          companyName: normalizeOptionalString(consignor.companyName),
          notes: normalizeOptionalString(consignor.notes),
        };
        await this._db.insert(contacts).values(contactData);
      }
    } else {
      // No email provided, create new contact
      contactId = crypto.randomUUID();
      const contactData: ContactInsert = {
        ...consignor,
        id: contactId,
        userId: consignment.userId,
        email: normalizedEmail,
        phone: normalizeOptionalString(consignor.phone),
        companyName: normalizeOptionalString(consignor.companyName),
        notes: normalizeOptionalString(consignor.notes),
      };
      await this._db.insert(contacts).values(contactData);
    }

    const consignorId = crypto.randomUUID();
    const consignorData = {
      id: consignorId,
      contactId,
      userId: consignment.userId,
      isActive: true,
    };

    await this._db.insert(consignors).values(consignorData);

    const consignmentId = crypto.randomUUID();
    const consignmentData = {
      ...consignment,
      id: consignmentId,
      consignorId,
    };

    const [newConsignment] = await this._db.insert(consignments).values(consignmentData).returning();
    return newConsignment;
  }
  
  async createConsignmentAsset(data: InsertConsignmentAsset): Promise<ConsignmentAsset> {
    const assetId = crypto.randomUUID();
    const assetData = {
      ...data,
      id: assetId
    };
    
    const [newAsset] = await this._db.insert(consignmentAssets).values(assetData).returning();
    return newAsset;
  }
  
  async getConsignmentsByUserId(userId: string, archived?: boolean, status?: string): Promise<ConsignmentWithDetails[]> {
    const filters: SQL[] = [eq(consignments.userId, userId)];
    
    // If status is provided, use status filtering (new system)
    if (status) {
      filters.push(eq(consignments.status, status));
    } else if (typeof archived === "boolean") {
      // Otherwise, use legacy archived filtering for backwards compatibility
      filters.push(eq(consignments.archived, archived));
    }
    
    const whereClause = filters.length > 1 ? and(...filters) : filters[0];

    const results = await this._db
      .select({
        consignment: consignments,
        consignor: consignors,
        contact: contacts,
        totalAssets: sql<number>`COALESCE(COUNT(${consignmentAssets.id}), 0)`.as('totalAssets'),
        totalValue: sql<string>`COALESCE(SUM(CASE WHEN ${consignmentAssets.status} = 'sold' THEN COALESCE(${consignmentAssets.soldPrice}::numeric, 0) ELSE 0 END), 0)`.as('totalValue'),
        pipelineValue: sql<string>`COALESCE(SUM(COALESCE(${consignmentAssets.askingPrice}::numeric, 0)), 0)`.as('pipelineValue'),
        potentialProfit: sql<string>`COALESCE(SUM(
          COALESCE(${consignmentAssets.askingPrice}::numeric, 0) *
          ((100 - COALESCE(${consignmentAssets.splitPercentage}, ${consignments.defaultSplitPercentage}, '95.00')::numeric) / 100.0)
        ), 0)`.as('potentialProfit'),
      })
      .from(consignments)
      .leftJoin(consignors, eq(consignments.consignorId, consignors.id))
      .leftJoin(contacts, eq(consignors.contactId, contacts.id))
      .leftJoin(consignmentAssets, eq(consignmentAssets.consignmentId, consignments.id))
      .where(whereClause)
      .groupBy(consignments.id, consignors.id, contacts.id)
      .orderBy(desc(consignments.createdAt));

    return results.map((row: {
      consignment: Consignment;
      consignor: Consignor | null;
      contact: Contact | null;
      totalAssets: unknown;
      totalValue: unknown;
      pipelineValue: unknown;
      potentialProfit: unknown;
    }) => this._mapConsignmentWithStats(row));
  }
  
  async getConsignmentById(consignmentId: string): Promise<Consignment | undefined> {
    const [consignment] = await this._db
      .select()
      .from(consignments)
      .where(eq(consignments.id, consignmentId));
    return consignment || undefined;
  }

  async getConsignmentWithDetails(consignmentId: string): Promise<ConsignmentWithDetails | undefined> {
    const [result] = await this._db
      .select({
        consignment: consignments,
        consignor: consignors,
        contact: contacts,
        totalAssets: sql<number>`COALESCE(COUNT(${consignmentAssets.id}), 0)`.as('totalAssets'),
        totalValue: sql<string>`COALESCE(SUM(CASE WHEN ${consignmentAssets.status} = 'sold' THEN COALESCE(${consignmentAssets.soldPrice}::numeric, 0) ELSE 0 END), 0)`.as('totalValue'),
        pipelineValue: sql<string>`COALESCE(SUM(COALESCE(${consignmentAssets.askingPrice}::numeric, 0)), 0)`.as('pipelineValue'),
        potentialProfit: sql<string>`COALESCE(SUM(
          COALESCE(${consignmentAssets.askingPrice}::numeric, 0) *
          ((100 - COALESCE(${consignmentAssets.splitPercentage}, ${consignments.defaultSplitPercentage}, '95.00')::numeric) / 100.0)
        ), 0)`.as('potentialProfit'),
      })
      .from(consignments)
      .leftJoin(consignors, eq(consignments.consignorId, consignors.id))
      .leftJoin(contacts, eq(consignors.contactId, contacts.id))
      .leftJoin(consignmentAssets, eq(consignmentAssets.consignmentId, consignments.id))
      .where(eq(consignments.id, consignmentId))
      .groupBy(consignments.id, consignors.id, contacts.id);

    if (!result) {
      return undefined;
    }

    return this._mapConsignmentWithStats(result);
  }

  async getConsignmentAssets(consignmentId: string): Promise<any[]> {
    const results = await this._db
      .select({
        consignmentAsset: consignmentAssets,
        globalAsset: globalAssets,
        buyerName: sql<string>`(
          SELECT buyer_name 
          FROM sales_transactions 
          WHERE sales_transactions.global_asset_id = ${consignmentAssets.globalAssetId}
            AND sales_transactions.source_type = 'consignment'
          ORDER BY sales_transactions.sale_date DESC
          LIMIT 1
        )`.as('buyer_name'),
        buyerContactId: sql<string>`(
          SELECT b.contact_id 
          FROM sales_transactions st
          LEFT JOIN buyers b ON st.buyer_id = b.id
          WHERE st.global_asset_id = ${consignmentAssets.globalAssetId}
            AND st.source_type = 'consignment'
          ORDER BY st.sale_date DESC
          LIMIT 1
        )`.as('buyer_contact_id'),
      })
      .from(consignmentAssets)
      .leftJoin(globalAssets, eq(consignmentAssets.globalAssetId, globalAssets.id))
      .where(eq(consignmentAssets.consignmentId, consignmentId))
      .orderBy(desc(consignmentAssets.addedAt));

    return results.map(({ consignmentAsset, globalAsset, buyerName, buyerContactId }: { consignmentAsset: ConsignmentAsset; globalAsset: GlobalAsset | null; buyerName: string | null; buyerContactId: string | null }) => ({
      ...mapConsignmentAsset(consignmentAsset, globalAsset),
      buyerName: buyerName ?? null,
      buyerContactId: buyerContactId ?? null,
    }));
  }

  /**
   * Get consignment summary using efficient SQL aggregations
   * @returns { assetsCount, revenue, pipelineValue, profit }
   */
  async getConsignmentSummary(consignmentId: string): Promise<{
    assetsCount: number;
    revenue: number;
    pipelineValue: number;
    profit: number;
  }> {
    const result = await this._db
      .select({
        assetsCount: sql<number>`COUNT(*)::int`,
        revenue: sql<number>`
          COALESCE(SUM(
            CASE 
              WHEN LOWER(${consignmentAssets.status}) = 'sold' 
              THEN COALESCE(${consignmentAssets.soldPrice}::numeric, 0)
              ELSE 0 
            END
          ), 0)::numeric
        `,
        pipelineValue: sql<number>`
          COALESCE(SUM(COALESCE(${consignmentAssets.askingPrice}::numeric, 0)), 0)::numeric
        `,
        profit: sql<number>`
          COALESCE(SUM(
            COALESCE(${consignmentAssets.askingPrice}::numeric, 0) * 
            (100 - COALESCE(${consignmentAssets.splitPercentage}::numeric, 95)) / 100
          ), 0)::numeric
        `,
      })
      .from(consignmentAssets)
      .where(eq(consignmentAssets.consignmentId, consignmentId));

    // Handle case where no assets exist (returns single row with nulls)
    if (!result || result.length === 0) {
      return {
        assetsCount: 0,
        revenue: 0,
        pipelineValue: 0,
        profit: 0,
      };
    }

    const stats = result[0];
    return {
      assetsCount: stats.assetsCount || 0,
      revenue: Number(stats.revenue) || 0,
      pipelineValue: Number(stats.pipelineValue) || 0,
      profit: Number(stats.profit) || 0,
    };
  }
  
  async addAssetToConsignment(
    consignmentId: string, 
    globalAssetId: string, 
    askingPrice?: number, 
    marketValue?: number,
    splitPercentage?: number
  ): Promise<any> {
    // Get consignment settings to apply pricing strategy
    const [consignment] = await this._db
      .select()
      .from(consignments)
      .where(eq(consignments.id, consignmentId));

    if (!consignment) {
      throw new Error("Consignment not found");
    }

    // Helper to round prices based on settings
    const roundPrice = (price: number, rounding: number): number => {
      return Math.round(price / rounding) * rounding;
    };

    // Calculate list price based on consignment pricing strategy
    let calculatedAskingPrice = askingPrice;
    let calculatedReservePrice: number | null = null;

    if (!askingPrice && marketValue && consignment.pricingMode === 'market') {
      // Calculate list price as market value + percentage
      const percentAbove = consignment.listPercentAboveMarket || 20;
      const rawListPrice = marketValue * (1 + percentAbove / 100);
      const rounding = consignment.listRounding || 5;
      calculatedAskingPrice = roundPrice(rawListPrice, rounding);

      // Calculate reserve price if enabled
      if (consignment.enableReserveStrategy) {
        if (consignment.reserveStrategy === 'match') {
          // Reserve matches market value
          const reserveRounding = consignment.reserveRounding || 1;
          calculatedReservePrice = roundPrice(marketValue, reserveRounding);
        } else if (consignment.reserveStrategy === 'percentage') {
          // Reserve is percentage of market value
          const percentOfMarket = consignment.reservePercentOfMarket || 100;
          const rawReservePrice = marketValue * (percentOfMarket / 100);
          const reserveRounding = consignment.reserveRounding || 1;
          calculatedReservePrice = roundPrice(rawReservePrice, reserveRounding);
        }
      }
    }

    // Use passed splitPercentage if provided, otherwise use consignment default
    // Only use passed value if it's a valid number (not null or NaN)
    const finalSplitPercentage = (splitPercentage !== undefined && splitPercentage !== null && typeof splitPercentage === 'number')
      ? splitPercentage.toString() 
      : (consignment.defaultSplitPercentage || "95.00");

    const assetData = {
      id: crypto.randomUUID(),
      consignmentId,
      globalAssetId,
      askingPrice: calculatedAskingPrice ? calculatedAskingPrice.toString() : null,
      reservePrice: calculatedReservePrice ? calculatedReservePrice.toString() : null,
      splitPercentage: finalSplitPercentage,
      status: "draft" as const
    };

    const [newAsset] = await this._db.insert(consignmentAssets).values(assetData).returning();

    const [globalAsset] = await this._db
      .select()
      .from(globalAssets)
      .where(eq(globalAssets.id, globalAssetId));

    return mapConsignmentAsset(newAsset, globalAsset);
  }

  async updateConsignmentAsset(
    consignmentId: string,
    assetId: string,
    data: Partial<UpdateConsignmentAsset>
  ): Promise<any> {
    const updateData: Record<string, any> = {
      ...data,
      updatedAt: new Date(),
    };

    const numericFields: (keyof UpdateConsignmentAsset)[] = [
      "askingPrice",
      "reservePrice",
      "soldPrice",
      "consignorPrice",
      "splitPercentage",
    ];

    for (const field of numericFields) {
      if (field in updateData) {
        const value = updateData[field];
        if (value === null || value === undefined || value === "") {
          updateData[field] = null;
        } else if (typeof value === "number") {
          updateData[field] = value.toString();
        }
      }
    }

    const [updatedAsset] = await this._db
      .update(consignmentAssets)
      .set(updateData)
      .where(and(eq(consignmentAssets.id, assetId), eq(consignmentAssets.consignmentId, consignmentId)))
      .returning();

    if (!updatedAsset) {
      return undefined;
    }

    const [globalAsset] = await this._db
      .select()
      .from(globalAssets)
      .where(eq(globalAssets.id, updatedAsset.globalAssetId));

    return mapConsignmentAsset(updatedAsset, globalAsset);
  }

  async updateConsignment(consignmentId: string, data: UpdateConsignment): Promise<Consignment | undefined> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    const [updatedConsignment] = await this._db
      .update(consignments)
      .set(updateData)
      .where(eq(consignments.id, consignmentId))
      .returning();
    
    return updatedConsignment || undefined;
  }
  
  async deleteConsignment(consignmentId: string): Promise<boolean> {
    // Use a transaction to ensure atomicity
    return await this._db.transaction(async (tx: typeof this._db) => {
      // First, get the consignment to identify the owner
      const [consignment] = await tx
        .select({ userId: consignments.userId })
        .from(consignments)
        .where(eq(consignments.id, consignmentId));

      if (!consignment) {
        return false; // Consignment not found
      }

      // Get all consignmentAssets for this consignment to identify globalAssetIds
      const consignmentAssetsToDelete = await tx
        .select({ globalAssetId: consignmentAssets.globalAssetId })
        .from(consignmentAssets)
        .where(eq(consignmentAssets.consignmentId, consignmentId));

      // If there are assets in the consignment, soft delete corresponding userAssets records
      // but ONLY for the consignment owner's assets to prevent cross-user data loss
      if (consignmentAssetsToDelete.length > 0) {
        const globalAssetIds = consignmentAssetsToDelete.map((asset: { globalAssetId: string }) => asset.globalAssetId);
        const now = new Date();
        
        // Soft delete userAssets records that belong to the consignment owner
        // and have ownershipStatus="consignment" and match the globalAssetIds
        await tx
          .update(userAssets)
          .set({
            isActive: false,
            removedAt: now,
            updatedAt: now
          })
          .where(
            and(
              eq(userAssets.userId, consignment.userId), // Critical: scope to consignment owner only
              eq(userAssets.ownershipStatus, "consignment"),
              inArray(userAssets.globalAssetId, globalAssetIds),
              eq(userAssets.isActive, true) // Only update active records
            )
          );
      }

      // Now delete the consignment (this will CASCADE delete consignmentAssets)
      const result = await tx
        .delete(consignments)
        .where(eq(consignments.id, consignmentId));

      return result.rowCount > 0;
    });
  }

  async removeAssetFromConsignment(consignmentId: string, assetId: string): Promise<boolean> {
    const removed = await this._db
      .delete(consignmentAssets)
      .where(and(eq(consignmentAssets.id, assetId), eq(consignmentAssets.consignmentId, consignmentId)))
      .returning({ id: consignmentAssets.id });

    return removed.length > 0;
  }

  async getConsignorByConsignmentId(consignmentId: string): Promise<ConsignorWithContact | undefined> {
    const [result] = await this._db
      .select({ consignor: consignors, contact: contacts })
      .from(consignments)
      .innerJoin(consignors, eq(consignments.consignorId, consignors.id))
      .innerJoin(contacts, eq(consignors.contactId, contacts.id))
      .where(eq(consignments.id, consignmentId));

    if (!result) {
      return undefined;
    }

    const { consignor, contact } = result;
    return {
      ...consignor,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      companyName: contact.companyName,
      contact,
    };
  }

  async updateConsignor(consignmentId: string, data: UpdateConsignor): Promise<ConsignorWithContact | undefined> {
    const consignment = await this.getConsignmentById(consignmentId);
    if (!consignment?.consignorId) return undefined;

    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    await this._db
      .update(consignors)
      .set(updateData)
      .where(eq(consignors.id, consignment.consignorId));

    return this.getConsignorByConsignmentId(consignmentId);
  }

  async archiveConsignment(consignmentId: string): Promise<Consignment | undefined> {
    const [updated] = await this._db
      .update(consignments)
      .set({ archived: true, updatedAt: new Date() })
      .where(eq(consignments.id, consignmentId))
      .returning();

    return updated || undefined;
  }

  async unarchiveConsignment(consignmentId: string): Promise<Consignment | undefined> {
    const [updated] = await this._db
      .update(consignments)
      .set({ archived: false, updatedAt: new Date() })
      .where(eq(consignments.id, consignmentId))
      .returning();

    return updated || undefined;
  }

  async bulkArchiveConsignments(consignmentIds: string[]): Promise<number> {
    if (consignmentIds.length === 0) return 0;

    const updated = await this._db
      .update(consignments)
      .set({ archived: true, updatedAt: new Date() })
      .where(inArray(consignments.id, consignmentIds))
      .returning({ id: consignments.id });

    return updated.length;
  }

  async bulkUnarchiveConsignments(consignmentIds: string[]): Promise<number> {
    if (consignmentIds.length === 0) return 0;

    const updated = await this._db
      .update(consignments)
      .set({ archived: false, updatedAt: new Date() })
      .where(inArray(consignments.id, consignmentIds))
      .returning({ id: consignments.id });

    return updated.length;
  }

  // Collections methods implementation
  async getCollectionsByUserId(userId: string, archived?: boolean): Promise<CollectionWithDetails[]> {
    const filters: SQL[] = [eq(collections.userId, userId)];
    
    // Filter by archived status if specified
    if (typeof archived === "boolean") {
      filters.push(eq(collections.archived, archived));
    }
    
    const whereClause = filters.length > 1 ? and(...filters) : filters[0];

    const results = await this._db
      .select({
        collection: collections,
        totalAssets: sql<number>`COALESCE(COUNT(${collectionAssets.id}), 0)`.as('totalAssets'),
        personalAssets: sql<number>`COALESCE(COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM ${userAssets} ua
          WHERE ua.global_asset_id = ${collectionAssets.globalAssetId}
            AND ua.user_id = ${userId}
            AND ua.is_active = true
            AND COALESCE(ua.ownership_status, 'own') <> 'consignment'
        ) THEN 1 END), 0)`.as('personalAssets'),
        consignmentAssets: sql<number>`COALESCE(COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM ${consignmentAssets} ca2
          JOIN ${consignments} c ON ca2.consignment_id = c.id
          WHERE ca2.global_asset_id = ${collectionAssets.globalAssetId}
            AND c.user_id = ${userId}
            AND c.status = 'active'
        ) THEN 1 END), 0)`.as('consignmentAssets'),
        // Placeholder for now; compute monetary value later
        totalValue: sql<string>`0`.as('totalValue')
      })
      .from(collections)
      .leftJoin(collectionAssets, eq(collections.id, collectionAssets.collectionId))
      .where(whereClause)
      .groupBy(collections.id)
      .orderBy(desc(collections.createdAt));

    return results.map((row: any) => ({
      ...row.collection,
      totalAssets: parseNumeric(row.totalAssets),
      totalValue: parseNumeric(row.totalValue),
      personalAssets: parseNumeric(row.personalAssets),
      consignmentAssets: parseNumeric(row.consignmentAssets),
    }));
  }
  
  async getCollectionById(collectionId: string): Promise<Collection | undefined> {
    const [collection] = await this._db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId));
    return collection || undefined;
  }
  
  async createCollection(userId: string, collection: InsertCollection): Promise<Collection> {
    const collectionId = crypto.randomUUID();
    const collectionData = {
      ...collection,
      id: collectionId,
      userId
    };
    
    const [newCollection] = await this._db.insert(collections).values(collectionData).returning();
    return newCollection;
  }
  
  async updateCollection(collectionId: string, data: UpdateCollection): Promise<Collection | undefined> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    const [updatedCollection] = await this._db
      .update(collections)
      .set(updateData)
      .where(eq(collections.id, collectionId))
      .returning();
    
    return updatedCollection || undefined;
  }
  
  async deleteCollection(collectionId: string): Promise<boolean> {
    const result = await this._db
      .delete(collections)
      .where(eq(collections.id, collectionId));
    
    return result.rowCount > 0;
  }
  
  async archiveCollection(collectionId: string): Promise<Collection | undefined> {
    const [archivedCollection] = await this._db
      .update(collections)
      .set({ archived: true, updatedAt: new Date() })
      .where(eq(collections.id, collectionId))
      .returning();
    
    return archivedCollection || undefined;
  }
  
  async unarchiveCollection(collectionId: string): Promise<Collection | undefined> {
    const [unarchivedCollection] = await this._db
      .update(collections)
      .set({ archived: false, updatedAt: new Date() })
      .where(eq(collections.id, collectionId))
      .returning();
    
    return unarchivedCollection || undefined;
  }
  
  async getCollectionAssets(collectionId: string): Promise<any[]> {
    const results = await this._db
      .select({
        collectionAsset: collectionAssets,
        globalAsset: globalAssets
      })
      .from(collectionAssets)
      .innerJoin(globalAssets, eq(collectionAssets.globalAssetId, globalAssets.id))
      .where(eq(collectionAssets.collectionId, collectionId));
    
    return results.map(({ collectionAsset, globalAsset }: { collectionAsset: any, globalAsset: any }) => ({
      ...collectionAsset,
      asset: globalAsset
    }));
  }

  async getCollectionAssetsWithOwnership(collectionId: string, userId: string): Promise<any[]> {
    const results = await this._db
      .select({
        // Collection asset fields
        id: collectionAssets.id,
        collectionId: collectionAssets.collectionId,
        globalAssetId: collectionAssets.globalAssetId,
        notes: collectionAssets.notes,
        addedAt: collectionAssets.addedAt,
        // Essential global asset fields only
        assetId: globalAssets.id,
        title: globalAssets.title,
        playerName: globalAssets.playerName,
        setName: globalAssets.setName,
        year: globalAssets.year,
        cardNumber: globalAssets.cardNumber,
        variant: globalAssets.variant,
        grade: globalAssets.grade,
        grader: globalAssets.grader,
        certNumber: globalAssets.certNumber,
        assetImages: globalAssets.assetImages,
        psaImageFrontUrl: globalAssets.psaImageFrontUrl,
        psaImageBackUrl: globalAssets.psaImageBackUrl,
        category: globalAssets.category,
        liquidityRating: globalAssets.liquidityRating,
        // Ownership information using subqueries to avoid duplicates
        isOwned: sql<boolean>`EXISTS(
          SELECT 1 FROM ${userAssets} ua 
          WHERE ua.global_asset_id = ${collectionAssets.globalAssetId} 
          AND ua.user_id = ${userId} 
          AND ua.is_active = true
        )`.as('isOwned'),
        userAssetId: sql<string | null>`(
          SELECT MIN(ua.id) FROM ${userAssets} ua 
          WHERE ua.global_asset_id = ${collectionAssets.globalAssetId} 
          AND ua.user_id = ${userId} 
          AND ua.is_active = true
        )`.as('userAssetId'),
        ownershipStatus: sql<string | null>`(
          CASE
            WHEN EXISTS(
              SELECT 1 FROM ${consignmentAssets} ca_inner 
              JOIN ${consignments} c ON ca_inner.consignment_id = c.id 
              WHERE ca_inner.global_asset_id = ${collectionAssets.globalAssetId} 
              AND c.user_id = ${userId} 
              AND c.status = 'active'
            ) THEN 'consignment'
            ELSE (
              SELECT ua.ownership_status FROM ${userAssets} ua 
              WHERE ua.global_asset_id = ${collectionAssets.globalAssetId} 
              AND ua.user_id = ${userId} 
              ORDER BY ua.added_at DESC
              LIMIT 1
            )
          END
        )`.as('ownershipStatus')
      })
      .from(collectionAssets)
      .innerJoin(globalAssets, eq(collectionAssets.globalAssetId, globalAssets.id))
      .where(
        and(
          eq(collectionAssets.collectionId, collectionId),
          // 🔥 Hide sold assets - match portfolio behavior
          sql`NOT EXISTS(
            SELECT 1 FROM ${userAssets} ua_sold 
            WHERE ua_sold.global_asset_id = ${collectionAssets.globalAssetId} 
            AND ua_sold.user_id = ${userId}
            AND ua_sold.ownership_status = 'sold'
            AND ua_sold.is_active = true
          )`
        )
      );
    
    return results.map((row: any) => ({
      id: row.id,
      collectionId: row.collectionId,
      globalAssetId: row.globalAssetId,
      notes: row.notes,
      addedAt: row.addedAt,
      userAssetId: row.userAssetId,
      isOwned: row.isOwned,
      ownershipType: row.ownershipStatus === 'consignment' ? 'consignment' : row.isOwned ? 'portfolio' : 'collection',
      asset: {
        id: row.assetId,
        title: row.title,
        playerName: row.playerName,
        setName: row.setName,
        year: row.year,
        cardNumber: row.cardNumber,
        variant: row.variant,
        grade: row.grade,
        grader: row.grader,
        certNumber: row.certNumber,
        assetImages: row.assetImages,
        psaImageFrontUrl: row.psaImageFrontUrl,
        psaImageBackUrl: row.psaImageBackUrl,
        category: row.category,
        liquidityRating: row.liquidityRating
      }
    }));
  }
  
  async addAssetToCollection(data: InsertCollectionAsset): Promise<CollectionAsset> {
    const assetId = crypto.randomUUID();
    const assetData = {
      ...data,
      id: assetId
    };
    
    const [newAsset] = await this._db.insert(collectionAssets).values(assetData).returning();
    return newAsset;
  }
  
  async removeAssetFromCollection(collectionId: string, globalAssetId: string): Promise<boolean> {
    const result = await this._db
      .delete(collectionAssets)
      .where(and(
        eq(collectionAssets.collectionId, collectionId),
        eq(collectionAssets.globalAssetId, globalAssetId)
      ));
    
    return result.rowCount > 0;
  }
  
  async getCollectionsSummary(userId: string): Promise<{ totalCollections: number; totalAssets: number; favoriteCollections: number; publicCollections: number; }> {
    const [collectionsData] = await this._db
      .select({
        totalCollections: sql<number>`COUNT(DISTINCT ${collections.id})`
          .as('totalCollections'),
        totalAssets: sql<number>`COUNT(DISTINCT ${collectionAssets.id})`
          .as('totalAssets'),
        favoriteCollections: sql<number>`COUNT(DISTINCT CASE WHEN ${collections.isFavorite} = true THEN ${collections.id} END)`
          .as('favoriteCollections'),
        publicCollections: sql<number>`COUNT(DISTINCT CASE WHEN ${collections.isPublic} = true THEN ${collections.id} END)`
          .as('publicCollections')
      })
      .from(collections)
      .leftJoin(collectionAssets, eq(collections.id, collectionAssets.collectionId))
      .where(
        and(
          eq(collections.userId, userId),
          eq(collections.archived, false) // Only count active (non-archived) collections
        )
      );
    
    return {
      totalCollections: Number(collectionsData?.totalCollections) || 0,
      totalAssets: Number(collectionsData?.totalAssets) || 0,
      favoriteCollections: Number(collectionsData?.favoriteCollections) || 0,
      publicCollections: Number(collectionsData?.publicCollections) || 0
    };
  }
  
  async getContactsSummary(userId: string, archived?: boolean): Promise<{ totalContacts: number; recentContacts: number; contactsWithEmail: number; contactsWithPhone: number; }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Build where conditions based on archived parameter
    let whereConditions = eq(contacts.userId, userId);
    if (archived !== undefined) {
      whereConditions = and(
        eq(contacts.userId, userId),
        eq(contacts.archived, archived)
      ) as any;
    }
    
    const [contactsData] = await this._db
      .select({
        totalContacts: sql<number>`COUNT(*)`
          .as('totalContacts'),
        recentContacts: sql<number>`COUNT(CASE WHEN ${contacts.createdAt} >= ${thirtyDaysAgo} THEN 1 END)`
          .as('recentContacts'),
        contactsWithEmail: sql<number>`COUNT(CASE WHEN ${contacts.email} IS NOT NULL AND ${contacts.email} != '' THEN 1 END)`
          .as('contactsWithEmail'),
        contactsWithPhone: sql<number>`COUNT(CASE WHEN ${contacts.phone} IS NOT NULL AND ${contacts.phone} != '' THEN 1 END)`
          .as('contactsWithPhone')
      })
      .from(contacts)
      .where(whereConditions);
    
    return {
      totalContacts: Number(contactsData?.totalContacts) || 0,
      recentContacts: Number(contactsData?.recentContacts) || 0,
      contactsWithEmail: Number(contactsData?.contactsWithEmail) || 0,
      contactsWithPhone: Number(contactsData?.contactsWithPhone) || 0
    };
  }
  
  // Events methods implementation
  async createEvent(event: InsertEvent & { id: string; userId: string }): Promise<Event> {
    const [newEvent] = await this._db.insert(events).values(event).returning();
    return newEvent;
  }
  
  async getEventsByUserId(userId: string, archived?: boolean): Promise<Event[]> {
    if (archived === undefined) {
      return await this._db.select().from(events).where(eq(events.userId, userId));
    }
    return await this._db
      .select()
      .from(events)
      .where(sql`${events.userId} = ${userId} AND ${events.archived} = ${archived}`);
  }
  
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await this._db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }
  
  async updateEvent(id: string, event: UpdateEvent): Promise<Event> {
    const updateData = {
      ...event,
      updatedAt: new Date()
    };
    
    const [updatedEvent] = await this._db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    
    if (!updatedEvent) {
      throw new Error(`Event with id ${id} not found`);
    }
    return updatedEvent;
  }
  
  async deleteEvent(id: string): Promise<void> {
    await this._db.delete(events).where(eq(events.id, id));
  }
  
  async getEventsSummary(userId: string): Promise<{ totalEvents: number; totalBuyOffers: number; totalSold: number; totalRevenue: number; totalProfit: number; }> {
    const [eventsData] = await this._db
      .select({
        totalEvents: sql<number>`COUNT(*)`
          .as('totalEvents')
      })
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          eq(events.archived, false) // Only count active (non-archived) events
        )
      );
    
    // For now, return basic data - other stats would need more complex queries
    return {
      totalEvents: Number(eventsData?.totalEvents) || 0,
      totalBuyOffers: 0,
      totalSold: 0,
      totalRevenue: 0,
      totalProfit: 0
    };
  }
  
  async searchCardShows(query: string, limit?: number): Promise<CardShow[]> {
    const queryBuilder = this._db
      .select()
      .from(cardShows)
      .where(sql`LOWER(${cardShows.name}) LIKE LOWER(${'%' + query + '%'})`);
      
    if (limit) {
      queryBuilder.limit(limit);
    }
    
    return await queryBuilder;
  }
  
  async getUpcomingCardShows(limit?: number): Promise<CardShow[]> {
    const today = new Date();
    const queryBuilder = this._db
      .select()
      .from(cardShows)
      .where(and(
        sql`${cardShows.dateStart} >= ${today}`,
        eq(cardShows.isActive, true)
      ))
      .orderBy(cardShows.dateStart);
      
    if (limit) {
      queryBuilder.limit(limit);
    }
    
    return await queryBuilder;
  }
  
  async getCardShowById(id: string): Promise<CardShow | undefined> {
    const [cardShow] = await this._db.select().from(cardShows).where(eq(cardShows.id, id));
    return cardShow || undefined;
  }
  
  // Contacts methods implementation
  async getContactsByUserId(userId: string, archived?: boolean): Promise<Contact[]> {
    const filters: SQL<unknown>[] = [eq(contacts.userId, userId)];
    if (archived !== undefined) {
      filters.push(eq(contacts.archived, archived));
    }

    let condition: SQL<unknown> = filters[0]!;
    for (let index = 1; index < filters.length; index += 1) {
      const nextCondition = and(condition, filters[index]!);
      if (nextCondition) {
        condition = nextCondition;
      }
    }

    return await this._db
      .select()
      .from(contacts)
      .where(condition)
      .orderBy(desc(contacts.updatedAt), desc(contacts.createdAt));
  }

  async getContactById(contactId: string): Promise<Contact | undefined> {
    const [contact] = await this._db.select().from(contacts).where(eq(contacts.id, contactId));
    return contact || undefined;
  }

  async createContact(contact: InsertContact & { userId: string }): Promise<Contact> {
    const normalizedEmail = normalizeOptionalString(contact.email);
    const normalizedPhone = normalizeOptionalString(contact.phone);
    
    // Business-grade contact management: Check for duplicate email (enforced constraint)
    if (normalizedEmail) {
      const existingEmailContact = await this._db
        .select({ id: contacts.id, name: contacts.name })
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, contact.userId),
            eq(contacts.email, normalizedEmail),
            eq(contacts.archived, false)
          )
        )
        .limit(1);
      
      if (existingEmailContact.length > 0) {
        const error = new Error("DUPLICATE_EMAIL");
        (error as any).existingContact = existingEmailContact[0];
        (error as any).email = normalizedEmail;
        throw error;
      }
    }
    
    // Business-grade contact management: Check for duplicate phone (warning only, not blocking)
    let phoneWarning = null;
    if (normalizedPhone) {
      const existingPhoneContacts = await this._db
        .select({ id: contacts.id, name: contacts.name, email: contacts.email })
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, contact.userId),
            eq(contacts.phone, normalizedPhone),
            eq(contacts.archived, false)
          )
        )
        .limit(3); // Limit to avoid performance issues
      
      if (existingPhoneContacts.length > 0) {
        phoneWarning = {
          message: `Phone number already exists for ${existingPhoneContacts.length} other contact(s)`,
          existingContacts: existingPhoneContacts
        };
      }
    }

    const contactId = crypto.randomUUID();
    const now = new Date();
    const contactData: ContactInsert = {
      id: contactId,
      userId: contact.userId,
      name: contact.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      companyName: normalizeOptionalString(contact.companyName),
      notes: normalizeOptionalString(contact.notes),
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const [newContact] = await this._db.insert(contacts).values(contactData).returning();
      
      // Return contact with phone warning if applicable
      if (phoneWarning) {
        (newContact as any)._phoneWarning = phoneWarning;
      }
      
      return newContact;
    } catch (dbError: any) {
      // Handle database constraint violation as fallback (in case of race conditions)
      if (dbError?.code === '23505' && dbError?.constraint?.includes('email')) {
        const error = new Error("DUPLICATE_EMAIL");
        (error as any).email = normalizedEmail;
        throw error;
      }
      throw dbError;
    }
  }

  async updateContact(contactId: string, data: Partial<InsertContact>): Promise<Contact | undefined> {
    const updateData: Partial<ContactInsert> = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.email !== undefined) {
      updateData.email = normalizeOptionalString(data.email);
    }
    if (data.phone !== undefined) {
      updateData.phone = normalizeOptionalString(data.phone);
    }
    if (data.companyName !== undefined) {
      updateData.companyName = normalizeOptionalString(data.companyName);
    }
    if (data.notes !== undefined) {
      updateData.notes = normalizeOptionalString(data.notes);
    }

    updateData.updatedAt = new Date();

    const [updatedContact] = await this._db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, contactId))
      .returning();

    return updatedContact || undefined;
  }

  async deleteContact(contactId: string): Promise<boolean> {
    const references = await this.getContactReferences(contactId);
    if (references.total > 0) {
      const error = new Error("CONTACT_HAS_DEPENDENCIES");
      (error as any).systems = references.systems;
      (error as any).references = references;
      throw error;
    }

    const result = await this._db.delete(contacts).where(eq(contacts.id, contactId));
    return result.rowCount > 0;
  }

  async archiveContact(contactId: string): Promise<Contact | undefined> {
    const [updatedContact] = await this._db
      .update(contacts)
      .set({ archived: true, updatedAt: new Date() })
      .where(eq(contacts.id, contactId))
      .returning();

    return updatedContact || undefined;
  }

  async unarchiveContact(contactId: string): Promise<Contact | undefined> {
    const [updatedContact] = await this._db
      .update(contacts)
      .set({ archived: false, updatedAt: new Date() })
      .where(eq(contacts.id, contactId))
      .returning();

    return updatedContact || undefined;
  }

  async bulkArchiveContacts(contactIds: string[]): Promise<number> {
    const result = await this._db
      .update(contacts)
      .set({ archived: true, updatedAt: new Date() })
      .where(inArray(contacts.id, contactIds));

    return result.rowCount;
  }

  async bulkUnarchiveContacts(contactIds: string[]): Promise<number> {
    const result = await this._db
      .update(contacts)
      .set({ archived: false, updatedAt: new Date() })
      .where(inArray(contacts.id, contactIds));

    return result.rowCount;
  }

  async getContactReferences(contactId: string): Promise<any> {
    const sellerRecords = await this._db
      .select({ id: sellers.id })
      .from(sellers)
      .where(eq(sellers.contactId, contactId));
    const buyerRecords = await this._db
      .select({ id: buyers.id })
      .from(buyers)
      .where(eq(buyers.contactId, contactId));
    const consignorRecords = await this._db
      .select({ id: consignors.id })
      .from(consignors)
      .where(eq(consignors.contactId, contactId));

    const sellerIds = sellerRecords
      .map((record: { id: string | null }) => record.id)
      .filter((id: string | null): id is string => typeof id === "string" && id.length > 0);
    const buyerIds = buyerRecords
      .map((record: { id: string | null }) => record.id)
      .filter((id: string | null): id is string => typeof id === "string" && id.length > 0);
    const consignorIds = consignorRecords
      .map((record: { id: string | null }) => record.id)
      .filter((id: string | null): id is string => typeof id === "string" && id.length > 0);

    const buyingSessions = sellerIds.length > 0
      ? await this._db
          .select({
            id: buyOffers.id,
            title: buyOffers.offerNumber,
            status: buyOffers.status,
            createdAt: buyOffers.createdAt,
          })
          .from(buyOffers)
          .where(inArray(buyOffers.sellerId, sellerIds))
          .orderBy(desc(buyOffers.createdAt))
      : [];

    const consignmentsWithContact = consignorIds.length > 0
      ? await this._db
          .select({
            id: consignments.id,
            title: consignments.title,
            status: consignments.status,
            createdAt: consignments.createdAt,
          })
          .from(consignments)
          .where(inArray(consignments.consignorId, consignorIds))
          .orderBy(desc(consignments.createdAt))
      : [];

    const salesConditions: SQL<unknown>[] = [];
    if (sellerIds.length > 0) {
      salesConditions.push(inArray(salesTransactions.sellerId, sellerIds));
    }
    if (buyerIds.length > 0) {
      salesConditions.push(inArray(salesTransactions.buyerId, buyerIds));
    }

    let sales: Array<{ id: string; title: string; salePrice: number; paymentMethod: string; eventName: string | null; eventId: string | null; createdAt: Date; role: "buyer" | "seller"; }> = [];
    if (salesConditions.length > 0) {
      let salesWhere: SQL<unknown> = salesConditions[0]!;
      for (let index = 1; index < salesConditions.length; index += 1) {
        const nextWhere = or(salesWhere, salesConditions[index]!);
        if (nextWhere) {
          salesWhere = nextWhere;
        }
      }
      type SalesReferenceRow = {
        id: string;
        title: string | null;
        salePrice: string | null;
        paymentMethod: string | null;
        createdAt: Date | null;
        saleDate: Date | null;
        sellerId: string | null;
        buyerId: string | null;
        eventName: string | null;
        eventId: string | null;
      };
      const salesRows: SalesReferenceRow[] = await this._db
        .select({
          id: salesTransactions.id,
          title: salesTransactions.id,
          salePrice: salesTransactions.salePrice,
          paymentMethod: salesTransactions.paymentMethod,
          createdAt: salesTransactions.createdAt,
          saleDate: salesTransactions.saleDate,
          sellerId: salesTransactions.sellerId,
          buyerId: salesTransactions.buyerId,
          eventName: events.name,
          eventId: salesTransactions.eventId,
        })
        .from(salesTransactions)
        .leftJoin(events, eq(salesTransactions.eventId, events.id))
        .where(salesWhere)
        .orderBy(desc(salesTransactions.createdAt));

      sales = salesRows.map((sale) => {
        const role: "buyer" | "seller" = sale.sellerId && sellerIds.includes(sale.sellerId) ? "seller" : "buyer";
        const createdAtValue = sale.saleDate ?? sale.createdAt ?? new Date();
        return {
          id: sale.id,
          title: sale.title ?? sale.id,
          salePrice: sale.salePrice ? Number(sale.salePrice) : 0,
          paymentMethod: sale.paymentMethod ?? "unknown",
          eventName: sale.eventName ?? null,
          eventId: sale.eventId ?? null,
          createdAt: createdAtValue,
          role,
        };
      });
    }

    const systems = new Set<string>();
    if (buyingSessions.length > 0) {
      systems.add("buyingDesk");
    }
    if (consignmentsWithContact.length > 0) {
      systems.add("consignments");
    }
    if (sales.length > 0) {
      systems.add("sales");
    }

    return {
      buyingSessions,
      consignments: consignmentsWithContact,
      sales,
      total: buyingSessions.length + consignmentsWithContact.length + sales.length,
      systems: Array.from(systems),
    };
  }
  
  // Market methods implementation
  async getSalesRecords(cardIdentifier: string): Promise<SalesHistory[]> {
    return await this._db
      .select()
      .from(salesHistory)
      .where(eq(salesHistory.card_id, cardIdentifier))
      .orderBy(sql`${salesHistory.sold_date} DESC`);
  }
  
  async createSalesRecord(record: InsertSalesHistory): Promise<SalesHistory> {
    const recordWithId = { id: crypto.randomUUID(), ...record };
    const [newRecord] = await this._db.insert(salesHistory).values(recordWithId).returning();
    return newRecord;
  }
  
  async getSalesFetch(cardIdentifier: string): Promise<any> {
    const [fetch] = await this._db
      .select()
      .from(salesFetches)
      .where(eq(salesFetches.cardIdentifier, cardIdentifier));
    return fetch || null;
  }
  
  async upsertSalesFetch(data: any): Promise<any> {
    // Check if record exists
    const existing = await this.getSalesFetch(data.cardIdentifier);
    
    if (existing) {
      // Update existing record
      const [updated] = await this._db
        .update(salesFetches)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(salesFetches.cardIdentifier, data.cardIdentifier))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [inserted] = await this._db
        .insert(salesFetches)
        .values(data)
        .returning();
      return inserted;
    }
  }
  
  // Portfolio methods
  async getPortfolioSummary(userId: string): Promise<any> {
    // This would require complex calculations across multiple tables
    return {};
  }

  // ============================================
  // SHOW STOREFRONT - Storage Methods
  // ============================================
  // Feature: Show Storefront (sales-channels)
  // Purpose: Database access for storefront settings, analytics, cart holds, buying desk
  
  // Storefront Settings - Global configuration for user's storefront
  async getStorefrontSettings(userId: string) {
    const [settings] = await this._db
      .select()
      .from(storefrontSettings)
      .where(eq(storefrontSettings.userId, userId));
    return settings || null;
  }

  async createStorefrontSettings(data: any) {
    const [created] = await this._db
      .insert(storefrontSettings)
      .values(data)
      .returning();
    return created;
  }

  async updateStorefrontSettings(userId: string, data: any) {
    const [updated] = await this._db
      .update(storefrontSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(storefrontSettings.userId, userId))
      .returning();
    return updated;
  }

  // Event Storefront Settings - Per-event overrides for storefront config
  async getEventStorefrontSettings(eventId: string) {
    const [settings] = await this._db
      .select()
      .from(eventStorefrontSettings)
      .where(eq(eventStorefrontSettings.eventId, eventId));
    return settings || null;
  }

  async createEventStorefrontSettings(data: any) {
    const [created] = await this._db
      .insert(eventStorefrontSettings)
      .values(data)
      .returning();
    return created;
  }

  async updateEventStorefrontSettings(eventId: string, data: any) {
    const [updated] = await this._db
      .update(eventStorefrontSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(eventStorefrontSettings.eventId, eventId))
      .returning();
    return updated;
  }

  async deleteEventStorefrontSettings(eventId: string) {
    await this._db
      .delete(eventStorefrontSettings)
      .where(eq(eventStorefrontSettings.eventId, eventId));
  }

  // Storefront Analytics - Track customer behavior and sales
  async createStorefrontAnalyticsEvent(data: any) {
    const [event] = await this._db
      .insert(storefrontAnalytics)
      .values(data)
      .returning();
    return event;
  }

  async getStorefrontAnalytics(userId: string, filters?: any) {
    let query = this._db
      .select()
      .from(storefrontAnalytics)
      .where(eq(storefrontAnalytics.userId, userId));

    if (filters?.eventId) {
      query = query.where(eq(storefrontAnalytics.eventId, filters.eventId));
    }
    if (filters?.eventType) {
      query = query.where(eq(storefrontAnalytics.eventType, filters.eventType));
    }
    if (filters?.startDate) {
      query = query.where(sql`${storefrontAnalytics.createdAt} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      query = query.where(sql`${storefrontAnalytics.createdAt} <= ${filters.endDate}`);
    }

    return await query.orderBy(desc(storefrontAnalytics.createdAt));
  }

  // Cart Holds - Temporary holds for assets during checkout
  async createCartHold(data: any) {
    const [hold] = await this._db
      .insert(storefrontCartHolds)
      .values(data)
      .returning();
    return hold;
  }

  async getCartHold(id: string) {
    const [hold] = await this._db
      .select()
      .from(storefrontCartHolds)
      .where(eq(storefrontCartHolds.id, id));
    return hold || null;
  }

  async getActiveCartHolds(eventId: string) {
    return await this._db
      .select()
      .from(storefrontCartHolds)
      .where(
        and(
          eq(storefrontCartHolds.eventId, eventId),
          sql`${storefrontCartHolds.expiresAt} > NOW()`
        )
      );
  }

  async deleteCartHold(id: string) {
    await this._db
      .delete(storefrontCartHolds)
      .where(eq(storefrontCartHolds.id, id));
  }

  async cleanupExpiredCartHolds() {
    await this._db
      .delete(storefrontCartHolds)
      .where(sql`${storefrontCartHolds.expiresAt} <= NOW()`);
  }

  // Buying Desk Settings - Configuration for buy offers and auto-deny rules
  async getBuyingDeskSettings(userId: string) {
    const [settings] = await this._db
      .select()
      .from(buyingDeskSettings)
      .where(eq(buyingDeskSettings.userId, userId));
    return settings || null;
  }

  async createBuyingDeskSettings(data: any) {
    const [created] = await this._db
      .insert(buyingDeskSettings)
      .values(data)
      .returning();
    return created;
  }

  async updateBuyingDeskSettings(userId: string, data: any) {
    const [updated] = await this._db
      .update(buyingDeskSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(buyingDeskSettings.userId, userId))
      .returning();
    return updated;
  }

  // Counter Offers - Negotiation system for buying desk
  async createCounterOffer(data: any) {
    const [offer] = await this._db
      .insert(counterOffers)
      .values(data)
      .returning();
    return offer;
  }

  async getCounterOffer(id: string) {
    const [offer] = await this._db
      .select()
      .from(counterOffers)
      .where(eq(counterOffers.id, id));
    return offer || null;
  }

  async getCounterOffersByBuyOffer(buyOfferId: string) {
    return await this._db
      .select()
      .from(counterOffers)
      .where(eq(counterOffers.buyOfferId, buyOfferId))
      .orderBy(desc(counterOffers.createdAt));
  }

  async updateCounterOffer(id: string, data: any) {
    const [updated] = await this._db
      .update(counterOffers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(counterOffers.id, id))
      .returning();
    return updated;
  }

  // Storefront Orders - Customer order requests from storefront checkout
  async createStorefrontOrder(data: any) {
    const orderWithId = { id: crypto.randomUUID(), ...data };
    const [order] = await this._db
      .insert(storefrontOrders)
      .values(orderWithId)
      .returning();
    return order;
  }

  async getStorefrontOrder(orderId: string) {
    const [order] = await this._db
      .select()
      .from(storefrontOrders)
      .where(eq(storefrontOrders.id, orderId));
    return order || null;
  }

  async getStorefrontOrdersByUser(userId: string, eventId?: string) {
    let query = this._db
      .select()
      .from(storefrontOrders)
      .where(eq(storefrontOrders.userId, userId));
    
    if (eventId) {
      query = query.where(eq(storefrontOrders.eventId, eventId));
    }
    
    return await query.orderBy(desc(storefrontOrders.createdAt));
  }

  async updateStorefrontOrder(orderId: string, data: any) {
    const [updated] = await this._db
      .update(storefrontOrders)
      .set(data)
      .where(eq(storefrontOrders.id, orderId))
      .returning();
    return updated;
  }

  async deleteStorefrontOrder(orderId: string) {
    await this._db
      .delete(storefrontOrders)
      .where(eq(storefrontOrders.id, orderId));
  }

  // Storefront Order Items
  async createStorefrontOrderItem(data: any) {
    const itemWithId = { id: crypto.randomUUID(), ...data };
    const [item] = await this._db
      .insert(storefrontOrderItems)
      .values(itemWithId)
      .returning();
    return item;
  }

  async getStorefrontOrderItems(orderId: string) {
    return await this._db
      .select()
      .from(storefrontOrderItems)
      .where(eq(storefrontOrderItems.orderId, orderId));
  }

  async deleteStorefrontOrderItem(itemId: string) {
    await this._db
      .delete(storefrontOrderItems)
      .where(eq(storefrontOrderItems.id, itemId));
  }
}

export const storage = new DatabaseStorage();