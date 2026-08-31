# Controlled PRE_MATCH Conformance Fixture Plan

## 0. Status and boundary

| Field | Value |
|---|---|
| Document type | Planning/review only |
| Date | 2026-08-31 |
| Fixture class | **B — Controlled repository-backed PRE_MATCH test fixture** |
| Synthetic | **true** |
| Historical authenticity | **false** |
| Historical Evaluation Intake implementation | Not authorized |
| Fixture implementation | Not performed by this task |
| Final Gate | **A. READY FOR FIXTURE IMPLEMENTATION**, subject to human approval |

This plan defines a synthetic conformance fixture that can exercise a future
Historical Evaluation Intake trust boundary. It is not an authentic historical
prediction and must never be cited as evidence that a prediction existed before
a real match.

The existing artifact-admission decision remains:

```text
Authentic PRE_MATCH seal = NOT FOUND
Authentic seal + verified Actual pair = NOT FOUND
Historical Evaluation Intake = C. BLOCKED
```

Implementing this controlled fixture would satisfy only the controlled-fixture
test prerequisite. It would not admit any historical match or independently
authorize production intake.

## 1. Repository inspection findings

The repository currently has:

- inline synthetic `SealedPredictionInput` objects in Statistics and Replay
  tests;
- `EVALUATION_POPULATION_DEMO_V1`;
- validation-generated History/Sidecar populations;
- direct outcome-only `ActualMatchResult` records;
- no existing `test/fixtures/` convention under `@fas/statistics`;
- no committed canonical prediction-seal JSON;
- no controlled fixture with `analysisTime`, `analysisCutoff`, `generatedAt`
  and kickoff in one governed envelope;
- no matching typed `quality: "verified"` MATCH_RESULT artifact.

Therefore the future fixture must be newly authored and must not be derived by
running any current Analysis, Feature, Rule, Match Script or Projection code.

## 2. Recommended repository path

Use one versioned test-only fixture directory:

```text
packages/statistics/test/fixtures/
  controlled-prematch-conformance-v1/
    manifest.json
    prediction-seal.json
    verified-actual.json
```

Recommended future test files:

```text
packages/statistics/test/
  controlled-prematch-conformance-fixture.spec.ts
  historical-evaluation-intake.spec.ts
```

Reasons:

1. `@fas/statistics` owns `SealedPredictionInput`, Actual, Evaluation, History
   and replay eligibility.
2. The directory is outside `packages/statistics/src` and excluded from its
   published `dist` build.
3. Prediction and Actual remain separate artifacts. A post-match Actual cannot
   silently become part of the original PRE_MATCH seal.
4. A manifest can bind the pair without claiming they were created at the same
   real-world time.
5. A versioned directory prevents silent in-place reinterpretation.

Do not place the bundle under:

- `packages/provider-*/fixtures/`, because it is not Provider fact;
- `packages/report/src/validation/`, because it must not run current Analysis;
- `apps/api` or `apps/web`, because it is not an API/UI fixture;
- `packages/statistics/src/evaluation/`, because it must not ship as a
  production population;
- `docs/`, because documentation is not the executable fixture owner.

## 3. Fixture identity and labels

Use unmistakably synthetic identities. Suggested values:

```text
fixtureId:
  controlled-prematch-conformance-v1

immutableFixtureIdentity:
  urn:fas:test-fixture:controlled-prematch-conformance:v1

matchId:
  conformance:prematch:v1:home-fc:away-fc:2030-01-15T19:00:00Z

home:
  Conformance Home FC

away:
  Conformance Away FC

competitionId:
  conformance-competition-v1

competitionName:
  FAS Controlled Conformance Competition

season:
  conformance-season-v1

kickoff:
  2030-01-15T19:00:00.000Z

analysisTime:
  2030-01-15T12:00:00.000Z

analysisCutoff:
  2030-01-15T12:00:00.000Z

generatedAt:
  2030-01-15T12:00:01.000Z

actualObservedAt:
  2030-01-15T21:00:00.000Z
```

The dates are fictional conformance instants. They establish ordering for
deterministic tests; they do not claim that a real event occurred in 2030 or
that Git proves pre-kickoff existence.

Every file must carry or inherit these root labels:

