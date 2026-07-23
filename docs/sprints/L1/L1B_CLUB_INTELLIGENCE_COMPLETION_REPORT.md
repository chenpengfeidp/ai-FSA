# L1B — Club Intelligence Features / Rule / Confidence / Projection Completion Report

| Field | Value |
|---|---|
| Sprint | **L1B** Club Intelligence Features / Rule / Confidence / Projection |
| Date | 2026-07-23 |
| Authority | `docs/40_PRODUCT_ROADMAP.md` · Architecture Freeze v0.2 · B2 Coding Law · DA FI v2 Domain Architecture (L1) |
| Scope | Deterministic Feature → Rule → Confidence → Projection consume of L1A `CLUB_INTELLIGENCE` Evidence |
| Explicit exclusions | Provider changes · Evaluation / Evaluation History · database schema · Architecture redesign · new Engines · DTO redesign · ML / softmax rewrite |

---

## 1. Completion Report

L1B consumes L1A `CLUB_INTELLIGENCE` Evidence (league standings row + optional manager tenure) and derives 18 deterministic Club Intelligence Features (9 metrics × home/away). Those Features feed 12 new deterministic Rules through the existing Rule framework, which participate in Confidence completeness/agreement and the existing Football Projection channel exactly like every other intelligence domain (F1.3B xG, I1B Context, I2B Market). No Provider work, no Evaluation/Evaluation History change, no schema change, no new Engine, and no Projection/DTO redesign were introduced. Missing `CLUB_INTELLIGENCE` Evidence yields omitted Features and `INAPPLICABLE` Rules — standings/manager data is never estimated or fabricated.

Pins bumped:

- `feature.v2.l1b.club`
- `rule.mvp.l1b.club`
- `projection.v2.l1b.club`

Confidence policy version is unchanged (`confidence.mvp.a05`) — Club Intelligence participates through the existing completeness/agreement mechanics, not a new policy.

---

## 2. Files changed

### Feature (`@fas/feature`)

- `src/extraction/feature-math.ts` — club strength / league strength / points-per-match / goal-difference / attack / defensive / venue-split / manager-stability math
- `src/extraction/feature-extractor.ts` — `CLUB_INTELLIGENCE` metric parsing, `currentForm` string parsing, per-side extraction, honest-absence omission
- `src/domain/feature.ts` — 18 new `FeatureName` entries
- `src/domain/feature-bundle.ts` — `FEATURE_MODEL_VERSION = "feature.v2.l1b.club"`
- `src/index.ts` — new math function/constant exports
- `test/feature-extractor.spec.ts` — Club Intelligence extraction tests + pin assertion

### Rule (`@fas/rule`)

- `src/evaluation/rule-evaluator.ts` — 12 new Club Intelligence rule definitions + `TAU_*` thresholds; `RULE_POLICY = "rule.mvp.l1b.club"`
- `src/domain/rule-result.ts` — 12 new `RuleId` / `RuleName` entries
- `test/rule-evaluator.spec.ts` — Club Intelligence PASS/FAIL/INAPPLICABLE coverage; updated full-list assertion

### Analysis (`@fas/analysis`)

- `src/confidence/intelligence-confidence.ts` — `CLUB_INTELLIGENCE` home/away completeness checks; 12 Club rules added to `P1_CHANNEL_RULES` (agreement); limitation message when incomplete
- `src/projection/compute-deterministic-projection.ts` — 12 Club rules added to `footballChannelRules`
- `src/projection/deterministic-match-projection.ts` — `PROJECTION_MODEL_VERSION = "projection.v2.l1b.club"`
- `src/evaluation/build-sealed-prediction-input.ts` — `ruleSetVersion: "rule.mvp.l1b.club"`

### Report (`@fas/report`)

- `src/narrative/mvp/build-mvp-narrative.ts` — `ClubIntelligenceFeatures` line in the Strength narrative section

### Web (`apps/web`)

- `src/types/analysis.ts` — 18 Feature names + 12 Rule names
- `src/lib/explainable-report.ts` — `FEATURE_LABELS` and `RULE_TITLES` entries for Club Intelligence
- `test/analysis-session.spec.tsx`, `test/explainable-report.spec.tsx`, `test/match-detail.spec.tsx` — `projectionModelVersion` pin fixtures

### API (`apps/api`)

- `src/http-response.dto.ts` — Swagger example pin
- `test/import-evidence-workflow.spec.ts` — pin fixture

### Docs

- `docs/50_EVIDENCE_CATALOG.md` — `CLUB_INTELLIGENCE` row now cites L1B consume
- `docs/PROJECT_INDEX.md` — L1B marked complete; L2A queued
- `docs/PROJECT_STATE.md` — current sprint / last delivery / next authorized work
- `docs/sprints/L1/L1B_CLUB_INTELLIGENCE_COMPLETION_REPORT.md` — this report

