# 36 — Repository Health Check

| Field | Value |
|---|---|
| Date | 2026-07-20 |
| Role | Staff Engineer review (read-only assessment) |
| Scope | Whole repository: `docs/`, `apps/`, `packages/` |
| Declared baseline | Architecture Freeze **v0.2**; vertical slice 1.0–1.4 + B/C/A/P/F.1 landed |
| Authority | Non-authoritative relative to Project Bible, ADRs, and owning numbered contracts; does **not** redesign architecture or authorize new engines |
| Live delivery truth | [`PROJECT_STATE.md`](./PROJECT_STATE.md) |
| Document map | [`PROJECT_INDEX.md`](./PROJECT_INDEX.md) |

This document answers: **Is the repository healthy enough to continue MVP feature work inside the frozen architecture — and what should be built next?**

It does **not** propose new engines, new provider vendors, Redis/BullMQ, or public platform work.

---

## 0. Executive Summary

| Question | Answer |
|---|---|
| Architecture Freeze holding? | **Yes** — pipeline package edges and depcruise rules are intact |
| Docs vs code? | **Mostly aligned** at live snapshot (`PROJECT_STATE`); **stale headers** remain on docs 30–34 and §17 of doc 35 |
| Can MVP continue? | **Yes** — private deterministic vertical slice is already running; next work is gated enrichment, not greenfield |
| Biggest risks | Live match priming choreography; dual form/stats provenance (shots vs goals-proxy); default in-memory Evidence |
| Next development | Per `docs/40_PRODUCT_ROADMAP.md`: **Sprint F1.1** (player/lineup/injury…); true xG is **Sprint F1.3** |

**Repository Health Score: 76 / 100**

---

## 1. Documentation Consistency

### 1.1 Authority model (still correct)

When documents disagree:

1. `00_PROJECT_BIBLE.md`
2. Accepted ADRs
3. Owning numbered contracts (`01`–`19`, etc.)
4. Approved gates / specs (e.g. F.1 sprint spec, doc 35 §14)
5. `PROJECT_STATE.md` (live delivery)
6. Sprint reports / this health check

Docs **30–34** remain **non-authoritative design overlays**. Doc **35** is the authorized first-slice build order (implemented). Live status lives in **`PROJECT_STATE` / `PROJECT_INDEX`**.

### 1.2 Document-by-document status

| Document | Declared status in file | Actual role today | Consistency issue |
|---|---|---|---|
| `00_PROJECT_BIBLE.md` | Principles + seven engines | Still authoritative for principles/engine count | **OK** — no delivery-status claims; no conflict with Freeze v0.2 |
| `30_RULE_ENGINE_V2.md` | Design only — not implemented | Future design; subset delivered via `@fas/rule` + `@fas/feature` under doc 35 | Header “not implemented” is **misleading** if read as “no rules exist”; should be read as “full V2 design not implemented” |
| `31_PREDICTION_ENGINE_V2.md` | Design only — not implemented | Projection math partially delivered as Analysis-owned `DeterministicMatchProjection` (not a new engine) | Same as 30; name “Prediction Engine” must not be read as eighth engine (doc 34 VA-01) |
| `32_REPORT_ENGINE_V2.md` | Design only — not implemented | Report assembly delivered via `@fas/report` | Same; Report is Analysis-owned assembly, not a governed engine |
| `33_ANALYSIS_PIPELINE_V2.md` | Design only — not implemented | Orchestration delivered via API + `@fas/analysis` / `@fas/application` | Same; does not supersede `17_ANALYSIS_PIPELINE.md` |
| `34_V2_ARCHITECTURE_ALIGNMENT.md` | Header: “not approved, not implemented” | Body: VA-01–VA-10 **accepted for planning**; gates for doc 35 satisfied | **Header drift** — contradicts body §11/§12 and PROJECT_STATE |
| `35_V2_FIRST_VERTICAL_SLICE_SPECIFICATION.md` | Status cites PROJECT_STATE; §14 gates Done | Slice 1.0–1.4 **implemented** (+ later B/C/A/P/F.1) | §17 still speaks as if implementation has not started — **stale closing prose** |

### 1.3 Conflicts, duplicates, expired, missing Deprecated marks

