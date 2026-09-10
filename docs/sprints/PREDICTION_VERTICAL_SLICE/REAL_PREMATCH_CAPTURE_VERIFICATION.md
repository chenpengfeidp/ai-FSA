# Real PRE_MATCH Capture Verification

## 0. Recommendation

| Field | Result |
|---|---|
| Review type | Bounded real PRE_MATCH capture verification |
| Date | 2026-09-07 |
| Clock at verification | `2026-09-07T10:05:18Z` (UTC; host `date -u`) |
| Implementation commit | `1effc562a7ae1cde34dd8764d3ca4ea77159dd97` (`1effc56`) |
| Worktree | Clean; `main` at `1effc56`, tracking `origin/main` |
| Production code changed in this task | **No** |
| Candidate authentic Class A seal | **Does not exist** |
| Historical Evaluation Intake | **C. BLOCKED** / `production_historical_intake_authorized = false` |
| Primary recommendation | **B. BLOCKED — REAL PRE_MATCH CAPTURE NOT ESTABLISHED** |

Primary blocker: **durable Postgres authority is unavailable** in the current
environment. Secondary blockers prevent a genuine live upcoming fixture from
being selected even if Postgres were later started without additional
configuration.

This verification did **not** invent a match, start Compose to force a pass,
apply a migration against a missing database, call in-memory seal helpers, or
treat recorded/cassette/Class B data as Class A.

---

## 1. Implementation commit hash

```text
1effc562a7ae1cde34dd8764d3ca4ea77159dd97
feat(statistics): 添加 PRE_MATCH 封印捕获与持久化
AuthorDate: Mon Sep 7 18:02:41 2026 +0800
```

Inspected on `main` (not the review document alone). The commit contains:

- production `fas-json-canonical.v1` + dual hashes;
- Prisma model/table `prematch_prediction_seal_items`;
- cutoff-governed `AnalyzeMatchUseCase`;
- auto-capture in `GenerateMatchReportUseCase` **before** `ReportBuilder.build`;
- API wiring: `IsoClock` always; Prisma seal repository **only when**
  `EVIDENCE_REPOSITORY_MODE=postgres`.

Memory API mode returns `undefined` from
`createApiPrematchPredictionSealRepository()` — committed behavior; Class A
cannot be claimed from that path.

---

## 2. Environment

| Item | Observed (no secrets) |
|---|---|
| Host | local Darwin; repo `/Users/mico/Desktop/football-analysis-system` |
| Git | `main` @ `1effc56` = `origin/main`; clean worktree |
| `.env` | present (uncommitted; values not copied here) |
| `DATABASE_URL` | **absent** |
| `EVIDENCE_REPOSITORY_MODE` | **unset** → code default **`memory`** |
| `DATABASE_CLIENT_MODE` | **unset** |
| `FOOTBALL_DATA_PROVIDER_MODE` | **unset** → code default **`recorded`** |
| `ODDS_PROVIDER_MODE` | `live` (Odds is optional overlay, not Match Center facts when Football Data is recorded) |
| `API_FOOTBALL_KEY` | present (length recorded only; not printed) |
| `THE_ODDS_API_KEY` | present (length recorded only; not printed) |
| `pnpm dev:api` / port 3001 | **closed** |
| web port 3000 | **closed** |
| Docker CLI | `/usr/local/bin/docker` present |
| Docker daemon | **unavailable** (`docker info` failed) |
| Compose postgres | **not running** |

No API process was started for this verification.

---

## 3. Postgres verification

| Check | Result |
|---|---|
| TCP `127.0.0.1:5432` | **closed** (`nc`) |
| `pg_isready` | client not installed; port still closed |
| `DATABASE_URL` | **not set** — no target DSN to connect |
| Prisma client connect | **not attempted** (no URL, no listener) |
| Production repository insert/read | **not possible** |
| Process reload/read-back | **not possible** |

In-memory repository was **not** used as substitute evidence.

**Blocker label:** `B. BLOCKED — DURABLE POSTGRES AUTHORITY UNAVAILABLE`

---

## 4. Migration status

| Check | Result |
|---|---|
| Migration file in commit `1effc56` | **exists**: `packages/database/prisma/migrations/20260907120000_prematch_prediction_seal/migration.sql` |
| Table definition | `prematch_prediction_seal_items` with unique `original_seal_id` |
| Applied to a live database | **unknown / not applied in this environment** — cannot query `_prisma_migrations` without a connection |
| Table exists in live Postgres | **not verified** (no Postgres) |

A committed SQL file is not a live applied migration.

---

## 5. Exact selected fixture

**None.**

No genuine upcoming fixture was selected. Prerequisites A–J failed before
fixture selection. Inventing `matchId` / kickoff, using recorded cassettes,
Class B fixtures, demo population, or yesterday’s completed match is forbidden.

---

## 6. Exact kickoff

**Not applicable.** No fixture selected.

Clock at verification: `2026-09-07T10:05:18Z`. Cannot compare to a real
kickoff without a real fixture.