Not modified (by design): any Provider package, `packages/statistics/src/evaluation/build-evaluation-history-record.ts`, `packages/statistics/src/evaluation/evaluation-population.ts`, `packages/statistics/test/evaluation*.spec.ts`, Prisma schema, any architecture document.

---

## 3. New Club Intelligence Features

All Features derive solely from `CLUB_INTELLIGENCE` Evidence metrics (`leagueRank`, `leaguePoints`, `played`, `goalDifference`, `goalsScored`, `goalsConceded`, `currentForm`, home/away split, `managerTenureDays`). Every Feature carries `sourceEvidenceId` pointing at the originating `CLUB_INTELLIGENCE` Evidence item; any missing metric omits the Feature (never fabricated).

| Feature | Source metric | Range / notes |
|---|---|---|
| `pointsPerMatchHome` / `Away` | `leaguePoints`, `played` | Points ÷ matches played |
| `goalDifferenceStrengthHome` / `Away` | `goalDifference`, `played` | [0,100]; 50 = neutral per-match goal difference |
| `clubAttackStrengthHome` / `Away` | `goalsScored`, `played` | [0,100] vs a 1.3 goals/match baseline |
| `clubDefensiveStrengthHome` / `Away` | `goalsConceded`, `played` | [0,100]; higher = fewer conceded per match |
| `leagueStrengthHome` / `Away` | `leagueRank` | [0,100]; rank 1 → 100 on an assumed 20-team table |
| `clubStrengthHome` / `Away` | composite | [0,100]; 0.4·pointsIndex + 0.3·goalDifferenceStrength + 0.3·leagueStrength |
| `formStrengthHome` / `Away` | `currentForm` (e.g. `"WWDLW"`) | Reuses existing `computeRecentFormScore`; omitted if unparseable |
| `managerStabilityHome` / `Away` | `managerTenureDays` | [0,100] vs a 730-day baseline; omitted without manager Evidence |
| `homeLeagueStrength` | home venue split (wins/draws/losses/goals/played) | [0,100]; home team's home-only record |
| `awayLeagueStrength` | away venue split | [0,100]; away team's away-only record |

18 Feature names total (9 metrics × home/away, except `homeLeagueStrength`/`awayLeagueStrength` which are single-sided by construction).

---

## 4. New Club Intelligence Rules

Rules consume only the Features above — never `CLUB_INTELLIGENCE` Evidence or Provider data directly.

| Rule | Channel | Required Features | Threshold (τ) |
|---|---|---|---|
| `CLUB_STRENGTH_EDGE` / `_AWAY` | home+ / away+ | `clubStrengthHome`, `clubStrengthAway` | 10 |
| `LEAGUE_STRENGTH_EDGE` / `_AWAY` | home+ / away+ | `leagueStrengthHome`, `leagueStrengthAway` | 15 |
| `FORM_STRENGTH_EDGE` / `_AWAY` | home+ / away+ | `formStrengthHome`, `formStrengthAway` | 15 |
| `ATTACK_STRENGTH_EDGE` / `_AWAY` | home+ / away+ | `clubAttackStrengthHome`, `clubAttackStrengthAway` | 10 |
| `DEFENSE_STRENGTH_EDGE` / `_AWAY` | home+ / away+ | `clubDefensiveStrengthHome`, `clubDefensiveStrengthAway` | 10 |
| `MANAGER_STABILITY` / `_AWAY` | home+ / away+ | `managerStabilityHome`, `managerStabilityAway` | 20 |

12 rules total. Each pair evaluates the same Feature pair with a mirrored (home-minus-away vs away-minus-home) comparison; any missing Feature marks both rules in the pair `INAPPLICABLE` (existing Rule framework behavior — no new evaluation path).

Weights: `CLUB_STRENGTH_EDGE` 0.6, `ATTACK_STRENGTH_EDGE`/`DEFENSE_STRENGTH_EDGE` 0.5 each, `LEAGUE_STRENGTH_EDGE`/`FORM_STRENGTH_EDGE` 0.45 each, `MANAGER_STABILITY` 0.3 — deliberately at or below existing comparable edges (e.g. `HOME_ATTACK_EDGE` weight) so Club Intelligence supplements rather than dominates existing football signal.

---

## 5. Confidence impact

