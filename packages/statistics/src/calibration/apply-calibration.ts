import type { CalibrationArtifact } from "../domain/calibration-artifact.js";

export interface ProbabilityTriple {
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
}

export class CalibrationApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalibrationApplicationError";
  }
}

function requireProbability(value: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new CalibrationApplicationError(
      `${field} must be a finite non-negative probability.`,
    );
  }

  return value;
}

function renormalize(input: ProbabilityTriple): ProbabilityTriple {
  const pHome = requireProbability(input.pHome, "pHome");
  const pDraw = requireProbability(input.pDraw, "pDraw");
  const pAway = requireProbability(input.pAway, "pAway");
  const sum = pHome + pDraw + pAway;

  if (sum <= 0) {
    throw new CalibrationApplicationError(
      "Probability triple must have a positive sum.",
    );
  }

  return Object.freeze({
    pHome: pHome / sum,
    pDraw: pDraw / sum,
    pAway: pAway / sum,
  });
}

/**
 * Apply a pinned calibration artifact to a 1X2 triple.
 * Match runs must not train or select a new map here.
 */
export function applyCalibration(
  probabilities: ProbabilityTriple,
  artifact: CalibrationArtifact,
): ProbabilityTriple {
  const normalized = renormalize(probabilities);

  if (artifact.map.type === "identity") {
    return normalized;
  }

  throw new CalibrationApplicationError(
    `Unsupported calibration map type: ${String((artifact.map as { type: string }).type)}`,
  );
}
