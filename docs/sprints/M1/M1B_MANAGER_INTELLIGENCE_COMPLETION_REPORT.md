# M1B — Manager Intelligence Feature → Rule → Football State → Projection Completion Report

| Field | Value |
|---|---|
| Sprint | **M1B** Manager Intelligence Features / Rule / Football State / Confidence / Projection / Contribution |
| Date | 2026-08-04 |
| Authority | Architecture Freeze v0.3 · B2 Coding Law · DA FI v2 Domain Architecture (Manager track) · `docs/sprints/M1/M1A_MANAGER_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md` · L1B/P1B pattern precedent · task-authorized production coding (doc 40 cite pending) |
| Scope | Deterministic Feature → Rule → Football State → Confidence → Match Script → Projection → Replay → Contribution → Workspace consume of M1A `MANAGER_INTELLIGENCE` Evidence |
| Explicit exclusions | Provider changes · Evaluation / Evaluation History schema · database schema · Architecture redesign · new Engines · Projection mathematics redesign · direct Manager→λ injection · ML / LLM · new Football State dimensions |

---

## Overview

M1B completes deterministic Manager Intelligence integration so Manager behaves as a first-class Football Intelligence contributor alongside Club and Player:

```text
MANAGER_INTELLIGENCE Evidence
  → Manager Features (omit if Evidence/fields missing)
  → Manager Rules (INAPPLICABLE if Features absent)
  → Football State (pressureState + riskState only)
  → Match Script → Projection (no direct λ injection)
  → Replay provenance + Contribution domain `manager_intelligence`
  → Workspace Evidence / Features / Rules / State / Contribution
```

Missing Evidence never fabricates Features. No Projection math change. No Match Script bypass. No new Engine. Architecture Freeze v0.3 unchanged.

Pins bumped:

- `feature.v2.m1b.manager`
- `rule.mvp.m1b.manager`
- `projection.v2.m1b.manager`

Confidence policy version unchanged (`confidence.mvp.a05`).

---

## Architecture impact

| Area | Change |
|------|--------|
| Module boundaries | Unchanged |
| Engines | None added |
| Football State dimensions | None added — Manager Features map into existing `pressureState` (stability) and `riskState` |
| Projection λ math | Unchanged — Manager does **not** enter `FEATURE_ENRICHED_LAMBDA_PARAMETER_SET` |
| Contribution domains | `manager_intelligence` added (8 → 9), fixed canonical order |
| Provider / Evidence schema | Unchanged (consumes M1A Evidence) |

---

## Feature list

All Features derive solely from `MANAGER_INTELLIGENCE` payload fields. Every Feature carries `sourceEvidenceId`. Missing fields → Feature omitted.

| Feature | Source | Notes |
|---|---|---|
| `managerTenureStabilityHome` / `Away` | `tenureDays` | [0,100]; same tenure scale as L1B club `managerStability`, distinct Evidence source |
| `managerExperienceHome` / `Away` | `age` and/or `previousClubs.length` | Omits when both absent |
| `managerContinuityHome` / `Away` | `matchManagerConfirmed` (+ optional `tenureDays`) | Omits when unconfirmed |
| `managerChangeRiskHome` / `Away` | `tenureDays` and/or `interimManagerStatus` | Higher = more change risk; omits when neither present |
| `managerCareerStabilityHome` / `Away` | `previousClubs` array present | Fewer previous clubs → higher stability |

10 Feature names total (5 metrics × home/away).

---

## Rule list

Rules consume Manager Features only — never Evidence/Provider directly.

| Rule | Channel | Required Features | τ | Weight |
|---|---|---|---|---|
| `MANAGER_STABILITY_EDGE` / `_AWAY` | home+ / away+ | tenure stability pair | 15 | 0.35 |
| `MANAGER_EXPERIENCE_EDGE` / `_AWAY` | home+ / away+ | experience pair | 12 | 0.3 |
| `MANAGER_CONTINUITY_EDGE` / `_AWAY` | home+ / away+ | continuity pair | 12 | 0.3 |
| `MANAGER_CHANGE_RISK_HOME` | away+ | `managerChangeRiskHome` ≥ 55 | 55 | 0.4 |
| `MANAGER_CHANGE_RISK_AWAY` | home+ | `managerChangeRiskAway` ≥ 55 | 55 | 0.4 |

8 rules. L1B `MANAGER_STABILITY` / `_AWAY` (from `CLUB_INTELLIGENCE.managerTenureDays`) remain unchanged and distinct.

