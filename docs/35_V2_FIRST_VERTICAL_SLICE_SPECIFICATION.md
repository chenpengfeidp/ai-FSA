# V2 First Vertical Slice Specification

## 1. Document Status

| Field | Value |
|---|---|
| Status | Slice 1.0–1.4 implemented in the private fixture environment; see `docs/sprints/VERTICAL_SLICE_1_COMPLETION_REPORT.md` and `docs/PROJECT_STATE.md` |
| Kind | First delivery specification for deterministic football projection |
| Authority | Non-authoritative relative to Project Bible, ADRs, and owning numbered contracts; proceeds under planning acceptance recorded in [34_V2_ARCHITECTURE_ALIGNMENT](./34_V2_ARCHITECTURE_ALIGNMENT.md) |
| Depends on | Documents [30](./30_RULE_ENGINE_V2.md), [31](./31_PREDICTION_ENGINE_V2.md), [32](./32_REPORT_ENGINE_V2.md), [33](./33_ANALYSIS_PIPELINE_V2.md), [34](./34_V2_ARCHITECTURE_ALIGNMENT.md) |
| Implementation | Not authorized by this file alone; see §14 |
| Governance / architecture | Does not amend Project Bible, ADRs, or canonical architecture by itself |

### 1.1 Planning decisions assumed

This specification assumes the planning-accepted answers VA-01 through VA-10 in document 34:

- no new governed engines;
- Feature derivation, match projection, and report assembly are Analysis-owned capabilities;
- Rule Engine remains the governed deterministic evaluator;
- existing packages `@fas/feature`, `@fas/rule`, `@fas/report`, and `@fas/analysis` are reused for the first slice;
- no new ADR is required for the slice shape, but canonical document amendments remain required before coding.

### 1.2 Product goal of this slice

Deliver the smallest end-to-end deterministic football capability:

```text
controlled structured Evidence
  → Feature derivation
  → Rule evaluation
  → DeterministicMatchProjection
  → Deterministic report artifact
  → existing analyze API / Workspace can consume real projection fields
```

Permitted claim after completion:

> The system produces a reproducible deterministic football projection from controlled structured inputs.

Prohibited claim:

> The model is calibrated, production-accurate, or validated for real-world decision making.

---

## 2. Scope

### 2.1 Inclusions

| Layer | Exact scope |
|---|---|
| Evidence | `MATCH_INFO`, `TEAM_FORM`, `STATISTICS` for both teams via controlled fixtures |
| Features | `AttackRating`, `DefenseRating`, `Momentum`, `HomeAdvantage` (home/away where applicable) |
| Rules | `HOME_ATTACK_EDGE`, `AWAY_ATTACK_EDGE`, `MOMENTUM_HOME`, `MOMENTUM_AWAY`, `HOME_ADVANTAGE_MATERIAL` |
| Projection | Home/Away xG, independent Poisson matrix, 1X2, top 3 scorelines, goal ranges `0-1` / `2-3` / `4+` |
| Recommendation | `lean_home`, `lean_away`, `lean_draw`, `cautious`, `insufficient_evidence` |
| Confidence | Slice-local completeness + agreement + feature strength + contradiction penalty |
| Report | Minimum deterministic report DTO containing overview, features, rules, projection, confidence, recommendation, appendix |
| Transport | Extend existing `POST /api/analyze/match/:matchId` response shape only as needed for the DTO |
| Presentation | Minimal Workspace/Library mapping to new fields; no redesign |

### 2.2 Exclusions

- live external providers beyond current fixture/demo adapters;
- Evidence types: injury, lineup, odds, weather, travel, rest days, ranking, news, referee, H2H, motivation;
- Features: travel fatigue, rest advantage, availability, weather, odds consensus, H2H lean, table pressure;
- bivariate Poisson, Skellam-only path, Monte Carlo;
- market blend / calibration maps;
- Prompt Engine / LLM narration;
- Knowledge / Case stages;
- durable jobs, Redis, BullMQ, pgvector;
- new Nest modules beyond wiring required by existing composition;
- authentication, publication workflow, Review/Evaluation/Statistics implementation;
- frontend visual redesign or new routes;
- automatic historical library persistence beyond current local history unless already present.

### 2.3 Non-goals

- maximizing predictive accuracy;
- replacing the canonical AI analysis workflow;
- creating `@fas/prediction-engine` or any eighth governed engine package;
- rewriting the entire Evidence model.

