# I1A — Context Evidence Completion Report

| Field | Value |
|---|---|
| Sprint | **I1A** Context Evidence |
| Date | 2026-07-22 |
| Authority | Architecture Freeze v0.2 · B2 Coding Law · D0 Expansion Roadmap |
| Scope | Production Evidence path only (Provider → Normalizer → Evidence → Workspace → Report) |
| Explicit exclusions | Features · Rules · Projection · Confidence · DB schema · Engines · architecture redesign |

---

## 1. Completion Report

I1A delivers first-class `MATCH_CONTEXT` Evidence for provider-supplied Match Context facts.

- Metrics are mapped only when the provider schedule / fixture payload supplies the underlying facts.
- Unavailable metrics remain honest absence.
- Travel is home/away posture only — never distance/km.
- Knockout / leg / aggregate are mapped only when provider labels clearly supply them.
- Workspace/Report display Context Evidence without interpretation, scoring, or prediction.
- No Context Features, Rules, Confidence, or Projection changes in this sprint.

---

## 2. Files changed

### Provider (`@fas/provider-football`)

- `src/domain/football-match-context.ts` (new)
- `src/domain/football-models.ts` — `FootballMatchBundle.matchContext`
- `src/mapper/map-api-football-match-context.ts` (new)
- `src/mapper/to-evidence-match.ts`
- `src/live/live-api-sports-match-catalog.ts` — past `last=10` + next `next=5` schedule samples
- `src/recorded/recorded-football-catalog.ts`
- `src/index.ts`
- `fixtures/match-bundles-k-league.json` — recorded demo for `football:100001`
- `test/match-context-mapper.spec.ts` (new)
- `test/live-api-sports-match-catalog.spec.ts`

### Evidence / Normalizer

- `packages/evidence/src/domain/evidence.ts` — `MATCH_CONTEXT` type
- `packages/evidence/test/evidence.spec.ts`
- `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts`
- `packages/evidence-normalizer/test/match-context-evidence.spec.ts` (new)

### API / Web / Docs

- `apps/api/src/http-response.dto.ts`
- `apps/web/src/types/evidence.ts`
- `apps/web/src/types/explainable-report.ts`
- `apps/web/src/lib/explainable-report.ts`
- `apps/web/src/components/explainable-report/match-context-evidence.tsx` (new)
- `apps/web/src/components/explainable-report/explainable-match-report.tsx`
- `apps/web/src/components/explainable-report/evidence-timeline.tsx`
- `apps/web/src/copy/zh.ts`
- `docs/50_EVIDENCE_CATALOG.md`
- `docs/PROJECT_STATE.md`
- `docs/sprints/I1/I1A_CONTEXT_EVIDENCE_COMPLETION_REPORT.md` (this file)

---

## 3. Provider coverage

| Source | Coverage |
|---|---|
| Live API-Football `/fixtures?id=` | `league.type`, `league.round`, optional `score.aggregate` → competition kind / knockout / leg / aggregate when labels clear |
| Live `/fixtures?team=&last=10` | Rest days, days since last match, matches in last 7/14 days, fixture congestion (= 7-day count) |
| Live `/fixtures?team=&next=5` | Days until next match when next sample returns rows |
| Fixture venue | Venue city; home/away + travel posture from team side (never km) |
| Recorded cassette `football:100001` | Full demo Context for home and away |
| Other recorded bundles | Honest absence (`matchContext: []`) |

Never estimates rest from form strings alone without schedule dates. Never invents knockout for regular-season rounds. Never fabricates aggregate score.

---

## 4. New Context Evidence mapped

Evidence type: `MATCH_CONTEXT`

Each record preserves:

- Provider provenance (`source`, `sourceId`, `method`, collector)
- Timestamp (`observedAt`, Evidence intake timestamps)
- Competition / season (when supplied)
- Team identity + home/away side
- Match identity
- Context type (`match_context`)
- Metric set (only present keys):
  - `restDays`, `daysSinceLastMatch`, `daysUntilNextMatch`
  - `matchesInLast7Days`, `matchesInLast14Days`, `fixtureCongestion`
  - `homeAwayContext`, `travelContext`, `venueCity`
  - `competitionKind`, `competitionTypeLabel`
  - `isKnockout`, `roundLabel`, `leg`, `aggregateScore`

---

## 5. Workspace impact

- New Workspace section: **Match Context**
- Clearly separate from Feature Importance (derived Football Intelligence)
- Copy states Evidence-only posture: no Context Features in I1A

---

## 6. Report impact

- Report displays provider Context Evidence values and provenance
- Evidence timeline includes `MATCH_CONTEXT` items
- No interpretation, scoring, or prediction from Context

---

## 7. Tests added

- `packages/provider-football/test/match-context-mapper.spec.ts`
- `packages/evidence-normalizer/test/match-context-evidence.spec.ts`
- Live catalog test asserts Context mapping + Evidence normalize
- Existing Evidence type registry test updated for `MATCH_CONTEXT`

---

## 8. Quality Gates

```bash
pnpm validate
```

**Result (2026-07-22):** passed (toolchain, workspace, prisma, biome, boundaries, typecheck, test, build).

---

## 9. Remaining limitations

- Live rest/congestion limited to the `last=10` schedule sample window
- Days-until-next requires a successful `next=` sample; empty next → honest absence
- Travel is posture only (home/away); no distance/travel time
- Knockout/leg/aggregate only when provider round/score labels are unambiguous
- No Feature, Rule, Confidence, or Projection integration

---

## 10. Recommended next sprint

**I1B** — Transform `MATCH_CONTEXT` Evidence into deterministic Football Intelligence Features and integrate them into Rule, Confidence, and Projection (honest absence when Context Evidence is missing).

---

*End of I1A Completion Report.*
