import { db as defaultDb } from "../db";
import { DatabaseStorage } from "../storage";
import { EventsStorage } from "./events/events-storage";
import { UserStorage } from "./user/user-storage";
import { MarketStorage } from "./market/market-storage";

// Composite registry that overlays modular domains over the monolith instance
// For now, only events domain is overridden. Others fall back to DatabaseStorage.
export function createStorage(db: any = defaultDb) {
  const monolith = new DatabaseStorage(db);
  const events = new EventsStorage(db);
  const users = new UserStorage(db);
  const market = new MarketStorage(db);

  // Proxy merges domain-specific overrides with the monolith methods
  const proxy = new Proxy(monolith as any, {
    get(target, prop, receiver) {
      // prefer domain module methods when present
      if (prop in users) {
        const value = (users as any)[prop];
        if (typeof value === "function") return value.bind(users);
        return value;
      }
      if (prop in market) {
        const value = (market as any)[prop];
        if (typeof value === "function") return value.bind(market);
        return value;
      }
      // events after other overlays to avoid accidental shadowing
      if (prop in events) {
        const value = (events as any)[prop];
        if (typeof value === "function") return value.bind(events);
        return value;
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
  return proxy;
}

export const storage = createStorage();
