# Events Feature

Purpose: Manage card show events, inventory (storefront), checkout, Buying Desk, and sold items.

Exports (via `index.ts`):
- EventDetail, EventsList, AddEventDialog, EventCheckoutDialog
- InventorySection, InventoryColumnsPopover, InventoryFiltersPopover, InventoryToolbar

Structure:
- components/event-detail: event detail page and sections (inventory, sold items, Buying Desk, settings)
- components/checkout: POS checkout dialog and related UI
- components/inventory: add-to-event dialog and helpers
- types: shared event types
- api.ts: data access

Notes:
- Follow slabfyrules.md for file headers and feature isolation.
- InventorySection mirrors consignments AssetsSection UX; editable columns: List Price, Status, and %.
