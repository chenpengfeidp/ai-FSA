import { describe, expect, it } from "vitest";
import * as providerPackage from "../src/index.js";

describe("FixtureProvider", () => {
  it("returns raw fixture data with form and statistics for a known match", () => {
    const provider = new providerPackage.FixtureProvider();
    const match = provider.getMatch("match-example");

    expect(match).toMatchObject({
      matchId: "match-example",
      home: "Liverpool",
      away: "Chelsea",
      kickoff: "2026-08-01T19:30:00Z",
    });
    expect(match?.teamForm).toHaveLength(2);
    expect(match?.statistics).toHaveLength(2);
    expect(match?.teamForm[0]?.teamSide).toBe("home");
    expect(match?.statistics[1]?.teamSide).toBe("away");
  });

  it("returns immutable raw fixture data for demo matches", () => {
    const provider = new providerPackage.FixtureProvider();

    for (const matchId of [
      "match-example-1",
      "match-example-2",
      "match-example-3",
      "match-example-4",
      "match-example-5",
      "match-example-6",
    ]) {
      const match = provider.getMatch(matchId);

      expect(match?.matchId).toBe(matchId);
      expect(Object.isFrozen(match)).toBe(true);
      expect(Object.isFrozen(match?.teamForm)).toBe(true);
      expect(Object.isFrozen(match?.statistics)).toBe(true);
    }
  });

  it("returns undefined for an unknown match id", () => {
    const provider = new providerPackage.FixtureProvider();

    expect(provider.getMatch("match-unknown")).toBeUndefined();
  });

  it("exposes only the provider export", () => {
    expect(Object.keys(providerPackage)).toEqual(["FixtureProvider"]);
  });
});
