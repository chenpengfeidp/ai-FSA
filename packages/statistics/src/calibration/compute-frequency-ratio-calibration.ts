import {
  CALIBRATION_MODEL_VERSION_POPULATION_DEMO,
  type CalibrationArtifact,
  createCalibrationArtifact,
  POPULATION_DEMO_CALIBRATION_ARTIFACT_ID,
} from "../domain/calibration-artifact.js";
import type {
  CalibrationOutcome,
  CalibrationPopulationRow,
} from "../domain/calibration-population.js";
import { POPULATION_1X2_DEMO_V1 } from "./population-1x2-demo-v1.js";

export type { CalibrationOutcome, CalibrationPopulationRow };

export class CalibrationPopulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalibrationPopulationError";
  }
}

const MIN_SAMPLE = 20;
const MIN_MULTIPLIER = 0.25;
const MAX_MULTIPLIER = 4;

function requireProbability(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new CalibrationPopulationError(
      `${field} must be a finite non-negative probability.`,
    );
  }

  return value;
}

function clampMultiplier(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, value));
}

function roundMultiplier(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function stableChecksum(parts: readonly string[]): string {
  let hash = 2166136261;

  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function parseCalibrationPopulation(
  body: unknown,
): readonly CalibrationPopulationRow[] {
  if (!Array.isArray(body) || body.length === 0) {
    throw new CalibrationPopulationError(
      "Calibration population must be a non-empty array.",
    );
  }

  const rows: CalibrationPopulationRow[] = [];

  for (const [index, item] of body.entries()) {
    if (typeof item !== "object" || item === null) {
      throw new CalibrationPopulationError(
        `Population row ${String(index)} must be an object.`,
      );
    }

    const record = item as Record<string, unknown>;
    const pHome = requireProbability(record.pHome, `rows[${String(index)}].pHome`);
    const pDraw = requireProbability(record.pDraw, `rows[${String(index)}].pDraw`);
    const pAway = requireProbability(record.pAway, `rows[${String(index)}].pAway`);
    const sum = pHome + pDraw + pAway;

    if (sum <= 0) {
      throw new CalibrationPopulationError(
        `Population row ${String(index)} must have a positive probability sum.`,
      );
    }

    const outcome = record.outcome;

    if (outcome !== "home" && outcome !== "draw" && outcome !== "away") {
      throw new CalibrationPopulationError(
        `Population row ${String(index)}.outcome must be home, draw, or away.`,
      );
    }

    rows.push(
      Object.freeze({
        pHome: pHome / sum,
        pDraw: pDraw / sum,
        pAway: pAway / sum,
        outcome,
      }),
    );
  }

  return Object.freeze(rows);
}

/**
 * Fit outcome frequency / mean-predicted ratios for a declared immutable population.
 * This is offline Statistics work — never invoked inside a match analyze path.
 */
export function computeFrequencyRatioCalibrationArtifact(
  population: readonly CalibrationPopulationRow[],
  options?: {
    readonly artifactId?: string;
    readonly calibrationModelVersion?: string;
  },
): CalibrationArtifact {
  if (population.length < MIN_SAMPLE) {
    throw new CalibrationPopulationError(
      `Population sampleSize must be >= ${String(MIN_SAMPLE)}.`,
    );
  }

  let homeCount = 0;
  let drawCount = 0;
  let awayCount = 0;
  let homePred = 0;
  let drawPred = 0;
  let awayPred = 0;

  for (const row of population) {
    homePred += row.pHome;
    drawPred += row.pDraw;
    awayPred += row.pAway;

    if (row.outcome === "home") {
      homeCount += 1;
    } else if (row.outcome === "draw") {
      drawCount += 1;
    } else {
      awayCount += 1;
    }
  }

  const n = population.length;
  const homeMultiplier = roundMultiplier(
    clampMultiplier(homeCount / n / (homePred / n)),
  );
  const drawMultiplier = roundMultiplier(
    clampMultiplier(drawCount / n / (drawPred / n)),
  );
  const awayMultiplier = roundMultiplier(
    clampMultiplier(awayCount / n / (awayPred / n)),
  );

  const artifactId = options?.artifactId ?? POPULATION_DEMO_CALIBRATION_ARTIFACT_ID;
  const calibrationModelVersion =
    options?.calibrationModelVersion ?? CALIBRATION_MODEL_VERSION_POPULATION_DEMO;
  const checksum = `calibration-population-demo-v1-${stableChecksum([
    artifactId,
    calibrationModelVersion,
    String(n),
    String(homeMultiplier),
    String(drawMultiplier),
    String(awayMultiplier),
  ])}`;

  return createCalibrationArtifact({
    artifactId,
    calibrationModelVersion,
    map: {
      type: "frequency_ratio_1x2",
      homeMultiplier,
      drawMultiplier,
      awayMultiplier,
    },
    sampleSize: n,
    qualified: false,
    status: "computed_candidate",
    checksum,
    limitations: Object.freeze([
      "Frequency-ratio 1X2 calibration from a declared demo population (observed rate / mean predicted).",
      "Not Evaluation-qualified; not approved for release claims.",
      "Population is a recorded offline fixture, not a live historical warehouse.",
    ]),
  });
}

export function loadDemoPopulationRows(): readonly CalibrationPopulationRow[] {
  return POPULATION_1X2_DEMO_V1;
}

/** Pinned offline-fitted candidate consumed by Analysis when configured. */
export const POPULATION_DEMO_CALIBRATION_ARTIFACT: CalibrationArtifact =
  computeFrequencyRatioCalibrationArtifact(loadDemoPopulationRows());
