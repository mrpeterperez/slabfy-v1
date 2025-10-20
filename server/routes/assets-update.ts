// 🤖 INTERNAL NOTE:
// Purpose: Encapsulates patch logic for updating user-owned assets
// Exports: createAssetUpdateHandler
// Feature: assets
// Dependencies: express Response type, drizzle-orm, @shared/schema, ../db, ../supabase

import type { Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { userAssets, globalAssets, insertAssetSchema, type InsertAsset } from "@shared/schema";
import type { AuthenticatedRequest } from "../supabase";

type FetchAssetFn = (userAssetId: string, userId: string) => Promise<any | undefined>;

const updateAssetSchema = insertAssetSchema.partial();

const toNullableNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  const numericValue = typeof value === "string" ? Number(value) : value;
  return typeof numericValue === "number" && !Number.isNaN(numericValue) ? numericValue : null;
};

const toNullableInteger = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : Math.trunc(value);
  const parsedInt = parseInt(String(value), 10);
  return Number.isNaN(parsedInt) ? null : parsedInt;
};

const toNullableString = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const stringValue = String(value).trim();
  return stringValue.length === 0 ? null : stringValue;
};

export const createAssetUpdateHandler = (fetchAssetForUser: FetchAssetFn) =>
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userAssetId } = req.params;
      const authenticatedUserId = req.user?.id;

      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const existingAsset = await fetchAssetForUser(userAssetId, authenticatedUserId);
      if (!existingAsset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      const parsed = updateAssetSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        console.warn("❌ Invalid asset update payload", parsed.error.flatten());
        return res.status(400).json({
          error: "Invalid asset data",
          details: parsed.error.flatten(),
        });
      }

      const data = parsed.data as Partial<InsertAsset>;
      const record = data as Record<string, unknown>;

      const userAssetUpdates: Partial<typeof userAssets.$inferInsert> = {};

      if (data.purchasePrice !== undefined) {
        const normalized = toNullableNumber(data.purchasePrice);
        const numericString = normalized === null ? null : normalized.toString();
        userAssetUpdates.purchasePrice = numericString;
        userAssetUpdates.personalValue = numericString;
      }
      if (data.purchaseDate !== undefined) {
        const normalizedDate = toNullableString(data.purchaseDate);
        userAssetUpdates.purchaseDate = normalizedDate ?? null;
      }

      // New: purchaseSource updates (nullable string)
      if (data.purchaseSource !== undefined) {
        const normalizedSource = toNullableString(data.purchaseSource);
        userAssetUpdates.purchaseSource = normalizedSource ?? null;
      }

      (["notes", "ownershipStatus"] as const).forEach((field) => {
        if (record[field] !== undefined) {
          (userAssetUpdates as Record<string, unknown>)[field] = record[field] ?? null;
        }
      });

      if (data.serialNumbered !== undefined) {
        userAssetUpdates.serialNumbered = data.serialNumbered === null ? null : Boolean(data.serialNumbered);
      }
      if (data.serialNumber !== undefined) {
        userAssetUpdates.serialNumber = toNullableInteger(data.serialNumber);
      }
      if (data.serialMax !== undefined) {
        userAssetUpdates.serialMax = toNullableInteger(data.serialMax);
      }
      if (data.assetStatus !== undefined) {
        userAssetUpdates.status = data.assetStatus ?? null;
      }

      if (Object.keys(userAssetUpdates).length > 0) {
        userAssetUpdates.updatedAt = new Date();
        await db
          .update(userAssets)
          .set(userAssetUpdates)
          .where(and(eq(userAssets.id, userAssetId), eq(userAssets.userId, authenticatedUserId)));
      }

      const globalAssetUpdates: Partial<typeof globalAssets.$inferInsert> = {};

      (["type", "title", "playerName", "setName", "year", "cardNumber", "variant", "grader", "grade", "certNumber"] as const)
        .forEach((field) => {
          if (record[field] !== undefined) {
            (globalAssetUpdates as Record<string, unknown>)[field] = record[field] ?? null;
          }
        });

      if (record.assetImages !== undefined) {
        globalAssetUpdates.assetImages = Array.isArray(record.assetImages) ? record.assetImages : [];
      }

      if (Object.keys(globalAssetUpdates).length > 0 && existingAsset.globalAssetId) {
        globalAssetUpdates.updatedAt = new Date();
        await db
          .update(globalAssets)
          .set(globalAssetUpdates)
          .where(eq(globalAssets.id, existingAsset.globalAssetId));
      }

      const updatedAsset = await fetchAssetForUser(userAssetId, authenticatedUserId);
      if (!updatedAsset) {
        return res.status(500).json({ error: "Failed to fetch updated asset" });
      }

      return res.json(updatedAsset);
    } catch (error) {
      console.error(`❌ Error updating asset ${req.params.userAssetId}:`, error);
      return res.status(500).json({ error: "Failed to update asset" });
    }
  };