#### Content conflicts (resolve by authority)

| Conflict | Resolution |
|---|---|
| Doc 34 header “not approved” vs body VA acceptance + doc 35 §14 Done | Treat **body + PROJECT_STATE + doc 35 §14** as truth; header is stale |
| Docs 30–33 “not implemented” vs working `@fas/rule` / analysis / report | Treat as **full V2 design not implemented**; interim packages implement the **slice subset** authorized by doc 35 |
| Doc 31 “xG is the foundation” vs current Poisson/form path + deferred F.1.1 xG | Slice 35 pinned independent Poisson path; **true xG is F.1.1**, not a silent assumption of current code |
| Canonical `*-engine` names (`14_MONOREPO`) vs `@fas/rule`, `@fas/prompt`, `@fas/statistics` | Documented intentional interim migration gap |

#### Duplicate definitions (expected, not bugs)

- Pipeline stages described in `17`, `33`, `34`, `35`, and sprint specs — **same story at different authority levels**.
- “Prediction” terminology appears in doc 31 as product label for deterministic projections; Bible still forbids using “prediction” as synonym for analysis in product language — **epistemic tension is documented**, not a silent rewrite.

#### Expired / needs Deprecated (or Historical) banner

| Document / section | Recommendation (documentation only; not done by this review) |
|---|---|
| Doc 34 §1 Status table | Mark “Planning-accepted for doc 35; header historical” |
| Doc 35 §17 | Retarget to “slice delivered; further work per PROJECT_STATE” |
| Docs 30–33 Status | Clarify “Design overlay — full V2 not implemented; slice subset may exist in code” |
| Older README/AGENTS bootstrap claims | Already corrected in Freeze v0.2 sync; keep watching for regressions |

#### Not deprecated (correctly active)

- `00`–`19` owning contracts
- ADRs 001–004
- Sprint vertical-slice specs under `docs/sprints/` as historical + gate evidence
- F.1 Football Data provider spec (landed)

### 1.4 Documentation score drivers

**Strengths:** Clear authority order; V2 docs self-label as non-authoritative; PROJECT_STATE/INDEX exist as live maps; Freeze v0.2 cleaned the worst entry-point drift.

**Weaknesses:** Numbered V2 headers lag delivery; readers who only open 30–34 will under-estimate implementation.

---

## 2. Architecture Consistency

### 2.1 Intended runtime shape (frozen)

```text
Provider → Evidence → Feature → Rule → Analysis → Report → Prompt → AI Provider
```

Composition roots: `apps/api` (Nest), `apps/web` (HTTP only), `apps/worker` (bootstrap shell).

Prisma ownership: `@fas/database` only.

### 2.2 Code vs design — Controller / Service / Domain / Evidence / Rule / Projection / Pipeline / Module

| Layer | Expected | Observed | Verdict |
|---|---|---|---|
| Controllers | Thin transport | Nest controllers mostly map DTOs → use cases; analyze/import also run provider primers | **Mostly OK** (priming thickness noted below) |
| Application / services | Orchestration | `@fas/application` ImportMatch; `@fas/analysis` AnalyzeMatch; report GenerateMatchReport | **OK** |
| Domain | Framework-neutral | Packages avoid Nest/Next/Prisma; domain types in match/evidence/analysis | **OK** |
| Evidence | Facts + provenance | normalizer → import → query; memory default; postgres optional (P.2) | **OK for private demo** |
| Rule | Deterministic findings | `@fas/rule` consumes FeatureBundle; no probabilities as truth | **OK** |
| “Prediction” | Analysis-owned projection (doc 34) | `DeterministicMatchProjection` inside `@fas/analysis` — **no Prediction package/engine** | **OK** |
| Pipeline | Orchestrator at API/analysis | EvidenceModule wires full chain | **OK** |
| Module boundaries | Single responsibility packages | Interim split good; some dual-duty packages remain (see debt) | **Acceptable under Freeze** |
| Web | No engine imports | Confirmed — axios client only | **OK** |
| Report narrative | Injected port | `ReportBuilder(NarrativeGenerator)` wired in `evidence.module.ts` | **OK (Freeze v0.2)** |
| Dependency direction | Enforced | `pnpm boundaries` clean at review time | **OK** |