```text
synthetic = true
historicalAuthenticity = false
provenanceClass = B
allowedUsage = conformance_test_only
historicalPopulationEligible = false
calibrationEligible = false
validationEligible = false
```

No file may use `authentic`, `historical_prediction`, `live`, `provider_fact`,
or `production_sample` as a positive status.

## 4. Canonical fixture structure

### 4.1 `manifest.json`

The manifest owns classification, immutable bundle identity, file binding and
usage restrictions.

Planned structure:

```json
{
  "schemaVersion": "controlled-prematch-conformance-manifest.v1",
  "manifestPayload": {
    "fixtureId": "controlled-prematch-conformance-v1",
    "immutableFixtureIdentity": "urn:fas:test-fixture:controlled-prematch-conformance:v1",
    "classification": {
      "synthetic": true,
      "historicalAuthenticity": false,
      "provenanceClass": "B",
      "allowedUsage": "conformance_test_only"
    },
    "populationPolicy": {
      "historicalPopulationEligible": false,
      "calibrationEligible": false,
      "validationEligible": false,
      "databasePersistenceAllowed": false
    },
    "fixtureIdentity": {
      "matchId": "conformance:prematch:v1:home-fc:away-fc:2030-01-15T19:00:00Z",
      "homeTeam": "Conformance Home FC",
      "awayTeam": "Conformance Away FC",
      "competitionId": "conformance-competition-v1",
      "competitionName": "FAS Controlled Conformance Competition",
      "season": "conformance-season-v1",
      "kickoff": "2030-01-15T19:00:00.000Z"
    },
    "files": {
      "predictionSeal": {
        "path": "prediction-seal.json",
        "schemaVersion": "controlled-prematch-prediction-seal.v1",
        "sha256": "<computed digest of prediction-seal sealPayload>"
      },
      "verifiedActual": {
        "path": "verified-actual.json",
        "schemaVersion": "controlled-verified-match-result.v1",
        "sha256": "<computed digest of verified-actual actualPayload>"
      }
    }
  },
  "manifestIntegrity": {
    "algorithm": "sha256",
    "canonicalization": "fas-json-canonical.v1",
    "scope": "/manifestPayload",
    "digest": "<computed digest>"
  }
}
```

The manifest checksum is not self-referential because only
`manifestPayload` is in scope.

### 4.2 `prediction-seal.json`

The prediction file must contain static, hand-reviewed values conforming to
`SealedPredictionInput`; it must not contain an `ActualMatchResult`,
MATCH_RESULT Evidence, FT score or outcome-derived annotation.

Planned structure:

