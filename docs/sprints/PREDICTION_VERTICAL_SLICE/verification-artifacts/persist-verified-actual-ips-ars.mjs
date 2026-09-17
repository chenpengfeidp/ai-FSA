/**
 * Governed verified real-world MATCH_RESULT persistence (no analyze, no seal mutation).
 * Usage: DATABASE_URL must be set (e.g. from .env). Fresh observedAt at execution.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const envPath = join(REPO_ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

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
const EVIDENCE_ID = `evidence-itfc.co.uk-${MATCH_ID}-match-result`;
const KICKOFF = "2026-09-16T03:00:00+08:00";

function isoObservedAtNow() {
  const d = new Date();
  if (d.getTime() <= Date.parse(KICKOFF)) {
    throw new Error("Wall-clock must be after kickoff to record observedAt.");
  }
  return d.toISOString();
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local";

  const observedAt = isoObservedAtNow();
  const db = createFasDatabase(connectionString);
  await db.lifecycle.connect();

  const seal = await db.prematchPredictionSealRepository.findByOriginalSealId(
    ADMITTED_ORIGINAL_SEAL_ID,
  );
  if (seal === undefined) {
    throw new Error("Admitted seal not found");
  }

  authenticatePrematchPredictionSeal(seal);
  const identity = seal.sealIdentity;

  const existing = await db.evidenceRepository.findById(EVIDENCE_ID);
  if (existing !== undefined) {
    const p = existing.payload;
    const same =
      existing.type === "MATCH_RESULT" &&
      existing.quality === "verified" &&
      p.realWorldVerification === true &&
      p.homeGoals === 2 &&
      p.awayGoals === 4 &&
      p.winner === "away";
    if (!same) {
      throw new Error("Conflicting MATCH_RESULT already persisted.");
    }
  } else {
    const evidence = createEvidence({
      id: EVIDENCE_ID,
      source: "itfc.co.uk",
      sourceId: "carabao-cup-2026-09-15:ipswich-arsenal:ft:2-4",
      type: "MATCH_RESULT",
      matchId: createMatchId(MATCH_ID),
      collectedAt: observedAt,
      eventTime: observedAt,
      timestamp: observedAt,
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
        observedAt,
        realWorldVerification: true,
        verificationClass: "verified-real-world",
        sourceReference:
          "Ipswich Town 2-4 Arsenal; arsenal.com/news/report-ipswich-town-2-4-arsenal (corroboration); governed fixture season copied from admitted seal",
      },
    });
    await db.evidenceRepository.save(evidence);
  }

  await db.lifecycle.disconnect();

  const db2 = createFasDatabase(connectionString);
  await db2.lifecycle.connect();
  const reloaded = await db2.evidenceRepository.findById(EVIDENCE_ID);
  const sealReload = await db2.prematchPredictionSealRepository.findByOriginalSealId(
    ADMITTED_ORIGINAL_SEAL_ID,
  );
  const actual = mapActualMatchResultFromEvidence(reloaded);

  const out = {
    observedAtUsed: reloaded?.payload.observedAt ?? observedAt,
    sealSeason: identity.season,
    sealBefore: {
      originalSealId: seal.originalSealId,
      contentSha256: seal.contentSha256,
      sealedAt: seal.sealedAt,
    },
    sealAfter: {
      originalSealId: sealReload?.originalSealId,
      contentSha256: sealReload?.contentSha256,
      sealedAt: sealReload?.sealedAt,
    },
    sealUnchanged:
      sealReload?.originalSealId === seal.originalSealId &&
      sealReload?.contentSha256 === seal.contentSha256 &&
      sealReload?.sealedAt === seal.sealedAt,
    evidence: reloaded,
    actual,
    temporal: {
      analysisBeforeKickoff: Date.parse(identity.analysisTime) < Date.parse(KICKOFF),
      analysisCutoffEqualsAnalysisTime:
        identity.analysisCutoff === identity.analysisTime,
      sealedBeforeKickoff: Date.parse(seal.sealedAt) < Date.parse(KICKOFF),
      observedAfterKickoff:
        Date.parse(String(reloaded?.payload.observedAt)) > Date.parse(KICKOFF),
    },
  };

  console.log(JSON.stringify(out, null, 2));
  await db2.lifecycle.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
