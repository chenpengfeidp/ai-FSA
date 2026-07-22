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
  computeAvailabilityPenalty,
  computeDefenseRating,
  computeH2hLean,
  computeImpliedProbabilities,
  computeMarketLean,
  computeMomentum,
  computeRecentFormScore,
  DEFAULT_HOME_ADVANTAGE,
  roundFeature,
  VENUE_ADVANTAGE_SCORE,
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

function readFormSplit(
  value: unknown,
): Readonly<{ results: readonly ("D" | "L" | "W")[] }> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const results = asResultCodes((value as { results?: unknown }).results);
  return results === undefined ? undefined : Object.freeze({ results });
}

function extractFormDecompositionFeatures(input: {
  readonly form: Evidence;
  readonly side: "away" | "home";
  readonly matchId: Evidence["matchId"];
  readonly generatedAt: string;
}): readonly Feature[] {
  const { form, side, matchId, generatedAt } = input;

  if (matchId === undefined) {
    return emptyFeatures;
  }

  const features: Feature[] = [];
  const atHomeName =
    side === "home" ? ("formAtHomeHome" as const) : ("formAtHomeAway" as const);
  const onRoadName =
    side === "home" ? ("formOnRoadHome" as const) : ("formOnRoadAway" as const);
  const scoredName =
    side === "home"
      ? ("goalsScoredRateHome" as const)
      : ("goalsScoredRateAway" as const);
  const concededName =
    side === "home"
      ? ("goalsConcededRateHome" as const)
      : ("goalsConcededRateAway" as const);
  const shortName =
    side === "home"
      ? ("recentFormShortHome" as const)
      : ("recentFormShortAway" as const);

  const homeSplit = readFormSplit(form.payload.homeSplit);
  const awaySplit = readFormSplit(form.payload.awaySplit);
  const recentShort = readFormSplit(form.payload.recentShort);
  const scored = asFiniteNumber(form.payload.goalsScoredPerMatch);
  const conceded = asFiniteNumber(form.payload.goalsConcededPerMatch);

  if (homeSplit !== undefined) {
    const score = roundFeature(computeRecentFormScore(homeSplit.results));
    features.push(
      createFeature({
        featureId: featureId(form.id, atHomeName),
        matchId,
        name: atHomeName,
        value: score,
        explanation: `Home-venue form ${score} from ${homeSplit.results.length} home matches.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  if (awaySplit !== undefined) {
    const score = roundFeature(computeRecentFormScore(awaySplit.results));
    features.push(
      createFeature({
        featureId: featureId(form.id, onRoadName),
        matchId,
        name: onRoadName,
        value: score,
        explanation: `Away-venue form ${score} from ${awaySplit.results.length} away matches.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  if (scored !== undefined) {
    features.push(
      createFeature({
        featureId: featureId(form.id, scoredName),
        matchId,
        name: scoredName,
        value: roundFeature(scored),
        explanation: `Goals scored per match ${roundFeature(scored)} over recent window.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  if (conceded !== undefined) {
    features.push(
      createFeature({
        featureId: featureId(form.id, concededName),
        matchId,
        name: concededName,
        value: roundFeature(conceded),
        explanation: `Goals conceded per match ${roundFeature(conceded)} over recent window.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  if (recentShort !== undefined) {
    const score = roundFeature(computeRecentFormScore(recentShort.results));
    features.push(
      createFeature({
        featureId: featureId(form.id, shortName),
        matchId,
        name: shortName,
        value: score,
        explanation: `Short-window form ${score} from last ${recentShort.results.length} matches.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  return Object.freeze(features);
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
      const recentForm = roundFeature(computeRecentFormScore(results));
      const sourceEvidenceId = side.stats.id;
      const recentFormName =
        side.side === "home"
          ? ("recentFormHome" as const)
          : ("recentFormAway" as const);

      features.push(
        createFeature({
          featureId: featureId(sourceEvidenceId, side.attackName),
          matchId,
          name: side.attackName,
          value: attack,
          explanation: `Attack rating ${attack} from shots/goals-for vs baseline; sample=${windowMatches}.`,
          sourceEvidenceId,
          generatedAt,
        }),
        createFeature({
          featureId: featureId(sourceEvidenceId, side.defenseName),
          matchId,
          name: side.defenseName,
          value: defense,
          explanation: `Defense rating ${defense} from shots/goals-against vs baseline; sample=${windowMatches}.`,
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
        createFeature({
          featureId: featureId(side.form.id, recentFormName),
          matchId,
          name: recentFormName,
          value: recentForm,
          explanation: `Recent form ${recentForm} from W/D/L window (W=1, D=0.5, L=0).`,
          sourceEvidenceId: side.form.id,
          generatedAt,
        }),
      );

      features.push(
        ...extractFormDecompositionFeatures({
          form: side.form,
          side: side.side,
          matchId,
          generatedAt,
        }),
      );
    }

    const momentumHomeFeature = features.find(
      (feature) => feature.name === "momentumHome",
    );
    const momentumAwayFeature = features.find(
      (feature) => feature.name === "momentumAway",
    );

    if (
      typeof momentumHomeFeature?.value === "number" &&
      typeof momentumAwayFeature?.value === "number"
    ) {
      const momentumLean = roundFeature(
        momentumHomeFeature.value - momentumAwayFeature.value,
      );
      features.push(
        createFeature({
          featureId: featureId(matchInfo.id, "momentum"),
          matchId,
          name: "momentum",
          value: momentumLean,
          explanation: `Signed momentum lean ${momentumLean} (home momentum minus away momentum).`,
          sourceEvidenceId: matchInfo.id,
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
          "HomeAdvantage uses the competition baseline constant, not derived home/away splits.",
        sourceEvidenceId: matchInfo.id,
        generatedAt,
      }),
    );

    const venueEvidence = evidences.find((evidence) => evidence.type === "VENUE");

    if (venueEvidence !== undefined) {
      features.push(
        createFeature({
          featureId: featureId(venueEvidence.id, "venueAdvantage"),
          matchId,
          name: "venueAdvantage",
          value: VENUE_ADVANTAGE_SCORE,
          explanation: `VenueAdvantage ${VENUE_ADVANTAGE_SCORE} from VENUE Evidence (home context).`,
          sourceEvidenceId: venueEvidence.id,
          generatedAt,
        }),
      );
    }

    for (const side of ["home", "away"] as const) {
      const absenceEvidence = evidences.filter(
        (evidence) =>
          (evidence.type === "INJURY" || evidence.type === "SUSPENSION") &&
          evidence.payload.teamSide === side,
      );

      if (absenceEvidence.length === 0) {
        continue;
      }

      const injuryCount = absenceEvidence.filter(
        (evidence) => evidence.type === "INJURY",
      ).length;
      const suspensionCount = absenceEvidence.filter(
        (evidence) => evidence.type === "SUSPENSION",
      ).length;
      const penalty = roundFeature(
        computeAvailabilityPenalty({ injuryCount, suspensionCount }),
      );
      const name =
        side === "home"
          ? ("availabilityPenaltyHome" as const)
          : ("availabilityPenaltyAway" as const);
      const sourceEvidenceId = absenceEvidence[0]?.id ?? matchInfo.id;

      features.push(
        createFeature({
          featureId: featureId(sourceEvidenceId, name),
          matchId,
          name,
          value: penalty,
          explanation: `Availability penalty ${penalty} from ${injuryCount} injury and ${suspensionCount} suspension Facts.`,
          sourceEvidenceId,
          generatedAt,
        }),
      );
    }

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
