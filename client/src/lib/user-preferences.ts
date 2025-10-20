// Small hybrid user preferences helper: instant localStorage + background server sync
// Usage: loadUserPrefs(userId) to get prefs; saveUserPrefs(userId, partial) to merge and persist.

import { apiRequest } from "@/lib/queryClient";

export type InventoryColumnPref = { key: string; visible: boolean };
export type UserPreferences = {
  inventory?: {
    columns?: InventoryColumnPref[];
  };
  portfolio?: {
    columns?: InventoryColumnPref[];
  };
  cart?: {
  // Legacy keys kept for backward compatibility
  discountMode?: 'percent' | 'fixed';
  discountValue?: number;
  // Newer UI state keys used by EventCart
  showDiscount?: boolean;
  discountType?: 'percent' | 'amount';
  };
  // future keys here
};

const LOCAL_KEY = "slabfy.userPrefs";

function readLocal(): UserPreferences {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeLocal(prefs: UserPreferences) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs));
  } catch {}
}

export async function loadUserPrefs(userId?: string | null): Promise<UserPreferences> {
  const local = readLocal();

  // If no user, return local-only
  if (!userId) return local;

  try {
    const res = await apiRequest("GET", `/api/user/preferences?userId=${encodeURIComponent(userId)}`);
  const server: UserPreferences = await res.json();

    // Shallow-merge server over local
    const merged: UserPreferences = {
      ...local,
      ...server,
      inventory: {
        ...(local.inventory || {}),
        ...(server.inventory || {}),
      },
      portfolio: {
        ...(local.portfolio || {}),
        ...(server.portfolio || {}),
      },
      cart: {
        ...(local.cart || {}),
        ...(server.cart || {}),
      },
    };

    writeLocal(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveUserPrefs(userId: string | null | undefined, partial: UserPreferences): Promise<void> {
  const current = readLocal();
  const next: UserPreferences = {
    ...current,
    ...partial,
    inventory: {
      ...(current.inventory || {}),
      ...(partial.inventory || {}),
    },
    portfolio: {
      ...(current.portfolio || {}),
      ...(partial.portfolio || {}),
    },
    cart: {
      ...(current.cart || {}),
      ...(partial.cart || {}),
    },
  };
  writeLocal(next);

  if (!userId) return; // no-op server sync if not signed in

  // Fire-and-forget server sync
  try {
    await apiRequest("PUT", `/api/user/preferences?userId=${encodeURIComponent(userId)}`, next);
  } catch {
    // ignore
  }
}
