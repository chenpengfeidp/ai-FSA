# 40 — Product Roadmap (post Architecture Freeze v0.2)

| Field | Value |
|---|---|
| Status | **Active product roadmap** |
| Effective from | Architecture Freeze **v0.2** |
| Authority for sprint sequencing | **This document is the sole product roadmap** after v0.2. Every future Sprint Plan / Specification / Report must cite `docs/40_PRODUCT_ROADMAP.md` and the Sprint id used here. |
| Does not authorize | Code, APIs, schemas, package creation, Redis/BullMQ, public deployment, or new governed engines without a separate implementation gate |
| Does not redesign | Architecture Freeze boundaries; seven governed engines; epistemic split (facts / market / findings / inference) |
| Live delivery snapshot | [`PROJECT_STATE.md`](./PROJECT_STATE.md) |
| Health baseline | [`36_PROJECT_HEALTH_CHECK.md`](./36_PROJECT_HEALTH_CHECK.md) |
| Phase | **Product development** (architecture-design phase closed under Freeze v0.2) |

### Project Governance Rule (binding)

From the current version forward (Architecture Freeze v0.2 + this roadmap):

1. **Do not add new Architecture documents** unless an architecture defect is found.
2. **Do not add a new Engine** unless current governed engines cannot meet the need.
3. **After each Sprint, prioritize implementation code, tests, and validation** — not more design documents.
4. **Every new Sprint must cite this file** (`docs/40_PRODUCT_ROADMAP.md`) and its Sprint id.
5. **Every Sprint must define** clear inputs, outputs, acceptance criteria, and a completion report.

Goal: keep ai-FSA in **product R&D**, not reopen an architecture-design loop.

### Naming note (supersession)

Earlier delivery notes sometimes used **“F.1.1 = true xG”** as an informal next-step label.  
**This roadmap supersedes that product naming:**

| Id in this roadmap | Product meaning |
|---|---|
| **Sprint F1.1** | Player / Lineup / Injury / Referee / richer recent form |
| **Sprint F1.2** | Advanced match statistics (shots, possession, corners, …) |
| **Sprint F1.3** | Expected Goals (xG / xGA / chance quality / shot map / finishing) |

Historical Match Center slice **C.1** (fixtures board) is **not** the same as **Sprint C1** (Case Engine) below. Always write the full name when citing.

### Epistemic language

- Product stages may say “prediction” only as a **label for sealed deterministic projections** already produced by the analysis path.
- Outputs are never wagering advice.
- AI drafts and reviews; humans publish; learning never auto-activates.

---

## Baseline — v0.2 (Completed)

### Goal

Freeze architecture and prove a private, reviewable deterministic vertical slice before expanding product depth.

### Delivered capabilities (product view)

| Item | Product meaning |
|---|---|
| Architecture Frozen v0.2 | Stable pipeline and package boundaries for long-term feature work |
| Vertical Slice 1.0–1.4 (+ B/C/A/P paths) | Import evidence → features → rules → projection → report → local narrative; Match Center / Workspace / Library |
| F.1 Football Data ≠ Odds | Match facts from Football Data; odds remain optional market layer |
| Repository Health Check (doc 36) | Confirmed freeze holds; ready to continue MVP enrichment |

### Acceptance (baseline)

- Private demo can analyze a match from controlled / football-data evidence without public auth.
- Odds failure does not own the Match Center schedule when Football Data mode is active.
- No Redis / public platform / network AI required for the baseline claim.

### Status

**Done.** All sprints below assume this baseline.

---

## Sprint F1.1 — Player Analysis, Lineup, Injury, Referee, Recent Form

### Goal

Deepen **pre-match football context** beyond team-level form/stats: who plays, who is missing, who officiates, and clearer recent form narrative.

### New capabilities

- Player-level relevance for the upcoming match (availability / expected participation signals as product concepts)
- Starting lineup / probable lineup presentation (when available)
- Injury / suspension / availability signals as first-class analytical inputs
- Referee identity and basic referee tendency context (when available)
- Richer recent form windows (still evidence-backed, not narrative invention)

