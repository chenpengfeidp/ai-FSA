import type { Evidence } from "@fas/evidence";
import {
  createFeatureBundle,
  FEATURE_MODEL_VERSION,
  type FeatureBundle,
  type FeatureBundleStatus,
} from "../domain/feature-bundle.js";
import { createFeature, type Feature, type FeatureName } from "../domain/feature.js";
import {
  computeAsianHandicapLean,
  computeAttackRating,
  computeDefenseRating,
  computeH2hLean,
  computeImpliedProbabilities,
  computeMarketLean,
  computeMomentum,
  DEFAULT_HOME_ADVANTAGE,
  roundFeature,
} from "./feature-math.js";
import { stableChecksum } from "./stable-checksum.js";

export type FeatureExtractionErrorCode =
  | "MATCH_ID_REQUIRED"
  | "MATCH_INFO_FIELD_INVALID"
  | "MIXED_MATCHES";

export class FeatureExtractionError extends Error {
  readonly code: FeatureExtractionErrorCode;
  readonly field: string | undefined;

  constructor(code: FeatureExtractionErrorCode, message: string, field?: string) {
    super(message);
    this.name = "FeatureExtractionError";
    this.code = code;
    this.field = field;
  }
}

const emptyFeatures = Object.freeze([]) as readonly Feature[];

function requirePayloadString(evidence: Evidence, field: string): string {
  const value = evidence.payload[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FeatureExtractionError(
      "MATCH_INFO_FIELD_INVALID",
      `${field} must be a non-empty string.`,
      field,
    );
  }

  return value;
}

function featureId(evidenceId: string, name: FeatureName): string {
  return `feature:${evidenceId}:${name}`;
}

function asResultCodes(value: unknown): readonly ("D" | "L" | "W")[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const results: ("D" | "L" | "W")[] = [];

  for (const entry of value) {
    if (entry !== "W" && entry !== "D" && entry !== "L") {
      return undefined;
    }

    results.push(entry);
  }

  return results;
}

function asNumberArray(value: unknown): readonly number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const numbers: number[] = [];

  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return undefined;
    }

    numbers.push(entry);
  }

  return numbers;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function findSideEvidence(
  evidences: readonly Evidence[],
  type: "STATISTICS" | "TEAM_FORM",
  side: "away" | "home",
): Evidence | undefined {
  return evidences.find(
    (evidence) => evidence.type === type && evidence.payload.teamSide === side,
  );
}

function bundleChecksum(
  matchId: string,
  features: readonly Feature[],
  evidenceRefs: readonly string[],
  status: FeatureBundleStatus,
): string {
  const payload = JSON.stringify({
    featureModelVersion: FEATURE_MODEL_VERSION,
    matchId,
    status,
    evidenceRefs,
    features: features.map((feature) => ({
      name: feature.name,
      value: feature.value,
      sourceEvidenceId: feature.sourceEvidenceId,
    })),
  });

  return stableChecksum(payload);
}

export class FeatureExtractor {
  extract(evidence: Evidence): readonly Feature[] {
    if (evidence.type !== "MATCH_INFO") {
      return emptyFeatures;
    }

    if (evidence.matchId === undefined) {
      throw new FeatureExtractionError(
        "MATCH_ID_REQUIRED",
        "MATCH_INFO Evidence must reference a MatchId.",
        "matchId",
      );
    }

    const matchId = evidence.matchId;
    const inputs = [
      {
        name: "homeTeam" as const,
        value: requirePayloadString(evidence, "home"),
        explanation: "Home team extracted from MATCH_INFO.",
      },
      {
        name: "awayTeam" as const,
        value: requirePayloadString(evidence, "away"),
        explanation: "Away team extracted from MATCH_INFO.",
      },
      {
        name: "kickoff" as const,
        value: requirePayloadString(evidence, "kickoff"),
        explanation: "Kickoff extracted from MATCH_INFO.",
      },
    ];
    const features = inputs.map(({ name, value, explanation }) =>
      createFeature({
        featureId: featureId(evidence.id, name),
        matchId,
        name,
        value,
        explanation,
        sourceEvidenceId: evidence.id,
        generatedAt: evidence.collectedAt,
      }),
    );

    return Object.freeze(features);
  }

