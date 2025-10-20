// 🤖 INTERNAL NOTE:
// Purpose: Public API exports for events feature
// Exports: EventDetailPage, AddEventDialog, eventsApi, EventsList (transitional)
// Feature: events
// Dependencies: @/lib/api-request, @/shared/events
// Note: EventsList merged into main EventsPage component

export { EventDetailPage } from "./components/event-detail/event-detail-page";
export { AddEventDialog } from "./components/add-event/add-event-dialog";
export { EventsList } from "./components/event-list/events-list";
export { eventsApi } from "./api";
export * from "./types/event-types";
export { EventCheckoutDialog } from "./components/checkout/EventCheckoutDialog";

// Inventory public surface
// V1 InventorySection and related popovers/toolbar were removed.