# Prediction Vertical Slice — Readiness Audit — Completion Report

**Sprint id:** PREDICTION_VERTICAL_SLICE_READINESS_AUDIT  
**Roadmap citation:** `docs/40_PRODUCT_ROADMAP.md`  
**Architecture Freeze:** v0.3  
**Completed:** 2026-08-20  
**Type:** Read-only runtime audit (no production code changes)  

---

## 1. Objective

Determine whether the repository can perform a complete real pre-match football analysis from match input, by tracing **actual** implementation paths — not documentation claims.

Target UX: Home Team + Away Team + Fixture → full pipeline → explainable prediction report.

---

## 2. Deliverables

| # | Artifact | Status |
|---|----------|--------|
| 1 | `docs/sprints/PREDICTION_VERTICAL_SLICE/PREDICTION_VERTICAL_SLICE_READINESS_AUDIT.md` | **Complete** |
| 2 | This completion report | **Complete** |
| 3 | `docs/PROJECT_STATE.md` | **Updated** |
| 4 | `docs/PROJECT_INDEX.md` | **Updated** |

---

## 3. Method

- Read governance: `AGENTS.md`, `docs/PROJECT_STATE.md`, `docs/40_PRODUCT_ROADMAP.md`, Architecture Freeze v0.3, completed P2A–P2K / P2J / CAL reports (context).
- Traced runtime wiring: API controllers → `GenerateMatchReportUseCase` → `AnalyzeMatchUseCase` → import/providers → Feature/Rule → projection pin branch → report/narrative.
- Traced provider/evidence domains against `football:100001`, `football:244001`, `match-example` cassettes.
- Ran existing API test battery (no new fixtures): `pnpm --filter @fas/api test -- apps/api/test/import-evidence-workflow.spec.ts` — **30/30 passed**.

**No production code modified.** No calibration tuning. No Candidate 1 promotion. No P2K-CAL-3.

---

## 4. Findings summary

### Verdict: **PARTIAL**

| Area | Result |
|------|--------|
| End-to-end analyze with known `matchId` (recorded) | **YES** |
| Home + Away team name input without `matchId` | **NO** |
| Production API uses Projection V2 (State / Script / Unified Matrix) | **NO** — `projectionPolicyPin` defaults to `"v1"` in `apps/api/src/evidence.module.ts` |
| P2A–P2G implementation in repository | **YES** — active under V2 pin in replay/validation/tests |
| BTTS / O-U in match report API | **NO** — matrix computes; not exposed in report contract |
| Rosenborg vs Fredrikstad (default recorded mode) | **NO** — not in cassettes; live Eliteserien possible with credentials + upcoming discovery |

### Smallest blocking gap

**Wire production API to `projectionPolicyPin: "v2"`** without changing projection parameter artifacts or calibration definitions.

### Second gap

**Fixture discovery by team names** from upcoming catalog (no new Provider).

---

## 5. Validation evidence

```bash
pnpm --filter @fas/api test -- apps/api/test/import-evidence-workflow.spec.ts
# 30 tests passed — includes football:100001 analyze, match-example ODDS, upcoming board
```

Code review anchors:

- `packages/analysis/src/projection-v2/resolve-projection-policy.ts` — `DEFAULT_PROJECTION_POLICY_PIN = "v1"`
- `apps/api/src/evidence.module.ts` — `AnalyzeMatchUseCase` factory omits V2 pin
- `apps/web/src/copy/zh.ts` — UI documents Football State / Match Script require V2 pin

---

## 6. Promotion / governance

- **No** production artifact changes.
- **No** P2K-CAL-3 authorization inferred.
- **No** Candidate 1 promotion.

---

## 7. Recommended next coding sprint

**PVS-1: Production Projection V2 API Pin & Fixture Discovery**

Concrete scope:

1. Config-governed `projectionPolicyPin: "v2"` in API composition root.
2. Resolver: home/away (+ optional date) → `matchId` via upcoming catalog.
3. Optional: expose BTTS/O-U from unified matrix in report DTO.

**Not recommended next:** P2K-CAL-3 (calibration tuning) until PVS-1 closes the API/runtime wiring gap.

---

## 8. Limitations of this audit

- Did not invoke live API-Sports or The Odds API (no credential requirement in sprint charter).
- Did not mutate Evaluation History or sealed cohorts.
- Population overlays (A2/V1A/O1/P2H/P2I) audited as report attachments, not per-match prediction inputs.
