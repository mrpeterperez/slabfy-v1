# Buy Mode V2 Feature

Clean, simple buy offer management following slabfyrules.md standards.

## Purpose
Professional sports card buy offer system with asset evaluation and cart management.

## Structure
- `components/` - UI components (max 200 lines each)
- `hooks/` - Custom data hooks
- `utils/` - Pure utility functions
- `types/` - TypeScript definitions
- `api.ts` - Data fetching layer

## Key Features
- Sequential offer numbering (OF-2025-0001)
- Two-panel layout (evaluation vs buy list)
- Real market data integration
- Optimistic updates for instant feedback

## Dependencies
- `@/lib/queryClient` - API requests
- `@/components/ui/*` - ShadCN components
- `@/shared/schema` - Database types

## API Endpoints
- `GET /api/buy-mode/buy-offers/:id` - Buy offer details
- `GET /api/buy-mode/buy-offers/:id/staging-assets` - Staging assets
- `GET /api/buy-mode/buy-offers/:id/cart-assets` - Cart assets
- `POST /api/buy-mode/buy-offers/:id/staging-assets/move-to-cart` - Move to cart
- `DELETE /api/buy-mode/buy-offers/:id/cart-assets/:assetId` - Remove from cart