### Inputs

- Existing match identity and team context from Football Data path
- Provider-backed player / lineup / injury / referee / recent results facts (availability depends on data plan)
- Explicit uncertainty when a signal is missing

### Outputs

- Reviewable match context bundle: lineup / availability / referee / recent form sections
- Analysis and report surfaces that can **cite** these signals without treating them as market truth
- Clear “missing / incomplete” states when data is absent

### Acceptance criteria

1. Analyst can see lineup / injury / referee / recent form for a supported match when data exists.
2. Missing signals fail explicitly in the UI/report limitations — never silent empty success.
3. These signals remain **facts or market-adjacent facts**, not AI guesses.
4. Deterministic projection still runs when only the current minimum evidence set exists (backward compatible).
5. Sprint Plan/Spec/Report cite this roadmap id **F1.1**.

### Dependencies

- Baseline v0.2 + F.1 Football Data path
- Does **not** require F1.2 / F1.3 / engines K/C/S/R

### Estimated complexity

**M** (medium) — several new evidence kinds and product surfaces; provider coverage variance is the main risk.

### Estimated duration

**2–3 weeks** (one focused delivery slice, including offline recorded fixtures for CI).

---

## Sprint F1.2 — Advanced Match Statistics

### Goal

Replace thin / proxy team statistics with **real advanced match statistics** as first-class analytical inputs.

### New capabilities

- Shots  
- Shots on target  
- Possession  
- Corners  
- Cards  
- Dangerous attacks  
- Expected points (team strength / form summary signal, product-level)

### Inputs

- Team and competition context for a match window
- Provider-backed advanced statistics (recorded + live modes as product modes)
- Explicit stats basis / completeness flags

### Outputs

- Reviewable STATISTICS (and related) evidence that analysts can trust as measurements, not goals-proxy
- Features / findings / report sections that surface these numbers with provenance
- Limitations text when a metric is unavailable for a league or plan tier

### Acceptance criteria

1. For recorded demo matches, advanced stats appear with non-proxy provenance where claimed.
2. Projection / report no longer *requires* goals-proxy for the happy path on football-data matches.
3. Each metric is independently absent-safe (partial stats allowed with explicit gaps).
4. Odds goals-proxy path remains optional fallback only, clearly labeled.
5. Sprint artifacts cite roadmap id **F1.2**.

### Dependencies

- Baseline v0.2 + F.1  
- **F1.1 recommended first** (shared enrichment of Football Data depth), but F1.2 may proceed if gated to team-only stats without player/lineup — prefer F1.1 → F1.2

### Estimated complexity

**M–L** (medium–large) — metric catalog + provenance + UI explanation load.

### Estimated duration

**2–4 weeks**.

---

## Sprint F1.3 — Expected Goals (xG)

### Goal

Introduce **true expected-goals quality** into the product, including defensive xG and chance/finishing quality views.

### New capabilities

- xG (for)  
- xGA (against)  
- Chance quality  
- Shot map (reviewable visualization / structured shot events as product output)  
- Finishing quality (conversion vs chance quality)

### Inputs

- F1.2-class shot / attack statistics where required  
- Provider or derived xG fields with explicit basis  
- Match and team identity

### Outputs

- xG / xGA and quality metrics in evidence / workspace / report  
- Shot map suitable for private analyst review (not public betting UX)  
- Clear separation: xG is a **modelled attacking metric**, not a fact identical to goals

### Acceptance criteria

1. xG / xGA available on supported recorded matches with provenance.
2. Product copy never presents xG as observed goals or as wagering advice.
3. Projection path may **consume** xG when present; must still run without xG (explicit limitation).
4. Shot map / chance quality visible in Workspace or report for at least one demo competition.
5. Sprint artifacts cite roadmap id **F1.3**.

### Dependencies