```json
{
  "schemaVersion": "controlled-prematch-prediction-seal.v1",
  "sealPayload": {
    "fixtureId": "controlled-prematch-conformance-v1",
    "immutableFixtureIdentity": "urn:fas:test-fixture:controlled-prematch-conformance:v1",
    "classification": {
      "synthetic": true,
      "historicalAuthenticity": false,
      "provenanceClass": "B"
    },
    "fixtureIdentity": {
      "matchId": "conformance:prematch:v1:home-fc:away-fc:2030-01-15T19:00:00Z",
      "homeTeam": "Conformance Home FC",
      "awayTeam": "Conformance Away FC",
      "competitionId": "conformance-competition-v1",
      "competitionName": "FAS Controlled Conformance Competition",
      "season": "conformance-season-v1",
      "kickoff": "2030-01-15T19:00:00.000Z"
    },
    "temporal": {
      "mode": "PRE_MATCH",
      "analysisTime": "2030-01-15T12:00:00.000Z",
      "analysisCutoff": "2030-01-15T12:00:00.000Z",
      "generatedAt": "2030-01-15T12:00:01.000Z",
      "sourceTimezone": "UTC",
      "timeContractVersion": "fip.analysis-protocol.v1"
    },
    "lineage": {
      "featureModelVersion": "feature.synthetic.conformance.v1",
      "ruleSetVersion": "rule.synthetic.conformance.v1",
      "projectionModelVersion": "projection.synthetic.conformance.v1",
      "policyVersion": "projection-policy.synthetic.conformance.v1",
      "parameterArtifact": {
        "artifactId": "projectionParams:synthetic:conformance:v1",
        "versionLabel": "projection.synthetic.conformance.v1",
        "checksum": "<computed parameter payload checksum>",
        "checksumAlgorithm": "sha256",
        "checksumCanonicalization": "fas-json-canonical.v1",
        "checksumScope": "/sealPayload/lineage/parameterArtifact/payload",
        "payload": {
          "fixtureOnly": true,
          "notProductionParameters": true
        }
      }
    },
    "projectionIntegrity": {
      "algorithm": "sha256",
      "canonicalization": "fas-json-canonical.v1",
      "scope": "/sealPayload/prediction excluding projectionChecksum",
      "digest": "<same value as prediction.projectionChecksum>"
    },
    "prediction": {
      "matchId": "conformance:prematch:v1:home-fc:away-fc:2030-01-15T19:00:00Z",
      "projectionChecksum": "<computed projection digest>",
      "projectionStatus": "completed_nonempty",
      "pHome": 0.5,
      "pDraw": 0.3,
      "pAway": 0.2,
      "topScorelines": [
        {
          "homeGoals": 1,
          "awayGoals": 0,
          "probability": 0.12
        },
        {
          "homeGoals": 1,
          "awayGoals": 1,
          "probability": 0.11
        }
      ],
      "goalRange": {
        "range01": 0.3,
        "range23": 0.45,
        "range4Plus": 0.25
      },
      "predictionConfidence": 70,
      "confidenceBand": "high",
      "scenarios": {
        "mostLikely": {
          "slot": "mostLikely",
          "winner": "home",
          "homeGoals": 1,
          "awayGoals": 0,
          "probability": 0.5
        },
        "secondLikely": {
          "slot": "secondLikely",
          "winner": "draw",
          "homeGoals": 1,
          "awayGoals": 1,
          "probability": 0.3
        },
        "upset": {
          "slot": "upset",
          "winner": "away",
          "homeGoals": 0,
          "awayGoals": 1,
          "probability": 0.2
        }
      },
      "rules": [
        {
          "ruleName": "SYNTHETIC_HOME_EDGE",
          "status": "PASS",
          "channel": "home+"
        }
      ],
      "featureNames": [
        "syntheticHomeStrength",
        "syntheticAwayStrength"
      ],
      "projectionModelVersion": "projection.synthetic.conformance.v1",
      "featureModelVersion": "feature.synthetic.conformance.v1",
      "ruleSetVersion": "rule.synthetic.conformance.v1"
    },
    "provenance": {
      "creator": "repository-controlled-fixture",
      "creationMethod": "hand-authored-static-conformance-data",
      "generatedByCurrentAnalysis": false,
      "generatedByCurrentFeature": false,
      "generatedByCurrentRule": false,
      "generatedByCurrentMatchScript": false,
      "generatedByCurrentProjection": false,
      "historicalSource": null,
      "limitations": [
        "Synthetic conformance fixture only",
        "Not evidence of an authentic historical prediction"
      ]
    }
  },
  "sealIntegrity": {
    "algorithm": "sha256",
    "canonicalization": "fas-json-canonical.v1",
    "scope": "/sealPayload",
    "digest": "<computed digest>"
  }
}
```

The synthetic model and policy labels are intentional. The fixture must not
claim to have been produced by `projection.v3.replay`, production policy `v2`,
or any real production parameter artifact.

### 4.3 `verified-actual.json`

The Actual file is a controlled Evidence fixture. Its `quality: "verified"`
means “verified against this controlled fixture contract,” not independently
verified real-world history.

Planned structure:

