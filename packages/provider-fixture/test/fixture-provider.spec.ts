import { describe, expect, it } from "vitest";
import * as providerPackage from "../src/index.js";

const demoMatches = [
  {
    matchId: "match-example-1",
    home: "Liverpool",
    away: "Chelsea",
    kickoff: "2026-08-01T19:30:00Z",
  },
  {
    matchId: "match-example-2",
    home: "Arsenal",
    away: "Manchester City",
    kickoff: "2026-08-01T20:00:00Z",
  },
  {
    matchId: "match-example-3",
    home: "Barcelona",
    away: "Real Madrid",
    kickoff: "2026-08-01T20:30:00Z",
  },
  {
    matchId: "match-example-4",
    home: "Bayern Munich",
    away: "Borussia Dortmund",
    kickoff: "2026-08-01T18:30:00Z",
  },
  {
    matchId: "match-example-5",
    home: "PSG",
    away: "Marseille",
    kickoff: "2026-08-01T21:00:00Z",
  },
  {
    matchId: "match-example-6",
    home: "Inter Milan",
    away: "Juventus",
    kickoff: "2026-08-01T19:45:00Z",
  },
] as const;

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

  it.each(
    demoMatches,
  )("returns immutable raw fixture data for $matchId", (expected) => {
    const provider = new providerPackage.FixtureProvider();
    const match = provider.getMatch(expected.matchId);

    expect(match).toEqual(expected);
    expect(Object.isFrozen(match)).toBe(true);
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
