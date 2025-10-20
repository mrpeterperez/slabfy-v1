# My-Consignments Components

Clean component structure following slabfyrules.md patterns.

## Structure

```
components/
├── dialogs/               # Modal dialogs
│   ├── add-consignment-dialog.tsx
│   ├── edit-consignment-dialog.tsx
│   ├── consignment-settings-dialog.tsx
│   └── index.ts
├── lists/                 # Data list components
│   ├── consignments-list.tsx
│   └── index.ts
├── pages/                 # Page-level components
│   ├── consignment-detail-page.tsx
│   └── index.ts
├── sections/              # Page sections
│   ├── AssetsSection.tsx
│   ├── EarningsSection.tsx
│   ├── SettingsSection.tsx
│   └── index.ts
├── consignment-header.tsx # Shared header component
├── error-boundary.tsx     # Error boundary wrapper
└── index.ts              # Main exports
```

## Component Guidelines

- **200 lines max** per component
- **Named exports only** (no default exports)
- **Internal notes** at top of each file
- **Feature isolation** - no cross-feature imports
- **Explicit dependencies** documented in internal notes

## Import Patterns

All components use relative imports within the feature:
- `../../hooks/` for hooks
- `../../utils/` for utilities
- `../` for sibling components
- `@/` prefix only for shared dependencies

## Export Strategy

Each folder has an `index.ts` that re-exports all components with internal documentation. Main feature exports through `components/index.ts`.