---

## 3. Ownership and Package Areas

### 3.1 Ownership

| Capability | Owner | Package for this slice |
|---|---|---|
| Evidence fixtures / normalization inputs | Evidence | existing evidence / provider-fixture / import path |
| Feature derivation | Analysis-owned capability | `@fas/feature` |
| Rule evaluation | Rule capability (slice rules) | `@fas/rule` |
| Match projection | Analysis-owned capability | new pure modules under `@fas/analysis` or `@fas/report` orchestration; prefer `@fas/analysis` for projection domain |
| Report assembly | Analysis-owned capability | `@fas/report` |
| Orchestration | Analysis Orchestrator | `@fas/analysis` + existing API composition |
| Presentation mapping | Web | `apps/web` presentation mappers only |

### 3.2 Permitted change areas

| Area | Permission |
|---|---|
| `packages/feature/**` | Extend feature names, extractors, tests |
| `packages/rule/**` | Add slice rules alongside or versioned beyond presence rules; preserve existing presence rules unless explicitly migrated |
| `packages/analysis/**` | Add projection domain/use-case/orchestration stages |
| `packages/report/**` | Extend report DTO/builder to assemble projection fields without recomputation |
| `packages/provider-fixture/**` and evidence import fixtures | Add `TEAM_FORM` / `STATISTICS` controlled payloads for demo matches |
| `apps/api/**` | Wire composition only; no business formulas in controllers |
| `apps/web/src/lib/**`, report components, tests | Map and render new DTO fields; no calculation |
| docs listed in §14 | Canonical amendments when authorized |

### 3.3 Forbidden change areas for this slice

- `docs/00_PROJECT_BIBLE.md` engine list expansion;
- new ADR unless a later conflict forces one;
- Prompt/AI provider packages;
- Statistics/Evaluation/Review packages;
- database schema/migrations unless a later amendment explicitly adds persistence for this slice;
- inventing Redis/BullMQ/pgvector.

---

## 4. End-to-End Flow for the Slice

```text
Analyze(matchId)
  → import/select Evidence set
      MATCH_INFO
      TEAM_FORM(home), TEAM_FORM(away)
      STATISTICS(home), STATISTICS(away)
  → FeatureBundle v1
  → RuleEvaluationSet v1 (5 football rules + keep presence rules if still used by readiness)
  → DeterministicMatchProjection v1
  → DeterministicReport v1
  → API response / Workspace render
```

Stage statuses follow document 33 vocabulary: `completed_nonempty`, `completed_empty`, `blocked`, `failed`, `degraded`, `skipped`.

Minimum success path requires FeatureBundle and Projection and Report all `completed_nonempty` or an explicit degraded path is refused for this slice. This slice does **not** seal a success report when projection is blocked.

---

## 5. Evidence Contracts

### 5.1 Required evidence set

For a match to enter projection:

| Type | Subjects | Required |
|---|---|---|
| `MATCH_INFO` | match | yes |
| `TEAM_FORM` | home team, away team | yes |
| `STATISTICS` | home team, away team | yes |
| `HEAD_TO_HEAD` | match (current-side oriented) | optional (slice 1.1) |
| `ODDS` | match (decimal 1X2) | optional (slice 1.2) |

Missing any required item → Feature stage may partially compute, but Projection stage is `blocked` with `insufficient_evidence`.

Optional `HEAD_TO_HEAD` thickens evidence when present. Absence must not block projection and must not permanently cap football-rule alignment `A` (inapplicable H2H rules are excluded from the alignment denominator).

Optional `ODDS` is a **market signal**, not ground truth. Slice 1.2 derives market lean findings and applies a recommendation conflict gate; it does **not** blend market-implied probabilities into model 1X2.

### 5.2 `TEAM_FORM` required payload fields

| Field | Type | Meaning |
|---|---|---|
| `teamSide` | `"home"` \| `"away"` | Subject side in this match |
| `window` | integer `n` where `1 ≤ n ≤ 10` | Number of recent matches |
| `results` | array length `n` of `"W"` \| `"D"` \| `"L"` | Most-recent-first |
| `goalsFor` | array length `n` of non-negative integers | Most-recent-first |
| `goalsAgainst` | array length `n` of non-negative integers | Most-recent-first |

### 5.3 `STATISTICS` required payload fields

