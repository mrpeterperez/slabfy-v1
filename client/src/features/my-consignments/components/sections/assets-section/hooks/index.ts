// 🤖 INTERNAL NOTE:
// Purpose: Main hook that orchestrates assets section functionality
// Exports: useAssetsSection hook and related types
// Feature: my-consignments

export { useAssetsSectionState } from './use-assets-section-state';
export { useAssetMutations } from './use-asset-mutations';
export { useAutoPricing } from './use-auto-pricing';
export { useAssetsData } from './use-assets-data';

// Re-export types for convenience
export type { SortColumn, ConsignmentAssetData } from '../types';