- **F1.2** (advanced shots / attack stats) strongly required  
- F1.1 helpful but not strictly blocking if team-level xG only

### Estimated complexity

**L** (large) — data availability, epistemic labelling, and projection policy impact.

### Estimated duration

**3–5 weeks**.

---

## Sprint A1 — Prediction Evaluation

### Goal

Close the loop: **sealed projection → actual result → scored evaluation**, so the product can learn what “good” means.

### New capabilities

- Prediction → result pairing  
- Accuracy  
- Hit rate  
- ROI-style paper metrics (non-wagering, research framing only)  
- Confidence validation (did high confidence win more often?)

### Inputs

- Historical sealed analysis reports / projections  
- Official or curated match results  
- Defined evaluation windows and markets-under-test (e.g. 1X2 only at first)

### Outputs

- Evaluation reports per period / league / rule-set version  
- Leaderboards or tables for accuracy / hit rate / confidence reliability  
- Explicit “not production-qualified” until A2 / Evaluation Engine policy says so

### Acceptance criteria

1. At least one recorded population can be scored end-to-end without manual spreadsheet work.
2. Metrics are reproducible from sealed inputs + result feed.
3. ROI-style metrics carry non-advice disclaimers.
4. Failed / incomplete analyses are excluded with explicit rules.
5. Sprint artifacts cite roadmap id **A1**.

### Dependencies

- Baseline vertical slice (projections exist)  
- Durable or exportable analysis history (product dependency: persistence maturity)  
- **Does not require** K1/C1/S1/R1  
- Prefer after F1.2+ so evaluations are not dominated by proxy stats noise (not a hard block)

### Estimated complexity

**L**

### Estimated duration

**3–4 weeks**.

---

## Sprint A2 — Calibration

### Goal

Turn evaluation evidence into **calibration** of probabilities and confidence, still under human/Evaluation governance.

### New capabilities

- Probability calibration  
- Confidence calibration  
- Historical calibration curves  
- Consumable calibration artifacts for analysis (qualified vs candidate status remains governed)

### Inputs

- A1 evaluation datasets and metrics  
- Versioned projection outputs  
- Governance rules for what may become “qualified”

### Outputs

- Calibration curves and artifact versions  
- Analysis consumption of calibrated probabilities/confidence when artifact is approved  
- Clear candidate vs qualified lifecycle in the product

### Acceptance criteria

1. A calibration curve can be produced from A1 outputs and reviewed by a human.
2. Analysis can pin an artifact id; runs remain reproducible.
3. No automatic promotion from candidate → qualified without review step (product rule).
4. Identity / demo population artifacts remain available as fallbacks.
5. Sprint artifacts cite roadmap id **A2**.

### Dependencies

- **A1** required  
- Statistics / Evaluation product ownership as described in Bible (no new engine invention in this roadmap stage beyond activating the governed Statistics/Evaluation *capabilities*)

### Estimated complexity

**L**

### Estimated duration

**3–5 weeks**.

---

## Sprint K1 — Knowledge Engine

### Goal

Activate the **Knowledge Engine** product capability: governed football knowledge that analysis may retrieve under policy — never silent invent.

### New capabilities

- Football knowledge base (approved entries)  
- League characteristics  
- Playing style descriptors  
- Coach profiles / tendencies (governed)  
- Tactical pattern library (governed)

### Inputs

- Human-approved knowledge records with version and provenance  
- Match/league/team context for retrieval queries  
- Retrieval policy (what may be attached to an analysis)

### Outputs

- Knowledge hits attached to an analysis with citations  
- Reviewable “knowledge used” section in Workspace/report  
- Explicit empty result when nothing approved matches

### Acceptance criteria

1. Only approved, versioned knowledge can appear in an analysis.
2. Retrieval is replayable for a sealed analysis.
3. Knowledge never overwrites deterministic projection numbers.
4. Offline demo includes a small approved knowledge set.
5. Sprint artifacts cite roadmap id **K1**.

