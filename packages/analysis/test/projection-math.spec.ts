import { describe, expect, it } from "vitest";
import {
  buildIndependentPoissonMatrix,
  computeLambdas,
  softmaxAdjust,
} from "../src/index.js";

describe("projection math", () => {
  it("keeps 1X2 probabilities on the simplex", () => {
    const lambdas = computeLambdas({
      attackRatingHome: 70,
      defenseRatingAway: 40,
      attackRatingAway: 45,
      defenseRatingHome: 60,
      homeAdvantage: 0.35,
    });
    const poisson = buildIndependentPoissonMatrix(
      lambdas.lambdaHome,
      lambdas.lambdaAway,
    );

    expect(poisson.pHome + poisson.pDraw + poisson.pAway).toBeCloseTo(1, 9);
    expect(
      poisson.goalRange.range01 +
        poisson.goalRange.range23 +
        poisson.goalRange.range4Plus,
    ).toBeCloseTo(1, 9);
    expect(poisson.topScorelines).toHaveLength(3);
  });

  it("applies softmax adjustment without leaving the simplex", () => {
    const adjusted = softmaxAdjust(0.45, 0.27, 0.28, 0.1);

    expect(adjusted.pHome + adjusted.pDraw + adjusted.pAway).toBeCloseTo(1, 12);
    expect(adjusted.pHome).toBeGreaterThan(0.45);
    expect(adjusted.pAway).toBeLessThan(0.28);
  });
});
