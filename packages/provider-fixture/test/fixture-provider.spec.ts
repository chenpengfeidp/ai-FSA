import { describe, expect, it } from "vitest";
import * as providerPackage from "../src/index.js";

describe("FixtureProvider", () => {
  it("returns raw fixture data for a known match", () => {
    const provider = new providerPackage.FixtureProvider();

    expect(provider.getMatch("match-example")).toEqual({
      matchId: "match-example",
      home: "Liverpool",
      away: "Chelsea",
      kickoff: "2026-08-01T19:30:00Z",
    });
  });

  it("returns undefined for an unknown match id", () => {
    const provider = new providerPackage.FixtureProvider();

    expect(provider.getMatch("match-unknown")).toBeUndefined();
  });

  it("returns an immutable raw provider object", () => {
    const provider = new providerPackage.FixtureProvider();
    const match = provider.getMatch("match-example");

    expect(Object.isFrozen(match)).toBe(true);
    expect(Reflect.set(match as object, "home", "Changed")).toBe(false);
    expect(match).toHaveProperty("home", "Liverpool");
  });

  it("exposes only the provider and raw provider fields", () => {
    const provider = new providerPackage.FixtureProvider();
    const match = provider.getMatch("match-example");

    expect(Object.keys(providerPackage)).toEqual(["FixtureProvider"]);
    expect(Object.keys(match as object)).toEqual([
      "matchId",
      "home",
      "away",
      "kickoff",
    ]);
    expect(match).not.toHaveProperty("type");
    expect(match).not.toHaveProperty("provenance");
    expect(match).not.toHaveProperty("payload");
  });
});
