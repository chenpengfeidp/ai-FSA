# I1B — Match Context Intelligence Completion Report

| Field | Value |
|---|---|
| Sprint | **I1B** Match Context Intelligence |
| Date | 2026-07-23 |
| Authority | Architecture Freeze v0.2 · B2 Coding Law · D0 Expansion Roadmap |
| Scope | Deterministic Feature → Rule → Confidence → Projection consume of `MATCH_CONTEXT` |
| Explicit exclusions | AI Features · ML / new probabilistic models · DB schema · Engines · architecture redesign · Projection λ rewrite |

---

## 1. Completion Report

I1B consumes I1A `MATCH_CONTEXT` Evidence and derives deterministic Football Intelligence Features. Those Features feed the existing Rule framework; Confidence gains agreement when Match Context aligns with Expected Goals or Advanced Statistics on the same side; Projection consumes Context Rule channel weights through the existing football softmax path. Missing Evidence yields INAPPLICABLE Rules and honest limitations — never estimated rest, congestion, travel, or knockout facts.

Pins bumped:

- `feature.v2.i1b.context`
- `rule.mvp.i1b.context`
- `projection.v2.i1b.context`

---

## 2. Files changed

### Feature (`@fas/feature`)

- `src/extraction/feature-math.ts` — fatigue / schedule / stability / rotation / knockout math
- `src/extraction/feature-extractor.ts` — `MATCH_CONTEXT` extract
- `src/domain/feature.ts` / `feature-bundle.ts` / `index.ts`
- `test/feature-extractor.spec.ts`

### Rule (`@fas/rule`)

- `src/evaluation/rule-evaluator.ts` — Context Rules
- `src/domain/rule-result.ts` — RuleId / RuleName registry
- `test/rule-evaluator.spec.ts`

### Analysis / Report / Web / Docs

- `packages/analysis/src/confidence/intelligence-confidence.ts`
- `packages/analysis/src/projection/compute-deterministic-projection.ts`
- `packages/analysis/src/projection/deterministic-match-projection.ts`
- `packages/report/src/narrative/mvp/build-mvp-narrative.ts`
- `apps/web` types, labels, copy; fixture projection version in tests
- `apps/api` swagger example + workflow test pin
- `docs/50_EVIDENCE_CATALOG.md`, `docs/PROJECT_STATE.md`, this report

---

## 3. New Context Football Features

| Feature | Source | Notes |
|---|---|---|
| `fatigueIndexHome` / `Away` | restDays + matchesInLast7Days (+ optional last14) | [0,100]; absent → omitted |
| `scheduleAdvantage` | Relative rest (+ congestion when both sides known) | Signed; both restDays required |
| `homeStability` | homeAwayContext for home side | 100 at home; 35 if declared away |
| `rotationPressureHome` / `Away` | fixtureCongestion / matchesInLast7Days | [0,100] |
| `knockoutContext` | isKnockout + optional leg / aggregate | 0 when non-knockout; omitted when unknown |

---

## 4. Rule integrations

| Rule | Channel | Required Features |
|---|---|---|
| `REST_ADVANTAGE_HOME` | home+ | scheduleAdvantage ≥ τ |
| `REST_ADVANTAGE_AWAY` | away+ | scheduleAdvantage ≤ −τ |
| `FATIGUE_HOME` | away+ | fatigueIndexHome ≥ τ |
| `FATIGUE_AWAY` | home+ | fatigueIndexAway ≥ τ |
| `HOME_STABILITY` | home+ | homeStability ≥ τ |
| `ROTATION_PRESSURE` | home+ | away − home rotation ≥ τ |
| `KNOCKOUT_CONTEXT` | none | knockoutContext ≥ τ (findings; not football softmax) |

Missing Features → `INAPPLICABLE` (existing Rule framework).

---

## 5. Confidence impact

- MATCH_CONTEXT home/away added to evidence completeness checks
- Context Rules added to P1 channel agreement set (except `KNOCKOUT_CONTEXT`)
- Agreement bonus (capped +8) when Context Rules align with xG / Advanced Statistics on the same side
- Limitation text when MATCH_CONTEXT incomplete; note when agreement bonus applied
- Policy version unchanged (`confidence.mvp.a05`) — no Confidence redesign

---

## 6. Projection impact

- Channelled Context Rules added to football channel set for existing softmax Rule adjustment
- `KNOCKOUT_CONTEXT` remains findings-only (`channel: none`)
- Projection model pin: `projection.v2.i1b.context`
- No Projection architecture rewrite; no ML

---

## 7. Workspace / Report impact

- Feature Importance labels mark derived Context Features “(derived)”
- Match Context section remains raw Evidence; copy distinguishes Evidence vs Features
- Narrative Strength cites MatchContextFeatures; Key Factors still cite Rule outputs only

---

## 8. Tests added / updated

- Feature extractor: Context extract + honest absence
- Rule evaluator: Context PASS/FAIL + INAPPLICABLE when Features absent
- Projection pin updates in API/web fixtures

---

## 9. Quality Gates

```bash
pnpm validate
```

**Result (2026-07-23):** passed (toolchain, workspace, prisma, biome, boundaries, typecheck, test, build).

---

## 10. Remaining limitations

- Live rest/congestion limited to provider schedule sample windows
- Travel remains posture-only (no km); not a Feature
- `ROTATION_PRESSURE` currently favours home when away congestion is relatively higher (single channelled rule)
- `KNOCKOUT_CONTEXT` is findings-only until aggregate/leg-aware side effects are authorized
- Agreement bonus is a small additive signal, not a new Confidence engine

---

## 11. Recommended next sprint

**I2A** — Odds & Market Evidence (market layer Evidence expansion; findings-oriented Intelligence follows in later I2 work).

---

*End of I1B Completion Report.*