```json
{
  "schemaVersion": "controlled-verified-match-result.v1",
  "actualPayload": {
    "fixtureId": "controlled-prematch-conformance-v1",
    "immutableFixtureIdentity": "urn:fas:test-fixture:controlled-prematch-conformance:v1",
    "classification": {
      "synthetic": true,
      "historicalAuthenticity": false,
      "provenanceClass": "B"
    },
    "fixtureIdentity": {
      "matchId": "conformance:prematch:v1:home-fc:away-fc:2030-01-15T19:00:00Z",
      "homeTeam": "Conformance Home FC",
      "awayTeam": "Conformance Away FC",
      "competitionId": "conformance-competition-v1",
      "competitionName": "FAS Controlled Conformance Competition",
      "season": "conformance-season-v1",
      "kickoff": "2030-01-15T19:00:00.000Z"
    },
    "evidence": {
      "id": "evidence:controlled-prematch-conformance-v1:match-result",
      "providerId": "internal:controlled-conformance",
      "source": "controlled-conformance-fixture",
      "sourceId": "controlled-prematch-conformance-v1:result",
      "type": "MATCH_RESULT",
      "matchId": "conformance:prematch:v1:home-fc:away-fc:2030-01-15T19:00:00Z",
      "collectedAt": "2030-01-15T21:00:00.000Z",
      "eventTime": "2030-01-15T21:00:00.000Z",
      "timestamp": "2030-01-15T21:00:00.000Z",
      "freshness": "fresh",
      "confidence": "high",
      "quality": "verified",
      "provenance": {
        "collector": "repository-controlled-fixture",
        "method": "controlled-fixture-contract-verification",
        "providerId": "internal:controlled-conformance",
        "category": "internal"
      },
      "payload": {
        "homeTeam": "Conformance Home FC",
        "awayTeam": "Conformance Away FC",
        "competitionId": "conformance-competition-v1",
        "competitionName": "FAS Controlled Conformance Competition",
        "season": "conformance-season-v1",
        "kickoff": "2030-01-15T19:00:00.000Z",
        "homeGoals": 2,
        "awayGoals": 1,
        "winner": "home",
        "totalGoals": 3,
        "matchStatus": "FINISHED",
        "observedAt": "2030-01-15T21:00:00.000Z",
        "synthetic": true,
        "historicalAuthenticity": false
      }
    },
    "verification": {
      "verificationClass": "controlled-fixture-only",
      "verifiedAgainst": "controlled-prematch-conformance-manifest.v1",
      "realWorldVerification": false
    }
  },
  "actualIntegrity": {
    "algorithm": "sha256",
    "canonicalization": "fas-json-canonical.v1",
    "scope": "/actualPayload",
    "digest": "<computed digest>"
  }
}
```

## 5. Minimum field coverage

| Required field | Owning location |
|---|---|
| `fixtureId` | All three payloads |
| `matchId` | Manifest fixture identity, seal fixture identity/prediction, Actual fixture identity/Evidence |
| Home/away | Both fixture-identity blocks and Actual payload |
| Competition | Both fixture-identity blocks and Actual payload |
| Season | Both fixture-identity blocks and Actual payload |
| Kickoff | Both fixture-identity blocks and Actual payload |
| `analysisTime` | Prediction seal temporal block |
| `analysisCutoff` | Prediction seal temporal block |
| `generatedAt` | Prediction seal temporal block |
| Prediction payload | `prediction-seal.json` |
| Projection checksum | Prediction payload plus projection-integrity block |
| Checksum algorithm/scope | Projection, seal, Actual and manifest integrity blocks |
| Feature/Rule/Projection model versions | Seal lineage and prediction payload |
| Policy version | Seal lineage |
| Parameter artifact identity/checksum | Seal lineage parameter-artifact block |
| Immutable fixture identity | All three payloads |
| Provenance | Seal provenance, Actual Evidence provenance, root classification |
| Controlled verified Actual | `verified-actual.json` |

## 6. No-regeneration rule

The future fixture implementation must enforce all of the following:

1. JSON values are hand-authored and reviewed.
2. No fixture generator imports `@fas/analysis`, `@fas/feature`, `@fas/rule`,
   `@fas/report`, Provider packages or production Projection functions.
3. No test calls `AnalyzeMatchUseCase`, `buildSealedPredictionInput`,
   Match Script, Unified Matrix or Projection.
4. Tests load the committed JSON bytes and validate them against boundary
   contracts.
5. Expected digests are committed with the fixture, not regenerated and
   overwritten automatically during test execution.
6. Digest mismatch fails the test and requires explicit human review of the
   fixture diff.
7. No update-snapshot or “accept new checksum” mode is provided.
8. Provenance booleans stating that production stages were not used are
   asserted.
9. The fixture is never rewritten by test teardown/setup.

