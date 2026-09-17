/**
 * Governed verified real-world MATCH_RESULT persistence (no analyze, no seal mutation).
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

const { createEvidence } = await import(
  join(REPO_ROOT, "packages/evidence/dist/domain/evidence.js")
);
const { createMatchId } = await import(
  join(REPO_ROOT, "packages/match/dist/index.js")
);
const { createFasDatabase } = await import(
  join(REPO_ROOT, "packages/database/dist/src/client.js")
);
const { authenticatePrematchPredictionSeal, mapActualMatchResultFromEvidence } =
  await import(join(REPO_ROOT, "packages/statistics/dist/index.js"));

const MATCH_ID = "lottery:csl:20260915:周二012";
const ADMITTED_ORIGINAL_SEAL_ID =
  "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9";

const OBSERVED_AT = "2026-09-16T15:35:00+08:00";
const KICKOFF = "2026-09-16T03:00:00+08:00";

const EVIDENCE_ID = `evidence-itfc.co.uk-${MATCH_ID}-match-result`;

async function main() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local";

  const db = createFasDatabase(connectionString);
  await db.lifecycle.connect();

  const sealRow = await db.prematchPredictionSealRepository.findByOriginalSealId(
    ADMITTED_ORIGINAL_SEAL_ID,
  );

  if (sealRow === undefined) {
    throw new Error("Admitted seal not found");
  }

  const record = sealRow;
  authenticatePrematchPredictionSeal({
    schemaVersion: record.schemaVersion,
    originalSealId: record.originalSealId,
    sealedAt: record.sealedAt,
    sealIdentity: record.sealIdentity,
    contentSha256: record.contentSha256,
  });

  const identity = record.sealIdentity;
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
        "itfc.co.uk official match report (Ipswich Town 2-4 Arsenal); corroboration arsenal.com/news/report-ipswich-town-2-4-arsenal",
    },
  });

  await db.evidenceRepository.save(evidence);

  const reloaded = await db.evidenceRepository.findById(EVIDENCE_ID);
  const sealReload = await db.prematchPredictionSealRepository.findByOriginalSealId(
    ADMITTED_ORIGINAL_SEAL_ID,
  );

  const actual = mapActualMatchResultFromEvidence(reloaded);

  const out = {
    sealBefore: {
      originalSealId: record.originalSealId,
      contentSha256: record.contentSha256,
      sealedAt: record.sealedAt,
      analysisTime: identity.analysisTime,
      analysisCutoff: identity.analysisCutoff,
      kickoff: identity.kickoff,
    },
    sealAfter: {
      originalSealId: sealReload?.originalSealId,
      contentSha256: sealReload?.contentSha256,
      sealedAt: sealReload?.sealedAt,
    },
    sealUnchanged:
      sealReload?.originalSealId === record.originalSealId &&
      sealReload?.contentSha256 === record.contentSha256 &&
      sealReload?.sealedAt === record.sealedAt,
    evidence: reloaded,
    actual,
    temporal: {
      analysisBeforeKickoff: Date.parse(identity.analysisTime) < Date.parse(KICKOFF),
      sealedBeforeKickoff: Date.parse(record.sealedAt) < Date.parse(KICKOFF),
      observedAfterKickoff: Date.parse(OBSERVED_AT) > Date.parse(KICKOFF),
    },
  };

  console.log(JSON.stringify(out, null, 2));
  await db.lifecycle.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
