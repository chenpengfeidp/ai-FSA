# P2B — Football State & Scenario Architecture Completion Report

| Field | Value |
|---|---|
| Sprint | **P2B** Football State & Scenario Architecture |
| Date | 2026-07-30 |
| Authority | Architecture Freeze v0.3 · P2A Prediction Intelligence Architecture Review · Football Intelligence v3 Knowledge Model Design · `docs/40_PRODUCT_ROADMAP.md` (citation gap — see §0) |
| Scope | Design-only Football State layer, Match Script Scenario Layer, Intelligence domain mapping, Projection V2 integration, V1 migration |
| Explicit exclusions | Production code · package changes · Evidence / Feature / Rule redesign · ML · LLM |

---

## 0. Governance note (roadmap citation gap)

**P2B** is not yet listed in `docs/40_PRODUCT_ROADMAP.md`. This sprint was authorized by an explicit task request. Add **P2B** and proposed follow-on ids (**P2C**–**P2K**) to doc 40 before any coding sprint in this track.

---

## 1. Completion summary

P2B designs a deterministic **Football State → Match Script → Projection** pipeline inside `@fas/analysis`, replacing the V1 path where flat Rule weights feed a single Poisson world.

**Recommended pipeline:**

```text
Evidence → Feature → Rule → Football State → Match Script → Projection → ScenarioSet → Confidence
```

Football State models structural, tactical, pressure, and risk dimensions pre-kickoff. Match Script Layer activates 2–5 weighted scripts (Home Control, Away Counter, Low Event, Open Match, Late Chaos, …). Projection V2 merges per-script distributions into unified 1X2 + scorelines.

No production code. Evidence / Feature / Rule architecture unchanged.

---

## 2. Deliverables produced

| # | Deliverable | Location |
|---|---|---|
| 1 | Football State architecture | [`P2B_FOOTBALL_STATE_SCENARIO_ARCHITECTURE.md`](./P2B_FOOTBALL_STATE_SCENARIO_ARCHITECTURE.md) §3 |
| 2 | State transition model | §4 |
| 3 | Scenario Layer architecture | §5 |
| 4 | Scenario activation logic | §6 |
| 5 | Intelligence domain mapping | §7 |
| 6 | Projection integration | §8 |
| 7 | Migration strategy from Projection V1 | §9 |
| 8 | Recommended coding sequence | §10 |

---

## 3. Files changed

| File | Change |
|---|---|
| `docs/sprints/P2B/P2B_FOOTBALL_STATE_SCENARIO_ARCHITECTURE.md` | **Added** — main design document |
| `docs/sprints/P2B/P2B_FOOTBALL_STATE_SCENARIO_ARCHITECTURE_COMPLETION_REPORT.md` | **Added** — this report |

**No production code, packages, or upstream architecture were modified.**

---

## 4. Key design decisions

| Decision | Rationale |
|---|---|
| Insert State + Match Script **between Rule and Projection** | Rules encode local findings; football quality needs global match dynamics |
| Keep **`ScenarioSet`** after Projection | A1.5 contract preserved; quantitative trio unchanged |
| Rename pre-projection scripts **`MatchScript`** | Avoid collision with `ScenarioSet` and V3-KM Tactical Tags |
| **`red_card_influence` always absent** pre-match | Honest absence — no live match state in V1 |
| Market → State **favourite tag only** | Preserves Freeze v0.3 Market findings-only boundary |
| Retire flat rule softmax in V2 | Rules drive State/Scripts instead of redundant 1X2 delta |
| Match Context **owns structural plane** | leg, aggregate, knockout already in I1A/I1B |

---

## 5. Quality gates

| Check | Result |
|---|---|
| Production code changes | **None** |
| Package modifications | **None** |
| Evidence/Feature/Rule redesign | **None** |
| Architecture Freeze v0.3 | **Unchanged** |
| All 8 deliverables present | **Yes** |

---

## 6. Remaining limitations

- Affinity/transition tables are **design-level constants** — require tuning sprint with A1 replay evidence after P2G.  
- Second-leg / aggregate parsing depends on existing `MATCH_CONTEXT` coverage — sparse on many fixtures.  
- P2A Rule Interaction Graph deferred to **P2J** — State uses Rules directly in first implementation.  
- doc 40 does not yet list P2A/P2B or P2C–P2K.

---

## 7. Recommended next sprint

| Priority | Sprint | Rationale |
|---|---|---|
| 1 (unchanged) | **M1B** Manager Intelligence Features → Rules → Confidence → Projection | Authorized implementation work |
| 2 (after P2B review) | **P2C** Football State module (`footballState.v1`) | First coding step in this track |
| 3 (governance) | doc 40 update | Add P2A, P2B, P2C–P2K |

---

## Sign-off

| Item | Status |
|---|---|
| P2B Football State & Scenario Architecture | **Complete (design only)** |
| Production code changes | **None** |
| Next authorized coding (unchanged) | **M1B** |

---

*End of P2B Completion Report.*
