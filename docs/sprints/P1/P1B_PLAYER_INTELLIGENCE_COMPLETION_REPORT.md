# P1B — Player Intelligence Feature / Rule / Confidence / Projection Completion Report

| Field | Value |
|---|---|
| Sprint | **Football Intelligence v2 · Wave 2 · P1B** Player Intelligence |
| Date | 2026-07-24 |
| Authority | Architecture Freeze v0.3 · B2 Coding Law · `docs/reviews/PLAYER_INTELLIGENCE_MVP_SCOPE_REVIEW.md` · `docs/architecture/FOOTBALL_INTELLIGENCE_V2_DOMAIN_ARCHITECTURE.md` (DA, L3 Player Intelligence) · `docs/sprints/P1/P1A_PLAYER_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md` · `docs/sprints/L1/L1B_CLUB_INTELLIGENCE_COMPLETION_REPORT.md` (pattern precedent) |
| Scope | Deterministic Feature → Rule → Confidence → Projection consume of P1A `PLAYER` Evidence |
| Explicit exclusions | Provider changes · Evaluation / Evaluation History · database schema · Architecture redesign · new Engines · DTO redesign · ML / softmax rewrite |

---

## 1. Completion Report

P1B consumes the P1A-extended `PLAYER` Evidence payload (`age`, `captain`, `availabilityStatus`, `matchSquadStatus`, `seasonStats`) and derives deterministic Player Intelligence Features through the existing `@fas/feature` extraction pipeline. Those Features feed 8 new deterministic Rules through the existing Rule framework, which participate in Confidence completeness/agreement and the existing Football Projection channel exactly like every other intelligence domain (L1B Club, F1.3B xG, I1B Context, I2B Market). No Provider work, no Evaluation/Evaluation History change, no schema change, no new Engine, and no Confidence/Projection/DTO redesign were introduced. Missing `PLAYER` Evidence — or missing specific `seasonStats`/`availabilityStatus` fields on a given player — yields omitted Features and `INAPPLICABLE` Rules; availability/attack/goalkeeper strength is never estimated or fabricated from an incomplete squad list.

Pins bumped:

- `feature.v2.p1b.player`
- `rule.mvp.p1b.player`
- `projection.v2.p1b.player`

Confidence policy version is unchanged (`confidence.mvp.a05`) — Player Intelligence participates through the existing completeness/agreement mechanics, not a new policy.

Of the nine Feature names named as "typical" in the task brief, five ship (`playerAvailabilityImpact`, `squadAvailabilityScore`, `keyPlayerAvailability`, `playerAttackContribution`, `goalkeeperReliability`). `playerDefenseContribution`, `playerFormStrength`, and `playerDisciplineRisk` are **not** produced this sprint: `PLAYER` Evidence (per P1A) carries `yellowCards`/`redCards` per player but no per-match date series, so a defensible non-fabricated disciplinary-risk trend cannot be derived yet; a defender-specific contribution metric and an individual player form-strength metric were judged to duplicate existing L1B `clubDefensiveStrength`/`formStrength` signal without a materially different, non-redundant Evidence-backed computation. Shipping only what the underlying Evidence honestly supports follows the same discipline P1A used for dropping `cleanSheets`. This is recorded under Remaining limitations (§10) and is a candidate for a later Player Intelligence follow-up if richer Evidence (e.g. per-match discipline history) is added.

---

## 2. Files changed

### Feature (`@fas/feature`)

- `src/extraction/feature-math.ts` — position-weighted availability impact, squad availability score, attack contribution (goals/assists/minutes/rating composite), goalkeeper reliability (saves/goals-conceded/rating composite), key-player-absence predicate, and their baseline constants
- `src/extraction/feature-extractor.ts` — `PLAYER` Evidence parsing (`position`, `captain`, `availabilityStatus`, `seasonStats`), per-side extraction restricted to currently-available players for attack/goalkeeper contribution, honest-absence omission
- `src/domain/feature.ts` — 10 new `FeatureName` entries
- `src/domain/feature-bundle.ts` — `FEATURE_MODEL_VERSION = "feature.v2.p1b.player"`
- `src/index.ts` — new math function/constant exports
- `test/feature-extractor.spec.ts` — Player Intelligence extraction tests (success + full-omission) + pin assertion

