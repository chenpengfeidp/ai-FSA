# M1A — Manager Intelligence Evidence Completion Report

| Field | Value |
|---|---|
| Sprint | **M1A** Manager Intelligence Evidence |
| Date | 2026-07-24 |
| Authority | Architecture Freeze v0.3 · B2 Coding Law · `docs/architecture/FOOTBALL_INTELLIGENCE_V2_DOMAIN_ARCHITECTURE.md` (DA, Wave 2 L1 Manager track) · `docs/sprints/O1/O1_FOOTBALL_INTELLIGENCE_CONTRIBUTION_COMPLETION_REPORT.md` |
| Scope | Production Evidence path only (Provider → Normalizer → Evidence → Workspace → Report) |
| Explicit exclusions | Features · Rules · Confidence · Projection · Evaluation · Calibration · Validation · Contribution · DB schema · Engines · DTO redesign · architecture redesign |

---

## 1. Completion Report

M1A delivers first-class `MANAGER_INTELLIGENCE` Evidence for provider-backed manager facts, decoupled from `CLUB_INTELLIGENCE` (which previously nested only a manager name/tenure inside club metrics):

- Manager identity: id, name, nationality, age (from API-Football `/coachs`)
- Career facts: appointment date and tenure days for the current club, previous clubs from career history
- Match-day confirmation: cross-references the season-level `/coachs` profile against the match lineup's coach name; when they disagree (caretaker/interim scenario), emits a minimal confirmed identity instead of misattributing career facts to the wrong person
- Honest absence for `interimManagerStatus`: the provider never supplies this field, so it is always omitted rather than inferred

No Features, Rules, Confidence, or Projection changes. `CLUB_INTELLIGENCE` metrics and mapping are unchanged.

---

## 2. Files changed

### Provider (`@fas/provider-football`)

- `src/domain/football-manager-intelligence.ts` (new) — `FootballManagerIntelligenceSide`, `FootballManagerIntelligenceRecord`
- `src/domain/football-models.ts` — `managerIntelligence` on `FootballMatchBundle`
- `src/mapper/map-api-football-manager-intelligence.ts` (new) — `/coachs` + lineup coach cross-reference mapper
- `src/mapper/to-evidence-match.ts` — `toManagerIntelligenceShape`
- `src/live/live-api-sports-match-catalog.ts` — `/coachs` fetch + `managerIntelligence` assembly; `findLineupCoachName` helper
- `src/recorded/recorded-football-catalog.ts` — parses `managerIntelligence[]` from cassette JSON; honest fallback from legacy `managers[]` (name/start/tenure only, `matchManagerConfirmed: false`) when a cassette has no dedicated array
- `src/index.ts` — exports new domain types + mapper
- `fixtures/match-bundles-k-league.json` — `managerIntelligence` for both sides of `football:100001`
- `test/manager-intelligence-mapper.spec.ts` (new)
- `test/match-result-mapper.spec.ts` — bundle fixture updated with empty `managerIntelligence`

### Evidence / Normalizer

- `packages/evidence/src/domain/evidence.ts` — `MANAGER_INTELLIGENCE` EvidenceType
- `packages/evidence/test/evidence.spec.ts` — type list updated
- `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts` — `parseManagerIntelligence`
- `packages/evidence-normalizer/test/manager-intelligence-evidence.spec.ts` (new)

### API / Web / Docs

- `apps/api/src/http-response.dto.ts` — `MANAGER_INTELLIGENCE` added to the Evidence type enum
- `apps/api/test/import-evidence-workflow.spec.ts` — provenance test for the recorded K League match
- `apps/web/src/types/evidence.ts` — `MANAGER_INTELLIGENCE` type
- `apps/web/src/types/explainable-report.ts` — `ManagerIntelligenceRecordView`, `ManagerIntelligenceContextView`
- `apps/web/src/lib/explainable-report.ts` — `mapManagerIntelligenceRecord`, `buildManagerIntelligenceContext`, EVIDENCE_TITLES entry
- `apps/web/src/components/explainable-report/manager-intelligence-evidence.tsx` (new)
- `apps/web/src/components/explainable-report/explainable-match-report.tsx` — new Workspace section, positioned after Club Intelligence
- `apps/web/src/copy/zh.ts` — Manager Intelligence copy
- `apps/web/test/explainable-report.spec.tsx` — evidence fixture, view-builder assertions, render assertions, honest-absence test
- `docs/50_EVIDENCE_CATALOG.md`
- `docs/PROJECT_STATE.md`
- `docs/PROJECT_INDEX.md`
- `docs/sprints/M1/M1A_MANAGER_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md` (this file)

---

## 3. Provider coverage

| Source | Coverage |
|---|---|
| Live API-Football `/coachs?team=` | Manager id/name/nationality/age; current-club appointment date + tenure days from career `start`; previous clubs from career history |
| Live `/fixtures/lineups` coach block | Match-day coach name for cross-confirmation; sole source when `/coachs` is empty (minimal confirmed record, `matchManagerConfirmed: true`) |
| Recorded cassette `football:100001` | Both sides with full identity, nationality, age, appointment date, tenure, previous clubs, `matchManagerConfirmed: true` |
| Recorded cassettes without a dedicated `managerIntelligence[]` array | Honest fallback from legacy `managers[]` (name/start/tenure only); `matchManagerConfirmed: false` since no lineup cross-reference is available |

