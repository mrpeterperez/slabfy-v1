// 🤖 INTERNAL NOTE (LLM):
// Mocks eBay comps data based on search query.
// Part of `psa-slab-scanning` shared module.

import { PriceComp } from "../types";

export async function fetchComps(query: string): Promise<PriceComp[]> {
  return [
    {
      title: `${query} - Sold`,
      price: 750,
      soldDate: "2024-12-01",
    },
    {
      title: `${query} - Sold`,
      price: 780,
      soldDate: "2024-12-05",
    },
  ];
}