### Rule (`@fas/rule`)

- `src/evaluation/rule-evaluator.ts` — 8 new Player Intelligence rule definitions + `TAU_PLAYER_AVAILABILITY` / `TAU_PLAYER_ATTACK` / `TAU_GOALKEEPER_EDGE` thresholds + `booleanValue` helper for boolean Features; `RULE_POLICY = "rule.mvp.p1b.player"`
- `src/domain/rule-result.ts` — 8 new `RuleId` / `RuleName` entries
- `test/rule-evaluator.spec.ts` — Player Intelligence PASS/FAIL/INAPPLICABLE coverage; updated full-list assertion

### Analysis (`@fas/analysis`)

- `src/confidence/intelligence-confidence.ts` — `PLAYER` home/away completeness checks; 8 Player rules added to `P1_CHANNEL_RULES` (agreement); limitation message when incomplete
- `src/projection/compute-deterministic-projection.ts` — 8 Player rules added to `footballChannelRules`
- `src/projection/deterministic-match-projection.ts` — `PROJECTION_MODEL_VERSION = "projection.v2.p1b.player"`
- `src/evaluation/build-sealed-prediction-input.ts` — `ruleSetVersion: "rule.mvp.p1b.player"`

### Report (`@fas/report`)

- `src/narrative/mvp/build-mvp-narrative.ts` — `PlayerIntelligenceFeatures` line in the Strength narrative section; `KEY_PLAYER_MISSING_*` rules included in the risk-rule narrative filter

### Web (`apps/web`)

- `src/types/analysis.ts` — 10 Feature names + 8 Rule names
- `src/lib/explainable-report.ts` — `FEATURE_LABELS` and `RULE_TITLES` entries for Player Intelligence
- `test/analysis-session.spec.tsx`, `test/explainable-report.spec.tsx`, `test/match-detail.spec.tsx` — `projectionModelVersion` pin fixtures

### API (`apps/api`)

- `src/http-response.dto.ts` — Swagger example pin
- `test/import-evidence-workflow.spec.ts` — pin fixture

### Docs

- `docs/50_EVIDENCE_CATALOG.md` — `PLAYER` row now cites P1B consume
- `docs/PROJECT_INDEX.md` — P1B marked complete; M1A queued
- `docs/PROJECT_STATE.md` — current sprint / last delivery / next authorized work
- `docs/sprints/P1/P1B_PLAYER_INTELLIGENCE_COMPLETION_REPORT.md` — this report

Not modified (by design): any Provider package, `packages/statistics/src/evaluation/build-evaluation-history-record.ts`, `packages/statistics/src/evaluation/evaluation-population.ts`, `packages/statistics/test/evaluation*.spec.ts`, Prisma schema, any architecture document, raw Player Evidence display components.

---

## 3. New Player Intelligence Features

All Features derive solely from `PLAYER` Evidence fields (`position`, `captain`, `availabilityStatus`, `teamSide`, `seasonStats.{appearances,minutesPlayed,rating,goals,assists,saves,goalsConceded}`). Every Feature carries `sourceEvidenceId` pointing at an originating `PLAYER` Evidence item; any missing/insufficient field omits the Feature (never fabricated).

| Feature | Source | Range / notes |
|---|---|---|
| `playerAvailabilityImpactHome` / `Away` | Position of each player with `availabilityStatus` set | [0,100]; sum of position weights (GK 30, ATT 25, MID 18, DEF 15, unknown 15), clamped |
| `keyPlayerAvailabilityHome` / `Away` | Captain / Goalkeeper / attack-contribution ≥ 40 among absent players | boolean; true if any confirmed absence is a captain, a goalkeeper, or a high-contribution attacker |
| `squadAvailabilityScoreHome` / `Away` | Count of listed `PLAYER` Evidence with vs without `availabilityStatus` | [0,100]; 100 × (available / total listed); 100 when no players listed |
| `playerAttackContributionHome` / `Away` | Currently-available players at `position: "Attacker"` with `seasonStats.{goals,assists,appearances}` | [0,100] average across available attackers; weighted composite of goals+assists/match (0.6), minutes share (0.25 if present), rating (0.15 if present) vs baselines |
| `goalkeeperReliabilityHome` / `Away` | Currently-available `position: "Goalkeeper"` with any of `seasonStats.{saves,goalsConceded,rating}` | [0,100]; weighted composite of saves/match (0.4), inverse goals-conceded/match (0.4), rating (0.2) — only the present sub-metrics are weighted |

