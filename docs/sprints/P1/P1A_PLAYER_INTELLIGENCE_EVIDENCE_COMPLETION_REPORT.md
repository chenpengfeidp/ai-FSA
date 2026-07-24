# P1A — Player Intelligence Evidence Completion Report

| Field | Value |
|---|---|
| Sprint | **Football Intelligence v2 · Wave 2 · P1A** Player Intelligence Evidence |
| Date | 2026-07-24 |
| Authority | Architecture Freeze v0.3 · B2 Coding Law · `docs/reviews/PLAYER_INTELLIGENCE_MVP_SCOPE_REVIEW.md` · `docs/architecture/FOOTBALL_INTELLIGENCE_V2_DOMAIN_ARCHITECTURE.md` (DA) · `docs/sprints/L1/L1B_CLUB_INTELLIGENCE_COMPLETION_REPORT.md` |
| Scope | Production Evidence path only (Provider → Evidence → Workspace → Report) |
| Explicit exclusions | Features · Rules · Confidence · Projection · Evaluation · Evaluation History · DB schema · new Engines · DTO redesign |

---

## 1. Completion Report

P1A extends the existing `PLAYER` Evidence payload with provider-backed Player Intelligence facts, following the same READY-only scope discipline used in L1A/L1B:

- Identity additions: `age`, `captain`
- Availability additions: `availabilityStatus` (`injury` | `suspension`), cross-referenced from existing `INJURY`/`SUSPENSION` Evidence
- Squad-status addition: `matchSquadStatus` (`starting` | `bench`), cross-referenced from existing confirmed `LINEUP` Evidence
- Season statistics addition: `seasonStats` (`appearances`, `starts`, `minutesPlayed`, `rating`, `goals`, `assists`, `yellowCards`, `redCards`, `saves`, `goalsConceded`), sourced from API-Football `/players?id=&season=`

No new Evidence type was introduced — `PLAYER` was already sealed Evidence (F1.1C-1); this sprint only extends its payload shape, honoring the Scope Review's explicit "extend `PLAYER`, do not invent a new type" constraint. `cleanSheets` from the original candidate list was dropped — API-Football does not expose it directly per player, and inventing it from `goalsConceded` would be a derived/fabricated metric, which is forbidden at the Evidence layer.

Season-stats coverage is intentionally **capped** to a small candidate set per side (goalkeeper + top attackers, `selectPlayerStatsCandidates`, default max 6) to respect API-Football free-tier quota, exactly as flagged as a hard constraint in the Scope Review. Players outside the candidate set keep `seasonStats: undefined` — honest absence, never a zero-filled or inferred stat line.

---

## 2. Files changed

### Provider (`@fas/provider-football`)

- `src/domain/football-models.ts` — `FootballMatchSquadStatus`, `FootballPlayerSeasonStats`, `FootballPlayer` extended with `age`, `captain`, `availabilityStatus`, `matchSquadStatus`, `seasonStats`
- `src/mapper/map-api-football-player-stats.ts` (new) — maps `/players?id=&season=` response → `FootballPlayerStatsEnrichment`
- `src/mapper/enrich-player-intelligence.ts` (new) — `selectPlayerStatsCandidates`, `mergePlayerSeasonStats`, `applyAvailabilityAndSquadStatus`
- `src/mapper/map-api-football-squad.ts` — explicit honest-absence `undefined` for new fields prior to enrichment
- `src/mapper/to-evidence-match.ts` — freezes and conditionally spreads new player fields into the Evidence-ready shape
- `src/live/live-api-sports-match-catalog.ts` — capped candidate selection, parallel `/players` calls, merge + cross-reference against Injury/Suspension/Lineup Evidence
- `src/recorded/recorded-football-catalog.ts` — parses and cross-references enriched player fields from the recorded cassette
- `src/index.ts` — exports for the new types/functions
- `fixtures/match-bundles-k-league.json` — enriched sample players with age/captain/seasonStats/availability/aligned lineup ids
- `test/player-intelligence-mapper.spec.ts` (new)
- `test/live-api-sports-match-catalog.spec.ts` — live `/players` + cross-reference coverage
- `test/recorded-football.spec.ts` — recorded-path cross-reference coverage

