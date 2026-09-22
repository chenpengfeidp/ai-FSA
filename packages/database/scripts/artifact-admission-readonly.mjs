/**
 * Read-only Ipswich–Arsenal artifact admission reload.
 * Does NOT call ingestHistoricalEvaluation. Does NOT write History.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../dist/generated/prisma/client.js";
import { createFasDatabase } from "../dist/src/client.js";
import { createMatchId } from "../../match/dist/index.js";
import {
  authenticatePrematchPredictionSeal,
  historicalPredictionSealFromPrematch,
  validateHistoricalPredictionSeal,
  validateVerifiedRealWorldActual,
  assertHistoricalIntakeTemporalIntegrity,
  mapActualMatchResultFromEvidence,
  evaluatePrediction,
  HistoricalEvaluationIntakeError,
} from "../../statistics/dist/index.js";

const MATCH_ID = "lottery:csl:20260915:周二012";
const ADMITTED_ORIGINAL_SEAL_ID =
  "prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9";
const EVIDENCE_ID = `evidence-itfc.co.uk-${MATCH_ID}-match-result`;
const EXPECTED_CONTENT_SHA256 =
  "ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e";
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local";

function gate(name, ok, extra) {
  return { name, result: ok ? "PASS" : "FAIL", ...(extra ?? {}) };
}

function failClosed(name, fn) {
  try {
    fn();
    return { name, result: "PASS" };
  } catch (error) {
    return {
      name,
      result: "FAIL",
      code:
        error instanceof HistoricalEvaluationIntakeError ? error.code : error.name,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const db = createFasDatabase(connectionString);

try {
  await prisma.$queryRaw`SELECT 1`;
  await db.lifecycle.ping();

  const sealRow = await prisma.prematchPredictionSealItem.findUnique({
    where: { originalSealId: ADMITTED_ORIGINAL_SEAL_ID },
  });
  if (sealRow === null) {
    throw new Error("Admitted seal row not found in Postgres");
  }
  const recordJson = sealRow.recordJson;
  const storedIdentity =
    recordJson && typeof recordJson === "object" && "sealIdentity" in recordJson
      ? recordJson.sealIdentity
      : {};

  const revived = await db.prematchPredictionSealRepository.findByOriginalSealId(
    ADMITTED_ORIGINAL_SEAL_ID,
  );
  if (revived === undefined) {
    throw new Error("Seal revive failed");
  }
  authenticatePrematchPredictionSeal(revived);

  const identity = revived.sealIdentity;
  const snapshot = identity.predictionSnapshot;
  const historical = historicalPredictionSealFromPrematch(revived);

  const evidence = await db.evidenceRepository.findById(EVIDENCE_ID);
  const matchEvidence = await db.evidenceRepository.findByMatch(
    createMatchId(MATCH_ID),
  );
  const matchResults = matchEvidence.filter((item) => item.type === "MATCH_RESULT");
  const mappedActual = evidence
    ? mapActualMatchResultFromEvidence(evidence)
    : undefined;

  const payload = evidence?.payload ?? {};
  const verifiedActual =
    evidence && mappedActual
      ? Object.freeze({
          actual: mappedActual,
          evidence: Object.freeze({
            id: evidence.id,
            type: evidence.type,
            quality: evidence.quality,
            providerId: evidence.providerId,
            sourceId: evidence.sourceId,
            method: evidence.provenance.method,
            matchId: String(evidence.matchId ?? ""),
            collectedAt: evidence.collectedAt,
          }),
          realWorldVerification: payload.realWorldVerification === true,
          verificationClass: String(payload.verificationClass ?? ""),
          homeTeam: String(payload.homeTeam ?? ""),
          awayTeam: String(payload.awayTeam ?? ""),
          competitionId: String(payload.competitionId ?? ""),
          competitionName: String(payload.competitionName ?? ""),
          season: String(payload.season ?? ""),
          kickoff: String(payload.kickoff ?? ""),
        })
      : undefined;

  const validatorSeal = failClosed("validateHistoricalPredictionSeal", () => {
    validateHistoricalPredictionSeal(historical);
  });
  const validatorActual = verifiedActual
    ? failClosed("validateVerifiedRealWorldActual", () => {
        validateVerifiedRealWorldActual(verifiedActual, historical);
      })
    : {
        name: "validateVerifiedRealWorldActual",
        result: "FAIL",
        message: "Actual missing",
      };
  const validatorTemporal = verifiedActual
    ? failClosed("assertHistoricalIntakeTemporalIntegrity", () => {
        assertHistoricalIntakeTemporalIntegrity({
          seal: historical,
          actual: verifiedActual,
        });
      })
    : {
        name: "assertHistoricalIntakeTemporalIntegrity",
        result: "FAIL",
        message: "Actual missing",
      };

  const evaluation =
    mappedActual && snapshot
      ? evaluatePrediction({
          prediction: snapshot,
          actual: mappedActual,
          evaluatedAt: historical.generatedAt,
        })
      : undefined;

  const historyByMatch = await db.evaluationHistoryRepository.findByMatch(MATCH_ID);
  const historyRows = await prisma.evaluationHistoryItem.findMany({
    where: {
      OR: [
        { matchId: MATCH_ID },
        { historyId: { contains: "周二012" } },
        { historyId: { contains: ADMITTED_ORIGINAL_SEAL_ID } },
        { historyId: { startsWith: "eval-history-hi:prematch-seal:lottery:" } },
      ],
    },
    select: { historyId: true, matchId: true },
  });

  const cutoffMs = Date.parse(identity.analysisCutoff);
  const kickoffMs = Date.parse(identity.kickoff);
  const prematchEvidence = matchEvidence.filter(
    (item) => item.type !== "MATCH_RESULT",
  );
  const evidenceTiming = prematchEvidence.map((item) => ({
    id: item.id,
    type: item.type,
    collectedAt: item.collectedAt,
    atOrBeforeCutoff: Date.parse(item.collectedAt) <= cutoffMs,
  }));
  const matchResultTiming = matchResults.map((item) => ({
    id: item.id,
    quality: item.quality,
    collectedAt: item.collectedAt,
    observedAt: item.payload?.observedAt,
    homeGoals: item.payload?.homeGoals,
    awayGoals: item.payload?.awayGoals,
    realWorldVerification: item.payload?.realWorldVerification,
    afterKickoff:
      Date.parse(String(item.payload?.observedAt ?? item.collectedAt)) > kickoffMs,
  }));

  const conflictingVerified = matchResults.filter((item) => {
    const p = item.payload ?? {};
    return (
      item.quality === "verified" &&
      p.realWorldVerification === true &&
      (p.homeGoals !== 2 || p.awayGoals !== 4 || item.id !== EVIDENCE_ID)
    );
  });

  const top0 = snapshot.topScorelines?.[0];
  const includes24 = (snapshot.topScorelines ?? []).some(
    (row) => row.homeGoals === 2 && row.awayGoals === 4,
  );

  const out = {
    ping: "OK",
    mutated: false,
    ingestCalled: false,
    sealRow: {
      originalSealId: sealRow.originalSealId,
      matchId: sealRow.matchId,
      schemaVersion: sealRow.schemaVersion,
      sealedAt: sealRow.sealedAt.toISOString(),
      contentSha256: sealRow.contentSha256,
      kickoffAt: sealRow.kickoffAt.toISOString(),
      homeTeam: sealRow.homeTeam,
      awayTeam: sealRow.awayTeam,
      competitionId: sealRow.competitionId,
      season: sealRow.season,
    },
    storedRecordJson: {
      schemaVersion: recordJson?.schemaVersion,
      originalSealId: recordJson?.originalSealId,
      sealedAt: recordJson?.sealedAt,
      contentSha256: recordJson?.contentSha256,
      storedSynthetic: storedIdentity.synthetic,
      storedHistoricalAuthenticity: storedIdentity.historicalAuthenticity,
      storedProvenanceClass: storedIdentity.provenanceClass,
      storedAllowedUsage: storedIdentity.allowedUsage,
      storedSourceAuthority: storedIdentity.sourceAuthority,
      storedReconstructed: storedIdentity.reconstructed,
      storedGeneratedByCurrentAnalysisPipeline:
        storedIdentity.generatedByCurrentAnalysisPipeline,
      analysisTime: storedIdentity.analysisTime,
      analysisCutoff: storedIdentity.analysisCutoff,
      kickoff: storedIdentity.kickoff,
      season: storedIdentity.season,
      competitionId: storedIdentity.competitionId,
      competitionName: storedIdentity.competitionName,
      homeTeam: storedIdentity.homeTeam,
      awayTeam: storedIdentity.awayTeam,
      featureModelVersion: storedIdentity.featureModelVersion,
      ruleSetVersion: storedIdentity.ruleSetVersion,
      projectionModelVersion: storedIdentity.projectionModelVersion,
      projectionPolicyPin: storedIdentity.projectionPolicyPin,
    },
    revivedSeal: {
      originalSealId: revived.originalSealId,
      schemaVersion: revived.schemaVersion,
      sealedAt: revived.sealedAt,
      contentSha256: revived.contentSha256,
      contentSha256MatchesExpected:
        revived.contentSha256 === EXPECTED_CONTENT_SHA256,
      authentication: "PASS",
      synthetic: identity.synthetic,
      historicalAuthenticity: identity.historicalAuthenticity,
      provenanceClass: identity.provenanceClass,
      allowedUsage: identity.allowedUsage,
      analysisTime: identity.analysisTime,
      analysisCutoff: identity.analysisCutoff,
      kickoff: identity.kickoff,
      matchId: identity.matchId,
    },
    snapshot: {
      matchId: snapshot.matchId,
      pHome: snapshot.pHome,
      pDraw: snapshot.pDraw,
      pAway: snapshot.pAway,
      predictionConfidence: snapshot.predictionConfidence,
      confidenceBand: snapshot.confidenceBand,
      projectionStatus: snapshot.projectionStatus,
      projectionChecksum: snapshot.projectionChecksum,
      featureModelVersion: snapshot.featureModelVersion,
      ruleSetVersion: snapshot.ruleSetVersion,
      projectionModelVersion: snapshot.projectionModelVersion,
      goalRange: snapshot.goalRange,
      mostLikely: snapshot.scenarios?.mostLikely,
      topScorelines0: top0,
      topScorelinesIncludes24: includes24,
      featureNames: snapshot.featureNames,
    },
    historicalMapped: {
      originalSealKind: historical.originalSealKind,
      originalSealChecksum: historical.originalSealChecksum,
      checksumScope: historical.checksumScope,
      generatedAt: historical.generatedAt,
      originalSealSource: historical.originalSealSource,
      observationsDefined: historical.observations !== undefined,
    },
    evidence: evidence
      ? {
          id: evidence.id,
          type: evidence.type,
          quality: evidence.quality,
          providerId: evidence.providerId,
          source: evidence.source,
          sourceId: evidence.sourceId,
          method: evidence.provenance.method,
          collector: evidence.provenance.collector,
          matchId: evidence.matchId,
          collectedAt: evidence.collectedAt,
          payload: {
            homeGoals: payload.homeGoals,
            awayGoals: payload.awayGoals,
            winner: payload.winner,
            totalGoals: payload.totalGoals,
            matchStatus: payload.matchStatus,
            observedAt: payload.observedAt,
            realWorldVerification: payload.realWorldVerification,
            verificationClass: payload.verificationClass,
            homeTeam: payload.homeTeam,
            awayTeam: payload.awayTeam,
            competitionId: payload.competitionId,
            competitionName: payload.competitionName,
            season: payload.season,
            kickoff: payload.kickoff,
            sourceReference: payload.sourceReference,
          },
        }
      : null,
    mappedActual,
    binding: verifiedActual
      ? {
          matchId:
            historical.matchId === verifiedActual.actual.matchId &&
            verifiedActual.evidence.matchId === historical.matchId,
          home: historical.homeTeam === verifiedActual.homeTeam,
          away: historical.awayTeam === verifiedActual.awayTeam,
          competitionId: historical.competitionId === verifiedActual.competitionId,
          competitionName:
            historical.competitionName === verifiedActual.competitionName,
          season: historical.season === verifiedActual.season,
          kickoff: historical.kickoff === verifiedActual.kickoff,
          notReversed: !(
            verifiedActual.homeTeam === historical.awayTeam &&
            verifiedActual.awayTeam === historical.homeTeam
          ),
        }
      : null,
    temporal: {
      analysisCutoffEqualsAnalysisTime:
        identity.analysisCutoff === identity.analysisTime,
      analysisTimeBeforeKickoff: Date.parse(identity.analysisTime) < kickoffMs,
      sealedAtBeforeKickoff: Date.parse(revived.sealedAt) < kickoffMs,
      generatedAtBeforeKickoff: Date.parse(historical.generatedAt) < kickoffMs,
      generatedAtNotBeforeAnalysis:
        Date.parse(historical.generatedAt) >= Date.parse(identity.analysisTime),
      observedAfterKickoff:
        mappedActual !== undefined &&
        Date.parse(mappedActual.observedAt) > kickoffMs,
    },
    validators: [validatorSeal, validatorActual, validatorTemporal],
    evaluationDry: evaluation
      ? {
          status: evaluation.status,
          evaluatedAt: evaluation.evaluatedAt,
          winnerHit: evaluation.metrics?.winnerHit,
          scoreHit: evaluation.metrics?.scoreHit,
          goalHit: evaluation.metrics?.goalHit,
          goalRangeHit: evaluation.metrics?.goalRangeHit,
          predictedWinner: evaluation.metrics?.predictedWinner,
        }
      : null,
    evidenceCounts: {
      total: matchEvidence.length,
      byType: Object.fromEntries(
        [...new Set(matchEvidence.map((item) => item.type))].map((type) => [
          type,
          matchEvidence.filter((item) => item.type === type).length,
        ]),
      ),
    },
    evidenceTiming,
    matchResultTiming,
    conflictingVerifiedCount: conflictingVerified.length,
    prematchEvidenceAllBeforeCutoff: evidenceTiming.every(
      (item) => item.atOrBeforeCutoff,
    ),
    historyByMatchCount: historyByMatch.length,
    historyRowIds: historyRows,
    intakeIntegritySources: {
      originalSealId: Boolean(historical.originalSealId),
      originalSealChecksum: Boolean(historical.originalSealChecksum),
      resultEvidenceId: Boolean(evidence?.id),
      resultVerifiedAt: Boolean(mappedActual?.observedAt),
      fixtureIdentity: Boolean(
        historical.matchId && historical.season && historical.kickoff,
      ),
      featureModelVersion: Boolean(historical.featureModelVersion),
      ruleSetVersion: Boolean(historical.ruleSetVersion),
      projectionModelVersion: Boolean(historical.projectionModelVersion),
      predictionGeneratedAt: Boolean(historical.generatedAt),
    },
  };

  console.log(JSON.stringify(out, null, 2));
} finally {
  await prisma.$disconnect();
  await db.lifecycle.disconnect();
}