### 2.3 Architecture Drift

| ID | Drift | Severity | Notes |
|---|---|---|---|
| D1 | Docs 30–34 status headers lag delivered slice | Doc | Not runtime drift |
| D2 | Interim package names vs target `*-engine` | Naming | Documented; do not rename opportunistically |
| D3 | Report depends on `@fas/ai-provider` for **port type** + Prompt for composition | Mild | Freeze allows Report→Prompt→AI; concrete adapter is composition-root injected |
| D4 | Dual facts paths: Football Data vs Odds scores-goals-proxy | Product | Intentional until F.1.1 / stats enrichment; risk is epistemic confusion |
| D5 | Football Domain Model lives inside `@fas/provider-football` | Mild | Deliberately deferred split (single provider) |
| D6 | Analyze path always re-imports evidence | Mild | Correct for demo idempotency; not a separate “query-only analyze” mode |

### 2.4 Architecture Risk

| ID | Risk | Severity | Why it matters |
|---|---|---|---|
| R1 | Live `football:*` / `odds:*` require controller priming before sync `getMatch` | **High (ops)** | Wrong call order → false MATCH_NOT_FOUND |
| R2 | Analyze triggers `listUpcoming()` priming (board side-effect) | Medium | Couples analyze latency/cost to Match Center fan-out |
| R3 | Goals-proxy STATISTICS can look like shots/xG | Medium | Misread provenance without F.1.1 / clearer limitations |
| R4 | Default Evidence repository = memory | Medium | Restart loses imports; not private-production ready |
| R5 | Mega composition root (`evidence.module` + factories) | Medium | Correct for monolith; high blast radius on wiring changes |
| R6 | Worker has no durable jobs | Low (for now) | Matches ADR-002 target still open; do not invent Redis |

No Nest/Prisma leakage into engine packages was found. No Provider→Rule/Analysis reverse edges in production sources (depcruise).

---

## 3. Technical Debt

### 3.1 Highest-value refactors (when authorized — not now)

1. **Centralize match priming** behind one application port so controllers do not own multi-primer choreography.
2. **Clarify STATISTICS provenance UX/limitations** when football shots path vs odds goals-proxy coexist.
3. **Default or smoke-proven postgres Evidence path** for private durability (P-series), before Evaluation scoring loops.
4. **Collapse duplicate MatchLookup-shaped ports** (odds `MatchLookup` vs football `FootballMatchLookup`) into one application contract — only when a second football vendor appears or ports diverge.

### 3.2 Hotspots

| Area | Path | Issue |
|---|---|---|
| OpenAPI DTO gravity | `apps/api/src/http-response.dto.ts` | Large transport schema; drift risk vs domain |
| Upcoming board factory | `apps/api/src/upcoming-matches.factory.ts` | Mode matrix + fallbacks |
| Match provider factory | `apps/api/src/match-provider.factory.ts` | Football × odds mode wiring |
| Projection core | `packages/analysis/src/projection/compute-deterministic-projection.ts` | Dense policy; needs tests for every coefficient change |
| Live football catalog | `packages/provider-football/src/live/live-api-sports-match-catalog.ts` | Network + cache + enrichment |
| Goals-proxy | `packages/provider-odds/src/scores/build-team-form-from-scores.ts` | Proxy until true stats/xG |
| Empty shared domain shell | `packages/domain` | Underused vs real types elsewhere |

### 3.3 Naming / boundary notes

- Sprint id collisions historically: Match Center **C.1** vs future Case Engine — prefer KE/CE/SE/RE for engine sprints.
- `@fas/statistics` today = calibration artifacts, **not** full Statistics Engine productization.
- Do **not** create Feature/Prediction/Report governed engines (doc 34 VA-01–03).

### 3.4 Dependency direction

Frozen and enforced. Remaining debt is **layer skips inside Report** (Feature/Rule types for summary) — acceptable, lower priority than priming/persistence.

---

## 4. Vertical Slice / MVP Readiness

Clarification: “Backend 已开始实现” understates reality — the **private deterministic MVP vertical slice is already implemented and demoable**. Readiness below is for **continuing** MVP enrichment inside Freeze v0.2.