### Dependencies

- Baseline analysis/report surfaces  
- Prefer after A1 so knowledge impact can later be evaluated (soft dependency)

### Estimated complexity

**L**

### Estimated duration

**4–6 weeks**.

---

## Sprint C1 — Case Engine (Historical Similar Matches)

### Goal

Activate the **Case Engine** product capability: similar historical matches as analogies — labelled as analogies, not proof.

### New capabilities

- Historical similar match search  
- Case retrieval  
- Case similarity presentation  
- Analogy sections in analysis review UI

### Inputs

- Historical match library with features/outcomes  
- Current match sealed feature context  
- Similarity policy version

### Outputs

- Ranked similar cases with similarity rationale (product-level)  
- Explicit “analogy / not causal proof” labelling  
- Optional link from case → prior report

### Acceptance criteria

1. At least one demo match returns a non-empty similar-case set from recorded history.
2. Cases never auto-change 1X2 probabilities.
3. Similarity policy version is visible on the analysis.
4. Empty library fails explicitly.
5. Sprint artifacts cite roadmap id **C1** (**Case Engine**, not Match Center C.1).

### Dependencies

- Baseline features/projections  
- Prefer **K1** not required; prefer **F1.2+** so similarity uses real stats  
- Soft dependency on A1 for later measuring case usefulness

### Estimated complexity

**L**

### Estimated duration

**4–6 weeks**.

---

## Sprint S1 — Statistics Engine (Product Activation)

### Goal

Activate broader **Statistics Engine** product surfaces beyond calibration artifacts: historical distributions, trends, and league-level stats rebuildable from governed inputs.

### New capabilities

- Historical distributions (e.g. goals, shots, xG when present)  
- Trend analysis (form/performance over time)  
- League statistics dashboards / comparables  
- Rebuildable metric versions for review

### Inputs

- Historical match and event statistics warehouse (product data readiness)  
- Metric definitions and versions  
- League/season filters

### Outputs

- Statistics views for analysts  
- Versioned metric outputs consumable by Evaluation / Calibration / Knowledge  
- No release decision power (Evaluation still decides qualification)

### Acceptance criteria

1. A league-season distribution can be rebuilt and shown for a demo league.
2. Metric version + input snapshot identity are visible.
3. Statistics outputs are deterministic for pinned inputs.
4. Does not publish analyses or auto-qualify calibration.
5. Sprint artifacts cite roadmap id **S1** (**Statistics Engine**).

### Dependencies

- F1.2 / F1.3 enrich the metric catalog (soft → strong for xG trends)  
- A1/A2 benefit from S1 but A1 can start earlier with thinner metrics  
- Preferred order: **A2 before or interleaved with early S1** if calibration needs distributions — default: **A2 → S1** unless a thin S1 MVP is gated separately

### Estimated complexity

**L–XL**

### Estimated duration

**5–8 weeks**.

---

## Sprint R1 — AI Review

### Goal

Add **AI-assisted review** of sealed analyses: reasoning quality and consistency checks — still non-authoritative drafts.

### New capabilities

- LLM self-review of narrative / explanation drafts  
- Prediction (projection) review against evidence completeness  
- Reasoning quality checklist / scores (advisory)  
- Reviewer queue for human acceptance

### Inputs

- Sealed AnalysisReport + evidence summary + rule findings  
- Prompt manifests / review policies  
- Optional Evaluation metrics when available

### Outputs

- AI review draft attached to an analysis (epistemic kind: inference / review proposal)  
- Human accept / reject / edit path  
- No automatic change to deterministic numbers

### Acceptance criteria

1. AI review never mutates sealed projection fields.
2. Review draft is reproducible under pinned prompt/manifest versions (within provider nondeterminism policy — product must state limits).
3. Human can dismiss review without blocking publication in private mode.
4. Works with local/deterministic narrator first; network LLM only under a separate infra gate.
5. Sprint artifacts cite roadmap id **R1**.

### Dependencies