| Field | Type | Meaning |
|---|---|---|
| `teamSide` | `"home"` \| `"away"` | Subject side |
| `windowMatches` | integer `n` where `1 ≤ n ≤ 10` | Sample size |
| `shotsForPerMatch` | finite number `≥ 0` | Average shots for |
| `shotsAgainstPerMatch` | finite number `≥ 0` | Average shots against |
| `xgForPerMatch` | finite number `≥ 0` | Average xG for (provider fixture value; not computed here) |
| `xgAgainstPerMatch` | finite number `≥ 0` | Average xG against |

### 5.4 `HEAD_TO_HEAD` optional payload fields (slice 1.1)

Meetings are oriented to the **current** fixture sides (`homeGoals` / `awayGoals` refer to the current home/away teams, regardless of venue in the historical meeting).

| Field | Type | Meaning |
|---|---|---|
| `sampleSize` | integer `n` where `1 ≤ n ≤ 20` | Number of meetings |
| `meetings` | array length `n` | Historical meetings |
| `meetings[].playedAt` | ISO 8601 timestamp | Kickoff of the meeting |
| `meetings[].homeGoals` | non-negative integer | Goals by current home side |
| `meetings[].awayGoals` | non-negative integer | Goals by current away side |

### 5.5 `ODDS` optional payload fields (slice 1.2)

| Field | Type | Meaning |
|---|---|---|
| `homeOdds` | finite number `> 1` | Decimal odds for home win |
| `drawOdds` | finite number `> 1` | Decimal odds for draw |
| `awayOdds` | finite number `> 1` | Decimal odds for away win |
| `observedAt` | ISO 8601 timestamp | Observation time of the market snapshot |

### 5.6 Quality / freshness for the slice

- Rejected evidence cannot contribute.
- Fixture/demo evidence may be `unverified`.
- No post-kickoff outcome evidence may enter.
- Market signals retain observation time and are never promoted to facts.

---

## 6. Feature Specification (`featureModelVersion = feature.v2.slice1`)

All features are pure functions of the Evidence set. Output includes value, explanation, source evidence IDs, and model version.

### 6.1 Constants

| Constant | Value |
|---|---|
| `BASELINE_ATTACK` | `50` |
| `BASELINE_DEFENSE` | `50` |
| `BASELINE_SHOTS_FOR` | `12` |
| `BASELINE_SHOTS_AGAINST` | `12` |
| `BASELINE_XG_FOR` | `1.3` |
| `BASELINE_XG_AGAINST` | `1.3` |
| `SHRINK_K` | `3` |
| `MOMENTUM_DECAY` | `0.75` |
| `DEFAULT_HOME_ADVANTAGE` | `0.35` |

Helper:

```text
shrink(raw, baseline, n) = (n * raw + SHRINK_K * baseline) / (n + SHRINK_K)
clamp(x, lo, hi) = min(hi, max(lo, x))
```

### 6.2 `AttackRating` (home/away)

Inputs: side `STATISTICS`, side `TEAM_FORM`.

```text
shotsIndex = 100 * (shotsForPerMatch / BASELINE_SHOTS_FOR)
xgIndex    = 100 * (xgForPerMatch / BASELINE_XG_FOR)
gfIndex    = 100 * (mean(goalsFor) / BASELINE_XG_FOR)

raw = 0.40 * shotsIndex + 0.40 * xgIndex + 0.20 * gfIndex
AttackRating = clamp(shrink(raw, BASELINE_ATTACK, windowMatches), 0, 100)
```

Explanation template:

```text
Attack rating {value} from shots/xG/goals-for vs baseline; sample={n}.
```

### 6.3 `DefenseRating` (home/away)

Higher is stronger defense.

```text
shotsAgainstIndex = 100 * (BASELINE_SHOTS_AGAINST / max(shotsAgainstPerMatch, 0.01))
xgAgainstIndex    = 100 * (BASELINE_XG_AGAINST / max(xgAgainstPerMatch, 0.01))
gaIndex           = 100 * (BASELINE_XG_AGAINST / max(mean(goalsAgainst), 0.01))

raw = 0.40 * shotsAgainstIndex + 0.40 * xgAgainstIndex + 0.20 * gaIndex
DefenseRating = clamp(shrink(raw, BASELINE_DEFENSE, windowMatches), 0, 100)
```