---

## Football State integration

| Dimension | Manager Features |
|---|---|
| `pressureState` (stability) | tenure stability, continuity, experience, career stability |
| `riskState` | change risk |

No new dimensions. Match Script activation continues from existing FS levels/tags — Manager influence is indirect via State → Script → merged matrix.

---

## Confidence integration

- `evidenceCompleteness` adds home/away `MANAGER_INTELLIGENCE` checks
- 8 M1B rules added to `P1_CHANNEL_RULES` (agreement)
- Limitation when Manager Evidence incomplete
- Policy version unchanged

---

## Projection integration

- V1 football-channel rules include M1B Manager rules (softmax adjust path)
- V2 confidence/alignment channel includes M1B Manager rules
- V2 λ path: **no** Manager Feature weights — flow is Rule → FS → Match Script → Projection only
- Pins: `projection.v2.m1b.manager`

---

## Replay integration

- Sealed prediction `ruleSetVersion` / Feature / Projection pins record M1B versions
- Replay sidecar continues to capture Features/Rules; Manager Features/Rules appear when Evidence present
- Projection Replay Comparison `byIntelligenceDomain` includes `manager_intelligence` via domain Feature family

---

## Workspace integration

- Existing Manager Evidence section (M1A) retained
- Feature Importance + Rule Evaluation show Manager Features/Rules with labels
- Football State reflects pressure/risk impacts when Manager Features present
- Contribution section shows **教练智能 / Manager Intelligence** domain row
- Narrative Strength section adds `ManagerIntelligenceFeatures` line

---

## Files changed (summary)

### Feature (`@fas/feature`)
- `feature-math.ts` — M1B tenure/experience/continuity/change-risk/career math
- `feature-extractor.ts` — `MANAGER_INTELLIGENCE` extraction
- `feature.ts` / `feature-bundle.ts` — names + pin `feature.v2.m1b.manager`
- tests — extraction success + honest omission

### Rule (`@fas/rule`)
- `rule-evaluator.ts` — 8 Manager rules; pin `rule.mvp.m1b.manager`
- `rule-result.ts` — RuleId / RuleName entries
- tests — PASS/FAIL/INAPPLICABLE

### Analysis (`@fas/analysis`)
- Football State pressure/risk Feature lists
- Confidence completeness + agreement + limitations
- V1/V2 football channel rule sets
- Projection / sealed / replay pins

### Statistics (`@fas/statistics`)
- `manager_intelligence` domain + Feature family
- Contribution / replay domain lists (9)

### Report / Web / API / Docs
- Narrative, Workspace labels/copy/types, Swagger pin, Evidence catalog, PROJECT_STATE, PROJECT_INDEX, this report

---

## Acceptance checklist

| Criterion | Status |
|---|---|
| Manager Features from Evidence only; omit when missing | Done |
| Manager Rules deterministic / explainable / Evidence-backed | Done |
| Football State: Stability (pressure) + Risk only; no new dimensions | Done |
| Confidence reuses existing framework | Done |
| Projection via Rule → FS → Match Script (no direct λ) | Done |
| Contribution Breakdown includes Manager | Done |
| Replay preserves Manager contribution provenance | Done |
| Workspace displays Evidence → Features → Rules → State → Contribution | Done |
| No estimation / hallucination | Done |
| Architecture Freeze v0.3 unchanged | Done |

---

## Quality gates

| Gate | Result |
|------|--------|
| `pnpm quality` | Pass |
| `pnpm lint` | Pass (`biome lint .`) |
| `pnpm typecheck` | Pass |
| `pnpm test` (M1B packages) | Pass — feature 40, rule 34, analysis 51, statistics 63, report 14, api 28, web 42 |
| `pnpm build` (M1B packages) | Pass — feature, rule, analysis, statistics, report, api, web |
| Full `pnpm test` | Toolchain packages pass; `@fas/database` prisma-evidence-repository blocked without live PostgreSQL (`DATABASE_URL`) — env/infra, not M1B |

---

## Future work

1. Optional Evaluation-qualified promotion of Manager Feature weights into λ **only** after measured need + explicit gate (not default).
2. Richer Manager Evidence (e.g. provider interim status) if/when available — still never invent.
3. **L2A** Squad Intelligence Evidence (DA sequencing).
4. Add M1B / P2 sequence to `docs/40_PRODUCT_ROADMAP.md` when documenting product sprint inventory.