A one-time checksum calculation command may be used during the separately
approved fixture-authoring task, but it must hash the static payload only. It
must not compute a prediction.

## 7. Canonical checksum plan

### 7.1 Canonicalization

Define one test-fixture canonicalization contract:

```text
fas-json-canonical.v1
```

Rules:

1. input must be valid JSON;
2. object keys are sorted lexicographically by Unicode code point at every
   depth;
3. array order is preserved;
4. strings use JSON escaping;
5. numbers must be finite JSON numbers and serialize without locale rules;
6. no insignificant whitespace is included;
7. canonical bytes are UTF-8;
8. the named JSON Pointer scope is extracted before canonicalization;
9. fields outside the declared scope do not affect that digest.

The future test-only verifier should implement this narrow contract or use an
approved RFC 8785-compatible implementation. It must not depend on object
insertion order from ordinary `JSON.stringify`.

### 7.2 Digests

Use lowercase 64-character SHA-256 hex for:

- parameter fixture payload;
- synthetic projection snapshot excluding its own `projectionChecksum`;
- complete `sealPayload`;
- complete `actualPayload`;
- complete `manifestPayload`.

Validation order:

1. parse all three files;
2. reject duplicate JSON keys and unsupported values;
3. validate each declared schema version and classification label;
4. recompute parameter checksum;
5. recompute projection checksum;
6. recompute seal and Actual checksums;
7. compare child digests with manifest references;
8. recompute manifest checksum;
9. perform cross-file identity equality checks.

No digest is proof of historical authenticity. It proves only that committed
controlled fixture content has not changed outside review.

## 8. Seal/Actual exact pairing contract

The verifier must compare exact values, not team-name similarity:

| Field | Required comparison |
|---|---|
| `fixtureId` | Manifest = seal = Actual |
| `immutableFixtureIdentity` | Manifest = seal = Actual |
| `matchId` | Manifest = seal fixture = prediction = Actual fixture = Evidence |
| `homeTeam` | Exact manifest/seal/Actual equality |
| `awayTeam` | Exact manifest/seal/Actual equality |
| `competitionId` | Exact equality |
| `competitionName` | Exact equality |
| `season` | Exact equality |
| `kickoff` | Same explicit canonical string and same parsed instant |
| Orientation | Home score belongs to declared home; away score belongs to declared away |
| Status | Actual payload must be `FINISHED` |
| Evidence type/quality | Exactly `MATCH_RESULT` / `verified` |

The verifier must reject reversed home/away values even when the score is
mathematically valid.

## 9. Gate coverage enabled by the fixture

### 9.1 Temporal gate

The baseline fixture proves the intended valid ordering:

```text
analysisCutoff = analysisTime
analysisTime < kickoff
analysisCutoff <= generatedAt < kickoff
observedAt > kickoff
```

Tests should clone the parsed in-memory object, never rewrite the fixture, to
cover missing timezone, equal-to-kickoff, post-kickoff and cutoff mismatch
failures.

### 9.2 Identity gate

Mutation cases should cover matchId mismatch, reversed orientation,
competition/season mismatch and kickoff mismatch.

### 9.3 Seal-integrity gate

Mutation cases should alter:

- one probability;
- projection checksum;
- seal checksum;
- checksum scope;
- model/policy pin;
- parameter artifact checksum.

Every mutation must fail closed.

### 9.4 Verified-Actual gate

Mutation cases should change `quality` to `unverified`, remove Evidence id,
change result matchId, use unfinished status, invalidate winner/score or place
`observedAt` before kickoff.

### 9.5 Idempotency gate

A future Historical Intake unit test should:

1. load and validate the same static bundle twice;
2. use an injected in-memory History repository only;
3. supply one fixed, explicitly approved `evaluatedAt`;
4. vary only `intakeRecordedAt` if the future contract allows it;
5. assert one deterministic History identity and one stored record;
6. mutate canonical seal/Actual content under the same identity and assert a
   conflict.

The fixture does not resolve production idempotency by itself. Human approval
must choose the stable `evaluatedAt`/History-id rule before intake
implementation.

### 9.6 Replay blocked while FT Evaluation is allowed

The bundle intentionally contains no replay sidecar or
`SealedProjectionReplayContext`.

