# Match Replay / Evaluation Dataset Update Completion Report

**Task id:** MATCH_REPLAY_EVALUATION_DATASET_UPDATE  
**Roadmap:** `docs/40_PRODUCT_ROADMAP.md` (A1/A2 trust-track data maintenance; explicitly authorized outcome-only update, not a new roadmap sprint)  
**Architecture Freeze:** v0.3  
**Completion date:** 2026-08-28  
**Result:** COMPLETE — four outcome-only replay samples added  
**Production model changes:** None

---

## 1. Executive summary

Four confirmed completed matches were added as immutable, outcome-only
`ActualMatchResult` samples:

1. Anderlecht 3–0 Kairat Almaty
2. Celta Vigo 1–2 Osasuna
3. Barcelona 2–0 Athletic Club
4. Omonia 4–2 Sint-Truiden

The repository's canonical `EvaluationHistoryRecord`, Projection Replay Sidecar, replay cohort and
population evaluation structures all require a genuine sealed `PRE_MATCH_PREDICTION`. No exact
historical Prediction was available for these four matches. Therefore:

- no Prediction was reconstructed;
- no Evaluation History row was created or modified;
- no Replay Sidecar or cohort member was created;
- no current model was run retrospectively and mislabelled as the original pre-match Prediction;
- the samples remain outcome-only and are ineligible for scored Prediction Evaluation,
  Calibration or sealed replay until a genuine matching prediction seal exists.

The existing `ActualMatchResult` schema is FT-only. HT score, half totals, match events,
substitutions, post-match script annotations and exogenous-event annotations are recorded in this
completion report rather than forcing them into an incompatible schema or creating a parallel
persistence model.

These four matches are **evaluation/replay samples only**.

---

## 2. Existing structure reused

Data was added at:

`packages/statistics/src/evaluation/confirmed-match-replay-results.ts`

The dataset uses the existing:

- `ActualMatchResult`
- `createActualMatchResult`
- `MatchWinner`
- `goalRangeBucket`

Dataset version:

`confirmed-match-replay-results.v1`

Each stored sample contains only fields supported by `ActualMatchResult`:

- stable replay match identity;
- FT home/away goals;
- actual 1X2 winner;
- total goals;
- competition id/name;
- `FINISHED` status;
- source/provenance URL;
- provider method;
- observation timestamp.

No new database model, Evidence type, Evaluation History schema, Replay schema or parallel data
system was introduced.

---

## 3. Separation of post-match assets

| Asset class | Status for these four cases | Storage |
|---|---|---|
| `PRE_MATCH_PREDICTION` | **UNAVAILABLE** — not reconstructed or backfilled | None |
| `ACTUAL_MATCH_RESULT` | **RECORDED** | Immutable `ActualMatchResult` fixture |
| `ACTUAL_MATCH_SCRIPT` | **CURATED POST-MATCH ANNOTATION** — not a production Match Script id | This report only |
| `EXOGENOUS_EVENTS` | **CURATED/VERIFIED POST-MATCH ANNOTATION** | This report only |

The post-match script labels below must not be confused with the pre-match Match Script generator's
governed script set. They are descriptive replay annotations supplied by the task and preserved for
future error-attribution design.

---

## 4. Cases added

### Case 1 — Anderlecht vs Kairat Almaty

| Field | Value |
|---|---|
| Replay match id | `replay:2026-08-27:anderlecht:kairat-almaty` |
| Competition | UEFA Europa League Qualifying — Play-off Round, second leg |
| Kickoff | `2026-08-27T18:30:00Z` |
| Home / Away | Anderlecht / Kairat Almaty |
| HT | 1–0 |
| FT | 3–0 |
| First-half goals | 1 |
| Second-half goals | 2 |
| Total goals | 3 |
| Actual 1X2 | Home |
| Actual goal band | `2-3` (`range23`) |
| Actual BTTS | No |
| Actual O/U 2.5 | Over |
| Penalties | Anderlecht penalty scored at 45+2′ |
| Red cards | None identified in the corroborated event log |
| Actual-script annotation | `controlled_strong_side_advantage_expansion` |
| Exogenous-event classification | Penalty recorded; no separate state-transition flag assigned |
| Pre-match Prediction | **UNAVAILABLE** |

Verified goal sequence:

- 45+2′ Mihajlo Cvetković, penalty, 1–0
- 53′ Danylo Sikan, 2–0
- 71′ Giulian Biancone, 3–0

The score progression supports preservation as a controlled strong-side expansion replay
annotation. It is not evidence that a specific pre-match Match Script was activated.

Sources:

- official RSCA match centre: <https://www.rsca.be/en/fixture/view/6042>
- corroborating event log:
  <https://www.foxsports.com/soccer/europa-league-anderlecht-vs-kairat-aug-27-2026-game-boxscore-962626>

### Case 2 — Celta Vigo vs Osasuna

