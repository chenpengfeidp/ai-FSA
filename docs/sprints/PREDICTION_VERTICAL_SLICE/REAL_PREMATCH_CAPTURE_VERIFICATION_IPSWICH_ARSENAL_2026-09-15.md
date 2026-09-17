# Real PRE_MATCH Capture Verification — Ipswich vs Arsenal (周二012)

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| Manifest | `verification-artifacts/2026-09-15-ips-ars-lottery-manifest.v1.json` |
| `matchId` | `lottery:csl:20260915:周二012` |
| API | `platformPersistenceMode=postgres`, `/health/ready` ready |
| Remediation build | `@fas/evidence-normalizer` `buildOddsEvidenceId` in `dist` |
| Capture | **PASS** |
| Admission | `AUTHENTIC_PREMATCH_SEAL_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-15.md` |

## Runtime

- `pnpm --filter @fas/evidence-normalizer build` + `pnpm --filter @fas/api build`
- `EVIDENCE_REPOSITORY_MODE=postgres`, `node apps/api/dist/main.js`, `PORT=3001`
- Single `POST /api/analyze/match/lottery:csl:20260915:周二012`

## Seal

| Field | Value |
|---|---|
| `analysisTime` / `analysisCutoff` | `2026-09-15T14:22:18.766Z` |
| `sealedAt` | `2026-09-15T14:22:18.878Z` |
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| `contentSha256` | `ecd427e51da3ac40cc1d57672321c1311471954ba7341afa6cd325f825fc410e` |

Artifact: `verification-artifacts/2026-09-15-ips-ars-seal-recordJson.json`
