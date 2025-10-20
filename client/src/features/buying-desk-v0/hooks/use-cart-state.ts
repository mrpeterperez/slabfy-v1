// 🤖 INTERNAL NOTE:
// Purpose: React Query-based cart panel state persistence
// Exports: useCartState hook
// Feature: buying-desk-v0
// Dependencies: @tanstack/react-query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CartState {
  isOpen: boolean;
}

const DEFAULT_STATE: CartState = { isOpen: true };

function loadCartState(sessionId: string): CartState {
  try {
    const key = `buyingDeskCartState:${sessionId}`;
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveCartState(sessionId: string, state: CartState): void {
  try {
    const key = `buyingDeskCartState:${sessionId}`;
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function useCartState(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['cartState', sessionId];

  // Get cart state
  const { data: state = DEFAULT_STATE } = useQuery({
    queryKey,
    queryFn: () => loadCartState(sessionId),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
    enabled: !!sessionId,
  });

  // Update cart state
  const updateState = useMutation({
    mutationFn: async (newState: CartState) => {
      saveCartState(sessionId, newState);
      return newState;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(queryKey, newState);
    },
  });

  const setCartOpen = (isOpen: boolean) => {
    updateState.mutate({ isOpen });
  };

  const toggleCart = () => {
    updateState.mutate({ isOpen: !state.isOpen });
  };

  return {
    isCartOpen: state.isOpen,
    setCartOpen,
    toggleCart,
    isLoading: updateState.isPending,
  };
}