### 6.4 `Momentum` (home/away)

Map results most-recent-first with weights `w_i = MOMENTUM_DECAY^i`, points `W=1`, `D=0`, `L=-1`:

```text
Momentum = clamp( sum(w_i * points_i) / sum(w_i), -1, 1 )
```

### 6.5 `HomeAdvantage` (match-level)

Slice-1 uses competition baseline constant because `HOME_AWAY_SPLITS` is out of scope:

```text
HomeAdvantage = DEFAULT_HOME_ADVANTAGE
```

Explanation must state that the value is the slice baseline, not derived splits.

### 6.6 `H2hLean` / `H2hSampleSize` (optional, slice 1.1)

Present only when `HEAD_TO_HEAD` evidence is present and valid.

Map each meeting to points `W=1`, `D=0`, `L=-1` from the current home side’s perspective:

```text
raw = mean(points)
H2hLean = clamp(shrink(raw, 0, sampleSize), -1, 1)
H2hSampleSize = sampleSize
```

### 6.7 Market features (optional, slice 1.2)

Present only when `ODDS` evidence is present and valid.

```text
rawH = 1 / homeOdds
rawD = 1 / drawOdds
rawA = 1 / awayOdds
sum  = rawH + rawD + rawA

marketImpliedHome = rawH / sum
marketImpliedDraw = rawD / sum
marketImpliedAway = rawA / sum
marketLean = clamp(marketImpliedHome - marketImpliedAway, -1, 1)
```

Explanations must label these as market signals, not outcome forecasts.

### 6.8 Feature bundle output

```text
FeatureBundle {
  featureModelVersion
  matchId
  features[]
  evidenceRefs[]
  checksum
  status
}
```

Missing `TEAM_FORM` or `STATISTICS` for a side → that side’s Attack/Defense/Momentum are absent; bundle status becomes `degraded` or `blocked` according to §11.

---

## 7. Rule Specification (`ruleModelVersion = rule.v2.slice1`)

Rules consume FeatureBundle values only. They emit findings; they do not compute 1X2 probabilities.

### 7.1 Thresholds

| Constant | Value |
|---|---|
| `τ_attack` | `8` |
| `τ_mom` | `0.25` |
| `τ_home` | `0.30` |
| `τ_h2h` | `0.20` |
| `n_min_h2h` | `3` |
| `τ_market` | `0.08` |

### 7.2 Rules

| Rule | Match when | Weight | Channel hint |
|---|---|---|---|
| `HOME_ATTACK_EDGE` | `AttackRating_home - DefenseRating_away ≥ τ_attack` | `0.70` | home+ |
| `AWAY_ATTACK_EDGE` | `AttackRating_away - DefenseRating_home ≥ τ_attack` | `0.70` | away+ |
| `MOMENTUM_HOME` | `Momentum_home - Momentum_away ≥ τ_mom` | `0.45` | home+ |
| `MOMENTUM_AWAY` | `Momentum_away - Momentum_home ≥ τ_mom` | `0.45` | away+ |
| `HOME_ADVANTAGE_MATERIAL` | `HomeAdvantage ≥ τ_home` | `0.55` | home+ |
| `H2H_SUPPORTS_HOME` | `H2hLean ≥ τ_h2h` and `H2hSampleSize ≥ n_min_h2h` | `0.25` | home+ |
| `H2H_SUPPORTS_AWAY` | `H2hLean ≤ -τ_h2h` and `H2hSampleSize ≥ n_min_h2h` | `0.25` | away+ |
| `MARKET_LEAN_HOME` | `marketLean ≥ τ_market` | `1.00` | none (finding only) |
| `MARKET_LEAN_AWAY` | `marketLean ≤ -τ_market` | `1.00` | none (finding only) |

Market rules never enter the football softmax adjustment.

Status mapping for this slice:

- condition true → `PASS` / matched finding;
- condition false with all required features present → `FAIL` / not matched;
- required feature absent → `inapplicable` equivalent recorded as non-PASS with explicit explanation (implementation may extend status enum; must not treat missing as false success).

Each result includes: rule id/version, status, weight, explanation, source feature ids, evaluatedAt.

### 7.3 Presence rules

Existing presence rules may remain for fixture identity checks. They are not used as football lean evidence and must not drive recommendation.

---

## 8. Projection Specification (`projectionModelVersion = projection.v2.slice1`)

