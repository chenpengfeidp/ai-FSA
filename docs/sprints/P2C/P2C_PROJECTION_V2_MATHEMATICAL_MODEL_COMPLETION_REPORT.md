# P2C — Projection V2 Mathematical Model Completion Report

| Field | Value |
|---|---|
| Sprint | **P2C** Projection V2 Mathematical Model |
| Date | 2026-07-30 |
| Authority | Architecture Freeze v0.3 · P2A · P2B · A1.5 Projection Framework · A2 Calibration Framework · `docs/40_PRODUCT_ROADMAP.md` (citation gap — see §0) |
| Scope | Design-only formal mathematics for Projection V2: unified probability space, Feature→λ, script weighting, confidence decomposition, governed parameters |
| Explicit exclusions | Production code · package changes · Evidence / Feature / Rule redesign · ML · LLM |

---

## 0. Governance note (roadmap citation gap)

**P2C** is not yet listed in `docs/40_PRODUCT_ROADMAP.md`. Add P2A, P2B, P2C, and proposed implementation ids **P2D**–**P2M** before any coding sprint in this track.

**Sprint id note:** P2B §10 used **P2C** for Football State **coding**. This design sprint **P2C** is the math specification. Implementation sprints are renumbered **P2D** onward in the P2C design (§10).

---

## 1. Completion summary

P2C formalizes the deterministic mathematics for Projection V2, replacing V1's **Independent Poisson + flat Rule softmax** with a **single unified joint scoreline matrix** from which all outputs derive.

**Core equation:**

```text
P̃(i,j) = normalize( Σ_s w_s · P_s(i,j | μ^s_h, μ^s_a, ρ) )
```

All of 1X2, scorelines, goal range, BTTS, and O/U are **marginals of P̃**. Rule influence enters via Football State → Match Script → expected goals — not orphan softmax.

All coefficients belong to **ProjectionParameterArtifact** governance — not hard-coded in Projection logic.

---

## 2. Deliverables produced

| # | Deliverable | Location |
|---|---|---|
| 1 | Projection V2 mathematical architecture | [`P2C_PROJECTION_V2_MATHEMATICAL_MODEL.md`](./P2C_PROJECTION_V2_MATHEMATICAL_MODEL.md) §3 |
| 2 | Unified probability model | §4 |
| 3 | Feature → λ mapping | §5 |
| 4 | Scenario weighting model | §6 |
| 5 | Confidence decomposition | §7 |
| 6 | Governed parameter model | §8 |
| 7 | Migration strategy | §9 |
| 8 | Recommended coding sequence | §10 |

---

## 3. Files changed

| File | Change |
|---|---|
| `docs/sprints/P2C/P2C_PROJECTION_V2_MATHEMATICAL_MODEL.md` | **Added** — main design document |
| `docs/sprints/P2C/P2C_PROJECTION_V2_MATHEMATICAL_MODEL_COMPLETION_REPORT.md` | **Added** — this report |

**No production code, packages, or upstream architecture were modified.**

---

## 4. Key findings (V1 mathematical defects)

| ID | Defect | V2 fix |
|---|---|---|
| M-01 | Dual basis (1X2 post-rule, scorelines pre-rule) | Single P̃ for all outputs |
| M-02 | Orphan Rule softmax | Rules → State → Script → μ only |
| M-03 | Weak draw modeling | Dixon–Coles ρ + low_event script |
| M-04 | No BTTS/O/U | Derived from P̃ |
| M-07 | Intelligence bypasses λ | Feature-enriched μ⁰ |
| M-08 | Confidence decoupled from distribution | P_conf from matrix entropy |

---

## 5. Key design decisions

| Decision | Rationale |
|---|---|
| Script mixture of Poisson matrices | Lowest-risk multi-modal model; P2A recommendation D |
| Dixon–Coles optional via artifact | Improves draw without new engine |
| Marginal calibration via IPF reconcile | Preserves matrix coherence after A2 map |
| Five-component confidence | Separates evidence, reasoning, projection, scenario, history |
| `projectionParams:v3.0:baseline` with zero intelligence weights initially | Safe migration; enable groups after replay validation |
| Market Features excluded from μ/P̃ | Freeze v0.3 preserved |

---

## 6. Quality gates

| Check | Result |
|---|---|
| Production code changes | **None** |
| Package modifications | **None** |
| Evidence/Feature/Rule redesign | **None** |
| Architecture Freeze v0.3 | **Unchanged** |
| All 8 deliverables present | **Yes** |

---

## 7. Remaining limitations

- IPF reconcile algorithm specified at design level only — needs convergence tests in P2L coding.  
- Feature weight defaults are structural estimates — require Evaluation History replay before promotion.  
- Negative Binomial variance deferred to post-V2 pin if sub-mix insufficient.  
- doc 40 does not yet list P2A/P2B/P2C or P2D–P2M.

---

## 8. Recommended next sprint

| Priority | Sprint | Rationale |
|---|---|---|
| 1 (unchanged) | **M1B** Manager Intelligence consume | Authorized implementation |
| 2 (after P2C review) | **P2D** ProjectionParameterArtifact + identity baseline | First math implementation step |
| 3 (governance) | doc 40 update | Add Prediction Intelligence track ids |

---

## Sign-off

| Item | Status |
|---|---|
| P2C Projection V2 Mathematical Model | **Complete (design only)** |
| Production code changes | **None** |
| Next authorized coding (unchanged) | **M1B** |

---

*End of P2C Completion Report.*
