import type { EvidenceProviderCategory } from "./categories.js";

export interface ResolvedProviderBinding {
  readonly providerId: string;
  readonly category: EvidenceProviderCategory;
}

/**
 * Maps legacy Evidence.source strings to stable FAS provider ids (doc 41).
 * Vendor aliases never become FAS Match identity.
 */
export function resolveProviderFromSource(
  source: string,
  explicitProviderId?: string,
  explicitCategory?: EvidenceProviderCategory,
): ResolvedProviderBinding {
  if (
    explicitProviderId !== undefined &&
    explicitProviderId.trim().length > 0 &&
    explicitCategory !== undefined
  ) {
    return Object.freeze({
      providerId: explicitProviderId.trim(),
      category: explicitCategory,
    });
  }

  const normalized = source.trim().toLowerCase();

  let binding: ResolvedProviderBinding;

  switch (normalized) {
    case "api-football":
      binding = {
        providerId: "football:api-sports",
        category: "football",
      };
      break;
    case "the-odds-api":
      binding = {
        providerId: "market:the-odds-api",
        category: "market",
      };
      break;
    case "fixture":
      binding = {
        providerId: "internal:recorded",
        category: "internal",
      };
      break;
    default:
      binding = {
        providerId: "internal:unknown",
        category: "internal",
      };
  }

  if (explicitProviderId !== undefined && explicitProviderId.trim().length > 0) {
    return Object.freeze({
      providerId: explicitProviderId.trim(),
      category: explicitCategory ?? binding.category,
    });
  }

  if (explicitCategory !== undefined) {
    return Object.freeze({
      providerId: binding.providerId,
      category: explicitCategory,
    });
  }

  return Object.freeze(binding);
}
