# PVS-4 — Lottery Multi-ODDS Evidence Persistence Remediation Review

| Field | Value |
|---|---|
| Sprint type | Bounded production defect remediation |
| Date | 2026-09-15 |
| Trigger | `AUTHENTIC_PREMATCH_SEAL_ARTIFACT_ADMISSION_REVIEW` blocker |
| Production code changed | **Yes** (evidence-normalizer only) |
| Recommendation | **A. PASS — LOTTERY MULTI-ODDS EVIDENCE PERSISTENCE REMEDIATED** |

---

## 1. Observed collision

Operator manifest attested **two** China Sports Lottery ODDS observations (standard
1X2 and three-way handicap-result). Postgres `evidence_items` after governed
import contained **one** `china-sports-lottery` ODDS row.

---

## 2. Root cause (confirmed in code)

`parseOdds` in `fixture-evidence-set-normalizer.ts` assigned:

```text
evidenceId = `evidence-${source}-${matchId}-odds`
```

when provenance overlay was present, **ignoring** distinct `providerSourceId`
values. Multiple lottery ODDS rows for the same match/source collided on import
(idempotent retry returned the first row).

---

## 3. Old vs new Evidence id rule

| | Rule |
|---|---|
| **Old** (overlay present) | `evidence-${providerSource}-${matchId}-odds` |
| **New** (overlay present) | `evidence-${providerSource}-${matchId}-odds-${providerSourceId}` |
| **Unchanged** (no overlay) | `evidence-fixture-${matchId}-odds` |

---

## 4. Determinism and idempotency

- Identity keys off governed manifest fields `providerSource` + `providerSourceId`
  (stable per market observation; not array index).
- Reordering `additionalOdds` does not change ids when `providerSourceId` is stable.
- Exact manifest re-import: `importEvidenceRecordIdempotent` + duplicate id → same
  logical Evidence (no overwrite of a different market).

---

## 5. Tests

| Id | Coverage |
|---|---|
| T01–T06 | `packages/evidence-normalizer/test/lottery-multi-odds-evidence.spec.ts` |
| T26–T28 | `packages/application/test/pvs-4-lottery-manifest.spec.ts` |
| T09 | PVS-4 suite 45 tests green |
| T10 | evidence-normalizer 63 tests green |
| T08 | Postgres round-trip: existing `prisma-evidence-repository.spec.ts` (skip if DB unavailable) |

---

## 6. Boundaries unchanged

- No PRE_MATCH seal hash / canonicalization changes.
- No Historical Evaluation Intake, Projection, Rule, Calibration, Validation changes.
- Existing seal rows `…d63058f…` and `…b4314967…` **not** modified.

---

## 7. Validation

```text
pnpm --filter @fas/evidence-normalizer build
pnpm --filter @fas/evidence-normalizer test
pnpm --filter @fas/application test -- pvs-4-lottery-manifest.spec.ts
pnpm quality
```

---

## 8. Next governance

Re-capture governed PRE_MATCH run + new artifact admission review on **new** seal only.
