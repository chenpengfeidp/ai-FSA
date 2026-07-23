# Evidence Catalog (Product Status)

| Field | Value |
|---|---|
| Purpose | Track which Evidence / product surfaces are wired in the private V1 path |
| Authority | Complements domain Evidence types; does **not** replace Architecture Freeze or doc 41 |
| Roadmap | [`docs/40_PRODUCT_ROADMAP.md`](./40_PRODUCT_ROADMAP.md) |
| Last updated | 2026-07-22 (after Sprint **F1.3B**) |

Status legend:

| Status | Meaning |
|---|---|
| **Active** | Provider → Normalizer → Evidence → Workspace/Report path delivered |
| **Composed** | Presentation summary built from other Evidence (not a sealed Evidence type) |
| **Typed unused** | Evidence type exists; ingest not wired |
| **Deferred** | Planned later under F1.1 / later sprints |
| **Not supported** | No honest Fact source — do not invent |

---

## F1.1D focus

| Catalog id | Evidence type / surface | Status | Notes |
|---|---|---|---|
| **INJURY** | `INJURY` | **Active** | F1.1D; `/injuries` rows with `kind=injury` |
| **SUSPENSION** | `SUSPENSION` | **Active** | F1.1D; `/injuries` rows with `kind=suspension` |
| **AVAILABILITY** | Workspace / Report **Availability Summary** | **Composed** | Built from INJURY + SUSPENSION Evidence only; not a sealed Evidence type; honest absence when neither present |

---

## Broader catalog (selected)

| Catalog id | Evidence type / surface | Status | Delivery |
|---|---|---|---|
| MATCH_INFO | `MATCH_INFO` | Active | F.1 |
| TEAM_FORM | `TEAM_FORM` | Active | F.1 |
| STATISTICS | `STATISTICS` | Active | F.1 (team) + F1.2a optional advanced (SoT/possession/corners/cards/…); STATISTICS xG fields remain zero until F1.3B |
| EXPECTED_GOALS | `EXPECTED_GOALS` | Active | F1.3A Evidence + F1.3B Feature/Rule/Confidence/Projection consume; never estimated from shots |
| MATCH_CONTEXT | `MATCH_CONTEXT` | Active | I1A Evidence + I1B Feature/Rule/Confidence/Projection consume; never invent rest/travel/knockout |
| HEAD_TO_HEAD | `HEAD_TO_HEAD` | Active | F.1 |
| VENUE | `VENUE` | Active | F1.1B-1 |
| PLAYER | `PLAYER` | Active | F1.1C-1 (basic identity) |
| ODDS | `ODDS` | Active (optional path) | I2A Market Evidence (1X2 / AH / O/U + optional opening/closing/movement/public/volume/sharp when provider-supplied); supporting evidence only — no Market Features in I2A |
| LINEUP | `LINEUP` | Confirmed XI only (F1.1E) | Honest absence when unpublished; never Expected Lineup |
| WEATHER | `WEATHER` | Typed unused | Future |
| Expected Lineup | — | **Not supported** | No API-Football Fact endpoint |
| Referee | `MATCH_INFO.referee` | F1.1E | Identity + optional country/league/statistics when supplied |
| Player Statistics | — | Deferred | Later |

---

## Pipeline notes

- Feature / Rule / Projection consume sealed Evidence for math; **INJURY / SUSPENSION / AVAILABILITY are presentation-only in F1.1D** (not wired into Feature/Rule/Projection).
- Honest absence: missing provider data must not become Unknown guesses or “all available”.

---

## References

- [`docs/41_EVIDENCE_PROVIDER_ARCHITECTURE.md`](./41_EVIDENCE_PROVIDER_ARCHITECTURE.md)
- [`docs/sprints/F1.1/F1.1D_PLANNING.md`](./sprints/F1.1/F1.1D_PLANNING.md)
- [`docs/sprints/F1.1/F1.1D_AVAILABILITY_IMPLEMENTATION_REPORT.md`](./sprints/F1.1/F1.1D_AVAILABILITY_IMPLEMENTATION_REPORT.md)
- [`docs/sprints/F1.1/F1.1_REVIEW.md`](./sprints/F1.1/F1.1_REVIEW.md)

---

*End of Evidence Catalog.*
