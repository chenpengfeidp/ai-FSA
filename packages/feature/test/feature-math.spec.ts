import { describe, expect, it } from "vitest";
import {
  computeAsianHandicapLean,
  computeAvailabilityPenalty,
  computeH2hLean,
  computeImpliedProbabilities,
  computeMarketLean,
  computeRecentFormScore,
  shrink,
  VENUE_ADVANTAGE_SCORE,
} from "../src/extraction/feature-math.js";

describe("intelligence MVP feature math", () => {
  it("scores recent form from W/D/L in [0, 100]", () => {
    expect(computeRecentFormScore(["W", "W", "W", "W", "W"])).toBe(100);
    expect(computeRecentFormScore(["L", "L", "L", "L", "L"])).toBe(0);
    expect(computeRecentFormScore(["W", "D", "L", "W", "D"])).toBe(60);
    expect(computeRecentFormScore([])).toBe(0);
  });

  it("computes availability penalty from injury and suspension counts", () => {
    expect(computeAvailabilityPenalty({ injuryCount: 1, suspensionCount: 0 })).toBe(
      8,
    );
    expect(computeAvailabilityPenalty({ injuryCount: 0, suspensionCount: 1 })).toBe(
      10,
    );
    expect(computeAvailabilityPenalty({ injuryCount: 2, suspensionCount: 1 })).toBe(
      26,
    );
    expect(
      computeAvailabilityPenalty({ injuryCount: 10, suspensionCount: 10 }),
    ).toBe(40);
  });

  it("exposes a fixed venue advantage score when VENUE Evidence is present", () => {
    expect(VENUE_ADVANTAGE_SCORE).toBe(8);
  });
});

describe("computeH2hLean", () => {
  it("returns 0 for an empty meeting list", () => {
    expect(computeH2hLean([])).toBe(0);
  });

  it("leans positive when the current home side dominates", () => {
    const lean = computeH2hLean([
      { homeGoals: 2, awayGoals: 0 },
      { homeGoals: 1, awayGoals: 0 },
      { homeGoals: 2, awayGoals: 1 },
      { homeGoals: 1, awayGoals: 1 },
      { homeGoals: 3, awayGoals: 1 },
    ]);

    expect(lean).toBeCloseTo(shrink(0.8, 0, 5), 6);
    expect(lean).toBeGreaterThan(0.2);
  });

  it("leans negative when the current away side dominates", () => {
    const lean = computeH2hLean([
      { homeGoals: 0, awayGoals: 2 },
      { homeGoals: 1, awayGoals: 2 },
      { homeGoals: 0, awayGoals: 1 },
      { homeGoals: 1, awayGoals: 1 },
    ]);

    expect(lean).toBeCloseTo(shrink(-0.75, 0, 4), 6);
    expect(lean).toBeLessThan(-0.2);
  });
});

describe("market odds features", () => {
  it("de-viggs decimal odds into probabilities that sum to 1", () => {
    const implied = computeImpliedProbabilities({
      homeOdds: 2,
      drawOdds: 3.5,
      awayOdds: 3.5,
    });

    expect(implied.home + implied.draw + implied.away).toBeCloseTo(1, 12);
    expect(implied.home).toBeGreaterThan(implied.away);
  });

  it("leans negative when away odds are shorter", () => {
    expect(
      computeMarketLean({
        homeOdds: 3.6,
        drawOdds: 3.4,
        awayOdds: 2.05,
      }),
    ).toBeLessThan(-0.08);
  });

  it("leans positive when Asian handicap home price is shorter", () => {
    expect(
      computeAsianHandicapLean({
        asianHandicapHomeOdds: 1.85,
        asianHandicapAwayOdds: 2.05,
      }),
    ).toBeGreaterThan(0);
  });
});