### 8.1 Expected goals (`xgModelVersion = xg.v2.slice1`)

Constants:

| Constant | Value |
|---|---|
| `λ0` | `1.30` |
| `HOME_ATTACK_SHARE` | `0.60` |
| `AWAY_SUPPRESS_SHARE` | `0.40` |
| `λ_min` | `0.05` |
| `λ_max` | `5.0` |

```text
attackHome = AttackRating_home / 50
defenseAway = DefenseRating_away / 50
attackAway = AttackRating_away / 50
defenseHome = DefenseRating_home / 50

homeFactor = 1 + HOME_ATTACK_SHARE * HomeAdvantage
awayFactor = 1 - AWAY_SUPPRESS_SHARE * HomeAdvantage

λh = clamp(λ0 * attackHome / max(defenseAway, 0.05) * homeFactor, λ_min, λ_max)
λa = clamp(λ0 * attackAway / max(defenseHome, 0.05) * awayFactor, λ_min, λ_max)
```

No rest/travel/weather/availability modifiers in slice 1.

### 8.2 Probability / scoreline model (`probabilityModelVersion = independent_poisson.v1`)

Goal cap `G_max = 6`.

```text
P(H=i) = e^{-λh} * λh^i / i!
P(A=j) = e^{-λa} * λa^j / j!
M[i][j] = P(H=i) * P(A=j)   for i,j in 0..G_max
```

Normalize the truncated matrix so `sum(M) = 1` and record truncation mass before normalization in appendix diagnostics.

```text
pHome = Σ_{i>j} M[i][j]
pDraw = Σ_{i=j} M[i][j]
pAway = Σ_{i<j} M[i][j]
```

Invariants:

- `pHome + pDraw + pAway = 1 ± 1e-9`
- all probabilities finite and in `[0, 1]`
- top scorelines are the three largest `M[i][j]` with stable tie-break: lower `i+j`, then higher `i`, then lower `j`

### 8.3 Goal ranges

```text
P(0-1) = Σ_{i+j ≤ 1} M[i][j]
P(2-3) = Σ_{2 ≤ i+j ≤ 3} M[i][j]
P(4+)  = Σ_{i+j ≥ 4} M[i][j]
```

### 8.4 Rule channel adjustments (bounded)

After matrix aggregation, apply a small logit adjustment from matched football rules, then renormalize:

```text
homeSignal = sum(weight of matched home+ rules)
awaySignal = sum(weight of matched away+ rules)
delta = 0.08 * (homeSignal - awaySignal)
pHome', pDraw', pAway' = softmax_adjust((pHome,pDraw,pAway), delta on home vs away)
```

Exact `softmax_adjust` must be pure and golden-tested. Draw receives residual mass after home/away adjustment so probabilities remain a simplex.

Scorelines for display remain the pre-adjustment matrix in slice 1, and appendix must mark:

```text
scorelinesBasis = pre_rule_adjustment
oneXTwoBasis = post_rule_adjustment
```

This explicit inconsistency mark is required by document 31’s consistency rule when post-matrix 1X2 adjustment is used.

### 8.5 Confidence (`confidenceModelVersion = confidence.v2.slice1`)

```text
C = presentRequiredEvidenceWeight / requiredEvidenceWeight
S = mean([
  abs(AttackRating_home-50)/50,
  abs(AttackRating_away-50)/50,
  abs(DefenseRating_home-50)/50,
  abs(DefenseRating_away-50)/50,
  abs(Momentum_home),
  abs(Momentum_away),
  HomeAdvantage
])
A = alignedWeight / max(totalFootballRuleWeight, ε)
X = 1 if both HOME_ATTACK_EDGE and AWAY_ATTACK_EDGE matched else 0;
    += 0.5 if both MOMENTUM_HOME and MOMENTUM_AWAY matched

confidenceRaw = 0.35*A + 0.30*C + 0.35*S
confidence = clamp(confidenceRaw * (1 - 0.50*X), 0, 0.95)
```

If any required evidence missing: `confidence ≤ 0.40` and recommendation gate prefers `insufficient_evidence`.

### 8.6 Recommendation (`recommendationPolicyVersion = recommendation.v2.slice1`)

Ordered gates:

