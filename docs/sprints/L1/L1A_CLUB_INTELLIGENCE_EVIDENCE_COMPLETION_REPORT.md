# L1A — Club Intelligence Evidence Completion Report

| Field | Value |
|---|---|
| Sprint | **L1A** Club Intelligence Evidence |
| Date | 2026-07-23 |
| Authority | Architecture Freeze v0.3 · B2 Coding Law · P0 Provider Review · DA Domain Architecture |
| Scope | Production Evidence path only (Provider → Normalizer → Evidence → Workspace → Report) |
| Explicit exclusions | Features · Rules · Projection · Confidence · Evaluation · Evaluation History · DB schema · Engines · architecture redesign |

---

## 1. Completion Report

L1A delivers first-class `CLUB_INTELLIGENCE` Evidence for provider-backed club facts:

- League rank / points / W-D-L / goals / goal difference
- Home and away records when `/standings` supplies splits
- Current form string and promotion/relegation description when present
- Manager name + optional tenure (from `/coachs` career start, or lineup coach name fallback)

Metrics are mapped only when the provider supplies them. Unavailable values remain honest absence. No Features, Rules, Confidence, or Projection changes.

---

## 2. Files changed

### Provider (`@fas/provider-football`)

- `src/domain/football-club-intelligence.ts` (new)
- `src/domain/football-models.ts` — standing splits + `clubIntelligence` on bundle
- `src/mapper/map-api-football-standings.ts` — home/away/form/description/goalsDiff
- `src/mapper/map-api-football-coach.ts` (new)
- `src/mapper/map-club-intelligence-from-standings.ts` (new)
- `src/mapper/to-evidence-match.ts`
- `src/live/live-api-sports-match-catalog.ts` — `/coachs` + Club Intelligence assembly
- `src/recorded/recorded-football-catalog.ts`
- `src/index.ts`
- `fixtures/match-bundles-k-league.json` — richer standings + managers for `football:100001`
- `test/club-intelligence-mapper.spec.ts` (new)
- `test/live-api-sports-match-catalog.spec.ts` — `/coachs` mock
- `test/match-result-mapper.spec.ts`

### Evidence / Normalizer

- `packages/evidence/src/domain/evidence.ts` — `CLUB_INTELLIGENCE` type
- `packages/evidence/src/provider/default-registry.ts` — coach ingestImplemented
- `packages/evidence/test/evidence.spec.ts`
- `packages/evidence/test/provider-registry.spec.ts`
- `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts`
- `packages/evidence-normalizer/test/club-intelligence-evidence.spec.ts` (new)

### API / Web / Docs

- `apps/api/src/http-response.dto.ts`
- `apps/web/src/types/evidence.ts`
- `apps/web/src/types/explainable-report.ts`
- `apps/web/src/lib/explainable-report.ts`
- `apps/web/src/components/explainable-report/club-intelligence-evidence.tsx` (new)
- `apps/web/src/components/explainable-report/explainable-match-report.tsx`
- `apps/web/src/components/explainable-report/evidence-timeline.tsx`
- `apps/web/src/copy/zh.ts`
- `docs/50_EVIDENCE_CATALOG.md`
- `docs/PROJECT_STATE.md`
- `docs/PROJECT_INDEX.md`
- `docs/sprints/L1/L1A_CLUB_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md` (this file)

---

## 3. Provider coverage

| Source | Coverage |
|---|---|
| Live API-Football `/standings` | Rank, points, W/D/L, GF/GA, goalsDiff, form, description, home/away splits when present |
| Live API-Football `/coachs?team=` | Manager name; tenure days when current career `start` is present |
| Live `/fixtures/lineups` coach block | Manager name fallback when `/coachs` empty |
| Recorded cassette `football:100001` | Both sides with standings depth + manager facts |

Never invents standings rows, form strings, promotion status, or manager tenure.

---

## 4. Club Evidence mapped

Evidence type: `CLUB_INTELLIGENCE`

Each record preserves:

- Provider provenance (`source`, `sourceId`, `method`, collector)
- Timestamp (`observedAt`, Evidence intake timestamps)
- Competition / season
- Team identity + home/away side
- Window (`season` | `current`)
- Metric set (only present keys): leagueRank, leaguePoints, goalDifference, goalsScored/Conceded, wins/draws/losses/played, home/away splits, currentForm, promotionRelegationStatus, managerName/StartDate/TenureDays

---

## 5. Workspace impact

- New Workspace section: **俱乐部情报 / Club Intelligence**
- Separated from derived Feature Importance (Football Intelligence)
- Honest absence copy when no Club Evidence

---

## 6. Report impact

- Report displays Club Intelligence Evidence values and provenance
- Evidence timeline includes `CLUB_INTELLIGENCE`
- Copy states Evidence-only posture: no interpretation, scoring, or prediction

---

## 7. Tests added

- `packages/provider-football/test/club-intelligence-mapper.spec.ts`
- `packages/evidence-normalizer/test/club-intelligence-evidence.spec.ts`
- Evidence type registry + provider registry coach ingest updates

---

## 8. Quality Gates

```bash
pnpm quality
pnpm typecheck
pnpm build
pnpm --filter @fas/provider-football --filter @fas/evidence --filter @fas/evidence-normalizer --filter @fas/web --filter @fas/feature --filter @fas/rule --filter @fas/analysis --filter @fas/report test
```

**Result (2026-07-23):**

- `pnpm quality` — passed
- `pnpm typecheck` — passed
- `pnpm build` — passed
- L1A-scoped package tests — passed (provider-football 39, evidence-normalizer 52, evidence, web 38, feature/rule/analysis/report unchanged green)

Full `pnpm validate` additionally requires a live Postgres for `@fas/database` evidence-repository suite; that suite failed in this environment when DB was unavailable and is outside L1A scope (no schema changes).

---

## 9. Remaining limitations

- Club Intelligence requires a standings row for the side; missing row → honest absence
- Live season coverage varies by league `coverage` / plan depth
- Manager tenure requires `/coachs` career start for the current club
- No Feature, Rule, Confidence, or Projection integration (reserved for L1B)
- No financial / squad investment Facts (deferred; new provider)

---

## 10. Recommended next sprint

**L1B** — Transform `CLUB_INTELLIGENCE` Evidence into deterministic Club Strength Features and integrate them into Rule, Confidence, and Projection (honest absence when Club Evidence is missing).

---

*End of L1A Completion Report.*
