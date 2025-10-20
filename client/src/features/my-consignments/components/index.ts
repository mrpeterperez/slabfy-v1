// 🤖 INTERNAL NOTE:
// Purpose: Main component exports for my-consignments feature
// Exports: All component modules (dialogs, lists, sections, pages, shared components)
// Feature: my-consignments
// Dependencies: Feature subcomponents

// Dialog components
export * from './dialogs';

// List components  
export * from './lists';

// Section components
export * from './sections';

// Page components
export { ConsignmentDetailPage } from './pages/consignment-detail-page';

// Shared components
export { ConsignmentHeader } from './consignment-header';
export { ConsignmentErrorBoundary } from './error-boundary';