### 4.1 Ready

| Area | Why |
|---|---|
| Evidence → Feature → Rule → Projection → Report | End-to-end packages + tests |
| Match Center + analyze/import API | Operational private demo |
| Web Workspace / Library | Consumes sealed DTOs; no recomputation |
| Football Data primary schedule (F.1) | Facts≠odds split landed |
| Odds as optional market layer | Recorded/live paths exist |
| Local narrative | DI’d `NarrativeGenerator` |
| Quality gates | Biome, depcruise pipeline rules, Vitest projects, toolchain pins |
| Architecture Freeze v0.2 | Stable boundary for feature work |

### 4.2 Not Ready (gated / incomplete)

| Area | Why |
|---|---|
| True xG | Explicit F.1.1; not Free-tier guaranteed |
| Evaluation-qualified calibration | A.1 ships candidate only |
| Durable default Evidence | Memory default; postgres optional, smoke incomplete |
| Durable jobs / worker pipeline | ADR-002 target; no Redis without milestone |
| Knowledge / Case / Review / Evaluation engines | Not packages yet — correctly deferred |
| Auth / public deployment | Forbidden in V1 |
| Network AI SDK | Forbidden without gate |

### 4.3 Verdict

**Yes — the repository can continue real MVP development** inside frozen boundaries.

It is **not** a greenfield “start MVP from zero” moment; it is a **continue MVP on a working slice** moment. Do not pause for more architecture documents.

---

## 5. Repository Health Score

| Dimension | Score / 100 | Rationale |
|---|---|---|
| **Architecture** | **82** | Freeze holds; depcruise clean; composition root correct; priming/dual-path risks remain |
| **Documentation** | **68** | Live maps good; V2 headers (30–34) and doc 35 §17 stale |
| **Implementation** | **80** | Full private slice + F.1; persistence/jobs/xG incomplete by design |
| **Technical Debt** | **72** | Manageable; concentrated in factories/priming/proxy stats — not systemic chaos |
| **Maintainability** | **78** | Clear packages, tests, toolchain; mega wiring and doc lag reduce score |

### Overall: **76 / 100**

Interpretation: **Healthy for continued private MVP delivery.** Not yet private-production (v1.0) healthy — persistence, Evaluation, and ops smoke still required.

---

## 6. Next Recommendation

**Do not design new architecture. Do not add engines. Do not start Redis/BullMQ/microservices/public platform.**

### Build next

1. **Sprint F1.1** per `docs/40_PRODUCT_ROADMAP.md` (Player/Lineup/Injury/Referee/Recent Form); true xG is **Sprint F1.3**. Keep domain-model → Evidence mapping and provider replaceability rules from F.1. 
   - Prefer enriching STATISTICS from Football Data before inventing Injury/Lineup as required inputs.  
   - Keep Odds goals-proxy as explicit fallback only.

2. In parallel or immediately after (platform, not engines): **Compose / postgres Evidence smoke** so private demos survive process restart — prerequisite for serious Evaluation loops.

3. **Defer:** Knowledge / Case / Review engines; SportMonks; public v2.0; opportunistic `*-engine` renames.

### Explicit non-goals for the next phase

- No new governed engines  
- No Feature/Prediction/Report engine packages  
- No architecture redesign documents beyond gate specs for the chosen slice  
- No auth / public deployment  

---

## 7. Suggested documentation hygiene (optional, separate from coding)

These are **status banner** fixes only — not architecture redesign:

1. Doc 34 §1 — planning-accepted / historical header  
2. Doc 35 §17 — “slice delivered” wording  
3. Docs 30–33 — “full V2 design not implemented; slice subset may exist”  
4. Keep `PROJECT_STATE` / `PROJECT_INDEX` as the first read for delivery status  

---

## 8. Sign-off

| Item | Result |
|---|---|
| Architecture Frozen v0.2 still valid? | **Yes** |
| Safe to continue MVP feature work? | **Yes** |
| Need large refactor before next feature? | **No** |
| Next authorized development focus | **Sprint F1.1** per doc 40 (+ optional postgres smoke), under an explicit gate; xG = **F1.3** |

---

*End of Repository Health Check — 2026-07-20.*
