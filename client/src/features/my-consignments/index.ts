// 🤖 INTERNAL NOTE:
// Purpose: Public API for my-consignments feature
// Exports: Main page component, API functions, hooks
// Feature: my-consignments
// Dependencies: Self-contained feature exports

// Main pages
export { ConsignmentsPage } from './pages/consignments-page';

// Components (exported through component index)
export * from './components';

// Hooks
export * from './hooks/use-consignments';
export * from './hooks/use-contacts';

// API
export * from './api/consignment-api';
export * from './api/contacts-api';

// Utilities
export * from './utils/status';
export * from './utils/validation';