  extractBundle(evidences: readonly Evidence[]): FeatureBundle {
    const matchInfoCandidates = evidences.filter(
      (evidence) => evidence.type === "MATCH_INFO",
    );
    const matchInfo =
      matchInfoCandidates.find(
        (evidence) =>
          typeof evidence.payload.home === "string" &&
          typeof evidence.payload.away === "string" &&
          typeof evidence.payload.kickoff === "string",
      ) ?? matchInfoCandidates[0];

    if (matchInfo === undefined || matchInfo.matchId === undefined) {
      throw new FeatureExtractionError(
        "MATCH_ID_REQUIRED",
        "MATCH_INFO Evidence must reference a MatchId.",
        "matchId",
      );
    }

    const matchId = matchInfo.matchId;

    if (evidences.some((evidence) => evidence.matchId !== matchId)) {
      throw new FeatureExtractionError(
        "MIXED_MATCHES",
        "All Evidence items must reference the same MatchId.",
        "matchId",
      );
    }

    const features: Feature[] = [...this.extract(matchInfo)];
    const homeForm = findSideEvidence(evidences, "TEAM_FORM", "home");
    const awayForm = findSideEvidence(evidences, "TEAM_FORM", "away");
    const homeStats = findSideEvidence(evidences, "STATISTICS", "home");
    const awayStats = findSideEvidence(evidences, "STATISTICS", "away");
    const generatedAt = matchInfo.collectedAt;

    const sides = [
      {
        side: "home" as const,
        form: homeForm,
        stats: homeStats,
        attackName: "attackRatingHome" as const,
        defenseName: "defenseRatingHome" as const,
        momentumName: "momentumHome" as const,
      },
      {
        side: "away" as const,
        form: awayForm,
        stats: awayStats,
        attackName: "attackRatingAway" as const,
        defenseName: "defenseRatingAway" as const,
        momentumName: "momentumAway" as const,
      },
    ];

    let missingFootballEvidence = false;

    for (const side of sides) {
      if (side.form === undefined || side.stats === undefined) {
        missingFootballEvidence = true;
        continue;
      }

      const windowMatches = asFiniteNumber(side.stats.payload.windowMatches);
      const shotsFor = asFiniteNumber(side.stats.payload.shotsForPerMatch);
      const shotsAgainst = asFiniteNumber(side.stats.payload.shotsAgainstPerMatch);
      const xgFor = asFiniteNumber(side.stats.payload.xgForPerMatch);
      const xgAgainst = asFiniteNumber(side.stats.payload.xgAgainstPerMatch);
      const goalsFor = asNumberArray(side.form.payload.goalsFor);
      const goalsAgainst = asNumberArray(side.form.payload.goalsAgainst);
      const results = asResultCodes(side.form.payload.results);

      if (
        windowMatches === undefined ||
        shotsFor === undefined ||
        shotsAgainst === undefined ||
        xgFor === undefined ||
        xgAgainst === undefined ||
        goalsFor === undefined ||
        goalsAgainst === undefined ||
        results === undefined
      ) {
        missingFootballEvidence = true;
        continue;
      }

      const attack = roundFeature(
        computeAttackRating({
          shotsForPerMatch: shotsFor,
          xgForPerMatch: xgFor,
          goalsFor,
          windowMatches,
        }),
      );
      const defense = roundFeature(
        computeDefenseRating({
          shotsAgainstPerMatch: shotsAgainst,
          xgAgainstPerMatch: xgAgainst,
          goalsAgainst,
          windowMatches,
        }),
      );
      const momentum = roundFeature(computeMomentum(results));
      const sourceEvidenceId = side.stats.id;

      features.push(
        createFeature({
          featureId: featureId(sourceEvidenceId, side.attackName),
          matchId,
          name: side.attackName,
          value: attack,
          explanation: `Attack rating ${attack} from shots/xG/goals-for vs baseline; sample=${windowMatches}.`,
          sourceEvidenceId,
          generatedAt,
        }),
        createFeature({
          featureId: featureId(sourceEvidenceId, side.defenseName),
          matchId,
          name: side.defenseName,
          value: defense,
          explanation: `Defense rating ${defense} from shots/xG/goals-against vs baseline; sample=${windowMatches}.`,
          sourceEvidenceId,
          generatedAt,
        }),
        createFeature({
          featureId: featureId(side.form.id, side.momentumName),
          matchId,
          name: side.momentumName,
          value: momentum,
          explanation: `Momentum ${momentum} from decay-weighted recent results.`,
          sourceEvidenceId: side.form.id,
          generatedAt,
        }),
      );
    }

    features.push(
      createFeature({
        featureId: featureId(matchInfo.id, "homeAdvantage"),
        matchId,
        name: "homeAdvantage",
        value: DEFAULT_HOME_ADVANTAGE,
        explanation:
          "HomeAdvantage uses the slice-1 competition baseline constant, not derived home/away splits.",
        sourceEvidenceId: matchInfo.id,
        generatedAt,
      }),
    );

    const headToHead = evidences.find(
      (evidence) => evidence.type === "HEAD_TO_HEAD",
    );

    if (headToHead !== undefined) {
      const sampleSize = asFiniteNumber(headToHead.payload.sampleSize);
      const meetingsRaw = headToHead.payload.meetings;
      const meetings: Array<{ homeGoals: number; awayGoals: number }> = [];

      if (Array.isArray(meetingsRaw) && sampleSize !== undefined) {
        for (const entry of meetingsRaw) {
          if (
            entry !== null &&
            typeof entry === "object" &&
            !Array.isArray(entry) &&
            typeof entry.homeGoals === "number" &&
            typeof entry.awayGoals === "number"
          ) {
            meetings.push({
              homeGoals: entry.homeGoals,
              awayGoals: entry.awayGoals,
            });
          }
        }
      }

      if (meetings.length === sampleSize && sampleSize > 0) {
        const lean = roundFeature(computeH2hLean(meetings));
        features.push(
          createFeature({
            featureId: featureId(headToHead.id, "h2hLean"),
            matchId,
            name: "h2hLean",
            value: lean,
            explanation: `H2H lean ${lean} from ${sampleSize} meetings (shrunken).`,
            sourceEvidenceId: headToHead.id,
            generatedAt,
          }),
          createFeature({
            featureId: featureId(headToHead.id, "h2hSampleSize"),
            matchId,
            name: "h2hSampleSize",
            value: sampleSize,
            explanation: `H2H sample size ${sampleSize}.`,
            sourceEvidenceId: headToHead.id,
            generatedAt,
          }),
        );
      }
    }

    const oddsEvidence = evidences.find((evidence) => evidence.type === "ODDS");

    if (oddsEvidence !== undefined) {
      const homeOdds = asFiniteNumber(oddsEvidence.payload.homeOdds);
      const drawOdds = asFiniteNumber(oddsEvidence.payload.drawOdds);
      const awayOdds = asFiniteNumber(oddsEvidence.payload.awayOdds);

      if (
        homeOdds !== undefined &&
        drawOdds !== undefined &&
        awayOdds !== undefined &&
        homeOdds > 1 &&
        drawOdds > 1 &&
        awayOdds > 1
      ) {
        const implied = computeImpliedProbabilities({
          homeOdds,
          drawOdds,
          awayOdds,
        });
        const lean = roundFeature(
          computeMarketLean({ homeOdds, drawOdds, awayOdds }),
        );
        features.push(
          createFeature({
            featureId: featureId(oddsEvidence.id, "marketImpliedHome"),
            matchId,
            name: "marketImpliedHome",
            value: roundFeature(implied.home),
            explanation:
              "De-vigged market-implied home win probability from decimal odds (market signal).",
            sourceEvidenceId: oddsEvidence.id,
            generatedAt,
          }),
          createFeature({
            featureId: featureId(oddsEvidence.id, "marketImpliedDraw"),
            matchId,
            name: "marketImpliedDraw",
            value: roundFeature(implied.draw),
            explanation:
              "De-vigged market-implied draw probability from decimal odds (market signal).",
            sourceEvidenceId: oddsEvidence.id,
            generatedAt,
          }),
          createFeature({
            featureId: featureId(oddsEvidence.id, "marketImpliedAway"),
            matchId,
            name: "marketImpliedAway",
            value: roundFeature(implied.away),
            explanation:
              "De-vigged market-implied away win probability from decimal odds (market signal).",
            sourceEvidenceId: oddsEvidence.id,
            generatedAt,
          }),
          createFeature({
            featureId: featureId(oddsEvidence.id, "marketLean"),
            matchId,
            name: "marketLean",
            value: lean,
            explanation: `Market lean ${lean} = impliedHome - impliedAway (not an outcome forecast).`,
            sourceEvidenceId: oddsEvidence.id,
            generatedAt,
          }),
        );

        const asianHandicapLine = asFiniteNumber(
          oddsEvidence.payload.asianHandicapLine,
        );
        const asianHandicapHomeOdds = asFiniteNumber(
          oddsEvidence.payload.asianHandicapHomeOdds,
        );
        const asianHandicapAwayOdds = asFiniteNumber(
          oddsEvidence.payload.asianHandicapAwayOdds,
        );

        if (
          asianHandicapLine !== undefined &&
          asianHandicapHomeOdds !== undefined &&
          asianHandicapAwayOdds !== undefined &&
          asianHandicapHomeOdds > 1 &&
          asianHandicapAwayOdds > 1
        ) {
          const ahLean = roundFeature(
            computeAsianHandicapLean({
              asianHandicapHomeOdds,
              asianHandicapAwayOdds,
            }),
          );
          features.push(
            createFeature({
              featureId: featureId(oddsEvidence.id, "asianHandicapLine"),
              matchId,
              name: "asianHandicapLine",
              value: asianHandicapLine,
              explanation:
                "Primary Asian handicap line for the home side (market signal).",
              sourceEvidenceId: oddsEvidence.id,
              generatedAt,
            }),
            createFeature({
              featureId: featureId(oddsEvidence.id, "asianHandicapLean"),
              matchId,
              name: "asianHandicapLean",
              value: ahLean,
              explanation: `Asian handicap lean ${ahLean} from two-way de-vigged prices on line ${asianHandicapLine} (not an outcome forecast).`,
              sourceEvidenceId: oddsEvidence.id,
              generatedAt,
            }),
          );
        }
      }
    }

    const requiredFootballPresent =
      homeForm !== undefined &&
      awayForm !== undefined &&
      homeStats !== undefined &&
      awayStats !== undefined &&
      !missingFootballEvidence;
    const status: FeatureBundleStatus = requiredFootballPresent
      ? "completed_nonempty"
      : "degraded";
    const evidenceRefs = Object.freeze(evidences.map((evidence) => evidence.id));
    const frozenFeatures = Object.freeze(features);

    return createFeatureBundle({
      matchId,
      features: frozenFeatures,
      evidenceRefs,
      checksum: bundleChecksum(matchId, frozenFeatures, evidenceRefs, status),
      status,
    });
  }
}