- Baseline report + narrative  
- Prefer **A1** so reviews can mention evaluation context  
- Prefer **K1/C1** optional enrichment  
- Network LLM provider remains a **separate infrastructure gate** (not implied by R1 product scope)

### Estimated complexity

**M–L**

### Estimated duration

**3–5 weeks** (local review first); longer if network LLM gate is included.

---

## v1.0 — Private Production

### Goal

Run FAS as a **trusted private production** system for a closed analyst group — still not a public platform.

### New capabilities (product)

- Hardened private deployment topology  
- Durable analysis history and evidence retention suitable for real use  
- Operational readiness (backup, restore, monitoring expectations — product level)  
- Evaluation/calibration governance usable in day-to-day private ops  
- Explicit support boundaries (leagues, data freshness, SLAs)

### Inputs

- Completed F-series depth agreed for v1.0 scope (minimum: F1.2; target: F1.3)  
- A1 + A2 at least in candidate/qualified hybrid acceptable to stakeholders  
- Persistence and ops checklists

### Outputs

- Private production acceptance record  
- Supported league/data matrix  
- Operator runbook (product/ops, not code)

### Acceptance criteria

1. Private analysts can run daily workflows without losing history across restarts.
2. No public auth/multi-tenant claims.
3. Wagering advice remains forbidden in all surfaces.
4. Architecture Freeze boundaries still hold (no silent engine invention).
5. Stakeholder sign-off recorded against this roadmap stage **v1.0**.

### Dependencies

- F1.1–F1.3 as scoped for v1.0  
- A1 required; A2 strongly required for any “calibrated” claim  
- K1/C1/S1/R1 optional for v1.0 MVP private — may ship as v1.0+  
- Infra gates (jobs, backups) as needed — separate from this product doc’s design authority

### Estimated complexity

**XL**

### Estimated duration

**6–10 weeks** after prerequisite sprints (calendar depends on scope freeze).

---

## v2.0 — Public Platform

### Goal

Evolve FAS into a **public platform** with accounts, tenancy, and commercial boundaries — only after private production is proven.

### New capabilities (product)

- Public users / auth / tenancy  
- Product packaging (subscriptions or equivalent — TBD commercially)  
- Public-safe UX (no wagering advice; compliance copy)  
- Scale-oriented reliability and abuse controls  
- Optional notifications and collaboration features

### Inputs

- v1.0 private production acceptance  
- Legal/compliance review  
- Multi-tenant product policies

### Outputs

- Public launch checklist  
- Tenant isolation guarantees (product)  
- Support and incident processes

### Acceptance criteria

1. Auth and tenant isolation verified.
2. Public surfaces cannot be mistaken for betting tips.
3. Architecture still evidence-first and reviewable.
4. Commercial model documented separately.
5. Stage cited as roadmap **v2.0**.

### Dependencies

- **v1.0** required  
- Typically K1/C1/S1/R1 desirable for public differentiation  
- Major infra/security gates (out of scope for this product-only doc)

### Estimated complexity

**XL**

### Estimated duration

**3–6+ months** after v1.0 (indicative).

---

## Roadmap Timeline (indicative)

Durations are **engineering-calendar estimates** for a small team (≈1–2 full-time equivalents on FAS). They assume Architecture Freeze holds and no major infra detour.

```text
v0.2 Baseline                          ████ DONE
Sprint F1.1  Player/Lineup/Injury/...  ░░ 2–3w
Sprint F1.2  Advanced match stats      ░░░ 2–4w
Sprint F1.3  xG / xGA / shot map       ░░░░ 3–5w
Sprint A1    Prediction evaluation     ░░░ 3–4w
Sprint A2    Calibration               ░░░░ 3–5w
Sprint K1    Knowledge Engine          ░░░░░ 4–6w
Sprint C1    Case Engine               ░░░░░ 4–6w
Sprint S1    Statistics Engine         ░░░░░░ 5–8w
Sprint R1    AI Review                 ░░░ 3–5w
v1.0         Private Production        ░░░░░░░ 6–10w (after prerequisites)
v2.0         Public Platform           ░░░░░░░░░░ 3–6+ months after v1.0
```