1. If required evidence missing or `confidence < 0.40` → `insufficient_evidence`
2. Else if market lean conflicts with directional football lean (`lean_home` vs `MARKET_LEAN_AWAY`, or `lean_away` vs `MARKET_LEAN_HOME`) → `cautious` and record an explicit limitation
3. Else if `confidence < 0.55` or `A < 0.50` or `X ≥ 1` → `cautious`
4. Else if `pHome` is max and `pHome - second ≥ 0.08` → `lean_home`
5. Else if `pAway` is max and `pAway - second ≥ 0.08` → `lean_away`
6. Else if `pDraw` is max and `pDraw - second ≥ 0.05` → `lean_draw`
7. Else → `cautious`

Slice 1 does not emit `high_scoring` / `low_scoring` codes.

Slice 1.2 does not blend market-implied probabilities into model `pHome`/`pDraw`/`pAway`.

### 8.7 Calibration consumption (slice 1.3)

Statistics owns calibration artifacts. Analysis consumes an **exact pinned** artifact reference and must not train, refresh, or approve a map during a match run.

Slice 1.3 ships only:

| Field | Value |
|---|---|
| `calibrationArtifactId` | `calibration:identity:v1` |
| `calibrationModelVersion` | `calibration.v1.identity` |
| `map` | identity (probabilities unchanged after renormalization) |
| `status` | `uncalibrated_baseline` |
| `qualified` | `false` |

Projection records artifact id/version/status/checksum/qualified and applies `applyCalibration` after rule adjustment. Identity maps do not claim predictive calibration.

### 8.8 Projection bundle

```text
DeterministicMatchProjection {
  projectionModelVersion
  xgModelVersion
  probabilityModelVersion
  confidenceModelVersion
  recommendationPolicyVersion
  matchId
  lambdaHome, lambdaAway
  pHome, pDraw, pAway
  topScorelines[3]
  goalRange
  confidence + components
  recommendation + limitations
  calibrationArtifactId + calibrationModelVersion + calibrationStatus + calibrationChecksum + calibrationQualified
  ruleEvaluationRefs
  featureBundleRef
  checksum
  status
}
```

---

## 9. Report Specification (`reportSchemaVersion = report.v2.slice1`)

### 9.0 Narrative attachment (slice 1.4)

After the deterministic report body is sealed, Prompt composition may build a narrative prompt manifest from exact sealed projection fields. A local deterministic narrator may produce an `inference` draft that:

- copies sealed 1X2 / recommendation / limitations / matched findings into prose;
- records `promptManifestId` / checksum / provider id;
- never invents or alters probabilities, λ, scorelines, confidence, or recommendations.

Network AI providers are out of scope for this slice.

### 9.1 Assembly rules

Report assembly copies FeatureBundle, RuleEvaluationSet, and DeterministicMatchProjection. It may:

- order sections;
- count matched rules;
- compute content checksum over canonical JSON.

It must not recalculate λ, probabilities, scorelines, confidence, or recommendation.

### 9.2 Minimum DTO sections

| Section | Required fields |
|---|---|
| Metadata | reportId, matchId, generatedAt, schema/assembler versions, status |
| Overview | teams, competition, kickoff, headline lean from recommendation/1X2, confidence |
| Features | all slice features with values/explanations |
| Rules | all football rule results |
| Projection | λh/λa, 1X2, top3, goalRange |
| Confidence | scalar + A/C/S/X + clamps |
| Recommendation | code + limitations + policy version |
| Appendix | model versions, checksums, truncation mass, oneXTwoBasis/scorelinesBasis |

### 9.3 Compatibility with current report

Current `AnalysisReport` (`summary`, `features`, `rules`) may be preserved as a compatibility view or replaced by an additive `deterministic` field. The slice must not break existing tests without updating them in the same change set.

Preferred shape for this slice:

```text
AnalysisReport {
  ...existing fields...
  deterministic?: DeterministicReportV2Slice1
}
```

---

## 10. API and Presentation

### 10.1 API

Reuse `POST /api/analyze/match/:matchId`.

- Controllers validate/transport only.
- No formulas in `apps/api`.
- OpenAPI/DTO updates are allowed for new fields.

### 10.2 Workspace

- Render deterministic projection fields when present.
- Replace placeholder winner/confidence derivation where those fields exist.
- Do not compute Poisson/xG in `apps/web`.

### 10.3 Analysis Session

- May remain timer-based for this slice.
- Must not claim real stage completion unless wired to orchestration events later.

### 10.4 Library

