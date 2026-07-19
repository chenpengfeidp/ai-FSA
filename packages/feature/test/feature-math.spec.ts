import { describe, expect, it } from "vitest";
import {
  computeAsianHandicapLean,
  computeH2hLean,
  computeImpliedProbabilities,
  computeMarketLean,
  shrink,
} from "../src/extraction/feature-math.js";

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
