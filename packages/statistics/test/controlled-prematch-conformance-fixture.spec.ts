import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { canonicalizeJson, sha256JsonPointer } from "./helpers/canonical-json.js";

type JsonRecord = Record<string, unknown>;

interface FixtureBundle {
  readonly manifest: JsonRecord;
  readonly predictionSeal: JsonRecord;
  readonly verifiedActual: JsonRecord;
}

type BundleMutation = (bundle: FixtureBundle) => void;

const FIXTURE_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "controlled-prematch-conformance-v1",
);

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

function fail(message: string): never {
  throw new Error(message);
}

function asRecord(value: unknown, field: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${field} must be an object.`);
  }

  return value as JsonRecord;
}

function recordField(record: JsonRecord, field: string): JsonRecord {
  return asRecord(record[field], field);
}

function stringField(record: JsonRecord, field: string): string {
  const value = record[field];

  if (typeof value !== "string" || value.length === 0) {
    return fail(`${field} must be a non-empty string.`);
  }

  return value;
}

function numberField(record: JsonRecord, field: string): number {
  const value = record[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(`${field} must be a finite number.`);
  }

  return value;
}

function booleanField(record: JsonRecord, field: string): boolean {
  const value = record[field];

  if (typeof value !== "boolean") {
    return fail(`${field} must be a boolean.`);
  }

  return value;
}

function requireEqual(actual: unknown, expected: unknown, field: string): void {
  if (actual !== expected) {
    fail(`${field} must equal ${JSON.stringify(expected)}.`);
  }
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    return fail(`${field} must be a lowercase SHA-256 hex digest.`);
  }

  return value;
}

function parseInstant(value: unknown, field: string): number {
  if (typeof value !== "string" || !ISO_TIMESTAMP_PATTERN.test(value)) {
    return fail(`${field} must be a timezone-aware ISO-8601 instant.`);
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return fail(`${field} must be a valid instant.`);
  }

  return parsed;
}

function parseFixtureFile(name: string): JsonRecord {
  const parsed: unknown = JSON.parse(
    readFileSync(join(FIXTURE_DIRECTORY, name), "utf8"),
  );
  return asRecord(parsed, name);
}

function loadBundle(): FixtureBundle {
  return {
    manifest: parseFixtureFile("manifest.json"),
    predictionSeal: parseFixtureFile("prediction-seal.json"),
    verifiedActual: parseFixtureFile("verified-actual.json"),
  };
}

function cloneBundle(bundle: FixtureBundle): FixtureBundle {
  return structuredClone(bundle);
}

function validateClassification(classification: JsonRecord, field: string): void {
  requireEqual(
    booleanField(classification, "synthetic"),
    true,
    `${field}.synthetic`,
  );
  requireEqual(
    booleanField(classification, "historicalAuthenticity"),
    false,
    `${field}.historicalAuthenticity`,
  );
  requireEqual(
    stringField(classification, "provenanceClass"),
    "B",
    `${field}.provenanceClass`,
  );
  requireEqual(
    stringField(classification, "allowedUsage"),
    "conformance_test_only",
    `${field}.allowedUsage`,
  );
}

function validateIntegrityDescriptor(
  document: JsonRecord,
  descriptor: JsonRecord,
  expectedScope: string,
  field: string,
): string {
  requireEqual(stringField(descriptor, "algorithm"), "sha256", `${field}.algorithm`);
  requireEqual(
    stringField(descriptor, "canonicalization"),
    "fas-json-canonical.v1",
    `${field}.canonicalization`,
  );
  requireEqual(stringField(descriptor, "scope"), expectedScope, `${field}.scope`);

  const declared = requireSha256(descriptor.digest, `${field}.digest`);
  const recomputed = sha256JsonPointer(document, expectedScope);
  requireEqual(declared, recomputed, `${field}.digest`);
  return declared;
}

function validatePredictionSeal(document: JsonRecord): string {
  requireEqual(
    stringField(document, "schemaVersion"),
    "controlled-prematch-prediction-seal.v1",
    "predictionSeal.schemaVersion",
  );

  const sealPayload = recordField(document, "sealPayload");
  validateClassification(
    recordField(sealPayload, "classification"),
    "predictionSeal.classification",
  );

  const temporal = recordField(sealPayload, "temporal");
  requireEqual(stringField(temporal, "mode"), "PRE_MATCH", "temporal.mode");
  requireEqual(
    stringField(temporal, "sourceTimezone"),
    "UTC",
    "temporal.sourceTimezone",
  );
  requireEqual(
    stringField(temporal, "timeContractVersion"),
    "fip.analysis-protocol.v1",
    "temporal.timeContractVersion",
  );

  const lineage = recordField(sealPayload, "lineage");
  const parameterArtifact = recordField(lineage, "parameterArtifact");
  requireEqual(
    stringField(lineage, "featureModelVersion"),
    "feature.synthetic.conformance.v1",
    "lineage.featureModelVersion",
  );
  requireEqual(
    stringField(lineage, "ruleSetVersion"),
    "rule.synthetic.conformance.v1",
    "lineage.ruleSetVersion",
  );
  requireEqual(
    stringField(lineage, "projectionModelVersion"),
    "projection.synthetic.conformance.v1",
    "lineage.projectionModelVersion",
  );
  requireEqual(
    stringField(lineage, "policyVersion"),
    "projection-policy.synthetic.conformance.v1",
    "lineage.policyVersion",
  );
  requireEqual(
    stringField(parameterArtifact, "artifactId"),
    "projectionParams:synthetic:conformance:v1",
    "parameterArtifact.artifactId",
  );
  requireEqual(
    stringField(parameterArtifact, "versionLabel"),
    "projection.synthetic.conformance.v1",
    "parameterArtifact.versionLabel",
  );
  requireEqual(
    stringField(parameterArtifact, "checksumAlgorithm"),
    "sha256",
    "parameterArtifact.checksumAlgorithm",
  );
  requireEqual(
    stringField(parameterArtifact, "checksumCanonicalization"),
    "fas-json-canonical.v1",
    "parameterArtifact.checksumCanonicalization",
  );
  const parameterScope = stringField(parameterArtifact, "checksumScope");
  requireEqual(
    parameterScope,
    "/sealPayload/lineage/parameterArtifact/payload",
    "parameterArtifact.checksumScope",
  );
  const parameterChecksum = requireSha256(
    parameterArtifact.checksum,
    "parameterArtifact.checksum",
  );
  requireEqual(
    parameterChecksum,
    sha256JsonPointer(document, parameterScope),
    "parameterArtifact.checksum",
  );

  const projectionIntegrity = recordField(sealPayload, "projectionIntegrity");
  const projectionChecksum = validateIntegrityDescriptor(
    document,
    projectionIntegrity,
    "/sealPayload/projectionChecksumPayload",
    "projectionIntegrity",
  );
  const prediction = recordField(sealPayload, "prediction");
  requireEqual(
    stringField(prediction, "projectionChecksum"),
    projectionChecksum,
    "prediction.projectionChecksum",
  );
  const predictionWithoutChecksum = { ...prediction };
  delete predictionWithoutChecksum.projectionChecksum;
  requireEqual(
    canonicalizeJson(predictionWithoutChecksum),
    canonicalizeJson(recordField(sealPayload, "projectionChecksumPayload")),
    "prediction projection checksum payload",
  );

  requireEqual(
    stringField(prediction, "projectionStatus"),
    "completed_nonempty",
    "prediction.projectionStatus",
  );
  const pHome = numberField(prediction, "pHome");
  const pDraw = numberField(prediction, "pDraw");
  const pAway = numberField(prediction, "pAway");
  requireEqual(pHome + pDraw + pAway, 1, "prediction 1X2 probability sum");

  const goalRange = recordField(prediction, "goalRange");
  requireEqual(
    numberField(goalRange, "range01") +
      numberField(goalRange, "range23") +
      numberField(goalRange, "range4Plus"),
    1,
    "prediction goal-range probability sum",
  );
  requireEqual(
    stringField(prediction, "projectionModelVersion"),
    lineage.projectionModelVersion,
    "prediction.projectionModelVersion",
  );
  requireEqual(
    stringField(prediction, "featureModelVersion"),
    lineage.featureModelVersion,
    "prediction.featureModelVersion",
  );
  requireEqual(
    stringField(prediction, "ruleSetVersion"),
    lineage.ruleSetVersion,
    "prediction.ruleSetVersion",
  );

  const provenance = recordField(sealPayload, "provenance");
  for (const field of [
    "generatedByCurrentAnalysis",
    "generatedByCurrentFeature",
    "generatedByCurrentRule",
    "generatedByCurrentMatchScript",
    "generatedByCurrentProjection",
  ]) {
    requireEqual(booleanField(provenance, field), false, `provenance.${field}`);
  }
  requireEqual(provenance.historicalSource, null, "provenance.historicalSource");

  for (const forbidden of ["actual", "actualResult", "evidence", "matchResult"]) {
    if (Object.hasOwn(sealPayload, forbidden)) {
      fail(`prediction seal must not contain ${forbidden}.`);
    }
  }
  if (
    canonicalizeJson(sealPayload).includes('"MATCH_RESULT"') ||
    canonicalizeJson(sealPayload).includes('"FINISHED"')
  ) {
    fail("prediction seal must not contain post-match status or Evidence.");
  }

  return validateIntegrityDescriptor(
    document,
    recordField(document, "sealIntegrity"),
    "/sealPayload",
    "sealIntegrity",
  );
}

function validateActual(document: JsonRecord): string {
  requireEqual(
    stringField(document, "schemaVersion"),
    "controlled-verified-match-result.v1",
    "verifiedActual.schemaVersion",
  );

  const actualPayload = recordField(document, "actualPayload");
  validateClassification(
    recordField(actualPayload, "classification"),
    "verifiedActual.classification",
  );

  const evidence = recordField(actualPayload, "evidence");
  stringField(evidence, "id");
  stringField(evidence, "source");
  stringField(evidence, "sourceId");
  requireEqual(
    stringField(evidence, "providerId"),
    "internal:controlled-conformance",
    "evidence.providerId",
  );
  requireEqual(stringField(evidence, "type"), "MATCH_RESULT", "evidence.type");
  requireEqual(stringField(evidence, "quality"), "verified", "evidence.quality");
  requireEqual(stringField(evidence, "freshness"), "fresh", "evidence.freshness");

  const provenance = recordField(evidence, "provenance");
  requireEqual(
    stringField(provenance, "method"),
    "controlled-fixture-contract-verification",
    "evidence.provenance.method",
  );
  requireEqual(
    stringField(provenance, "category"),
    "internal",
    "evidence.provenance.category",
  );

  const payload = recordField(evidence, "payload");
  const homeGoals = numberField(payload, "homeGoals");
  const awayGoals = numberField(payload, "awayGoals");
  const totalGoals = numberField(payload, "totalGoals");
  const expectedWinner =
    homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
  requireEqual(totalGoals, homeGoals + awayGoals, "actual totalGoals");
  requireEqual(payload.winner, expectedWinner, "actual winner");
  requireEqual(payload.matchStatus, "FINISHED", "actual matchStatus");
  requireEqual(payload.synthetic, true, "actual synthetic");
  requireEqual(
    payload.historicalAuthenticity,
    false,
    "actual historicalAuthenticity",
  );

  const verification = recordField(actualPayload, "verification");
  requireEqual(
    verification.verificationClass,
    "controlled-fixture-only",
    "verification.verificationClass",
  );
  requireEqual(
    verification.realWorldVerification,
    false,
    "verification.realWorldVerification",
  );

  return validateIntegrityDescriptor(
    document,
    recordField(document, "actualIntegrity"),
    "/actualPayload",
    "actualIntegrity",
  );
}

const IDENTITY_FIELDS = [
  "matchId",
  "homeTeam",
  "awayTeam",
  "competitionId",
  "competitionName",
  "season",
  "kickoff",
] as const;

function validateCrossFileIdentity(bundle: FixtureBundle): void {
  const manifestPayload = recordField(bundle.manifest, "manifestPayload");
  const sealPayload = recordField(bundle.predictionSeal, "sealPayload");
  const actualPayload = recordField(bundle.verifiedActual, "actualPayload");

  for (const field of ["fixtureId", "immutableFixtureIdentity"]) {
    const expected = stringField(manifestPayload, field);
    requireEqual(sealPayload[field], expected, `predictionSeal.${field}`);
    requireEqual(actualPayload[field], expected, `verifiedActual.${field}`);
  }

  const manifestIdentity = recordField(manifestPayload, "fixtureIdentity");
  const sealIdentity = recordField(sealPayload, "fixtureIdentity");
  const actualIdentity = recordField(actualPayload, "fixtureIdentity");

  for (const field of IDENTITY_FIELDS) {
    const expected = stringField(manifestIdentity, field);
    requireEqual(sealIdentity[field], expected, `predictionSeal.${field}`);
    requireEqual(actualIdentity[field], expected, `verifiedActual.${field}`);
  }

  const prediction = recordField(sealPayload, "prediction");
  const evidence = recordField(actualPayload, "evidence");
  const evidencePayload = recordField(evidence, "payload");
  requireEqual(prediction.matchId, manifestIdentity.matchId, "prediction.matchId");
  requireEqual(evidence.matchId, manifestIdentity.matchId, "evidence.matchId");

  for (const field of [
    "homeTeam",
    "awayTeam",
    "competitionId",
    "competitionName",
    "season",
    "kickoff",
  ]) {
    requireEqual(
      evidencePayload[field],
      manifestIdentity[field],
      `evidence.payload.${field}`,
    );
  }

  const kickoff = stringField(manifestIdentity, "kickoff");
  requireEqual(
    Date.parse(stringField(sealIdentity, "kickoff")),
    Date.parse(kickoff),
    "predictionSeal kickoff instant",
  );
  requireEqual(
    Date.parse(stringField(actualIdentity, "kickoff")),
    Date.parse(kickoff),
    "verifiedActual kickoff instant",
  );
}

function validateTemporal(bundle: FixtureBundle): void {
  const manifestPayload = recordField(bundle.manifest, "manifestPayload");
  const fixtureIdentity = recordField(manifestPayload, "fixtureIdentity");
  const sealPayload = recordField(bundle.predictionSeal, "sealPayload");
  const temporal = recordField(sealPayload, "temporal");
  const actualPayload = recordField(bundle.verifiedActual, "actualPayload");
  const evidence = recordField(actualPayload, "evidence");
  const result = recordField(evidence, "payload");

  const analysisTimeText = stringField(temporal, "analysisTime");
  const analysisCutoffText = stringField(temporal, "analysisCutoff");
  const analysisTime = parseInstant(analysisTimeText, "analysisTime");
  const analysisCutoff = parseInstant(analysisCutoffText, "analysisCutoff");
  const generatedAt = parseInstant(temporal.generatedAt, "generatedAt");
  const kickoff = parseInstant(fixtureIdentity.kickoff, "kickoff");
  const observedAt = parseInstant(result.observedAt, "observedAt");

  requireEqual(analysisCutoffText, analysisTimeText, "analysisCutoff");

  if (!(analysisTime < kickoff)) {
    fail("analysisTime must be before kickoff.");
  }
  if (!(analysisCutoff <= generatedAt && generatedAt < kickoff)) {
    fail("generatedAt must be at/after cutoff and before kickoff.");
  }
  if (!(observedAt > kickoff)) {
    fail("observedAt must be after kickoff.");
  }
}

function validateManifest(
  bundle: FixtureBundle,
  sealChecksum: string,
  actualChecksum: string,
): void {
  requireEqual(
    stringField(bundle.manifest, "schemaVersion"),
    "controlled-prematch-conformance-manifest.v1",
    "manifest.schemaVersion",
  );
  const payload = recordField(bundle.manifest, "manifestPayload");
  validateClassification(
    recordField(payload, "classification"),
    "manifest.classification",
  );

  const population = recordField(payload, "populationPolicy");
  for (const field of [
    "historicalPopulationEligible",
    "calibrationEligible",
    "validationEligible",
    "databasePersistenceAllowed",
  ]) {
    requireEqual(
      booleanField(population, field),
      false,
      `populationPolicy.${field}`,
    );
  }

  const files = recordField(payload, "files");
  const predictionFile = recordField(files, "predictionSeal");
  const actualFile = recordField(files, "verifiedActual");
  requireEqual(
    predictionFile.path,
    "prediction-seal.json",
    "files.predictionSeal.path",
  );
  requireEqual(
    predictionFile.schemaVersion,
    bundle.predictionSeal.schemaVersion,
    "files.predictionSeal.schemaVersion",
  );
  requireEqual(
    requireSha256(predictionFile.sha256, "files.predictionSeal.sha256"),
    sealChecksum,
    "files.predictionSeal.sha256",
  );
  requireEqual(actualFile.path, "verified-actual.json", "files.verifiedActual.path");
  requireEqual(
    actualFile.schemaVersion,
    bundle.verifiedActual.schemaVersion,
    "files.verifiedActual.schemaVersion",
  );
  requireEqual(
    requireSha256(actualFile.sha256, "files.verifiedActual.sha256"),
    actualChecksum,
    "files.verifiedActual.sha256",
  );

  validateIntegrityDescriptor(
    bundle.manifest,
    recordField(bundle.manifest, "manifestIntegrity"),
    "/manifestPayload",
    "manifestIntegrity",
  );
}

function validateReplayBoundary(bundle: FixtureBundle): void {
  const payload = recordField(bundle.manifest, "manifestPayload");
  const boundary = recordField(payload, "expectedBoundary");
  const expected: Readonly<Record<string, unknown>> = {
    sealValid: true,
    actualValid: true,
    ftEvaluationAllowed: true,
    sidecarPresent: false,
    outcomeEvaluable: true,
    replayComplete: false,
    replayEligible: false,
    replayReason: "MISSING_SIDECAR",
  };

  for (const [field, value] of Object.entries(expected)) {
    requireEqual(boundary[field], value, `expectedBoundary.${field}`);
  }

  for (const [name, document] of [
    ["predictionSeal", bundle.predictionSeal],
    ["verifiedActual", bundle.verifiedActual],
  ] as const) {
    if (
      Object.hasOwn(document, "sidecar") ||
      Object.hasOwn(document, "replayContext")
    ) {
      fail(`${name} must not contain replay context or a Sidecar.`);
    }
  }
}

function validateBundle(bundle: FixtureBundle): void {
  const sealChecksum = validatePredictionSeal(bundle.predictionSeal);
  const actualChecksum = validateActual(bundle.verifiedActual);
  validateManifest(bundle, sealChecksum, actualChecksum);
  validateCrossFileIdentity(bundle);
  validateTemporal(bundle);
  validateReplayBoundary(bundle);
}

function mutateTemporal(
  bundle: FixtureBundle,
  mutation: (temporal: JsonRecord, result: JsonRecord) => void,
): void {
  const temporal = recordField(
    recordField(bundle.predictionSeal, "sealPayload"),
    "temporal",
  );
  const result = recordField(
    recordField(recordField(bundle.verifiedActual, "actualPayload"), "evidence"),
    "payload",
  );
  mutation(temporal, result);
}

function mutationCase(name: string, mutate: BundleMutation) {
  return { name, mutate };
}

describe("controlled PRE_MATCH conformance fixture", () => {
  it("validates the static Class B bundle and all canonical checksums", () => {
    const bundle = loadBundle();

    expect(() => validateBundle(bundle)).not.toThrow();
  });

  it("can be repeatedly read and validated without rewriting it", () => {
    const first = loadBundle();
    const second = loadBundle();

    validateBundle(first);
    validateBundle(second);
    expect(second).toEqual(first);
  });

  it("is isolated from runtime and historical populations", () => {
    const bundle = loadBundle();
    const manifestPayload = recordField(bundle.manifest, "manifestPayload");
    const population = recordField(manifestPayload, "populationPolicy");

    expect(FIXTURE_DIRECTORY).toContain("/packages/statistics/test/fixtures/");
    expect(FIXTURE_DIRECTORY).not.toContain("/packages/statistics/src/");
    expect(population).toEqual({
      historicalPopulationEligible: false,
      calibrationEligible: false,
      validationEligible: false,
      databasePersistenceAllowed: false,
    });
  });

  it("declares FT Evaluation allowed while replay stays blocked without Sidecar", () => {
    const bundle = loadBundle();
    validateBundle(bundle);
    const boundary = recordField(
      recordField(bundle.manifest, "manifestPayload"),
      "expectedBoundary",
    );

    expect(boundary).toMatchObject({
      sealValid: true,
      actualValid: true,
      ftEvaluationAllowed: true,
      sidecarPresent: false,
      outcomeEvaluable: true,
      replayComplete: false,
      replayEligible: false,
      replayReason: "MISSING_SIDECAR",
    });
  });

  it.each([
    mutationCase("missing analysisTime", (bundle) => {
      mutateTemporal(bundle, (temporal) => {
        delete temporal.analysisTime;
      });
    }),
    mutationCase("missing analysisCutoff", (bundle) => {
      mutateTemporal(bundle, (temporal) => {
        delete temporal.analysisCutoff;
      });
    }),
    mutationCase("missing generatedAt", (bundle) => {
      mutateTemporal(bundle, (temporal) => {
        delete temporal.generatedAt;
      });
    }),
    mutationCase("missing timezone", (bundle) => {
      mutateTemporal(bundle, (temporal) => {
        temporal.analysisTime = "2030-01-15T12:00:00.000";
      });
    }),
    mutationCase("generatedAt equals kickoff", (bundle) => {
      mutateTemporal(bundle, (temporal) => {
        temporal.generatedAt = "2030-01-15T19:00:00.000Z";
      });
    }),
    mutationCase("generatedAt is after kickoff", (bundle) => {
      mutateTemporal(bundle, (temporal) => {
        temporal.generatedAt = "2030-01-15T19:00:01.000Z";
      });
    }),
    mutationCase("analysisTime is at kickoff", (bundle) => {
      mutateTemporal(bundle, (temporal) => {
        temporal.analysisTime = "2030-01-15T19:00:00.000Z";
        temporal.analysisCutoff = "2030-01-15T19:00:00.000Z";
      });
    }),
    mutationCase("analysisCutoff differs from analysisTime", (bundle) => {
      mutateTemporal(bundle, (temporal) => {
        temporal.analysisCutoff = "2030-01-15T12:00:00.001Z";
      });
    }),
    mutationCase("observedAt is at kickoff", (bundle) => {
      mutateTemporal(bundle, (_temporal, result) => {
        result.observedAt = "2030-01-15T19:00:00.000Z";
      });
    }),
  ])("fails closed for temporal mutation: $name", ({ mutate }) => {
    const bundle = cloneBundle(loadBundle());
    mutate(bundle);

    expect(() => validateBundle(bundle)).toThrow();
  });

  it.each([
    mutationCase("matchId mismatch", (bundle) => {
      recordField(
        recordField(bundle.predictionSeal, "sealPayload"),
        "prediction",
      ).matchId = "conformance:mismatch";
    }),
    mutationCase("home and away reversed", (bundle) => {
      const identity = recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "fixtureIdentity",
      );
      identity.homeTeam = "Conformance Away FC";
      identity.awayTeam = "Conformance Home FC";
    }),
    mutationCase("competition mismatch", (bundle) => {
      recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "fixtureIdentity",
      ).competitionId = "different-competition";
    }),
    mutationCase("season mismatch", (bundle) => {
      recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "fixtureIdentity",
      ).season = "different-season";
    }),
    mutationCase("kickoff mismatch", (bundle) => {
      recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "fixtureIdentity",
      ).kickoff = "2030-01-15T19:01:00.000Z";
    }),
  ])("fails closed for identity mutation: $name", ({ mutate }) => {
    const bundle = cloneBundle(loadBundle());
    mutate(bundle);

    expect(() => validateBundle(bundle)).toThrow();
  });

  it.each([
    mutationCase("probability changed", (bundle) => {
      recordField(
        recordField(bundle.predictionSeal, "sealPayload"),
        "prediction",
      ).pHome = 0.51;
    }),
    mutationCase("projection checksum changed", (bundle) => {
      recordField(
        recordField(bundle.predictionSeal, "sealPayload"),
        "prediction",
      ).projectionChecksum = "0".repeat(64);
    }),
    mutationCase("seal checksum changed", (bundle) => {
      recordField(bundle.predictionSeal, "sealIntegrity").digest = "0".repeat(64);
    }),
    mutationCase("checksum scope changed", (bundle) => {
      recordField(bundle.predictionSeal, "sealIntegrity").scope =
        "/sealPayload/prediction";
    }),
    mutationCase("policy pin changed", (bundle) => {
      recordField(
        recordField(bundle.predictionSeal, "sealPayload"),
        "lineage",
      ).policyVersion = "projection-policy.production";
    }),
    mutationCase("parameter artifact checksum changed", (bundle) => {
      const lineage = recordField(
        recordField(bundle.predictionSeal, "sealPayload"),
        "lineage",
      );
      recordField(lineage, "parameterArtifact").checksum = "f".repeat(64);
    }),
  ])("fails closed for seal mutation: $name", ({ mutate }) => {
    const bundle = cloneBundle(loadBundle());
    mutate(bundle);

    expect(() => validateBundle(bundle)).toThrow();
  });

  it.each([
    mutationCase("quality becomes unverified", (bundle) => {
      recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "evidence",
      ).quality = "unverified";
    }),
    mutationCase("Evidence id is removed", (bundle) => {
      delete recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "evidence",
      ).id;
    }),
    mutationCase("Actual matchId changes", (bundle) => {
      recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "evidence",
      ).matchId = "conformance:mismatch";
    }),
    mutationCase("status becomes unfinished", (bundle) => {
      const evidence = recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "evidence",
      );
      recordField(evidence, "payload").matchStatus = "POSTPONED";
    }),
    mutationCase("score changes", (bundle) => {
      const evidence = recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "evidence",
      );
      recordField(evidence, "payload").homeGoals = 3;
    }),
    mutationCase("winner changes", (bundle) => {
      const evidence = recordField(
        recordField(bundle.verifiedActual, "actualPayload"),
        "evidence",
      );
      recordField(evidence, "payload").winner = "away";
    }),
    mutationCase("observedAt moves before kickoff", (bundle) => {
      mutateTemporal(bundle, (_temporal, result) => {
        result.observedAt = "2030-01-15T18:59:59.000Z";
      });
    }),
  ])("fails closed for Actual mutation: $name", ({ mutate }) => {
    const bundle = cloneBundle(loadBundle());
    mutate(bundle);

    expect(() => validateBundle(bundle)).toThrow();
  });
});