---

## 7. Exact execution command / API request

**Not executed.**

The production path that would have been used, had prerequisites existed:

```text
EVIDENCE_REPOSITORY_MODE=postgres
DATABASE_CLIENT_MODE=live
FOOTBALL_DATA_PROVIDER_MODE=live
→ GET /api/matches/upcoming   (live catalog, kickoff in the future)
→ POST /api/analyze/match/:matchId
   or POST /api/analyze { homeTeam, awayTeam, optional date }
```

Owner: `GenerateMatchReportUseCase` (auto-capture before `ReportBuilder.build`).

This verification did not POST analyze, did not call
`capturePrematchPredictionSeal` from a script, and did not write rows by hand.

---

## 8–10. analysisTime / analysisCutoff / sealedAt

**Not captured.** No production run.

---

## 11. Evidence count

**Not captured.**

---

## 12. max Evidence.collectedAt

**Not captured.**

---

## 13. MATCH_RESULT count

**Not captured.** No governed PRE_MATCH evidenceSet was loaded.

---

## 14–16. originalSealId / sealIdentityHash / contentSha256

**None.** No persisted artifact.

Independent hash recomputation was not performed because there is no stored
`sealIdentity` / `contentSha256` to authenticate.

---

## 17. Persisted classification

**None.** Required Class A fields were not read from Postgres because no row
exists in this environment.

---

## 18. sourceAuthority

**Not observed on a persisted row.**

Committed production code would set
`prisma.prematch_prediction_seal_items` only after a successful Prisma insert.
That path was not reachable (`EVIDENCE_REPOSITORY_MODE` default memory + no
Postgres).

---

## 19. Postgres row evidence

**Zero rows inspected.** No connection, no table probe, no `SELECT`.

---

## 20. Reload / read-back evidence

**Not performed.** Requires a durable write first.

---

## 21. Retry / idempotency evidence

**Skipped.** No first write; retry would not be a PRE_MATCH production retry.

---

## 22. Deviations

None from the verification contract:

- did not fabricate a match;
- did not start Docker/Compose to manufacture Postgres for a forced PASS;
- did not switch env to recorded/cassette and call it real-world;
- did not use memory seal repository;
- did not modify production code;
- did not backfill or backdate.

Runtime config deviations **relative to Class A capture requirements** (current
`.env` / defaults, not code defects):

1. Postgres not running; `DATABASE_URL` unset.
2. Persistence mode defaults to **memory** → seal repository **not wired**.
3. Football Data mode defaults to **recorded** → cassette/demo schedule, not a
   live upcoming catalog.
4. API HTTP surface not running (ports 3001/3000 closed).
5. Docker daemon unavailable, so Compose postgres cannot be assumed present.

These are environment/runtime gaps, not newly discovered production-code
defects in commit `1effc56`. No bounded fix sprint is indicated for seal
capture logic from this run.

---

## 23. Blockers

Required checklist:

| ID | Prerequisite | Result |
|---|---|---|
| A | Real upcoming football fixture | **MISSING** — not selected; live catalog not queried |
| B | kickoff strictly in the future | **MISSING** |
| C | exact real matchId | **MISSING** |
| D | exact home/away orientation | **MISSING** |
| E | real competition / season / kickoff identity | **MISSING** |
| F | real PRE_MATCH Evidence via production pipeline | **MISSING** |
| G | production Postgres connectivity | **FAIL** — port closed, no DSN |
| H | PrematchPredictionSealItem migration applied | **UNVERIFIED / unavailable** |
| I | production Prisma seal repository wired | **FAIL** — memory default, no postgres mode |
| J | injected real clock | **NOT EXERCISED** (API not running; `IsoClock` exists in code only) |
| K | no MATCH_RESULT / Actual on governed path | **NOT EXERCISED** |
| L | source not Class B / demo / fixture / replay / backfill | **FAIL to establish** — current Football Data default is `recorded` |

PASS requires all of A–L plus durable write, checksum, and reload. Anything
less is BLOCKED.

---

## 24. Final recommendation

**B. BLOCKED — REAL PRE_MATCH CAPTURE NOT ESTABLISHED**

Narrower label for the first hard stop:

**B. BLOCKED — DURABLE POSTGRES AUTHORITY UNAVAILABLE**

`authentic_prematch_seal` remains **NOT_FOUND**.

This is **not** Artifact Admission. Historical Evaluation Intake remains
**C. BLOCKED**. `production_historical_intake_authorized` remains **false**.

### Exact next Governance action

Restore a **live durable Postgres** (`DATABASE_URL` + applied
`20260907120000_prematch_prediction_seal` migration +
`EVIDENCE_REPOSITORY_MODE=postgres`), run the **production API** with
**live** Football Data against a **genuine upcoming** fixture (kickoff in the
future), then **retry this same verification**. Do **not** implement Historical
Evaluation Intake. Do **not** treat recorded cassettes or Class B fixtures as
Class A.