### Suggested calendar bands (not commitments)

| Phase | Indicative window after v0.2 |
|---|---|
| F1.1 → F1.3 | ~2–3 months |
| A1 → A2 | ~1.5–2.5 months (may overlap late F1.3) |
| K1 → C1 → S1 → R1 | ~4–6 months (serial) or less if parallelized carefully |
| v1.0 | After F-series + A1/A2 minimum scope freeze |
| v2.0 | After v1.0 acceptance only |

---

## Sprint Dependency Graph

```text
                    [v0.2 Baseline — DONE]
                              |
                              v
                          [F1.1]
                              |
                              v
                          [F1.2]
                              |
                              v
                          [F1.3]
                             / \
                            /   \
                           v     v
                        [A1]     |
                           \     |
                            \    |
                             v   v
                             [A2]
                               |
              +----------------+----------------+
              |                |                |
              v                v                v
            [K1]             [C1]             [S1]
              |                |                |
              +-------+--------+--------+-------+
                      |                 |
                      v                 v
                    [R1] <---- (soft: A1/A2 context)
                      |
                      v
                   [v1.0 Private Production]
                      |
                      v
                   [v2.0 Public Platform]
```

### Dependency rules (product)

| From | To | Rule |
|---|---|---|
| v0.2 | F1.1 | Hard |
| F1.1 | F1.2 | Preferred hard (shared Football Data depth) |
| F1.2 | F1.3 | Hard |
| F1.2 / F1.3 | A1 | Soft preferred (better signal quality) |
| Persistence maturity | A1 | Soft product dependency (history must survive) |
| A1 | A2 | Hard |
| A2 | S1 | Preferred (calibration/distributions collaboration) |
| F1.2+ | C1 | Soft preferred |
| Baseline | K1 / C1 / R1 | Hard (need analysis/report surfaces) |
| A1 | R1 | Soft preferred |
| F1.x + A1/A2 (+ optional K/C/S/R) | v1.0 | Scope freeze required |
| v1.0 | v2.0 | Hard |

### Parallelism allowed

- After **F1.2**: early **A1** spike on recorded populations may start while **F1.3** proceeds — only if evaluation population is frozen and labelled as pre-xG.
- **K1** and **C1** may proceed in parallel after A2 (or after F1.3 if staffing allows), provided neither blocks the other.
- **S1** should not block **R1** if R1 stays on local/narrative review only.

### Forbidden jumps

- Do not start **v2.0** before **v1.0** acceptance.  
- Do not claim **calibrated production accuracy** before **A2** qualification rules exist.  
- Do not treat **R1** AI review as authority over deterministic numbers.  
- Do not invent new governed engines outside Bible names when executing K1/C1/S1/R1 — these sprints **activate** existing engine slots.

---

## How future sprints must cite this document

Every Sprint Planning / Specification / Report must include:

```text
Roadmap: docs/40_PRODUCT_ROADMAP.md
Sprint id: <F1.1 | F1.2 | F1.3 | A1 | A2 | K1 | C1 | S1 | R1 | v1.0 | v2.0>
```

And must state **inputs**, **outputs**, **acceptance criteria**, and (at close) a **completion report**. Prefer shipping code + tests + validation evidence over expanding design docs.

If a sprint is split, use suffixes: `F1.2a`, `F1.2b`, still pointing at the parent roadmap section.

---

## Out of scope for this roadmap document

- Class design, interfaces, package layouts, API routes  
- Provider vendor selection beyond existing F.1 decisions  
- Redis / BullMQ / microservices  
- Commercial pricing details for v2.0  
- Changing Architecture Freeze or the seven-engine Bible set  

---

*End of Product Roadmap — authoritative for post–v0.2 sprint sequencing.*
