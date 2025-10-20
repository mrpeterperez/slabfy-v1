# 🧠 PSA Slab Scanning Module

## 🤖 INTERNAL NOTE (LLM):
This folder defines the shared logic for scanning PSA slabs by cert number.

It decouples all external dependencies (PSA API, intelligent matching, eBay comps) into small, reusable commands.  
This allows multiple features (add-asset, buy-asset, kiosk-scanner) to scan slabs and get metadata + price comps — **without duplicating logic** or hardcoding API calls.

---

## 👤 User Story

> As a user, I want to scan a PSA-certified slab (or manually enter the cert number) and instantly see the card's details and recent market prices — so I can either add it to my collection, estimate its resale value, or evaluate it in a kiosk setting.

---

## 🧩 Purpose

This module powers all PSA-related scanning logic:
- 🟢 Fetches **slab metadata** (player, year, set, grade) from PSA
- 🔎 Generates **searchable queries** using intelligent string building
- 💰 Fetches **recent comps** (sold eBay listings)
- 🔄 Returns one clean object to consuming features

It is **decoupled**, **testable**, and **LLM-readable**.

---

## 📂 Folder Structure

```
shared/
 └── psa-slab-scanning/
     ├── README.md ← This file
     ├── types.ts ← Shared types for metadata, comps, and output
     └── commands/
         ├── fetchCertMetadata.ts ← Fetch PSA cert data (mocked or real)
         ├── runFuzzyMatch.ts ← Generate search query string
         └── fetchComps.ts ← Mock eBay comps fetcher
```

---

## 📦 Types

These interfaces are the shared contract between commands and consumers.

```typescript
export interface CertMetadata {
  cert: string;
  player: string;
  year: string;
  set: string;
  grade: string;
  cardNumber?: string;
}

export interface PriceComp {
  title: string;
  price: number;
  soldDate: string;
}

export interface SlabScanResult {
  cert: string;
  metadata: CertMetadata;
  comps: PriceComp[];
}
```

---

## 📁 Files Explained

### fetchCertMetadata.ts
**Input:** certNumber: string

**Output:** CertMetadata

**Role:** Fetches metadata from the PSA API

⚠️ Currently mocked — replace with PSA cert API integration

### runFuzzyMatch.ts
**Input:** metadata: CertMetadata

**Output:** string (a fuzzy match string for eBay search)

**Role:** Converts structured metadata into a realistic eBay-style title

💡 Later: plug into AI services or intelligent local matching to handle typos, variants, and seller inconsistency

### fetchComps.ts
**Input:** query: string

**Output:** PriceComp[]

**Role:** Mocks recent eBay sales based on the query

🛠️ Future: replace with eBay Browse or Finding API to pull real market data

---

## 🔧 Usage Example

```typescript
import { scanSlabByCert } from './psa-slab-scanning';

// Scan a slab and get metadata + comps
const result = await scanSlabByCert('12345678');

console.log(result.metadata.player); // "Mike Trout"
console.log(result.comps.length); // 5 recent sales
```

---

## 🚀 Integration Points

This module integrates with:
- **PSA API** (via Supabase Edge Functions)
- **eBay APIs** (for authentic pricing data)
- **AI Services** (for intelligent search query generation - clean slate for future implementation)
- **Caching System** (for performance optimization)