### Evidence Normalizer

- `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts` — validates/parses `age`, `captain`, `availabilityStatus`, `matchSquadStatus`, `seasonStats` on `PLAYER` payloads
- `packages/evidence-normalizer/test/player-evidence.spec.ts` — new-field acceptance, invalid-enum rejection, honest-absence cases

### Web (Workspace / Report)

- `apps/web/src/types/explainable-report.ts` — `PlayerAvailabilityStatus`, `PlayerMatchSquadStatus`, `PlayerSeasonStatsView`, extended `PlayerContextItemView`
- `apps/web/src/lib/explainable-report.ts` — `mapPlayerEvidence` / `mapPlayerSeasonStats`, updated Player Intelligence note copy
- `apps/web/src/components/explainable-report/player-context.tsx` — renders age/captain/squad-status/availability tags and a season-stats grid with per-row honest absence
- `apps/web/src/copy/zh.ts` — Player Intelligence labels (age, captain, availability, squad status, season-stat rows, no-stats copy)
- `apps/web/test/explainable-report.spec.tsx` — mapping + rendering assertions for the new fields

### Docs

- `docs/50_EVIDENCE_CATALOG.md` — `PLAYER` row and `Player Statistics` row updated to reflect P1A delivery
- `docs/sprints/P1/P1A_PLAYER_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md` (this file)

---

## 3. Provider coverage

| Source | Coverage |
|---|---|
| Live API-Football `/players/squads` | Existing basic identity (id, name, team, position, number, nationality, photo) |
| Live API-Football `/players?id=&season=` | Age, captain flag, season appearances/starts/minutes/rating/goals/assists/cards, GK saves/goalsConceded — capped to selected candidates per side |
| Live API-Football `/injuries?fixture=` (existing) | Cross-referenced into `PLAYER.availabilityStatus` (`injury` \| `suspension`) |
| Live API-Football `/fixtures/lineups` (existing) | Cross-referenced into `PLAYER.matchSquadStatus` (`starting` \| `bench`) |
| Recorded cassette `football:100001` (K League) | Full path exercised: enriched squad + aligned lineup ids + availability cross-reference |

Never fetches or fabricates player xG, expected/probable starting XI, or any branded rating beyond the vendor's own `games.rating`.

---

## 4. Player Evidence mapped

Evidence type: `PLAYER` (unchanged type; extended payload)

Each record preserves:

- Provider provenance (`providerId`, `source`, `sourceId`, collector/method)
- Timestamp (`collectedAt`/`eventTime`/`timestamp`)
- Competition / season (on `seasonStats.competitionId` / `seasonStats.season`)
- Match, team, team side
- Player identity: `playerId`, `name`, `position`, `number`, `age`, `nationality`, `photo`
- `captain` (boolean, when supplied)
- `availabilityStatus` (`injury` \| `suspension`, cross-referenced; absent when neither applies)
- `matchSquadStatus` (`starting` \| `bench`, cross-referenced; absent when no confirmed Lineup Evidence)
- `seasonStats` (appearances, starts, minutesPlayed, rating, goals, assists, yellowCards, redCards, saves, goalsConceded — only present keys; absent entirely for non-candidate players)

---

## 5. Workspace impact

- The existing **球员情报证据 / Player Intelligence Evidence** section (formerly "球员基本信息" / basic squad identity) now surfaces season stats, availability, and match-squad-status tags alongside identity, still visually and structurally separate from any derived Feature/Rule surface (no Player Feature section exists; none was created).
- Honest-absence copy (`playerStatsNone`) renders per player when no season-stat candidate coverage applies, instead of blank rows or invented zeros.

---

## 6. Report impact

