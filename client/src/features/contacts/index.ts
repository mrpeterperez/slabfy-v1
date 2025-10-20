// 🤖 INTERNAL NOTE:
// Purpose: Export all contacts feature components and hooks
// Exports: All public components and hooks from contacts feature
// Feature: contacts

// Main components
export { ContactsList } from './components/contacts-list';
export { ContactDetail } from './components/contact-detail';
export { AddContactDialog } from './components/add-contact-dialog';
export { EditContactDialog } from './components/edit-contact-dialog';
export { ContactLeftNav } from './components/contact-left-nav';
export { ContactHeader } from './components/contact-header';

// Hooks
export * from './hooks/use-contacts';

// API
export * from './api/contacts-api';

// Types
export type { ContactTab } from './components/contact-left-nav';