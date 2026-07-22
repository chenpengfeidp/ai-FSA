import { describe, expect, it } from "vitest";
import { ProvidersController } from "../src/providers.controller.js";

describe("ProvidersController (F1.1A)", () => {
  const controller = new ProvidersController();

  it("lists all registry categories and connected providers", () => {
    const listed = controller.list();
    const categories = new Set(listed.map((provider) => provider.category));

    expect(categories.has("football")).toBe(true);
    expect(categories.has("market")).toBe(true);
    expect(categories.has("sentiment")).toBe(true);
    expect(categories.has("prediction")).toBe(true);
    expect(categories.has("internal")).toBe(true);

    const connected = controller.listConnected().map((provider) => provider.id);
    expect(connected).toContain("football:api-sports");
    expect(connected).toContain("internal:recorded");
    expect(connected).not.toContain("sentiment:stub");
  });

  it("queries capability support including F1.1E lineup and referee ingest", () => {
    const formProviders = controller.byCapability("recent_form");
    expect(
      formProviders.some((provider) => provider.id === "football:api-sports"),
    ).toBe(true);

    const capabilities = controller.capabilities("football:api-sports");
    const lineup = capabilities.find((capability) => capability.kind === "lineup");
    const referee = capabilities.find((capability) => capability.kind === "referee");
    expect(lineup?.supported).toBe(true);
    expect(lineup?.ingestImplemented).toBe(true);
    expect(referee?.supported).toBe(true);
    expect(referee?.ingestImplemented).toBe(true);
  });
});
