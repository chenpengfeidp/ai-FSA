# Real PRE_MATCH Recapture (Post Remediation) — 2026-09-15

| Field | Value |
|---|---|
| Manifest | `verification-artifacts/2026-09-15-liv-tot-recapture-manifest.v1.json` |
| `matchId` | `lottery:csl:20260915:周二011` |
| Remediation | `PVS-4_LOTTERY_MULTI_ODDS_EVIDENCE_PERSISTENCE_REMEDIATION_REVIEW.md` — **PASS** |
| Recapture | **BLOCKED** (session) |
| New admission | **NOT ATTEMPTED** |

## Blocker

1. **Governed Evidence import runs inside `POST /api/analyze/match`**, not on manifest
   POST. Pre-analyze Postgres audit still reflected the **legacy** 7-row set (2 ODDS)
   from the first capture.
2. Automated recapture session **did not complete analyze** after manifest POST.

## Required operator retry

1. `pnpm --filter @fas/evidence-normalizer build` && `pnpm --filter @fas/api build`
2. API with `EVIDENCE_REPOSITORY_MODE=postgres`
3. `POST /api/lottery/manifest` (recapture manifest)
4. `POST /api/analyze/match/lottery:csl:20260915:周二011` (before kickoff)
5. Verify Postgres: **≥5 ODDS** including `handicap-result-1` + oddssafari AH/O/U rows
6. Verify **new** `originalSealId` (not `d63058f…` / `b4314967…`)
7. Open **new** artifact admission on that seal only

Legacy seal rows remain immutable and **not** admitted.