10 Feature names total (5 metrics × home/away).

---

## 4. New Player Intelligence Rules

Rules consume only the Features above — never `PLAYER` Evidence or Provider data directly.

| Rule | Channel | Required Features | Threshold (τ) | Weight |
|---|---|---|---|---|
| `PLAYER_AVAILABILITY_EDGE_HOME` / `_AWAY` | home+ / away+ | `playerAvailabilityImpactHome`, `playerAvailabilityImpactAway` | 10 | 0.5 |
| `KEY_PLAYER_MISSING_HOME` / `_AWAY` | away+ / home+ | `keyPlayerAvailabilityHome` / `Away` | boolean = true | 0.55 |
| `PLAYER_ATTACK_EDGE_HOME` / `_AWAY` | home+ / away+ | `playerAttackContributionHome`, `playerAttackContributionAway` | 15 | 0.45 |
| `GOALKEEPER_EDGE_HOME` / `_AWAY` | home+ / away+ | `goalkeeperReliabilityHome`, `goalkeeperReliabilityAway` | 15 | 0.35 |

8 rules total. `KEY_PLAYER_MISSING_HOME` intentionally scores toward the **away+** channel (a missing home key player favors the away side) and vice versa. Any missing required Feature marks the rule `INAPPLICABLE` (existing Rule framework behavior — no new evaluation path). Weights sit at or below comparable existing edges (e.g. `HOME_ATTACK_EDGE`) so Player Intelligence supplements rather than dominates existing football signal; `KEY_PLAYER_MISSING_*` is weighted slightly higher, matching the Scope Review's framing of confirmed key-player absence as a materially larger single-fact edge than a general availability-impact composite.

`PLAYER_DEFENSE_EDGE` and `DISCIPLINE_RISK` from the task's "typical Rules" list are not implemented — they would require the `playerDefenseContribution` / `playerDisciplineRisk` Features that were not shipped this sprint (see §1, §10).

---

## 5. Confidence impact

- `evidenceCompleteness` now checks `PLAYER` presence for both home and away sides (2 of 20 total completeness checks)
- All 8 Player Intelligence rule names added to `P1_CHANNEL_RULES`, so they participate in `ruleAgreement` (alignment / contradiction-penalty) exactly like existing P1 edges
- New limitation message: `"PLAYER Evidence incomplete; player availability/attack/goalkeeper Features may be absent (never estimated from unlisted squads)."`
- No new agreement-bonus function was added for Player Intelligence specifically — Player Rules already influence confidence through the existing `P1_CHANNEL_RULES` agreement mechanism, avoiding an unnecessary Confidence redesign
- `INTELLIGENCE_CONFIDENCE_POLICY_VERSION` unchanged (`confidence.mvp.a05`)

---

## 6. Projection impact

- All 8 Player Intelligence rule names added to `footballChannelRules` in `compute-deterministic-projection.ts`, so PASS results adjust the existing football softmax channel exactly like other rule edges
- No softmax formula change, no new channel, no ML
- Market Intelligence rules remain `channel: "none"` (unchanged) — still supporting-only, never entering the football channel
- `PROJECTION_MODEL_VERSION = "projection.v2.p1b.player"`

---

## 7. Workspace / Report impact

- Feature Importance (generic, driven by `FEATURE_LABELS`) now renders the 10 Player Intelligence Features with human-readable labels (e.g. "Home Player Availability Impact (derived)", "Away Goalkeeper Reliability (derived)") ranked by contributing Rule weight — no bespoke Player Intelligence widget was added
- Key Factors / Rule list renders the 8 Player Intelligence rule titles (e.g. "Home Player Availability Edge", "Away Key Player Missing") via `RULE_TITLES`
- Raw Player Evidence display (built in P1A) is unchanged — squad/availability/season-stat facts remain visually and structurally separate from derived Features
- Narrative Strength section gained a `PlayerIntelligenceFeatures` sentence summarizing `playerAvailabilityImpact`, `squadAvailabilityScore`, `keyPlayerAvailability`, `playerAttackContribution`, `goalkeeperReliability` for both sides (labelled "derived from PLAYER Evidence"); the risk-rule narrative filter now also surfaces passing `KEY_PLAYER_MISSING_*` rules

