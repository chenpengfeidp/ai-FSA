import { createEvidence } from "@fas/evidence";
import { createMatchId } from "@fas/match";
import {
  authenticatePrematchPredictionSeal,
  mapActualMatchResultFromEvidence,
} from "@fas/statistics";
import { afterAll, describe, expect, it } from "vitest";

import { createFasDatabase, type FasDatabaseHandle } from "../src/index.js";

const MATCH_ID = "lottery:csl:20260915:周二012";
const ADMITTED_ORIGINAL_SEAL_ID =
  "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9";
const EVIDENCE_ID = `evidence-itfc.co.uk-${MATCH_ID}-match-result`;
const OBSERVED_AT = "2026-09-16T15:35:00+08:00";
const KICKOFF = "2026-09-16T03:00:00+08:00";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local";

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

describe.skipIf(connected === undefined)(
  "Verified real-world Actual + admitted Class A seal pair (周二012)",
  () => {
    afterAll(async () => {
      await connected?.lifecycle.disconnect();
    });

    it("persists verified MATCH_RESULT and leaves admitted seal immutable", async () => {
      const db = connected;
      if (db === undefined) {
        return;
      }

      const seal = await db.prematchPredictionSealRepository.findByOriginalSealId(
        ADMITTED_ORIGINAL_SEAL_ID,
      );
      expect(seal).toBeDefined();
      if (seal === undefined) {
        return;
      }

      authenticatePrematchPredictionSeal(seal);
      const identity = seal.sealIdentity;

      const evidence = createEvidence({
        id: EVIDENCE_ID,
        source: "itfc.co.uk",
        sourceId: "carabao-cup-2026-09-15:ipswich-arsenal:ft:2-4",
        type: "MATCH_RESULT",
        matchId: createMatchId(MATCH_ID),
        collectedAt: OBSERVED_AT,
        eventTime: OBSERVED_AT,
        timestamp: OBSERVED_AT,
        freshness: "fresh",
        confidence: "high",
        quality: "verified",
        provenance: {
          collector: "governed-verified-actual-capture",
          method: "official-club-match-report",
          category: "football",
        },
        payload: {
          homeTeam: identity.homeTeam,
          awayTeam: identity.awayTeam,
          competitionId: identity.competitionId,
          competitionName: identity.competitionName,
          season: identity.season,
          kickoff: identity.kickoff,
          homeGoals: 2,
          awayGoals: 4,
          winner: "away",
          totalGoals: 6,
          matchStatus: "FINISHED",
          observedAt: OBSERVED_AT,
          realWorldVerification: true,
          verificationClass: "verified-real-world",
          sourceReference:
            "Ipswich Town 2-4 Arsenal (Carabao Cup); itfc.co.uk official report; corroboration arsenal.com",
        },
      });

      const saved = await db.evidenceRepository.save(evidence);
      expect(saved.id).toBe(EVIDENCE_ID);

      const reloaded = await db.evidenceRepository.findById(EVIDENCE_ID);
      expect(reloaded?.quality).toBe("verified");
      expect(reloaded?.payload.realWorldVerification).toBe(true);

      const actual = mapActualMatchResultFromEvidence(reloaded!);
      expect(actual?.homeGoals).toBe(2);
      expect(actual?.awayGoals).toBe(4);
      expect(actual?.winner).toBe("away");
      expect(actual?.matchStatus).toBe("FINISHED");
      expect(Date.parse(actual!.observedAt)).toBeGreaterThan(Date.parse(KICKOFF));

      expect(identity.homeTeam).toBe("伊普斯维奇");
      expect(identity.awayTeam).toBe("阿森纳");
      expect(identity.competitionId).toBe("eng:efl-cup");
      expect(identity.season).toBe("2025/26");
      expect(identity.kickoff).toBe(KICKOFF);

      expect(Date.parse(identity.analysisTime)).toBeLessThan(Date.parse(KICKOFF));
      expect(Date.parse(seal.sealedAt)).toBeLessThan(Date.parse(KICKOFF));

      const sealReload =
        await db.prematchPredictionSealRepository.findByOriginalSealId(
          ADMITTED_ORIGINAL_SEAL_ID,
        );
      expect(sealReload?.contentSha256).toBe(seal.contentSha256);
      expect(sealReload?.sealedAt).toBe(seal.sealedAt);
      expect(sealReload?.originalSealId).toBe(seal.originalSealId);
    });
  },
);
