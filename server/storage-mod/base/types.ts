// Shared storage-level types and core interface composition

export interface BaseDbBound {
  // All storage modules accept a Drizzle-like db; keep it any to avoid coupling
  readonly db: any;
}

export type UUID = string;

// A light contract all domain storages should implement
export interface StorageModule extends BaseDbBound {}
