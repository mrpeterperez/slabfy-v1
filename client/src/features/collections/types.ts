// Client-side collection types that include server-provided thumbnail alias
// This keeps UI code strongly typed without leaking DB naming differences.

import type { Collection, CollectionWithDetails } from '@shared/schema';

export type CollectionClient = Collection & {
  thumbnailUrl?: string | null;
};

export type CollectionWithDetailsClient = CollectionWithDetails & {
  thumbnailUrl?: string | null;
};