Expected future behavior:

```text
seal valid = true
Actual valid = true
FT Evaluation scored = true
History eligible for transient unit assertion = true
sidecar present = false
outcomeEvaluable = true
replayComplete = false
replayEligible = false
reason includes MISSING_SIDECAR
```

No sidecar should be created to make the test pass. Parameter provenance in the
seal is validated for intake lineage but does not fabricate replay context.

## 10. Production and test file boundary

### 10.1 Fixture implementation task

No production file must change to add the fixture itself.

Allowed future changes:

| Path | Purpose | Classification |
|---|---|---|
| `packages/statistics/test/fixtures/controlled-prematch-conformance-v1/**` | Static controlled bundle | Test data only |
| `packages/statistics/test/controlled-prematch-conformance-fixture.spec.ts` | Parse, canonicalize and validate bundle | Test only |
| A test helper under `packages/statistics/test/helpers/` | Test-only canonical JSON and SHA-256 verification | Test only |

The fixture implementation must not add exports from
`packages/statistics/src/index.ts`.

### 10.2 Separately approved Historical Intake implementation

If the production capability is later approved, the minimum likely production
changes remain:

| Path | Future reason |
|---|---|
| `packages/statistics/src/domain/evaluation-history.ts` | Add a discriminated historical-intake History variant and manifest |
| New intake contract/validation/orchestration files under `packages/statistics/src/domain/` and `packages/statistics/src/evaluation/` | Fail-closed intake boundary |
| `packages/statistics/src/evaluation/build-evaluation-history-record.ts` or an adjacent versioned builder | Seal-aware id/checksum |
| `packages/statistics/src/index.ts` | Export the approved intake API |
| `packages/database/src/prisma-evaluation-history-repository.ts` | Version-aware JSON revival |

Those production changes are not authorized by this fixture plan.

### 10.3 MUST NOT CHANGE

- `packages/analysis/**`;
- `packages/feature/**`;
- `packages/rule/**`;
- `packages/report/**`;
- `packages/provider-*/**`;
- `packages/evidence-normalizer/**`;
- Projection, Football State, Match Script and Unified Matrix;
- Calibration and Validation definitions;
- `apps/api/**` and `apps/web/**`;
- `packages/database/prisma/schema.prisma`;
- Prisma migrations;
- existing History, Sidecars and cohorts;
- `docs/40_PRODUCT_ROADMAP.md`;
- `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`;
- Architecture Freeze documents;
- Case Engine or any new Engine/package.

## 11. Prisma and persistence decision

### Prisma migration

**NOT REQUIRED**

The controlled fixture is static test data outside Prisma. Its tests should use
pure validation and, where repository behavior is needed, an
`InMemoryEvaluationHistoryRepository`.

The fixture-authoring task must:

- perform no database writes;
- create no Prisma seed;
- create no migration;
- add no fixture bootstrap script;
- create no durable History or Sidecar.

A later Historical Intake domain extension can remain in existing
`record_json`; its decoder work is code, not schema migration.

## 12. Population contamination prevention

The controlled fixture must not become a real historical sample.

Required controls:

1. test-only path outside `src`;
2. synthetic matchId and competition namespaces;
3. `synthetic=true`;
4. `historicalAuthenticity=false`;
5. `provenanceClass=B`;
6. explicit population eligibility flags set to false;
7. no export from package runtime entry points;
8. no API, worker, bootstrap or Provider registration;
9. no Prisma seed or durable repository write;
10. unit tests use a fresh in-memory repository and discard it;
11. no Calibration/Validation test may load the fixture unless specifically
    asserting exclusion;
12. any future operator intake path must reject class B outside an explicit
    conformance-test boundary;
13. reports and completion documents must call it “controlled synthetic
    conformance fixture,” never “historical prediction”;
14. no History generated transiently in a unit test may be exported as
    historical data.

Current Calibration/Validation code consumes supplied History and does not
provide a general provenance-class filter. Therefore path isolation and
prohibition of durable History creation are mandatory; labels alone are not a
sufficient safeguard.

## 13. Human approval checklist

Before a fixture implementation task starts, a human must explicitly approve:

- [ ] The fixture is class B, synthetic and not historically authentic.
- [ ] The recommended test-only directory and three-file split.
- [ ] The fixed synthetic fixture/match/team/competition/season identities.
- [ ] The fictional UTC timeline and temporal inequalities.
- [ ] The static hand-authored prediction payload.
- [ ] The synthetic model, policy and parameter labels.
- [ ] No production model/version is claimed.
- [ ] `fas-json-canonical.v1` or an approved RFC 8785 replacement.
- [ ] SHA-256 digest scopes and no self-referential checksum.
- [ ] The controlled meaning of `quality: "verified"`.
- [ ] Exact seal/Actual fixture-identity comparison.
- [ ] The fixed future `evaluatedAt`/idempotency test rule.
- [ ] No Sidecar in the baseline fixture.
- [ ] FT Evaluation allowed and Replay blocked on `MISSING_SIDECAR`.
- [ ] Test-only in-memory repository use.
- [ ] No database/API/UI/Provider/Projection changes.
- [ ] No runtime export, seed or bootstrap registration.
- [ ] Exclusion from historical, Calibration and Validation populations.
- [ ] Fixture checksum changes require explicit review; no automatic update.
- [ ] Implementing the fixture does not unblock authentic historical intake.

The approval should authorize only fixture JSON and test-only verification
code. Historical Evaluation Intake production code requires a separate gate.

## 14. Acceptance criteria for fixture implementation

The future fixture implementation is complete only when:

1. all three files exist at the approved versioned path;
2. all classification and population-exclusion labels are exact;
3. Prediction and Actual remain separate checksum scopes;
4. the fixture contains no production-generated content or historical claim;
5. canonical SHA-256 checks pass;
6. all identity fields match exactly;
7. valid temporal ordering passes;
8. focused mutations fail temporal, identity, seal and Actual gates;
9. repeated in-memory intake is deterministic under the approved timestamp
   rule;
10. missing Sidecar leaves FT outcome evaluable and Replay blocked;
11. no fixture data reaches Prisma, API, Calibration or Validation;
12. no production source file changes;
13. repository diff contains only approved fixture/test artifacts and its
   completion evidence;
14. the completion report restates that authentic PRE_MATCH seal remains not
   found.

## 15. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Synthetic fixture mistaken for historical evidence | False historical claim | Synthetic namespaces, mandatory labels, test-only path and repeated disclaimers |
| Actual co-mingled with seal | Post-match leakage into PRE_MATCH checksum | Separate files and checksum scopes |
| Ordinary `JSON.stringify` key order treated as canonical | Unstable digest | Explicit recursive canonicalization contract |
| Production Projection used to generate fixture | Retrospective reconstruction pattern | Static hand-authored payload and import prohibition |
| Production version labels imply real runtime output | Misleading provenance | Dedicated `*.synthetic.conformance.v1` labels |
| `quality: "verified"` interpreted as real-world verification | Evidence overclaim | Controlled verification class and `realWorldVerification=false` |
| Fixture accidentally persisted | Calibration/Validation contamination | In-memory-only tests; no seeds, runtime exports or bootstrap |
| Digest regenerated automatically | Unauthorized fixture mutation hidden | Fail on mismatch; manual review only |
| Controlled fixture treated as satisfying authentic admission | Existing C gate incorrectly lifted | State explicitly that class B does not provide class A evidence |

## 16. Final Gate

### A. READY FOR FIXTURE IMPLEMENTATION

The controlled fixture is technically design-ready because:

- its owner and test-only path are clear;
- Prediction and Actual artifacts are separated;
- required fields and exact identities are specified;
- checksum algorithms, scopes and canonicalization are defined;
- non-regeneration and non-persistence controls are explicit;
- it can cover temporal, identity, seal, Actual, idempotency and replay-boundary
  tests without running production analysis;
- no Prisma migration, API/UI change or production model change is required.

This status means **ready to request human authorization for the fixture-only
implementation**. It does not authorize implementation by this task.

The following gates remain unchanged:

```text
Authentic PRE_MATCH historical seal: NOT FOUND
Authentic seal + verified real-world Actual: NOT FOUND
Historical Evaluation Intake production implementation: C. BLOCKED
```

No Roadmap or canonical FIP protocol change is required.