Never invents `interimManagerStatus` — always absent since neither `/coachs` nor lineups expose it. Never attributes `/coachs` career facts to a caretaker whose lineup name disagrees with the season profile (falls back to a minimal record with only the confirmed name).

---

## 4. Manager Evidence mapped

Evidence type: `MANAGER_INTELLIGENCE`

Each record preserves:

- Provider provenance (`source`, `sourceId`, `provenance.method`, collector)
- Timestamp (`observedAt`, Evidence intake timestamps)
- Competition / season (when supplied)
- Team identity + home/away side
- Manager identity: `managerName` (required), `managerId`, `nationality`, `age`
- Career facts: `appointmentDate`, `tenureDays`, `previousClubs`
- Match-day fact: `matchManagerConfirmed` (boolean, required)
- `interimManagerStatus` — reserved field, always absent from this provider (honest absence; never fabricated)

---

## 5. Workspace impact

- New Workspace section: **教练情报 / Manager Intelligence**, positioned directly after Club Intelligence and before Match Context
- Visually separated from derived Feature Importance (Football Intelligence)
- Displays match-day confirmation badge (confirmed vs. unconfirmed), provenance, and honest-absence copy when no Manager Evidence exists

---

## 6. Report impact

- Report displays Manager Intelligence Evidence values, provenance, and match-manager confirmation status
- Evidence timeline includes `MANAGER_INTELLIGENCE`
- Copy states Evidence-only posture: no interpretation of manager quality or tactical ability

---

## 7. Tests added

- `packages/provider-football/test/manager-intelligence-mapper.spec.ts` — identity mapping, match-day confirmation, caretaker/minimal-record handling, honest absence, recorded-cassette Evidence emission
- `packages/evidence-normalizer/test/manager-intelligence-evidence.spec.ts` — payload validation, honest-absence handling, rejection of missing required fields
- `packages/evidence/test/evidence.spec.ts` — `MANAGER_INTELLIGENCE` type registered
- `apps/api/test/import-evidence-workflow.spec.ts` — end-to-end provenance assertion via `/api/evidence/match/football:100001`
- `apps/web/test/explainable-report.spec.tsx` — view-builder mapping, honest-absence, and component render assertions

---

## 8. Quality Gates

```bash
pnpm quality
pnpm typecheck
pnpm build
pnpm --filter @fas/provider-football --filter @fas/evidence --filter @fas/evidence-normalizer --filter @fas/web --filter @fas/api --filter @fas/feature --filter @fas/rule --filter @fas/analysis --filter @fas/report test
```

**Result (2026-07-24):**

- `pnpm quality` — passed (Biome format fix applied to newly added provider/normalizer/test files)
- `pnpm typecheck` — passed across all 24 workspace packages
- `pnpm build` — passed
- Scoped package tests — passed (provider-football 57, evidence 38, evidence-normalizer 59, web 42, api 25 passed / 2 skipped, feature 38, rule 32, analysis 16, report 14)

**Notable build-tooling finding:** `@fas/evidence-normalizer` and `@fas/provider-football` resolve as workspace packages via their published `dist/` output (`exports` → `dist/index.js`), not TypeScript source. Editing `packages/evidence/src/domain/evidence.ts` and `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts` without rebuilding left tests silently exercising the stale compiled `dist` (0 `MANAGER_INTELLIGENCE` records instead of the expected 2) even though `pnpm --filter provider-football test` type-checked cleanly. Running `pnpm typecheck`/`pnpm build` (which rebuild every package's `dist` through Turborepo) resolved it; the underlying dist-vs-source resolution behavior is unchanged from prior sprints (same pattern applies to `@fas/evidence`, `@fas/statistics`, etc.) and is noted here only as a validation-order caution for future Evidence-type sprints, not a defect requiring a fix.

Full `pnpm validate` additionally requires a live Postgres for `@fas/database` evidence-repository suite; that suite is outside M1A scope (no schema changes) and behaves the same as in prior sprints.

---

## 9. Remaining limitations

- Manager Intelligence requires either a `/coachs` season profile or a lineup coach name; when both are absent, the record is honestly omitted
- `interimManagerStatus` is a reserved field that can never be populated from API-Football; it will remain permanently absent unless a new provider Fact source is added under a separate governance gate
- Live season coverage varies by league `coverage` / plan depth, same as `CLUB_INTELLIGENCE`
- Caretaker/interim scenarios are detected only by name mismatch between `/coachs` and the lineup; no explicit "caretaker" flag is available from the provider
- No Feature, Rule, Confidence, or Projection integration (reserved for **M1B**)

---

## 10. Recommended next sprint

**M1B** — Transform `MANAGER_INTELLIGENCE` Evidence into deterministic Manager Intelligence Features (e.g. manager tenure stability, match-day confirmation coverage) and integrate them into Rule, Confidence, and Projection (honest absence when Manager Evidence is missing), following the same pattern as L1B (Club Intelligence) and P1B (Player Intelligence).

---

*End of M1A Completion Report.*