---

## 8. Tests added / updated

- `packages/feature/test/feature-extractor.spec.ts` — Player Intelligence Feature extraction across goalkeeper/attacker/captain/absence combinations, exclusion of unavailable players from attack/goalkeeper contribution, `sourceEvidenceId` correctness, and full-omission when no `PLAYER` Evidence exists; updated `featureModelVersion` pin
- `packages/rule/test/rule-evaluator.spec.ts` — new `"evaluates P1B Player Intelligence Rules from Player Features"` (PASS/FAIL + `sourceFeatureIds`, incl. boolean `keyPlayerAvailability*`) and `"marks Player Intelligence Rules INAPPLICABLE when Player Features are absent"`; updated the full football-rule-list assertion to include the 8 new `INAPPLICABLE` entries in evaluation order
- `apps/web/test/analysis-session.spec.tsx`, `explainable-report.spec.tsx`, `match-detail.spec.tsx` — `projectionModelVersion` pin fixtures
- `apps/api/test/import-evidence-workflow.spec.ts` — pin fixture

---

## 9. Quality Gates

```bash
pnpm quality      # biome check + dependency-cruiser boundaries + boundary fixture negative tests
pnpm typecheck    # turbo run typecheck (all 23 packages)
pnpm test         # turbo run test (all packages)
pnpm build        # turbo run build (all packages, incl. next build)
```

**Result (2026-07-24):**

- `pnpm quality` — passed (biome format/lint clean after `biome format --write` on the 6 edited files with formatting diffs; dependency-cruiser boundaries clean; boundary negative fixtures still correctly rejected)
- `pnpm typecheck` — passed (41/41 tasks, 0 errors)
- `pnpm test` — passed for every package except the pre-existing `@fas/database` Postgres integration suite (`packages/database/test/prisma-evidence-repository.spec.ts`), which requires a live local Postgres instance not available in this environment; this failure is unrelated to P1B (no `@fas/database` files were touched) and matches the previously documented L1B environment limitation. `@fas/rule` (32/32), `@fas/feature` (38/38), `@fas/analysis` (16/16), `@fas/report` (8/8), `@fas/api` (21/21, 2 skipped), `@fas/web` (38/38) all pass
- `pnpm build` — passed (22/22 tasks, incl. `next build`)

---

## 10. Remaining limitations

- `playerDefenseContribution`, `playerFormStrength`, and `playerDisciplineRisk` (named as "typical" in the task brief) were not shipped — current `PLAYER` Evidence (P1A) lacks a per-match time series needed for a non-fabricated discipline trend, and a distinct non-redundant defender/form-strength computation beyond existing L1B `clubDefensiveStrength`/`formStrength` was not evident from the available fields; see §1
- `PLAYER_DEFENSE_EDGE` and `DISCIPLINE_RISK` Rules are consequently not implemented (no backing Feature)
- `playerAttackContribution` / `goalkeeperReliability` only ever populate for the capped candidate set that P1A's provider mapper selects (goalkeeper + top attackers, default max 6 per side) — non-candidate players remain honest-absence with no `seasonStats`
- `keyPlayerAvailability` treats any absent goalkeeper as automatically "key" (position-based rule); this may over-flag second-choice goalkeepers, but the alternative (depth-chart awareness) is not derivable from current `PLAYER` Evidence
- No cross-domain agreement bonus was added between Player Intelligence and other intelligence domains (e.g. Player `playerAttackContribution` vs Club `clubAttackStrength`); Player Rules currently influence Confidence only through the shared `P1_CHANNEL_RULES` agreement set

---

## 11. Recommended next sprint

**M1A** — Manager Intelligence Evidence (per `docs/40_PRODUCT_ROADMAP.md` sequencing and the DA's L-track wave plan).

---

*End of P1B Completion Report.*