- `evidenceCompleteness` now checks `CLUB_INTELLIGENCE` presence for both home and away sides (2 of 18 total completeness checks)
- All 12 Club Intelligence rule names added to `P1_CHANNEL_RULES`, so they participate in `ruleAgreement` (alignment / contradiction-penalty) exactly like existing P1 edges
- New limitation message: `"CLUB_INTELLIGENCE Evidence incomplete; club/league/form/manager strength Features may be absent (never estimated from unavailable standings)."`
- No new agreement-bonus function was added for Club Intelligence specifically (unlike the xG↔Advanced-Statistics bonus in F1.3B) — Club Rules already influence confidence through the existing `P1_CHANNEL_RULES` agreement mechanism, avoiding an unnecessary Confidence redesign
- `INTELLIGENCE_CONFIDENCE_POLICY_VERSION` unchanged (`confidence.mvp.a05`)

---

## 6. Projection impact

- All 12 Club Intelligence rule names added to `footballChannelRules` in `compute-deterministic-projection.ts`, so PASS results adjust the existing football softmax channel exactly like other rule edges
- No softmax formula change, no new channel, no ML
- Market Intelligence rules remain `channel: "none"` (unchanged) — still supporting-only, never entering the football channel
- `PROJECTION_MODEL_VERSION = "projection.v2.l1b.club"`

---

## 7. Workspace / Report impact

- Feature Importance (generic, driven by `FEATURE_LABELS`) now renders the 18 Club Intelligence Features with human-readable labels (e.g. "Home Club Strength (composite)", "Away Manager Stability") ranked by contributing Rule weight — no bespoke Club Intelligence widget was added
- Key Factors / Rule list renders the 12 Club Intelligence rule titles (e.g. "Home Club Strength Edge") via `RULE_TITLES`
- Raw Club Evidence display (`buildClubIntelligenceContext`, built in L1A) is unchanged — standings/manager facts remain visually and structurally separate from derived Features
- Narrative Strength section gained a `ClubIntelligenceFeatures` sentence summarizing `clubStrength`, `leagueStrength`, `formStrength`, `clubAttackStrength`, `clubDefensiveStrength`, `managerStability` for both sides (labelled "derived from CLUB_INTELLIGENCE Evidence")

---

## 8. Tests added / updated

- `packages/feature/test/feature-extractor.spec.ts` — Club Intelligence Feature extraction, honest-absence omission (missing metrics, missing manager tenure), `featureModelVersion` pin
- `packages/rule/test/rule-evaluator.spec.ts` — new `"evaluates L1B Club Intelligence Rules from Club Features"` (PASS/FAIL + `sourceFeatureIds`) and `"marks Club Intelligence Rules INAPPLICABLE when Club Features are absent"`; updated the full football-rule-list assertion to include the 12 new `INAPPLICABLE` entries in evaluation order
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

**Result (2026-07-23):**

- `pnpm quality` — passed (biome format/lint clean after `biome check --write` on the 4 edited files with formatting diffs; dependency-cruiser boundaries clean; boundary negative fixtures still correctly rejected)
- `pnpm typecheck` — passed (41/41 tasks, 0 errors)
- `pnpm test` — passed for every package except the pre-existing `@fas/database` Postgres integration suite (`packages/database/test/prisma-evidence-repository.spec.ts`), which requires a live local Postgres instance not available in this environment; this failure is unrelated to L1B (no `@fas/database` files were touched) and matches a previously documented environment limitation. `@fas/rule` (30/30), `@fas/feature` (36/36), `@fas/analysis` (16/16), `@fas/report` (8/8), `@fas/api` (21/21, 2 skipped), `@fas/web` (38/38) all pass
- `pnpm build` — passed (22/22 tasks, incl. `next build`)

---

## 10. Remaining limitations

- League table size is assumed at 20 teams (`BASELINE_LEAGUE_SIZE`) when computing `leagueStrength`; providers that supply a different competition size are not yet reflected (would require a Provider-level competition-size field, out of scope for L1B)
- `formStrength` reuses the existing W/D/L string parser (`computeRecentFormScore`); a `currentForm` string in an unrecognized format is silently omitted rather than partially parsed
- `managerStability` is only ever produced when the provider supplies manager tenure — most current fixtures/live data omit it, so this Feature/Rule pair is frequently `INAPPLICABLE` in practice
- No cross-domain agreement bonus was added between Club Intelligence and other intelligence domains (e.g. Club `clubAttackStrength` vs xG `xgAttackQuality`); Club Rules currently influence Confidence only through the shared `P1_CHANNEL_RULES` agreement set
- Home/away venue-split Features (`homeLeagueStrength` / `awayLeagueStrength`) depend on the provider supplying a home/away breakdown inside `CLUB_INTELLIGENCE`; absent on providers that only report the overall table row

---

## 11. Recommended next sprint

**L2A** — Squad Intelligence Evidence (per `docs/40_PRODUCT_ROADMAP.md`).

---

*End of L1B Completion Report.*
