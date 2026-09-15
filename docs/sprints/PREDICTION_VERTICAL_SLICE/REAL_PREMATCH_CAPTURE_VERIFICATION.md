# Real PRE_MATCH Capture Verification

## 0. Recommendation (latest)

| Field | Result |
|---|---|
| Review type | Product-aligned real PRE_MATCH Class A capture verification (PVS-4 lottery path) |
| Date | 2026-09-15 |
| Clock at verification | First governed analyze `2026-09-15T08:43:58.720Z`; wall ~`2026-09-15T16:43+08:00` |
| Repository HEAD | `bb2d925f3d066b44e1cafe2f83a3b6668b755f3f` (`bb2d925`) |
| PVS-4 implementation | **A. PASS** (manifest intake, `lottery:csl:` ids, multi-source CORE/market Evidence) |
| Implementation commit (seal capability) | `1effc562a7ae1cde34dd8764d3ca4ea77159dd97` (`1effc56`) |
| Saved manifest artifact | `docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/2026-09-15-liv-tot-lottery-manifest.v1.json` |
| Production code changed in this task | **No** |
| Candidate authentic Class A seal | **Captured (first row)** — awaiting artifact admission review |
| Historical Evaluation Intake | **C. BLOCKED** / `production_historical_intake_authorized = false` |
| Primary recommendation | **A. PASS — CANDIDATE AUTHENTIC CLASS A PRE_MATCH SEAL CAPTURED** |

**Fixture:** 竞彩足球 list date **2026-09-15**, code **周二011**, **利物浦 vs 热刺**,
EFL Cup, kickoff **`2026-09-16T03:00:00+08:00`**, canonical
`lottery:csl:20260915:周二011`.

**salesIssueId resolution:** PVS-4 gate defines `salesIssueId` as the official
sales-period id with example `20260913` (YYYYMMDD). Operator screenshot exposes
list date **2026-09-15** but not a separate opaque issue id. Contract-valid
representation: **`20260915`** (aligned with gate example and list date).

**Governed capture (first run):** `EVIDENCE_REPOSITORY_MODE=postgres`,
`platformPersistenceMode=postgres`, `POST /api/lottery/manifest` →
`POST /api/analyze/match/lottery:csl:20260915:周二011` before kickoff.
`analysisTime === analysisCutoff === 2026-09-15T08:43:58.720Z`;
`sealedAt === 2026-09-15T08:43:58.894Z`; temporal gate satisfied.
`authenticatePrematchPredictionSeal` **PASS** on first row. Durable read-back
after API process restart **unchanged** on first row.

