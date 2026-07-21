import type { ProviderCapabilityDeclaration } from "./capabilities.js";
import { EvidenceProviderRegistry } from "./registry.js";

function footballCapabilities(): readonly ProviderCapabilityDeclaration[] {
  return Object.freeze([
    Object.freeze({
      kind: "player" as const,
      supported: true,
      ingestImplemented: true,
      notes: "F1.1C-1 Player Basic Evidence (squad identity only; no stats/injury).",
    }),
    Object.freeze({
      kind: "coach" as const,
      supported: true,
      ingestImplemented: false,
      notes: "Provider supports coaches; ingest deferred.",
    }),
    Object.freeze({
      kind: "referee" as const,
      supported: true,
      ingestImplemented: false,
      notes: "Referee name on fixtures; ingest deferred past F1.1A.",
    }),
    Object.freeze({
      kind: "venue" as const,
      supported: true,
      ingestImplemented: true,
      notes: "F1.1B-1 Venue Evidence vertical slice (fixture venue → VENUE).",
    }),
    Object.freeze({
      kind: "lineup" as const,
      supported: true,
      ingestImplemented: false,
      notes: "Confirmed lineups via /fixtures/lineups; not in F1.1A.",
    }),
    Object.freeze({
      kind: "injury" as const,
      supported: true,
      ingestImplemented: true,
      notes:
        "F1.1D Availability: /injuries → INJURY + SUSPENSION Evidence (no Expected Lineup).",
    }),
    Object.freeze({
      kind: "recent_form" as const,
      supported: true,
      ingestImplemented: true,
      notes: "Existing TEAM_FORM path from Football Data (F.1).",
    }),
  ]);
}

function unsupportedCapabilities(
  notes: string,
): readonly ProviderCapabilityDeclaration[] {
  return Object.freeze(
    (
      [
        "player",
        "coach",
        "referee",
        "venue",
        "lineup",
        "injury",
        "recent_form",
      ] as const
    ).map((kind) =>
      Object.freeze({
        kind,
        supported: false,
        ingestImplemented: false,
        notes,
      }),
    ),
  );
}

/**
 * Default registry for private V1: API-Sports Football + Internal recorded connected.
 * Market / Sentiment / Prediction are extension stubs only (F1.1A).
 */
export function createDefaultEvidenceProviderRegistry(): EvidenceProviderRegistry {
  const registry = new EvidenceProviderRegistry();

  registry.register({
    id: "football:api-sports",
    displayName: "API-Sports Football (API-Football)",
    category: "football",
    enabled: true,
    connected: true,
    capabilities: footballCapabilities(),
  });

  registry.register({
    id: "internal:recorded",
    displayName: "FAS Internal Recorded Cassettes",
    category: "internal",
    enabled: true,
    connected: true,
    capabilities: Object.freeze([
      Object.freeze({
        kind: "recent_form" as const,
        supported: true,
        ingestImplemented: true,
        notes: "Recorded TEAM_FORM / match shells for CI and demos.",
      }),
      Object.freeze({
        kind: "player" as const,
        supported: false,
        ingestImplemented: false,
      }),
      Object.freeze({
        kind: "coach" as const,
        supported: false,
        ingestImplemented: false,
      }),
      Object.freeze({
        kind: "referee" as const,
        supported: false,
        ingestImplemented: false,
      }),
      Object.freeze({
        kind: "venue" as const,
        supported: false,
        ingestImplemented: false,
      }),
      Object.freeze({
        kind: "lineup" as const,
        supported: false,
        ingestImplemented: false,
      }),
      Object.freeze({
        kind: "injury" as const,
        supported: false,
        ingestImplemented: false,
      }),
    ]),
  });

  registry.register({
    id: "market:the-odds-api",
    displayName: "The Odds API (extension point)",
    category: "market",
    enabled: false,
    connected: false,
    capabilities: unsupportedCapabilities(
      "Market extension stub in F1.1A; existing odds path remains optional outside registry connection.",
    ),
  });

  registry.register({
    id: "sentiment:stub",
    displayName: "Sentiment Provider (extension point)",
    category: "sentiment",
    enabled: false,
    connected: false,
    capabilities: unsupportedCapabilities(
      "Sentiment providers not connected in F1.1A.",
    ),
  });

  registry.register({
    id: "prediction:stub",
    displayName: "Prediction Provider (extension point)",
    category: "prediction",
    enabled: false,
    connected: false,
    capabilities: unsupportedCapabilities(
      "External prediction feeds must never silently become Facts (doc 41).",
    ),
  });

  return registry;
}

/** Process-wide default registry instance for composition roots and capability queries. */
let defaultRegistry: EvidenceProviderRegistry | undefined;

export function getDefaultEvidenceProviderRegistry(): EvidenceProviderRegistry {
  if (defaultRegistry === undefined) {
    defaultRegistry = createDefaultEvidenceProviderRegistry();
  }

  return defaultRegistry;
}
