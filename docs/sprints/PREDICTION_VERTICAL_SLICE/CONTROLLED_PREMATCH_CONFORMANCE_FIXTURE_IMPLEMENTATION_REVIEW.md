# Controlled PRE_MATCH Conformance Fixture — Implementation Review

## 0. Review result

| Field | Result |
|---|---|
| Review type | Repository-grounded implementation review |
| Date | 2026-08-31 |
| Reviewed delivery | Controlled PRE_MATCH Conformance Fixture |
| Delivery commit | `08467c5` |
| Fixture class | **B — controlled synthetic** |
| Gate Decision | **PASS** |
| Historical authenticity | **false** |
| Historical Evaluation Intake authorization | **NOT GRANTED** |

The committed fixture satisfies its bounded purpose as static, test-only
conformance data. It is not an authentic historical artifact and does not
remove any Historical Evaluation Intake blocker.

## 1. Review Scope

The review inspected:

- the approved plan:
  `docs/sprints/PREDICTION_VERTICAL_SLICE/CONTROLLED_PREMATCH_CONFORMANCE_FIXTURE_PLAN.md`;
- commit `08467c5` and every file added by that commit;
- all three JSON fixture files;
- the test-only canonical JSON/SHA-256 helper;
- all 31 focused fixture tests;
- package configuration and runtime-reference search;
- current repository status and protected governance documents;
- fresh executions of focused tests, all Statistics tests, Statistics
  typecheck and repository quality gates.

This review did not:

- modify or execute Analysis, Feature, Rule, Football State, Match Script,
  Projection, Replay or Historical Evaluation Intake;
- create History, Sidecars, cohorts, predictions or database rows;
- modify production source, Prisma, Providers, APIs, UI, Roadmap, FIP protocol
  or Architecture Freeze.

## 2. Repository Evidence

### 2.1 Implemented files

| Path | Role | Runtime status |
|---|---|---|
| `packages/statistics/test/fixtures/controlled-prematch-conformance-v1/manifest.json` | Classification, identity, child checksum binding, population policy and expected replay boundary | Test-only |
| `packages/statistics/test/fixtures/controlled-prematch-conformance-v1/prediction-seal.json` | Static synthetic PRE_MATCH prediction seal | Test-only |
| `packages/statistics/test/fixtures/controlled-prematch-conformance-v1/verified-actual.json` | Controlled synthetic MATCH_RESULT Evidence | Test-only |
| `packages/statistics/test/controlled-prematch-conformance-fixture.spec.ts` | Baseline, mutation, isolation and checksum verification | Test-only |
| `packages/statistics/test/helpers/canonical-json.ts` | `fas-json-canonical.v1`, JSON Pointer and SHA-256 helper | Test-only |

### 2.2 Commit scope

Commit `08467c5` added the five fixture/test files above and four preceding
Historical Evaluation planning/review documents. It changed no production
source, Prisma file, migration, API, UI, Provider, model or Architecture file.

The commit is broader than a perfectly atomic fixture-only commit because it
also collected the preceding governance documents. This is a reviewability
limitation, not a fixture integrity failure.

### 2.3 Runtime-reference search

Repository search for:

```text
controlled-prematch-conformance-v1
urn:fas:test-fixture:controlled-prematch-conformance:v1
```

found only:

- the three fixture files;
- the focused test;
- the fixture plan;
- `docs/PROJECT_STATE.md`.

No reference exists in:

- `packages/statistics/src`;
- any other production package;
- API or Worker composition;
- Provider catalogs;
- Prisma schema, migration or seed;
- Calibration, Validation or Contribution population loaders;
- replay cohort bootstrap/runtime code.

## 3. Classification Review

### 3.1 Required labels

The manifest, prediction seal and verified Actual all carry:

| Field | Required | Actual | Result |
|---|---|---|---|
| `synthetic` | `true` | `true` | PASS |
| `historicalAuthenticity` | `false` | `false` | PASS |
| `provenanceClass` | `"B"` | `"B"` | PASS |
| `allowedUsage` | `"conformance_test_only"` | `"conformance_test_only"` | PASS |

The manifest additionally declares:

| Population field | Actual | Result |
|---|---|---|
| `historicalPopulationEligible` | `false` | PASS |
| `calibrationEligible` | `false` | PASS |
| `validationEligible` | `false` | PASS |
| `databasePersistenceAllowed` | `false` | PASS |

### 3.2 Misclassification risk

No path or positive status calls this fixture:

- authentic;
- live;
- real-world verified;
- a production sample;
- a historical prediction.

The prediction uses dedicated
`*.synthetic.conformance.v1` model/policy/parameter labels. The Actual uses
`verificationClass="controlled-fixture-only"` and
`realWorldVerification=false`.