- Report (via the shared Workspace component) exposes the extended `PLAYER` Evidence fields with provenance (`evidenceSource(providerId, source, "player")`) unchanged in position/format.
- No player-quality interpretation or impact scoring was added; the section remains a facts display only, per the sprint's explicit "Must NOT" constraints.
- `apps/api/src/http-response.dto.ts` required no change — Evidence payload is already transported as a generic `Record<string, unknown>`, so the new `PLAYER` fields flow through the existing DTO/API contract untouched.

---

## 7. Tests added

- `packages/provider-football/test/player-intelligence-mapper.spec.ts` (new, 10 tests) — stats mapper, candidate selection, merge, availability/squad-status cross-reference
- `packages/provider-football/test/live-api-sports-match-catalog.spec.ts` — extended with live `/players` + cross-reference coverage
- `packages/provider-football/test/recorded-football.spec.ts` — extended with recorded-path cross-reference assertions
- `packages/evidence-normalizer/test/player-evidence.spec.ts` — extended with new-field acceptance, invalid-enum rejection, honest-absence cases
- `apps/web/test/explainable-report.spec.tsx` — extended with view-mapping and rendered-copy assertions for the new Player Intelligence fields

---

## 8. Quality Gates

```bash
pnpm quality
pnpm format
DATABASE_URL=<...> pnpm typecheck
DATABASE_URL=<...> pnpm test
DATABASE_URL=<...> pnpm build
pnpm workspace:check
```

**Result (2026-07-24):**

- `pnpm quality` (biome check + dependency-cruiser boundaries + boundary fixture test) — passed
- `pnpm typecheck` (all 23 packages) — passed
- `pnpm build` (all 22 buildable packages) — passed
- `pnpm workspace:check` — passed
- Full `pnpm test` — passed for every package except one pre-existing, out-of-scope case:
  - `@fas/database` `test/prisma-evidence-repository.spec.ts` requires a live PostgreSQL connection and fails in this sandboxed environment with no reachable DB; `@fas/database` has zero file changes in this sprint (no schema/package touched). Confirmed pre-existing on `main` before this sprint's changes.
  - P1A-scoped suites: `provider-football` 50/50, `evidence-normalizer` 55/55, `@fas/web` 38/38 (incl. updated `explainable-report.spec.tsx`), plus unchanged green suites for evidence, evidence-import, evidence-query, feature, rule, application, analysis, report, provider-odds, statistics.
- Note: `@fas/database` `build`/`typecheck` also intermittently race on concurrent `prisma generate` writes to the same generated-client directory when Turborepo runs `build` and `typecheck` in parallel; this is a pre-existing tooling condition unrelated to P1A (reproduced identically by stashing all P1A changes) and resolves when `prisma generate` is run once before the parallel tasks.

---

## 9. Remaining limitations

- Season-stat coverage is capped per side (default 6 candidates: goalkeeper + top attackers by squad order) to respect API-Football Free-tier quota; non-candidate players show identity only with `seasonStats` honestly absent.
- `availabilityStatus` and `matchSquadStatus` depend on the same-match `INJURY`/`SUSPENSION`/confirmed `LINEUP` Evidence already being present; if those are absent, the corresponding `PLAYER` fields are also absent (never inferred).
- No `cleanSheets` field — API-Football does not expose it directly per player; deriving it from `goalsConceded`/appearances would be a fabricated metric and was excluded.
- Season stats reflect the competition/season resolved at fetch time; a player transferred mid-season may show a different competition's stats block depending on provider response shape.
- No Feature, Rule, Confidence, or Projection integration — reserved for **P1B**.

---

## 10. Recommended next sprint

**P1B** — Transform the extended `PLAYER` Evidence (season stats, availability, match squad status) into deterministic Player Intelligence Features and integrate them into Rule, Confidence, and Projection (honest absence when Player Evidence/candidate coverage is missing), following the same consume pattern established by L1B for Club Intelligence.

---

*End of P1A Completion Report.*
