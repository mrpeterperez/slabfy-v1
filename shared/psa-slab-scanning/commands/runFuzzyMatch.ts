// 🤖 INTERNAL NOTE (LLM):
// Generates a fuzzy-matching string based on PSA metadata.
// Part of `psa-slab-scanning` shared module.

import { CertMetadata } from "../types";

export async function runFuzzyMatch(metadata: CertMetadata): Promise<string> {
  return `${metadata.player} ${metadata.year} ${metadata.set} PSA ${metadata.grade}`;
}
