import { afterAll, describe, expect, it } from "vitest";
import {
  capturePrematchPredictionSeal,
  createPrematchPredictionSeal,
  identitiesCanonicallyEqual,
  SealIdentityConflictError,
  type PrematchFixtureIdentity,
  type PrematchPredictionSeal,
  type SealedPredictionInput,
} from "@fas/statistics";

import { createFasDatabase, type FasDatabaseHandle } from "../src/index.js";

const RULE_SET_VERSION = "rule.mvp.m1b.manager";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

async function tryConnect(): Promise<FasDatabaseHandle | undefined> {
  try {
    const database = createFasDatabase(databaseUrl);
    await database.lifecycle.ping();
    return database;
  } catch {
    return undefined;
  }
}

const connected = await tryConnect();

function snapshot(matchId: string): SealedPredictionInput {
  return Object.freeze({
    matchId,
    projectionChecksum: `proj-${matchId}`,
    projectionStatus: "completed_nonempty",
    pHome: 0.46,
    pDraw: 0.28,
    pAway: 0.26,
    topScorelines: Object.freeze([
      Object.freeze({ homeGoals: 1, awayGoals: 0, probability: 0.11 }),
    ]),
    goalRange: Object.freeze({ range01: 0.3, range23: 0.4, range4Plus: 0.3 }),
    predictionConfidence: 64,
    confidenceBand: "medium",
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: "mostLikely",
        winner: "home",
        homeGoals: 1,
        awayGoals: 0,
        probability: 0.46,
      }),
      secondLikely: Object.freeze({
        slot: "secondLikely",
        winner: "draw",
        homeGoals: 1,
        awayGoals: 1,
        probability: 0.28,
      }),
      upset: Object.freeze({
        slot: "upset",
        winner: "away",
        homeGoals: 0,
        awayGoals: 1,
        probability: 0.26,
      }),
    }),
    rules: Object.freeze([
      Object.freeze({
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS",
        channel: "home+",
      }),
    ]),
    featureNames: Object.freeze(["attackRatingHome"]),
    projectionModelVersion: "projection.v2.unifiedMatrix",
    featureModelVersion: "feature.v2.test",
    ruleSetVersion: RULE_SET_VERSION,
  });
}

function fixture(matchId: string): PrematchFixtureIdentity {
  return Object.freeze({
    matchId,
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    competitionId: "292",
    competitionName: "K League 1",
    season: "2026",
    kickoff: "2026-12-01T10:00:00.000Z",
  });
}

describe.skipIf(connected === undefined)(
  "PrismaPrematchPredictionSealRepository",
  () => {
    afterAll(async () => {
      if (connected !== undefined) {
        await connected.lifecycle.disconnect();
      }
    });

    it("T24/T25 round-trips a seal without re-analysis", async () => {
      const database = connected;
      if (database === undefined) {
        return;
      }

      const matchId = `match-seal-${Date.now()}`;
      const input = {
        fixture: fixture(matchId),
        evidenceSet: Object.freeze([
          Object.freeze({
            type: "MATCH_INFO",
            collectedAt: "2026-11-30T10:00:00.000Z",
          }),
        ]),
        predictionSnapshot: snapshot(matchId),
        featureModelVersion: "feature.v2.test",
        ruleSetVersion: RULE_SET_VERSION,
        projectionModelVersion: "projection.v2.unifiedMatrix",
        projectionPolicyPin: "v2",
        analysisTime: "2026-11-30T10:00:00.000Z",
        analysisCutoff: "2026-11-30T10:00:00.000Z",
        sealedAt: "2026-11-30T10:00:01.000Z",
      };
      const saved = await capturePrematchPredictionSeal(
        input,
        database.prematchPredictionSealRepository,
      );
      const loaded =
        await database.prematchPredictionSealRepository.findByOriginalSealId(
          saved.originalSealId,
        );

      expect(loaded).toBeDefined();
      expect(loaded?.originalSealId).toBe(saved.originalSealId);
      expect(loaded?.contentSha256).toBe(saved.contentSha256);
      expect(loaded?.sealIdentity.predictionSnapshot.pHome).toBe(0.46);
      expect(
        identitiesCanonicallyEqual(
          loaded?.sealIdentity ?? saved.sealIdentity,
          saved.sealIdentity,
        ),
      ).toBe(true);
    });

    it("T26 concurrent conflicting write fails closed", async () => {
      const database = connected;
      if (database === undefined) {
        return;
      }

      const matchId = `match-seal-conflict-${Date.now()}`;
      const first = await capturePrematchPredictionSeal(
        {
          fixture: fixture(matchId),
          evidenceSet: Object.freeze([
            Object.freeze({
              type: "MATCH_INFO",
              collectedAt: "2026-11-30T10:00:00.000Z",
            }),
          ]),
          predictionSnapshot: snapshot(matchId),
          featureModelVersion: "feature.v2.test",
          ruleSetVersion: RULE_SET_VERSION,
          projectionModelVersion: "projection.v2.unifiedMatrix",
          projectionPolicyPin: "v2",
          analysisTime: "2026-11-30T10:00:00.000Z",
          analysisCutoff: "2026-11-30T10:00:00.000Z",
          sealedAt: "2026-11-30T10:00:01.000Z",
        },
        database.prematchPredictionSealRepository,
      );

      const conflicting: PrematchPredictionSeal = Object.freeze({
        ...first,
        sealIdentity: Object.freeze({
          ...first.sealIdentity,
          homeTeam: "Other FC",
        }),
      });

      await expect(
        database.prematchPredictionSealRepository.save(conflicting),
      ).rejects.toBeInstanceOf(SealIdentityConflictError);
    });

    it("retries with a later sealedAt return the first row", async () => {
      const database = connected;
      if (database === undefined) {
        return;
      }

      const matchId = `match-seal-retry-${Date.now()}`;
      const created = createPrematchPredictionSeal({
        fixture: fixture(matchId),
        predictionSnapshot: snapshot(matchId),
        featureModelVersion: "feature.v2.test",
        ruleSetVersion: RULE_SET_VERSION,
        projectionModelVersion: "projection.v2.unifiedMatrix",
        projectionPolicyPin: "v2",
        analysisTime: "2026-11-30T10:00:00.000Z",
        analysisCutoff: "2026-11-30T10:00:00.000Z",
        sealedAt: "2026-11-30T10:00:01.000Z",
      });
      const first = await database.prematchPredictionSealRepository.save(created);
      const later = createPrematchPredictionSeal({
        fixture: fixture(matchId),
        predictionSnapshot: snapshot(matchId),
        featureModelVersion: "feature.v2.test",
        ruleSetVersion: RULE_SET_VERSION,
        projectionModelVersion: "projection.v2.unifiedMatrix",
        projectionPolicyPin: "v2",
        analysisTime: "2026-11-30T10:00:00.000Z",
        analysisCutoff: "2026-11-30T10:00:00.000Z",
        sealedAt: "2026-11-30T10:00:09.000Z",
      });
      const second = await database.prematchPredictionSealRepository.save(later);

      expect(second.sealedAt).toBe(first.sealedAt);
      expect(second.contentSha256).toBe(first.contentSha256);
    });
  },
);
