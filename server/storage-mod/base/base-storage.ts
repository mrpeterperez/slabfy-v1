// BaseStorage: provide a tiny wrapper to hold db in a consistent way
import type { StorageModule } from "./types";

export abstract class BaseStorage implements StorageModule {
  constructor(public readonly db: any) {}
}