| Field | Value |
|---|---|
| Replay match id | `replay:2026-08-27:celta-vigo:osasuna` |
| Competition | LaLiga EA Sports 2026/27, Matchday 1 |
| Kickoff | `2026-08-27T16:30:00Z` |
| Home / Away | Celta Vigo / Osasuna |
| HT | 1–0 |
| FT | 1–2 |
| First-half goals | 1 |
| Second-half goals | 2 |
| Total goals | 3 |
| Actual 1X2 | Away |
| Actual goal band | `2-3` (`range23`) |
| Actual BTTS | Yes |
| Actual O/U 2.5 | Over |
| Red cards | Marcos Alonso, Celta Vigo; foul/VAR upgrade at 48′, official red-card event at 51′ |
| Penalties | Osasuna penalty awarded at 62′ and converted at 64′ |
| Actual-script annotation | `red_card_driven_state_transition_comeback` |
| Exogenous-event classification | `HOME_RED_CARD`, `SCORE_REVERSAL_AFTER_RED_CARD`, `AWAY_PENALTY_GOAL_AFTER_TRANSITION` |
| Pre-match Prediction | **UNAVAILABLE** |

Verified state transition:

```text
14′ Celta lead 1–0
48′ foul + VAR card upgrade
51′ Marcos Alonso red card
54′ Osasuna equalise 1–1
64′ Osasuna penalty goal, lead 1–2
FT 1–2
```

This case is explicitly **not** reduced to “ordinary away upset” or “model predicted wrong”. The
home red card is preserved as an exogenous match-state transition preceding the equaliser and score
reversal. This does not by itself claim a causal counterfactual; it prevents future error
attribution from treating the match as an uninterrupted normal state.

Official source:

<https://www.laliga.com/en-GB/match/temporada-2026-2027-laliga-ea-sports-rc-celta-ca-osasuna-1>

### Case 3 — Barcelona vs Athletic Club

| Field | Value |
|---|---|
| Replay match id | `replay:2026-08-27:barcelona:athletic-club` |
| Competition | LaLiga EA Sports 2026/27, Matchday 1 |
| Kickoff | `2026-08-27T17:00:00Z` |
| Home / Away | Barcelona / Athletic Club |
| HT | 1–0 |
| FT | 2–0 |
| First-half goals | 1 |
| Second-half goals | 1 |
| Total goals | 2 |
| Actual 1X2 | Home |
| Actual goal band | `2-3` (`range23`) |
| Actual BTTS | No |
| Actual O/U 2.5 | Under |
| Red cards | None |
| Penalties | None |
| Actual-script annotation | `controlled_strong_side_win_low_to_moderate_scoring` |
| Exogenous-event classification | None verified |
| Pre-match Prediction | **UNAVAILABLE** |

Verified goals:

- 37′ Raphinha, 1–0
- 82′ Fermín López, 2–0

The official match record reports Barcelona with 70.3% possession, 22 total shots and 12 corners,
versus Athletic Club's 29.7%, 5 shots and 5 corners. Those observed dominance indicators remain
separate from the FT score. A 2–0 score is therefore not used to infer that the match was close.

Official source:

<https://www.laliga.com/en-GB/match/temporada-2026-2027-laliga-ea-sports-fc-barcelona-athletic-club-1>

### Case 4 — Omonia vs Sint-Truiden

| Field | Value |
|---|---|
| Replay match id | `replay:2026-08-27:omonia:sint-truiden` |
| Competition | UEFA Europa League Qualifying — Play-off Round, second leg |
| Kickoff | `2026-08-27T17:00:00Z` |
| Home / Away | Omonia / Sint-Truiden |
| HT | 2–1 |
| FT | 4–2 |
| First-half goals | 3 |
| Second-half goals | 3 |
| Total goals | 6 |
| Actual 1X2 | Home |
| Actual goal band | `4+` (`range4Plus`) |
| Actual BTTS | Yes |
| Actual O/U 2.5 | Over |
| Red cards | **UNAVAILABLE** from the retained authoritative result record |
| Penalties | Omonia scored at 16′; Sint-Truiden scored at 33′ |
| Actual-script annotation | `open_high_goal_realization` |
| Exogenous-event classification | `TWO_PENALTY_GOALS`; hat-trick preserved as player event |
| Pre-match Prediction | **UNAVAILABLE** |

Verified goal sequence:

- 16′ Loïs Diony, penalty, 1–0
- 29′ Loïs Diony, 2–0
- 33′ Ilias Sebaoui, penalty, 2–1
- 50′ Loïs Diony, 3–1 and hat-trick completed
- 82′ Nikolas Panagiotou, 4–1
- 90+2′ Ilias Sebaoui, 4–2

This case is explicitly marked as an **Open / High Goal Replay Case** so later, properly sealed
evaluation populations can test whether open-match goal tails are underestimated. This sample
alone does not justify parameter tuning.

Sources:

- result and event record:
  <https://www.espn.com/soccer/match/_/gameId/401909830/sint-truidense-omonia-nicosia>
- official Omonia scheduling corroboration:
  <https://www.omonoiafc.com.cy/%cf%83%cf%85%ce%bd%ce%b5%cf%87%ce%af%ce%b6%ce%b5%cf%84%ce%b1%ce%b9-%ce%b7-%ce%b4%ce%b9%ce%ac%ce%b8%ce%b5%cf%83%ce%b7-%cf%84%cf%89%ce%bd-%ce%b5%ce%b9%cf%83%ce%b9%cf%84%ce%b7%cf%81%ce%af%cf%89%ce%bd-44/>