**Classification verdict: PASS.**

## 4. Identity Review

### 4.1 Approved identity

All three files use the approved fixed identity:

```text
fixtureId =
controlled-prematch-conformance-v1

immutableFixtureIdentity =
urn:fas:test-fixture:controlled-prematch-conformance:v1

matchId =
conformance:prematch:v1:home-fc:away-fc:2030-01-15T19:00:00Z

homeTeam =
Conformance Home FC

awayTeam =
Conformance Away FC

competitionId =
conformance-competition-v1

competitionName =
FAS Controlled Conformance Competition

season =
conformance-season-v1

kickoff =
2030-01-15T19:00:00.000Z
```

The prediction's `matchId`, Actual Evidence `matchId`, and Actual payload
fixture fields bind to the manifest identity.

### 4.2 Test enforcement

The verifier compares exact strings across manifest, seal and Actual for:

- fixture id;
- immutable fixture identity;
- match id;
- home/away orientation;
- competition id/name;
- season;
- kickoff string and parsed instant.

Mutation tests reject:

- matchId mismatch;
- reversed home/away;
- competition mismatch;
- season mismatch;
- kickoff mismatch.

There is no fuzzy team-name matching.

### 4.3 Mutation boundary

An uncoordinated identity mutation fails cross-file equality and/or checksum
verification. A coordinated repository edit that changes all files and
recomputes every digest is not prevented cryptographically because the fixture
has no external signature/WORM anchor. Such an edit remains visible in Git and
requires review.

This is acceptable for a class-B repository-controlled fixture but is not
acceptable evidence for historical authenticity.

**Identity verdict: PASS for class-B conformance use.**

## 5. Checksum Review

### 5.1 Declared checksums

| Scope | Algorithm | Digest |
|---|---|---|
| Parameter fixture payload | SHA-256 over `fas-json-canonical.v1` JSON Pointer scope | `5cfefe7d1ccdfe34e5df0fe00fbc3251d102a47de618d365bc17c64d0eff5790` |
| Projection checksum payload | SHA-256 over `/sealPayload/projectionChecksumPayload` | `8afa8d2475bab45dd1d349b7f7228d0af07bcd97450f8fc1b9dd5e70bff16618` |
| Complete `sealPayload` | SHA-256 | `3135c5bef2e727c8604b701bc5253984f78a1c5b2836846391edb64bf3696411` |
| Complete `actualPayload` | SHA-256 | `03fd2e6505d54dcc4a405b05c83de860fb0955e1ab96ff3e13872cd9e6af9a38` |
| Complete `manifestPayload` | SHA-256 | `c05d672bd329675607cb2f0ebfef564ae0a7fa896ed0be3b9a7d1734c5d919c7` |

All are lowercase 64-character SHA-256 hex strings and were recomputed
successfully by the focused tests.

### 5.2 Canonicalization

`fas-json-canonical.v1`:

- validates finite JSON numbers;
- recursively sorts object keys by Unicode code point;
- preserves array order;
- uses JSON string escaping;
- emits no insignificant whitespace;
- hashes UTF-8 canonical bytes;
- extracts an exact JSON Pointer before canonicalization;
- does not depend on source object insertion order.

The prediction's complete payload excluding `projectionChecksum` is compared
canonically with the separately hashed projection checksum payload.

### 5.3 File binding

The manifest binds:

- exact child file names;
- exact child schema versions;
- the seal payload digest;
- the Actual payload digest.

The manifest then protects its own payload with a non-self-referential digest.

### 5.4 Mutation coverage

Focused tests reject:

- one changed probability;
- changed projection checksum;
- changed seal checksum;
- changed checksum scope;
- changed policy pin;
- changed parameter artifact checksum.

### 5.5 Raw JSON limitation

The loader calls `JSON.parse` before canonicalization, so the test helper cannot
automatically detect duplicate object keys in raw JSON text. A separate
read-only duplicate-key check during this review confirmed:

```text
manifest.json: no duplicate keys
prediction-seal.json: no duplicate keys
verified-actual.json: no duplicate keys
```

This is non-blocking for the current committed fixture. A future production
Historical Intake parser must not reuse this helper as its complete trust
boundary without explicit duplicate-key handling.

**Checksum verdict: PASS for the static fixture; not production-parser
approval.**

## 6. Temporal Review

### 6.1 Baseline

| Field | Value |
|---|---|
| Mode | `PRE_MATCH` |
| `analysisTime` | `2030-01-15T12:00:00.000Z` |
| `analysisCutoff` | `2030-01-15T12:00:00.000Z` |
| `generatedAt` | `2030-01-15T12:00:01.000Z` |
| Kickoff | `2030-01-15T19:00:00.000Z` |
| Actual `observedAt` | `2030-01-15T21:00:00.000Z` |

