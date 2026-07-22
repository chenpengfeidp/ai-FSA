import { describe, expect, it } from "vitest";
import {
  createDefaultEvidenceProviderRegistry,
  EVIDENCE_PROVIDER_CATEGORIES,
  PROVIDER_CAPABILITY_KINDS,
  resolveProviderFromSource,
} from "../src/index.js";

describe("Evidence Provider Registry (F1.1A)", () => {
  it("registers all five provider categories with extension stubs", () => {
    const registry = createDefaultEvidenceProviderRegistry();
    const categories = new Set(registry.list().map((provider) => provider.category));

    for (const category of EVIDENCE_PROVIDER_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }
  });

  it("connects only API-Sports football and internal recorded", () => {
    const registry = createDefaultEvidenceProviderRegistry();
    const connectedIds = registry.listConnected().map((provider) => provider.id);

    expect(connectedIds).toEqual(["football:api-sports", "internal:recorded"]);
    expect(registry.get("market:the-odds-api")?.connected).toBe(false);
    expect(registry.get("sentiment:stub")?.connected).toBe(false);
    expect(registry.get("prediction:stub")?.connected).toBe(false);
  });

  it("declares football capabilities with coach ingest deferred", () => {
    const registry = createDefaultEvidenceProviderRegistry();

    for (const kind of PROVIDER_CAPABILITY_KINDS) {
      expect(registry.supportsCapability("football:api-sports", kind)).toBe(true);
    }

    expect(
      registry.getCapability("football:api-sports", "coach")?.ingestImplemented,
    ).toBe(false);
    expect(
      registry.getCapability("football:api-sports", "lineup")?.ingestImplemented,
    ).toBe(true);
    expect(
      registry.getCapability("football:api-sports", "referee")?.ingestImplemented,
    ).toBe(true);
    expect(
      registry.getCapability("football:api-sports", "injury")?.ingestImplemented,
    ).toBe(true);
    expect(
      registry.getCapability("football:api-sports", "player")?.ingestImplemented,
    ).toBe(true);
    expect(
      registry.getCapability("football:api-sports", "recent_form")
        ?.ingestImplemented,
    ).toBe(true);
    expect(
      registry.getCapability("football:api-sports", "venue")?.ingestImplemented,
    ).toBe(true);
  });

  it("resolves legacy source strings to provider ids", () => {
    expect(resolveProviderFromSource("api-football")).toEqual({
      providerId: "football:api-sports",
      category: "football",
    });
    expect(resolveProviderFromSource("fixture")).toEqual({
      providerId: "internal:recorded",
      category: "internal",
    });
    expect(resolveProviderFromSource("the-odds-api")).toEqual({
      providerId: "market:the-odds-api",
      category: "market",
    });
  });
});
