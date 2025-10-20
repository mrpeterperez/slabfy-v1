// Modular storage registry (Phase 1 scaffolding)
// NOTE: Backward compatibility: existing imports from "../storage" still use DatabaseStorage in server/storage.ts
// This index exports types-only scaffolding for future extraction.

export * from "./base/types";
export * from "./user/types";
export * from "./assets/types";
export * from "./market/types";
export * from "./events/types";
export * from "./contacts/types";
export * from "./consignments/types";
export * from "./collections/types";
export * from "./portfolio/types";

// Composite type to mirror the monolithic IStorage shape via intersection
import type { IUserStorage } from "./user/types";
import type { IAssetsStorage } from "./assets/types";
import type { IMarketStorage } from "./market/types";
import type { IEventsStorage } from "./events/types";
import type { IContactsStorage } from "./contacts/types";
import type { IConsignmentsStorage } from "./consignments/types";
import type { ICollectionsStorage } from "./collections/types";
import type { IPortfolioStorage } from "./portfolio/types";

export type ModularStorage =
	& IUserStorage
	& IAssetsStorage
	& IMarketStorage
	& IEventsStorage
	& IContactsStorage
	& IConsignmentsStorage
	& ICollectionsStorage
	& IPortfolioStorage;

// In a later phase, provide a composite Storage class that wires domain storages.