---

## 5. Deterministic outcome labels

| Case | Actual 1X2 | Goal band | BTTS | O/U 2.5 |
|---|---|---|---|---|
| Anderlecht 3–0 Kairat Almaty | Home | `2-3` | No | Over |
| Celta Vigo 1–2 Osasuna | Away | `2-3` | Yes | Over |
| Barcelona 2–0 Athletic Club | Home | `2-3` | No | Under |
| Omonia 4–2 Sint-Truiden | Home | `4+` | Yes | Over |

Definitions:

- actual 1X2: compare FT home and away goals;
- goal band: `0-1`, `2-3`, `4+`;
- BTTS: both FT goal counts are greater than zero;
- Over 2.5: FT total goals are at least three.

The focused test derives these labels from canonical FT outcomes. They are not manually inserted
into Evaluation History.

---

## 6. Unsupported fields and honest handling

`ActualMatchResult` does not support:

- home/away team names as separate fields;
- kickoff/match date;
- HT score or half goal totals;
- BTTS or O/U actual labels as stored fields;
- event timeline;
- red cards, penalties or substitutions;
- actual Match Script classification;
- exogenous-event flags.

Those values are retained in this completion report only. No schema extension was made because the
task explicitly forbids architecture drift and authorizes fixture/documentation-only delivery when
the existing persistence entry is insufficient.

Substitutions were available in the official LaLiga event logs and in a corroborating Anderlecht
event log, but they were not inserted into the FT-only result fixture. A sufficiently reliable
complete substitution log was not retained for Omonia vs Sint-Truiden. No missing substitution or
disciplinary event was invented.

---

## 7. Evaluation History / Replay eligibility

| Structure | Action | Reason |
|---|---|---|
| `MATCH_RESULT` / `ActualMatchResult` | Four outcome fixtures added | Existing canonical actual-result shape |
| `EvaluationHistoryRecord` | **No write** | Requires a genuine sealed `predictionSnapshot` and scored evaluation |
| Projection Replay Sidecar | **No write** | Requires sealed pre-match Feature/Rule context tied to History |
| Replay cohort | **No membership change** | Requires replay-eligible History + Sidecar |
| Replay run | **Not executed** | No eligible sealed cohort members |
| Population evaluation | **Not executed** | No paired prediction/outcome records |
| Calibration | **Not executed** | Outcome-only samples are not calibration rows |

The four outcomes must remain excluded from Prediction Evaluation and Calibration until an exact
historical prediction seal is found. A prediction generated now would be retrospective and cannot
be relabelled as `PRE_MATCH_PREDICTION`.

---

## 8. Files changed

Evaluation/replay data and tests:

1. `packages/statistics/src/evaluation/confirmed-match-replay-results.ts`
2. `packages/statistics/test/confirmed-match-replay-results.spec.ts`

Documentation:

3. `docs/sprints/PREDICTION_VERTICAL_SLICE/MATCH_REPLAY_EVALUATION_DATASET_UPDATE_COMPLETION_REPORT.md`
4. `docs/PROJECT_STATE.md`
5. `docs/PROJECT_INDEX.md`

No Projection, Match Script, parameter, calibration, provider, Evidence schema, database schema or
Evaluation History repository file changed.

---

## 9. Tests and validation

| Validation | Result |
|---|---|
| `pnpm --filter @fas/statistics test` | PASS — 15 files / 104 tests |
| `pnpm --filter @fas/statistics typecheck` | PASS |
| `pnpm quality` | PASS — Biome, dependency boundaries and negative boundary fixtures |
| `DATABASE_URL=postgresql://fas:fas@localhost:5432/fas pnpm typecheck` | PASS — 41/41 tasks (non-secret local validation URL) |
| Outcome fixture immutable and size = 4 | PASS |
| FT totals/winners validated by `createActualMatchResult` | PASS |
| Goal band / BTTS / O/U derivation assertions | PASS |
| `predictionSnapshot` absent from every sample | PASS |
| Evaluation History repository write | Not performed |
| Replay cohort/run write | Not performed |

---

## 10. Governance confirmation

- **NO model parameter was changed.**
- These four matches are **evaluation/replay samples only**.
- Production Projection V2 parameters were not modified.
- `projection.v3.replay` was not modified.
- `projection.v3.calibration.candidate1` was not modified or promoted.
- P2K-CAL-3 was not performed.
- No λ, Match Script weight, Goal Band definition or probability parameter changed.
- No retraining or automatic tuning occurred.
- FT outcomes were not written into pre-match Evidence, Features, Rules, Football State, Match
  Script, Projection or Sidecar context.
- Actual result facts remain separate from unavailable pre-match predictions.
- Celta vs Osasuna preserves the red-card-driven state transition for future error attribution.
- Omonia vs Sint-Truiden remains marked as an open/high-goal-tail replay case.
- Existing Evaluation History and sealed cohorts were not mutated.
- FIP-1 and PVS-3.4 were not started.

Stop after this task.
