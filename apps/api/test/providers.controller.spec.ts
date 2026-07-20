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

  it("queries capability support without claiming lineup ingest", () => {
    const formProviders = controller.byCapability("recent_form");
    expect(
      formProviders.some((provider) => provider.id === "football:api-sports"),
    ).toBe(true);

    const lineup = controller
      .capabilities("football:api-sports")
      .find((capability) => capability.kind === "lineup");
    expect(lineup?.supported).toBe(true);
    expect(lineup?.ingestImplemented).toBe(false);
  });
});