- May continue local history.
- If storing new fields, store report-provided values only.

---

## 11. Failure Semantics

| Condition | Feature | Rules | Projection | Report |
|---|---|---|---|---|
| Missing MATCH_INFO | blocked/failed | skipped | blocked | blocked |
| Missing TEAM_FORM or STATISTICS | degraded/blocked | inapplicable/skipped as needed | blocked | blocked |
| Non-finite feature/projection math | failed | skipped | failed | blocked |
| Rule evaluator defect | ok | failed | blocked | blocked |
| Projection success, assembly defect | ok | ok | ok | failed |

No silent empty-success conversion.

---

## 12. Testing and Acceptance Evidence

### 12.1 Required unit/golden tests

1. Feature golden fixtures for at least two matches with hand-calculated ratings/momentum.
2. Rule threshold boundary tests (`τ ± epsilon`).
3. Poisson matrix invariants and top-3 ordering.
4. Goal-range partition sums to 1.
5. Recommendation gate ordering.
6. Report assembly does not alter projection numbers.
7. Missing STATISTICS blocks projection.
8. Deterministic replay: same inputs → identical checksums.

### 12.2 Commands

From repository root, after implementation:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm validate
```

All must pass.

### 12.3 Manual acceptance

1. Analyze a demo match with form/statistics fixtures.
2. Workspace shows non-placeholder λh/λa, 1X2, top scorelines, goal range, recommendation.
3. Re-run yields identical projection checksum.
4. Remove STATISTICS fixture → blocked/insufficient path is explicit.

---

## 13. Delivery Sequence Inside the Slice

1. Extend fixtures for `TEAM_FORM` and `STATISTICS`.
2. Implement Feature model v2 slice extractors/tests.
3. Implement five football rules/tests.
4. Implement projection pure functions/tests.
5. Extend Analysis orchestration to call projection.
6. Extend Report assembly/DTO.
7. Wire API DTO.
8. Minimal Workspace mapping.
9. Full validation gate.

No parallel speculative packages.

---

## 14. Remaining Gate Before Coding

| Gate item | Status |
|---|---|
| VA planning acceptance (document 34 §11.1) | Done for planning |
| Canonical amendments: `02`, `04`, `14`, `17` | Done |
| Light touch `07_RULE_ENGINE.md` feature-input / non-probability boundary | Done |
| Architecture review of dependency direction and no duplicate computation | Done — see §14.1 |
| Explicit implementation authorization for this slice | Done — authorized to implement this specification |

### 14.1 Architecture review (slice-1)

| Check | Result |
|---|---|
| Governed engine count remains seven | Pass — no new engine packages |
| Dependency direction | Pass — Evidence → `@fas/feature` → `@fas/rule` → `@fas/analysis` (projection) → `@fas/report` (assembly) → API → Web |
| Duplicate computation | Pass — projection owned by Analysis; Report assembles only; Web maps only; Rule emits findings, not 1X2 |
| Statistics boundary | Pass for slice-1 projection math; slice 1.3 adds pinned identity calibration artifact consumption only |
| ADR required | Pass — no system-shape change; canonical amendments already applied |
| Package placement | Pass — reuse `@fas/feature`, `@fas/rule`, `@fas/report`, `@fas/analysis` |

This specification is now an authorized build order for the first vertical slice.

---

## 15. Out of Scope

- Any code change performed solely because this file exists;
- Live OpenAI/network provider SDKs (slice 1.4 uses local deterministic narrator only);
- Statistics population metric refresh / trained calibration maps;
- Broad Evidence catalog expansion;
- Frontend redesign;
- New infrastructure;
- Claiming predictive accuracy;
- Creating new governed engines.

---

## 16. Traceability

| Spec section | Upstream design |
|---|---|
| Features | Document 30 §2 (subset) |
| Rules | Document 30 §3 (subset) |
| Projection | Document 31 §§2–6 (independent Poisson path) |
| Report assembly | Document 32 |
| Stage statuses / replay pins | Document 33 |
| Ownership / no new engines | Document 34 |

Exact coefficients in this document pin slice-1 behavior and supersede vague ranges in 30/31 for implementation of this slice only.

---

## 17. Outcome

When this specification is approved and the §14 gate is closed, the next work is implementation of the first deterministic football vertical slice—not additional platform concept documents.

This document alone is not an implementation gate.