The verifier enforces:

```text
analysisCutoff = analysisTime
analysisTime < kickoff
analysisCutoff <= generatedAt < kickoff
observedAt > kickoff
```

All instants require a timezone-aware ISO-8601 representation.

### 6.2 Fail-closed temporal mutations

Tests reject:

- missing `analysisTime`;
- missing `analysisCutoff`;
- missing `generatedAt`;
- missing timezone;
- `generatedAt == kickoff`;
- `generatedAt > kickoff`;
- `analysisTime >= kickoff`;
- `analysisCutoff != analysisTime`;
- `observedAt <= kickoff`.

### 6.3 Post-match leakage

`prediction-seal.json` contains no Actual, MATCH_RESULT Evidence, FINISHED
status or FT result. The controlled Actual is in a separate file and outside
the seal checksum scope.

The timestamps are fictional conformance instants. Their valid ordering does
not prove real-world pre-kickoff existence.

**Temporal verdict: PASS.**

## 7. Prediction Seal Review

The seal is:

- static JSON committed to a versioned test-only directory;
- declared hand-authored synthetic conformance data;
- not built by current Analysis/Feature/Rule/Match Script/Projection;
- protected by projection, parameter and seal checksums;
- bound to synthetic model, policy and parameter labels;
- free of Actual/Evidence/FT result fields;
- not exported from `@fas/statistics`.

The focused test imports only Node utilities, Vitest and the test-only checksum
helper. It does not import:

- `@fas/analysis`;
- `@fas/feature`;
- `@fas/rule`;
- `@fas/report`;
- Provider packages;
- `AnalyzeMatchUseCase`;
- `buildSealedPredictionInput`;
- `evaluatePrediction`;
- History or replay repositories.

No code path derives Prediction from the Actual.

The checksum contract detects accidental mutation. Git remains the review
authority for deliberate fixture-version changes; this is
immutable-by-contract, not an external timestamped/WORM seal.

The validator checks the principal prediction fields and canonical payload
equality but is not a complete production `SealedPredictionInput` schema
decoder. Production intake must use its own approved domain validation.

**Prediction seal verdict: PASS for controlled conformance use.**

## 8. Verified Actual Boundary Review

The Actual fixture contains:

- Evidence id, provider id, source and source id;
- `type="MATCH_RESULT"`;
- `quality="verified"`;
- internal controlled provenance;
- 2-1 home win;
- total goals 3;
- `matchStatus="FINISHED"`;
- post-kickoff `observedAt`;
- exact matching fixture identity.

Its verification semantics are explicit:

```text
method = controlled-fixture-contract-verification
verificationClass = controlled-fixture-only
realWorldVerification = false
synthetic = true
historicalAuthenticity = false
```

Tests reject unverified quality, missing Evidence id, mismatched matchId,
unfinished status, invalid score/total, invalid winner and pre-kickoff
observation.

Nothing upgrades this controlled quality marker into real-world verification.

**Verified Actual boundary verdict: PASS.**

## 9. Replay Boundary Review

The fixture contains:

- no Projection Replay Sidecar;
- no `SealedProjectionReplayContext`;
- no cohort specification;
- no replay-run artifact;
- no History record.

The manifest declares the intended future boundary:

```text
sealValid = true
actualValid = true
ftEvaluationAllowed = true
sidecarPresent = false
outcomeEvaluable = true
replayComplete = false
replayEligible = false
replayReason = MISSING_SIDECAR
```

The focused test verifies this declaration and absence of top-level Sidecar or
replay-context records. It does not execute Evaluation or Replay. Therefore the
result is evidence of fixture shape, not evidence that the unimplemented
Historical Intake path already enforces the boundary.

No runtime export, bootstrap, seed or composition registration references the
fixture.

**Replay boundary verdict: PASS for fixture isolation; runtime enforcement
remains future work.**

## 10. Population Isolation Review

### 10.1 Repository isolation

The fixture is under:

```text
packages/statistics/test/fixtures/
```

It is outside `packages/statistics/src`, is not included by the package build
`rootDir/include`, and is not part of runtime exports.

### 10.2 Population isolation

No reference links it to:

- Historical Evaluation population;
- Calibration;
- Validation;
- Contribution;
- Evaluation History;
- replay cohort selection;
- API/Worker runtime;
- Prisma seed or repository.

The manifest denies all population/database eligibility. Tests use fresh parsed
in-memory objects only.

Labels alone would not be enough if a future runtime explicitly loaded the
fixture. Current repository reference tracing confirms that no such path
exists.

**Population isolation verdict: PASS.**

## 11. Test Evidence

Fresh review execution:

