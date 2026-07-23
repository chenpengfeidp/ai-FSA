# A1 — Prediction Evaluation Framework Completion Report

| Field | Value |
|---|---|
| Sprint | **A1** Prediction Evaluation Framework |
| Date | 2026-07-19 |
| Authority | Architecture Freeze v0.3 · B2 Coding Law · D0 Expansion Roadmap · doc 40 |
| Scope | Deterministic evaluation of sealed predictions vs actual match outcomes |
| Explicit exclusions | Projection redesign · Feature/Rule/Confidence changes · Calibration · ML · Engines · architecture redesign |

---

## 1. Completion Report

A1 closes the prediction loop with a pure measurement path:

```text
Sealed Prediction  +  MATCH_RESULT (Actual)  →  PredictionEvaluationRecord
```

Evaluation never mutates Projection, Features, Rules, Confidence, or sealed Analysis history. When `MATCH_RESULT` Evidence is absent (pre-match / unfinished), Workspace shows honest absence for Actual Result and Evaluation.

---

## 2. Files changed

### Evidence / Provider / Normalizer

- `packages/evidence` — `MATCH_RESULT` Evidence type
- `packages/provider-football` — `FootballCompletedScore`, FT goals mapping, `matchResult` shape
- `packages/evidence-normalizer` — `parseMatchResult` → `MATCH_RESULT` Evidence

### Statistics / Analysis / Report

- `packages/statistics` — ActualMatchResult, evaluatePrediction, demo population, summarize
- `packages/analysis` — `buildSealedPredictionInput`, `EvaluatePredictionUseCase`
- `packages/report` — optional `actualResult` / `evaluation` on AnalysisReport

### API / Web / Docs

- `apps/api` — swagger optional Actual/Evaluation fields; Evidence type list
- `apps/web` — Evaluation + Actual Result Workspace sections; zh copy; DTOs
- `docs/50_EVIDENCE_CATALOG.md`, `docs/PROJECT_STATE.md`, this report

---

## 3. Evaluation metrics implemented

| Metric | Definition |
|---|---|
| Winner Hit | Argmax(1X2) equals actual winner |
| Score Hit | Top sealed scoreline equals FT score |
| Goal Hit | Most-likely scenario total goals equals actual total |
| Goal Range Hit | Predicted modal bucket (`01` / `23` / `4+`) equals actual bucket |
| Scenario Hit | Exact scoreline hit for Most Likely / Alternative / Upset (+ any) |
| Confidence Correctness | High confidence (≥70 or high/very_high band) → correct/incorrect; else `not_claimed` |
| Rule Coverage | Applicable PASS/FAIL counts + agreement ratio |
| Feature Coverage | Core football Feature presence ratio |
| Paper unit return | +1/−1 on predicted winner (research framing; non-advice disclaimer) |

Blocked / failed projections are **excluded** with an explicit reason.

---

## 4. Actual-result mapping

| Layer | Contract |
|---|---|
| Provider | `FootballFixture.completedScore` only when `status === FINISHED` and FT goals present |
| Evidence shape | `matchResult` on fixture normalize input |
| Evidence type | `MATCH_RESULT` payload: score, winner, totalGoals, competition*, matchStatus, observedAt |
| Canonical domain | `@fas/statistics` `ActualMatchResult` (+ provider provenance fields) |

Missing scores / unfinished matches → no `MATCH_RESULT` (honest absence).

---

## 5. Workspace / Report impact

Report and Workspace clearly separate:

1. **Prediction** — existing sealed Projection / scenarios / recommendation  
2. **Actual Result** — FT score, winner, totals, competition, provenance  
3. **Evaluation** — hit metrics, coverage, paper return disclaimer  

When Actual is unavailable, Evaluation is also unavailable (not empty success).

---

## 6. Tests added

- `packages/statistics/test/evaluation.spec.ts`
- `packages/evidence-normalizer/test/match-result-evidence.spec.ts`
- `packages/provider-football/test/match-result-mapper.spec.ts`
- `packages/analysis/test/evaluate-prediction-use-case.spec.ts`
- Report builder asserts absent Actual/Evaluation when no `MATCH_RESULT`

Demo population `EVALUATION_POPULATION_DEMO_V1` scores end-to-end without spreadsheets.

---

## 7. Quality Gates

Run from repository root:

```bash
pnpm validate
```

---

## 8. Remaining limitations

- No durable evaluation history store / leaderboard API yet (in-report overlay + demo population)
- Cassette fixtures remain mostly `SCHEDULED` (no FT scores) — evaluation appears when `MATCH_RESULT` is imported
- Paper ROI is unit ±1 only (no odds-based research ROI)
- Calibration still identity / demo candidate — **not** Evaluation-qualified (A2)
- Rule set version pin is not yet threaded into sealed evaluation input

---

## 9. Recommended next sprint

**A2 — Calibration** using historical A1 evaluation results under human/Evaluation governance (no auto-activation).
