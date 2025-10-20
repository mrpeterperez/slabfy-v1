# My Consignments Components Structure

- headers/
  - index.ts (barrel)
  - consignment-detail-header.tsx (existing header component)
- lists/
  - index.ts (barrel)
  - consignments-list.tsx (desktop/mobile list view)
- detail/
  - index.ts (barrel)
  - consignment-management-page.tsx (detail page with left nav)
- dialogs/
  - index.ts (barrel)
  - add-consignment-dialog.tsx
  - edit-consignment-dialog.tsx
  - consignment-settings-dialog.tsx
- sections/
  - AssetsSection.tsx
  - EarningsSection.tsx
  - SettingsSection.tsx
- shared/
  - index.ts (barrel)
  - error-boundary.tsx

Imports should prefer barrels, e.g. `../components/dialogs` and `../components/lists`.
