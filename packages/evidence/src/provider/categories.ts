/**
 * Evidence Provider Categories (doc 41).
 * Orthogonal to Evidence types; classifies provider families.
 */
export type EvidenceProviderCategory =
  | "football"
  | "internal"
  | "market"
  | "prediction"
  | "sentiment";

export const EVIDENCE_PROVIDER_CATEGORIES: readonly EvidenceProviderCategory[] =
  Object.freeze(["football", "market", "sentiment", "prediction", "internal"]);
