// 🤖 INTERNAL NOTE:
// Purpose: Hook for persisting table column preferences using React Query
// Exports: useColumnPreferences hook
// Feature: buying-desk-v0
// Dependencies: @tanstack/react-query

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ColumnConfig } from '../types/table';

const STORAGE_KEY_PREFIX = 'buyingDeskColumns';

interface ColumnPreferences {
  [key: string]: boolean;
}

function getStorageKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}:${sessionId}`;
}

function loadColumnPreferences(sessionId: string): ColumnPreferences {
  try {
    const key = getStorageKey(sessionId);
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveColumnPreferences(sessionId: string, preferences: ColumnPreferences): void {
  try {
    const key = getStorageKey(sessionId);
    sessionStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    // Ignore storage errors
  }
}

export function useColumnPreferences(sessionId: string, defaultColumns: ColumnConfig[]) {
  const queryClient = useQueryClient();
  const queryKey = ['columnPreferences', sessionId];

  // Load column preferences
  const { data: preferences = {} } = useQuery({
    queryKey,
    queryFn: () => loadColumnPreferences(sessionId),
    staleTime: Infinity, // Never refetch automatically
    gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
  });

  // Apply preferences to default columns
  const columns: ColumnConfig[] = defaultColumns.map((col) => ({
    ...col,
    visible: col.locked ? true : (preferences[col.key] ?? col.visible)
  }));

  // Update preferences
  const updatePreferences = useCallback((newColumns: ColumnConfig[]) => {
    const newPreferences = newColumns.reduce<ColumnPreferences>((acc, col) => {
      if (!col.locked) {
        acc[col.key] = col.visible;
      }
      return acc;
    }, {});

    // Update cache
    queryClient.setQueryData(queryKey, newPreferences);
    
    // Persist to storage
    saveColumnPreferences(sessionId, newPreferences);
  }, [sessionId, queryClient, queryKey]);

  return {
    columns,
    updatePreferences,
  };
}