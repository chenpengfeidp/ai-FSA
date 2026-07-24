import type { IntelligenceDomainId } from "../domain/contribution-report.js";
import {
  ADVANCED_STATISTICS_FEATURE_NAMES,
  CLUB_INTELLIGENCE_FEATURE_NAMES,
  EXPECTED_GOALS_FEATURE_NAMES,
  PLAYER_INTELLIGENCE_FEATURE_NAMES,
} from "../validation/feature-profile.js";

/**
 * Feature-name families used only to measure O1 domain contribution. This
 * module never extracts, computes, or renames Features — it reads the
 * `featureNames` already recorded on a sealed Evaluation History
 * `predictionSnapshot` (A1.5) and reports which Football Intelligence
 * domain(s) were observed to be present for that record. Unlike V1A's
 * mutually-exclusive profile ladder, domains here are independent, binary
 * presence checks: a single sealed prediction can count toward several
 * domains at once (e.g. a record with both Club and Player Features
 * contributes to both domain rows).
 *
 * Advanced Statistics, Expected Goals, Club Intelligence, and Player
 * Intelligence reuse the exact family sets already defined for V1A
 * (`../validation/feature-profile.js`) rather than duplicating them.
 */

/** Foundation Venue Intelligence Feature name (see feature-extractor.ts extractBundle VENUE handling). */
export const VENUE_INTELLIGENCE_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "venueAdvantage",
]);

/** Foundation Availability Intelligence Feature names (see feature-extractor.ts extractBundle INJURY/SUSPENSION handling). */
export const AVAILABILITY_INTELLIGENCE_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "availabilityPenaltyHome",
  "availabilityPenaltyAway",
]);

/**
 * I1B Match Context Feature names, including `homeStability` (which V1A's
 * own `MATCH_CONTEXT_FEATURE_NAMES` omits — see feature-extractor.ts
 * extractMatchContextFeatures). Kept as a separate constant here rather than
 * modifying V1A's frozen set, to avoid changing any already-shipped V1A
 * behavior.
 */
export const MATCH_CONTEXT_DOMAIN_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "fatigueIndexHome",
  "fatigueIndexAway",
  "rotationPressureHome",
  "rotationPressureAway",
  "scheduleAdvantage",
  "knockoutContext",
  "homeStability",
]);

/** I2B Market Intelligence Feature names (see feature-extractor.ts extractMarketIntelligenceFeatures + ODDS-derived Features). */
export const MARKET_INTELLIGENCE_FEATURE_NAMES: ReadonlySet<string> = new Set([
  "marketLean",
  "marketImpliedHome",
  "marketImpliedDraw",
  "marketImpliedAway",
  "asianHandicapLine",
  "asianHandicapLean",
  "marketConsensus",
  "steamMove",
  "reverseLineMovement",
  "marketVolatility",
  "sharpSupport",
]);

export const INTELLIGENCE_DOMAIN_FEATURE_NAMES: Readonly<
  Record<IntelligenceDomainId, ReadonlySet<string>>
> = Object.freeze({
  venue_intelligence: VENUE_INTELLIGENCE_FEATURE_NAMES,
  availability_intelligence: AVAILABILITY_INTELLIGENCE_FEATURE_NAMES,
  advanced_statistics: ADVANCED_STATISTICS_FEATURE_NAMES,
  expected_goals: EXPECTED_GOALS_FEATURE_NAMES,
  match_context: MATCH_CONTEXT_DOMAIN_FEATURE_NAMES,
  club_intelligence: CLUB_INTELLIGENCE_FEATURE_NAMES,
  player_intelligence: PLAYER_INTELLIGENCE_FEATURE_NAMES,
  market_intelligence: MARKET_INTELLIGENCE_FEATURE_NAMES,
});

/**
 * Returns true when the sealed snapshot's Feature names include at least
 * one member of the given domain's family. Purely observational: reports
 * only whether that domain's Features were present at seal time — never
 * infers, re-derives, or re-runs anything.
 */
export function hasDomainFeatures(
  featureNames: readonly string[],
  domain: IntelligenceDomainId,
): boolean {
  const family = INTELLIGENCE_DOMAIN_FEATURE_NAMES[domain];
  return featureNames.some((name) => family.has(name));
}