| Validation | Result | What it proves |
|---|---|---|
| Focused fixture test | **31 passed / 1 file** | Baseline checksums/classification, repeated reads, isolation declaration, replay declaration and required temporal/identity/seal/Actual mutations |
| Full `@fas/statistics` test suite | **135 passed / 16 files** | Fixture tests coexist with existing Evaluation/History/Replay/Calibration/Validation behavior |
| `@fas/statistics` typecheck | **PASS** | Production Statistics source remains type-correct |
| `pnpm quality` | **PASS** | Biome, dependency boundaries and negative boundary fixtures pass |
| IDE lint diagnostics | No new production diagnostics observed | Supporting evidence only |

Test count alone did not determine PASS. The review mapped each required
mutation and boundary to actual assertions.

Important limitation: `packages/statistics/tsconfig.json` includes `src/**/*.ts`
and excludes `test`; package typecheck therefore does not independently
typecheck the fixture test files. Vitest successfully transforms and executes
them, while Biome checks their syntax/style.

## 12. Repository Diff Review

### 12.1 Fixture implementation commit

`08467c5` added:

- four prior planning/review documents;
- three JSON fixture files;
- one focused test;
- one test-only helper.

It added no production source.

### 12.2 Protected areas

| Area | Changed by fixture implementation? |
|---|---|
| Production code | **NO** |
| `packages/statistics/src` | **NO** |
| Prisma/schema/migrations/seeds | **NO** |
| Database runtime/writes | **NO** |
| Analysis/Feature/Rule/Match Script/Projection code | **NO** |
| API/Web/Worker | **NO** |
| Canonical FIP protocol | **NO** |
| Product Roadmap | **NO** |
| Architecture Freeze | **NO** |
| Calibration/Validation definitions | **NO** |

The review test executions performed no database write, Analysis, Projection,
Replay or historical reconstruction.

## 13. Findings

### Passing findings

1. Classification is explicit and consistent in all three fixture files.
2. No field claims historical or real-world authenticity.
3. Exact identity is cross-file bound and mutation-tested.
4. Five canonical SHA-256 scopes verify successfully.
5. Required temporal ordering and mutations fail closed.
6. Prediction and Actual are physically and cryptographically separated.
7. Controlled verification is explicitly not real-world verification.
8. No History, Sidecar, cohort, seed or runtime registration exists.
9. Population eligibility is denied and repository tracing confirms isolation.
10. Required test and quality gates pass.
11. No production or governance boundary changed.

### Blocking findings

**None for the bounded class-B fixture review.**

## 14. Risks / Limitations

| Severity | Limitation | Consequence / required handling |
|---|---|---|
| Medium | Canonical helper parses with `JSON.parse` and cannot reject duplicate raw keys itself | Current files were separately confirmed duplicate-free; production intake needs explicit duplicate-key handling |
| Medium | Repository/Git review, not an external signature or WORM timestamp, anchors fixture identity | Sufficient only for class B; never use as authentic historical evidence |
| Medium | Coordinated edits plus recomputed digests can create a new passing repository state | Any identity/content change requires explicit review and preferably a new fixture version |
| Medium | Test validator is not a complete production domain decoder | Historical Intake must implement approved trust-boundary validation rather than exporting/reusing this test helper |
| Medium | Replay boundary is declarative; no Evaluation/Replay was executed | Must be proven later by the separately approved intake implementation |
| Low | Statistics package typecheck excludes test files | Vitest execution and Biome passed; future test-tooling improvement is separate |
| Low | Delivery commit also contains preceding governance documents | Reduces commit atomicity but changes no runtime scope |

These limitations are non-blocking for the fixture's narrow purpose. They must
not be interpreted as resolved production-intake requirements.

## 15. Gate Decision

# PASS

The Controlled PRE_MATCH Conformance Fixture implementation passes its bounded
review as class-B controlled synthetic test data.

This PASS authorizes only progression to the next **Planning / Final Gate**
stage. It does not authorize Historical Evaluation Intake production
implementation.

```text
CURRENT_STAGE =
CONTROLLED_PREMATCH_CONFORMANCE_FIXTURE_REVIEW_COMPLETED

CURRENT_GATE =
HISTORICAL_INTAKE_PLANNING_FINAL_GATE

NEXT_ACTION =
HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE
```

The blockers remain:

```text
Authentic PRE_MATCH seal = NOT FOUND
Authentic seal + verified real-world Actual = NOT FOUND
Historical Evaluation Intake = C. BLOCKED
Historical Evaluation Intake production implementation = NOT AUTHORIZED
```

The controlled fixture must remain excluded from Historical Evaluation,
Calibration, Validation, Contribution, Evaluation History and replay cohorts.
