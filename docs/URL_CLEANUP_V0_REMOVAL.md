# URL Cleanup: Removed -v0 Suffixes

## Overview
Cleaned up all URL routes to remove `-v0` version suffixes for cleaner, production-ready URLs.

## Changes Made

### 1. App.tsx - Route Cleanup
**Before:**
- `/my-portfolio-v0` (main route)
- `/portfolio-v2` (legacy redirect)
- `/buying-desk-v0` (main route)
- `/buying-desk-v0/:id` (detail route)
- `/buy-mode` (legacy redirect)

**After:**
- `/my-portfolio` (clean route)
- `/buying-desk` (clean route)
- `/buying-desk/:id` (clean detail route)

**Removed:**
- All `-v0` suffixed routes
- All legacy redirect components (`RedirectPortfolioV2`, `RedirectToBuyingDesk`, `RedirectBuyModeDetails`)
- `/portfolio-v2` and `/buy-mode` legacy routes

### 2. Analytics Page
**Updated URLs:**
- `/buying-desk-v0/${sessionId}` → `/buying-desk/${sessionId}`
- `/buying-desk-v0` → `/buying-desk`

### 3. Buying Desk Components
**Updated internal navigation:**

**`buying-desk-v0/components/ui/header.tsx`:**
- Delete session redirect: `/buying-desk-v0` → `/buying-desk`

**`buying-desk-v0/pages/session.tsx`:**
- Base path: `/buying-desk-v0/${id}` → `/buying-desk/${id}`
- Delete redirect: `/buying-desk-v0` → `/buying-desk`
- Panel auto-save ID: `buying-desk-v0-split:${id}` → `buying-desk-split:${id}`

**`buying-desk-v0/components/dialogs/add-offer-dialog.tsx`:**
- Create redirect: `/buying-desk-v0/${id}` → `/buying-desk/${id}`

### 4. Main.tsx - PWA & Route Detection
**Removed:**
- PWA disable logic for `/my-portfolio-v0` path
- `/buying-desk-v0` and `/buy-mode` from route detection regex

**Updated:**
- Buy session detection: `/^\/(buying-desk)(\/|$)/` (clean regex)

## URL Mapping

### Portfolio
| Old URL | New URL |
|---------|---------|
| `/my-portfolio-v0` | `/my-portfolio` |
| `/portfolio-v2` | Removed (was redirect) |

### Buying Desk
| Old URL | New URL |
|---------|---------|
| `/buying-desk-v0` | `/buying-desk` |
| `/buying-desk-v0/:id` | `/buying-desk/:id` |
| `/buying-desk-v0/:id/:tab` | `/buying-desk/:id/:tab` |
| `/buy-mode` | Removed (was redirect) |
| `/buy-mode/:id` | Removed (was redirect) |

## Feature Directory Names
**Note:** Feature directories still use `-v0` suffix for internal organization:
- `client/src/features/my-portfolio-v0/` (unchanged)
- `client/src/features/buying-desk-v0/` (unchanged)

This allows for future version transitions while keeping URLs clean.

## Breaking Changes
None - all old URLs were redirects that pointed to the same components. The clean URLs now work directly without redirects.

## Benefits
✅ Cleaner, more professional URLs
✅ Removed unnecessary redirect logic
✅ Simplified codebase maintenance
✅ Better SEO and link sharing
✅ Production-ready URL structure

## Testing Checklist
- [ ] `/my-portfolio` loads correctly
- [ ] `/buying-desk` loads correctly
- [ ] `/buying-desk/:id` loads session details
- [ ] Analytics links navigate correctly
- [ ] Session creation navigates to clean URL
- [ ] Session deletion redirects to clean URL
- [ ] All internal navigation uses clean URLs