**Deviations (do not void first candidate):** lottery fixture registry is
**in-memory** (manifest must be re-posted after API restart). A later
post-restart re-analyze with a **new** `analysisTime` inserted a **second** seal
row — that is **not** governed idempotency; same-session immediate retry was not
completed. See [Appendix D](#appendix-d--2026-09-15-liverpool-v-tottenham-product-aligned-capture).

**Does not authorize:** Historical Evaluation Intake, `authentic_prematch_seal=FOUND`,
or calibration population membership.

Prior blocked attempts: [Appendix C](#appendix-c--2026-09-14-no-operator-manifest);
[Appendix B](#appendix-b--2026-09-13-attempt-api-football-catalog);
[Appendix A](#appendix-a--2026-09-07-attempt-postgres-unavailable).

---

## 1. Implementation commit hash

```text
1effc562a7ae1cde34dd8764d3ca4ea77159dd97
feat(statistics): 添加 PRE_MATCH 封印捕获与持久化
```

Inspected on `main` (ancestor of `4641b34`). Baseline unchanged:

- production `fas-json-canonical.v1` + dual hashes;
- Prisma model/table `prematch_prediction_seal_items`;
- migration `20260907120000_prematch_prediction_seal`;
- cutoff-governed `AnalyzeMatchUseCase`;
- auto-capture in `GenerateMatchReportUseCase` before `ReportBuilder.build`;
- API: `IsoClock`; `PrismaPrematchPredictionSealRepository` when
  `EVIDENCE_REPOSITORY_MODE=postgres`.

No drift found that invalidates
`AUTHENTIC_PREMATCH_SEAL_CAPTURE_IMPLEMENTATION_REVIEW.md`.

---

## 2. Environment

| Item | Observed (no secrets) |
|---|---|
| Host | local Darwin; repo `/Users/mico/Desktop/football-analysis-system` |
| Git | `main` @ `4641b34` = `origin/main`; clean worktree |
| `.env` | present (uncommitted); `API_FOOTBALL_KEY` set (length 32); `DATABASE_URL` **unset in file** |
| Runtime `DATABASE_URL` (verification) | set for session only: `postgresql://fas_local@127.0.0.1:5432/fas_local` (password not recorded) |
| `EVIDENCE_REPOSITORY_MODE` | `postgres` (verification override) |
| `DATABASE_CLIENT_MODE` | `live` (verification override) |
| `FOOTBALL_DATA_PROVIDER_MODE` | `live` (verification override) |
| `ODDS_PROVIDER_MODE` | `recorded` (from `.env` / default) |
| Docker | Desktop started for verification; daemon available after start |
| Postgres | `postgres:17-alpine` container `fas-postgres-verify`, `127.0.0.1:5432` → healthy |
| API | `pnpm dev:api` on `http://127.0.0.1:3001`; `/health/ready` → `ready` |
| `GET /api/providers/connected` | `football:api-sports` **connected: true** |

---

## 3. Postgres verification

| Check | Result |
|---|---|
| TCP `127.0.0.1:5432` | **open** |
| `pg_isready` (in container) | **accepting connections** |
| Prisma `migrate deploy` | **success** (7 migrations including `20260907120000_prematch_prediction_seal`) |
| Table `prematch_prediction_seal_items` | **exists** |
| Row count before capture | **0** |
| `PrismaPrematchPredictionSealRepository` | **wired** via `EVIDENCE_REPOSITORY_MODE=postgres` (no capture run) |

**This retry:** durable Postgres authority **available** for the verification
session. Not used as Class A evidence without a governed PRE_MATCH capture run.

---

## 4. Migration status

| Check | Result |
|---|---|
| Migration `20260907120000_prematch_prediction_seal` | **applied** (`pnpm prisma:migrate` / `migrate deploy`) |
| `_prisma_migrations` | 7 migrations applied in fresh local volume |
| Live table | **verified** via `psql` `\dt` |

---

## 5. Live provider / current-season status

| Check | Result |
|---|---|
| Football Data mode at runtime | `live` (`meta.footballDataProviderMode`) |
| Credential | key present; provider **connected** in `/api/providers/connected` |
| Match Center catalog | `GET /api/matches/upcoming` → `ok: true` |
| `meta.usedRecordedFallback` | **`true`** |
| `meta.scheduleSource` | `football-data` |
| Eligible live upcoming rows | **0** (`futureCount` with wall clock `2026-09-13T09:39:31Z`) |
| Row provenance on board | API-Football-shaped rows: `providerMethod: recorded-snapshot`; additional `providerSource: fixture` seeds |
| Max kickoff on board | **before** verification clock (all past) |

**Entitlement blocker (consistent with PVS-3.2):** live API-Football catalog
does not supply a genuine current-season upcoming fixture; production falls
back to recorded snapshots explicitly. Prior sprint evidence documented plan
denial for **2026** season (`Free plans do not have access to this season,
try from 2022 to 2024.`). This retry did not re-print provider payloads or
account identity.

**Blocker label:** `B. BLOCKED — GENUINE LIVE PRE_MATCH FIXTURE UNAVAILABLE`

---

## 6. Exact selected fixture

**None.**

Fixture selection stopped at prerequisite 7. No `POST /api/analyze` was executed.

---

## 7. Exact kickoff

**Not applicable.**

---

## 8. Exact execution command / API request

Postgres restore (local, credentials aligned with `.env.example` placeholders):

```bash
docker run -d --name fas-postgres-verify \
  -p 127.0.0.1:5432:5432 \
  -e POSTGRES_DB=fas_local \
  -e POSTGRES_USER=fas_local \
  -e POSTGRES_PASSWORD=<local-only> \
  postgres:17-alpine
```

```bash
DATABASE_URL="postgresql://fas_local:<local-only>@127.0.0.1:5432/fas_local" \
  pnpm prisma:migrate
```

Production API (verification overrides; `.env` sourced for keys only):

```bash
DATABASE_URL="postgresql://fas_local:<local-only>@127.0.0.1:5432/fas_local" \
DATABASE_CLIENT_MODE=live \
EVIDENCE_REPOSITORY_MODE=postgres \
FOOTBALL_DATA_PROVIDER_MODE=live \
ODDS_PROVIDER_MODE=recorded \
PORT=3001 \
pnpm dev:api
```

Catalog probe (executed):

```http
GET http://127.0.0.1:3001/api/matches/upcoming
```

Analyze / seal capture path **not executed** (no qualifying fixture).

---

## 9–16. Temporal, Evidence, hashes, classification

**Not captured.** No governed PRE_MATCH production run.

| Field | Value |
|---|---|
| analysisTime | — |
| analysisCutoff | — |
| sealedAt | — |
| Evidence count | — |
| max `Evidence.collectedAt` | — |
| MATCH_RESULT count | — |
| originalSealId | — |
| sealIdentityHash | — |
| contentSha256 | — |
| Persisted classification | — |
| Postgres row evidence | **0 rows** |

---

## 17. Reload / read-back evidence

**Not performed.** No durable seal write.

---

## 18. Retry / idempotency evidence

**Skipped.** No first capture.

---

## 19. Deviations

- Started Docker Desktop when daemon was initially stopped (runtime restoration).
- Used a one-off `postgres:17-alpine` container with host port `5432` and
  `.env.example` database/user/db names so host `pnpm prisma:migrate` and
  `pnpm dev:api` could reach Postgres (Compose postgres service publishes no
  host port per README).
- Did **not** commit `.env` changes; session-only env overrides for verification.
- Did **not** analyze fallback or fixture-seed rows.

No production-code defects discovered in this retry.

---

## 20. Blockers (checklist)

| ID | Prerequisite | Result (2026-09-13 retry) |
|---|---|---|
| A | Real upcoming football fixture | **FAIL** — none on live catalog |
| B | kickoff strictly in the future | **FAIL** — 0 future rows |
| C | exact real matchId | **MISSING** |
| D | exact home/away orientation | **MISSING** |
| E | real competition / season / kickoff identity | **MISSING** |
| F | real PRE_MATCH Evidence via production pipeline | **NOT RUN** |
| G | production Postgres connectivity | **PASS** (this retry) |
| H | migration applied | **PASS** |
| I | Prisma seal repository wired | **PASS** (`postgres` mode) |
| J | injected real clock | **NOT EXERCISED** (no analyze) |
| K | no MATCH_RESULT / Actual | **NOT EXERCISED** |
| L | source not Class B / demo / fixture / replay | **FAIL** — board is explicit recorded fallback + fixture seeds |

---

## 21. Final recommendation

**B. BLOCKED — REAL PRE_MATCH CAPTURE NOT ESTABLISHED**

Narrower label for the **first hard stop on the capture path** (after Postgres
restored):

**B. BLOCKED — GENUINE LIVE PRE_MATCH FIXTURE UNAVAILABLE**

`authentic_prematch_seal` remains **NOT_FOUND**.

Historical Evaluation Intake remains **C. BLOCKED**.
`production_historical_intake_authorized` remains **false**.

### Exact next Governance action

1. Obtain API-Football **current-season** entitlement that returns genuine
   upcoming fixtures (not recorded fallback).
2. Retry bounded real PRE_MATCH capture verification with the same production
   path (`EVIDENCE_REPOSITORY_MODE=postgres`, live Football Data, one future
   fixture, `POST /api/analyze/match/:matchId` or governed team analyze).
3. **Do not** implement Historical Evaluation Intake until a candidate Class A
   seal exists and completes **Artifact Admission Review** (separate gate).

---

## Appendix D — 2026-09-15 Liverpool v Tottenham product-aligned capture

| # | Field | Value |
|---|---|---|
| 1 | Repository HEAD | `bb2d925f3d066b44e1cafe2f83a3b6668b755f3f` |
| 2 | Fixture identity | `salesIssueId=20260915`, `lotteryMatchCode=周二011`, 利物浦 vs 热刺, `eng:efl-cup`, `2025/26` |
| 3 | Saved manifest | `docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/2026-09-15-liv-tot-lottery-manifest.v1.json` |
| 4 | Canonical `matchId` | `lottery:csl:20260915:周二011` |
| 5 | CORE Evidence | `MATCH_INFO`×1, `TEAM_FORM`×2, `STATISTICS`×2 — sources `china-sports-lottery` (manifest) |
| 6 | Evidence total (first analyze) | **7** rows (`GET /api/evidence/match/...`) |
| 7 | `analysisTime` | `2026-09-15T08:43:58.720Z` |
| 8 | `analysisCutoff` | `2026-09-15T08:43:58.720Z` |
| 9 | max `Evidence.collectedAt` | `2026-09-15T08:43:58.720Z` (≤ cutoff) |
| 10 | MATCH_RESULT count | **0** |
| 11 | Actual count | **0** |
| 12 | `sealedAt` (first row) | `2026-09-15T08:43:58.894Z` |
| 13 | `originalSealId` (first) | `prematch-seal:lottery:csl:20260915:周二011:d63058fdd561cbe09375cf068b4e3eca5c46bf00147ebfefbf9b0941d061ec42` |
| 14 | `sealIdentityHash` (first) | `d63058fdd561cbe09375cf068b4e3eca5c46bf00147ebfefbf9b0941d061ec42` — **verified** |
| 15 | `contentSha256` (first) | `4c52a8b9d68c5ab825cbf7116451fcbbb12c3b3f27297e6627e3e0ee9e667a01` — **verified** |
| 16 | Persisted classification (first row `recordJson`) | `schemaVersion=prematch-prediction-seal.v1`, `synthetic=false`, `historicalAuthenticity=true`, `provenanceClass=A`, `sourceAuthority=prisma.prematch_prediction_seal_items`, `allowedUsage` includes `historical_evaluation_intake` |
| 17 | Reload after API restart | First row `originalSealId`, `sealedAt`, `contentSha256` **unchanged** |
| 18 | Idempotency | **Not demonstrated** on immediate same-session retry; post-restart re-analyze with new `analysisTime` created a **second** row (excluded from candidate) |
| 19 | Runtime | Postgres `fas-postgres-verify`; migrations applied; API `platformPersistenceMode=postgres`; `FOOTBALL_DATA_PROVIDER_MODE=recorded`, `ODDS_PROVIDER_MODE=recorded` |
| 20 | Market Evidence | **1X2:** `lottery-official` (1.62 / 3.82 / 4.00) + `lottery-official-handicap-result-minus-one` three-way (2.78 / 3.65 / 2.02) — **not** labeled Asian Handicap; **AH:** independent `public-reference-consensus` line −1 @ 2.25 / 1.63; **O/U:** same row line 3.5 @ 2.25 / 1.67 (rechecked vs public consensus 2026-09-15) |
| 21 | ODDS row count | **2** persisted ODDS Evidence rows (lottery + public reference bundle per normalizer) |
| 22 | Final recommendation | **A. PASS — CANDIDATE AUTHENTIC CLASS A PRE_MATCH SEAL CAPTURED** |

**Exact next Governance action:** **AUTHENTIC PRE_MATCH SEAL ARTIFACT ADMISSION REVIEW** (first row only).

---

## Appendix C — 2026-09-14 product-aligned attempt (no operator manifest)

| # | Field | Value |
|---|---|---|
| 1 | Repository HEAD | `22eddf6fd06fd8c2c65a412240a1b6eed47bb68a` |
| 2 | Fixture identity | **None selected** |
| 3 | Lottery manifest | **Not submitted** (no genuine operator manifest) |
| 4 | Canonical `matchId` | — |
| 5 | Evidence sources | — |
| 6 | Evidence count | — |
| 7 | `analysisTime` | — |
| 8 | `analysisCutoff` | — |
| 9 | max `collectedAt` | — |
| 10 | MATCH_RESULT count | — |
| 11 | Actual count | — |
| 12 | `sealedAt` | — |
| 13 | `originalSealId` | — |
| 14 | `sealIdentityHash` | — |
| 15 | `contentSha256` | — |
| 16 | Persisted row | **0 rows** in `prematch_prediction_seal_items` |
| 17 | Reload/read-back | **Not performed** |
| 18 | Retry/idempotency | **Skipped** (no first capture) |
| 19 | Runtime configuration | Postgres container `fas-postgres-verify` healthy; `GET /version` → `platformPersistenceMode: postgres`; `GET /health/ready` → `ready`; `GET /api/lottery/fixtures` → `fixtures: []`; invalid manifest probe → `LOTTERY_MANIFEST_SCHEMA_UNSUPPORTED` (endpoint live) |
| 20 | Deviations | Did not use PVS-4 CI manifest; did not implement Sporttery scraping in repo |
| 21 | Blockers | **A.** No operator genuine manifest **B.** No verifiable live 竞彩 list in session **C.** Analyze/seal path not run |
| 22 | Final recommendation | **B. BLOCKED** — first hard stop: **genuine operator-supplied lottery fixture + PRE_MATCH Evidence unavailable** |

**Exact next Governance action:** Obtain one genuine upcoming 竞彩足球 fixture +
bounded CORE/market fields as `lottery-fixture-manifest.v1`, register via
`POST /api/lottery/manifest`, run governed `POST /api/analyze/match/lottery:csl:…`
before kickoff with `EVIDENCE_REPOSITORY_MODE=postgres`, then re-run this
verification. On success, next step is **AUTHENTIC PRE_MATCH SEAL ARTIFACT
ADMISSION REVIEW** (not Historical Intake authorization).

---

## Appendix B — 2026-09-13 attempt (API-Football catalog)

Supersedes the former “latest” narrative in §0 before 2026-09-14. Postgres was
restored; blocker was **B. BLOCKED — GENUINE LIVE PRE_MATCH FIXTURE UNAVAILABLE**
(`GET /api/matches/upcoming`, `usedRecordedFallback: true`, zero future kickoffs).
Repository HEAD `4641b347c2d4cf4845607c51da31ce056f9a3f04`. Full tables remain in
sections 1–21 below (environment, Postgres, catalog probe).

---

## Appendix A — 2026-09-07 attempt (Postgres unavailable)

| Field | Result |
|---|---|
| Date | 2026-09-07 |
| HEAD | `1effc56` |
| Primary blocker | **B. BLOCKED — DURABLE POSTGRES AUTHORITY UNAVAILABLE** |
| Postgres | port closed; `DATABASE_URL` unset; Docker daemon unavailable |
| Fixture | not selected |
| Analyze | not executed |

That attempt is superseded for Postgres/migration status by the 2026-09-13
retry above; capture remains blocked on live fixture entitlement.
