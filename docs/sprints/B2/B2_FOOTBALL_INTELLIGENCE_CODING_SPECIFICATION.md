# B2 — Football Intelligence Coding Specification

| Field | Value |
|---|---|
| Sprint id | **B2** |
| Document type | Coding Specification (**Coding Law**) |
| Purpose class | Prescribe **how** Football Intelligence code must be written |
| Governing (read-only) | Project Bible; Architecture Freeze **v0.2**; docs 17 / 18; `DEVELOPMENT_WORKFLOW` |
| Design inputs | A0, A0.5, A1, A1.5, A1.8, A1.9, A1.10, A1.11, A2, A2.5, A3, A4, **B0**, **B1** |
| Status | Specification complete — **does not by itself authorize a coding sprint** |
| Explicitly excluded | Production code in this deliverable; DTO design; schema design; Bible / Freeze / docs 17 / docs 18 edits; new Engines; new packages; architecture redesign |

---

## 0. Authority and Position

```text
Design (A0–A4)
  → Architecture Mapping (B0)
  → Implementation Blueprint (B1)
  → Coding Specification (B2)   ← this document = Coding Law
  → Coding Sprint (requires A4 Coding Gate + human authorization)
```

| Document | Answers |
|---|---|
| A0–A4 | **What** Intelligence means |
| B0 | **Where** it lives in Freeze |
| B1 | **How** the repo is organized before coding |
| **B2** | **How every line of Intelligence code must be written** |

**B2 is not Architecture, not Blueprint, not Package Mapping.**  
It is the highest encoding-norm document for all future Football Intelligence Coding Sprints. When B2 conflicts with informal agent habit, **B2 wins** for Intelligence code. When B2 conflicts with Bible / Freeze / docs 17–18, **stop and escalate** — do not “fix” authority docs from a coding sprint.

**Normative language**

| Word | Meaning |
|---|---|
| **MUST** | Required; failing it fails the Coding Sprint |
| **MUST NOT** | Forbidden |
| **SHOULD** | Default; deviate only with recorded justification in review |
| **MAY** | Optional within stated bounds |

---

## 1. Package Coding Rules

1. **MUST** implement Intelligence changes only inside packages mapped by B0/B1 (`@fas/evidence`, `@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report`, `@fas/statistics`, `@fas/database`, related existing packages, `apps/api`, `apps/worker`).
2. **MUST NOT** create new packages, Engines, or “`*-engine`” Intelligence packages from a Coding Sprint.
3. **MUST** export only intentional public API from each package `index.ts` (or existing package entry); **MUST NOT** re-export Prisma types, Nest types, or Provider SDK types.
4. **MUST** keep package responsibility single: Evidence owns Facts; Feature owns derivation; Rule owns findings; Analysis owns Projection/Scenario/Confidence/pins; Report owns seal/narrative assembly; Statistics owns metric/calibration projections; database owns Prisma.
5. **MUST NOT** put pipeline orchestration inside `@fas/feature`, `@fas/rule`, or `@fas/evidence` beyond their stage operations.
6. **MUST** place new files under the owning package’s existing layer folders (B1 directory blueprint); **MUST NOT** invent a parallel root tree outside the package.
7. **MUST** treat `@fas/config` as id/selector only — **MUST NOT** embed Rule/Projection/Feature policy semantics in env parsing.
8. **MUST NOT** add Redis, BullMQ, pgvector, microservices, or new provider SDKs without a separate Architecture Review Gate (A4).

---

## 2. Domain Coding Rules

1. **MUST** use strict TypeScript; public functions and exports **MUST** have explicit return types.
2. **MUST** use `unknown` at trust boundaries; **MUST NOT** use `any`.
3. **MUST** prefer discriminated unions for states and result variants; **MUST** handle unions exhaustively (no silent `default` that drops variants).
4. **MUST** keep domain modules pure regarding time, randomness, network, filesystem, env, and Nest/Prisma/Provider SDKs — inject clocks/ids through ports when needed.
5. **MUST** encode invariants in types and constructors/factories; **MUST NOT** allow invalid aggregates to be constructed as “empty success.”
6. **MUST** separate Facts, market signals, Features, Rule findings, Projection probabilities, Scenarios, Confidence, Narrative, and inference — never collapse labels in domain types.
7. **MUST NOT** import `apps/*`, NestJS, Next.js, Prisma client, or Provider SDKs from domain code.
8. **MUST** use canonical domain language; **MUST NOT** use “prediction” as a synonym for analysis pipeline stages where Bible distinguishes analysis / report / history.
9. **MUST** name version identities as value objects (e.g. FeatureModelVersion, RuleSetVersion) — opaque string ids without parsing policy in callers.
10. **SHOULD** keep domain files small and focused; one primary concept per file when practical.

---

## 3. Application Coding Rules

1. **MUST** put orchestration in application/use-case modules of the owning package (AnalyzeMatch in `@fas/analysis`; GenerateReport in `@fas/report`).
2. **MUST** depend on ports + domain contracts; **MUST NOT** depend on controllers, Prisma, or Provider SDKs.
3. **MUST** enforce Compatibility Profile pins before Feature/Rule/Projection stages run under pinned versions (A1.11).
4. **MUST** fail explicitly when pins are missing, incompatible, or Evidence is not cutoff-qualified — **MUST NOT** substitute silent defaults that invent Facts or Features.
5. **MUST** keep pre-match application paths **outcome-blind** (doc 17) — **MUST NOT** read verified Actual into AnalyzeMatch / Projection / Scenario / Confidence.
6. **MUST NOT** rewrite sealed Prediction History or sealed Match Reports from Calibration, Experiment, Promotion, or Rollback use-cases.
7. **MUST** limit Promotion/Rollback/Experiment effects to **future** pin selection only (A2 / A2.5 / A4).
8. **MUST** translate errors at application boundaries into typed application failures with safe causal context; **MUST NOT** catch-and-ignore.
9. **MUST** design commands for idempotency where retries are possible (import, job handlers, seal writes).
10. **MUST NOT** auto-activate learning: Statistics/AI may propose; Evaluation gates + human commands promote.

---

## 4. Port Rules

1. **MUST** define ports as framework-neutral TypeScript interfaces (or equivalent function types) in the owning package’s `ports/` (or existing ports location).
2. **MUST** express port inputs/outputs as domain/application contracts — **MUST NOT** put Prisma models, Nest `Request`, or SDK response classes on port surfaces.
3. **MUST** name ports by capability (`FeatureExtractionOperation`, `EvidenceByMatchQuery`, `EvaluationGatePort`) — not by infrastructure brand.
4. **MUST** keep one clear purpose per port; **SHOULD** avoid god-ports that span Evidence+Feature+Rule.
5. **MUST** document owner package and consumer in code review when introducing a new port (align with B1 §6).
6. **MUST NOT** call adapters directly from domain; application depends on port abstractions.
7. **MUST** treat AI/provider outputs entering through ports as untrusted inputs requiring validation before domain acceptance.

---

## 5. Adapter Rules

1. **MUST** implement ports at edges: `@fas/database` for persistence; `@fas/provider-*` for raw captures; `@fas/ai-provider` for narrative rewrite/local narrator.
2. **MUST** map adapter I/O to application contracts before returning — **MUST NOT** leak SDK/Prisma types upward.
3. **MUST** confine Provider adapters to Evidence intake; **MUST NOT** let Feature, Rule, or Projection import Provider adapters.
4. **MUST** confine AI adapters to narrative (and prompt-backed rewrite) under Report ownership; **MUST NOT** let AI adapters write Facts, Features, Rule findings, Projection distributions, or seal lineage.
5. **MUST NOT** publish or mutate domain state from Provider/AI adapters except through owning application commands.
6. **MUST** fail explicitly on provider/AI transport errors; **MUST NOT** convert failure into empty FeatureBundle or empty RuleResult.
7. **SHOULD** keep adapters thin: translate, validate at boundary, invoke port contract — no Projection math inside adapters.

---

## 6. Repository Rules

1. **MUST** implement Intelligence persistence repositories only in `@fas/database` (or existing database-owned adapter locations).
2. **MUST** return domain/application contracts from repository methods — **MUST NOT** return Prisma records as public contracts.
3. **MUST** provide append/create paths for sealed history/reports; **MUST NOT** expose “update seal in place” or “rewrite history” APIs for Calibration/Experiment.
4. **MUST** preserve checksum/lineage fields exactly as supplied by Report/Analysis seal logic — repositories **MUST NOT** recompute business projections.
5. **MUST** translate persistence errors at the adapter boundary; **MUST NOT** swallow unique-constraint/idempotency conflicts without typed handling.
6. **MUST NOT** let `@fas/feature`, `@fas/rule`, or Analysis domain modules import repository implementations — only ports.
7. **SHOULD** keep mappers pure and unit-testable separately from Prisma client wiring.

---

## 7. Use Case Rules

| Use case | Home | Coding MUST | Coding MUST NOT |
|---|---|---|---|
| **AnalyzeMatchUseCase** | `@fas/analysis` | Run pipeline stages in order via ports; enforce pins; return typed AnalysisResult | Embed Nest; seal report; fit calibration; read Actual |
| **GenerateReportUseCase** | `@fas/report` | Assemble narrative + explainability index; seal from AnalysisResult | Recompute Feature/Projection; author Facts |
| **ReplayPredictionUseCase** | `@fas/analysis` | Reproduce under identical pins + Evidence selection identity | Retarget seals to “latest” challenger pins |
| **EvaluatePredictionUseCase** | Evaluation slot + history coordination | Compare seal to verified Actual; emit evaluation inputs | Mutate pre-match seals; auto-promote |
| **CalibrationUseCase** | `@fas/statistics` (+ gates) | Fit/validate artifacts; emit artifact ids | Rewrite history; decide release alone |
| **ExperimentUseCase** | `@fas/analysis` coordination | Assign arms for future pins | Hijack Replay of original seals |
| **PromotionUseCase** | Analysis coordination + gates + human command | Switch **future** default pins after gate pass | Auto-promote from Statistics |
| **RollbackUseCase** | Same as Promotion | Restore prior approved pin ids for future runs | Delete or alter Prediction History |

General use-case rules:

1. **MUST** name files/types with `*UseCase` (or existing repo convention already used, e.g. `analyze-match-use-case.ts`) and keep a single primary entry method.
2. **MUST** accept explicit input objects and return explicit result unions (`success | failure` or equivalent).
3. **MUST NOT** perform HTTP parsing, OpenAPI, or job-serialization concerns inside use-cases — those stay in API/worker adapters.
4. **MUST** call stages through operations/ports, not by reaching into another package’s private folders.

---

## 8. Feature Coding Rules

1. **MUST** implement extractors in `@fas/feature` only.
2. **MUST** accept Evidence contracts / EvidenceSelection — **MUST NOT** read Provider JSON or raw captures.
3. **MUST** emit Features under an explicit `FeatureModelVersion`.
4. **MUST** represent honest absence as a first-class Feature state — **MUST NOT** invent placeholder Facts to “fill” features.
5. **MUST** keep extractors deterministic for the same EvidenceSelection + FeatureModelVersion.
6. **MUST NOT** compute match-winner probabilities or Scenario selection inside Feature code (A1.5 / A1.10).
7. **MUST NOT** import `@fas/rule`, Projection, Report, or Provider packages from Feature domain/extraction.
8. **SHOULD** isolate one feature family per extractor module; bundle assembly in builders/factories.

---

## 9. Rule Coding Rules

1. **MUST** implement evaluators in `@fas/rule` only.
2. **MUST** consume `FeatureBundle` (+ RuleSetVersion / hierarchy metadata) only — **MUST NOT** query Evidence or Providers.
3. **MUST** keep evaluation pure and deterministic — **MUST NOT** call LLMs or AI adapters for Rule findings (Bible / A1.8 / A4).
4. **MUST** apply hierarchy/precedence explicitly; conflicts **MUST** surface as typed findings, not silent last-write wins without policy.
5. **MUST NOT** author Projection probabilities or Confidence labels inside Rule evaluators.
6. **MUST** version RuleSets; callers **MUST** pass RuleSetVersion from pins — **MUST NOT** hardcode “latest” inside AnalyzeMatch without pin resolution.
7. **MUST NOT** import Report, Statistics, or database adapters from Rule evaluation modules.

---

## 10. Projection Coding Rules

1. **MUST** implement Projection only under `@fas/analysis` `projection/` (or equivalent analysis-owned module).
2. **MUST** be the sole author of probability distributions for the Intelligence path (A1.5).
3. **MUST** consume FeatureBundle + RuleResult (+ pinned projection policy version) — **MUST NOT** read raw Evidence.
4. **MUST** remain outcome-blind pre-match.
5. **MUST** seal/freeze the distribution before Scenario and Confidence consume it — Scenario/Confidence **MUST NOT** mutate Projection numbers.
6. **MUST NOT** live in `@fas/report`, `@fas/feature`, or `@fas/statistics`.
7. **MUST** fail closed when inputs are insufficient per policy — **MUST NOT** emit uniform “fake confidence” distributions to hide missing evidence.

---

## 11. Scenario Coding Rules

1. **MUST** implement Scenario selection only under `@fas/analysis` `scenario/`.
2. **MUST** select scenarios from the sealed Projection (+ scenario policy pin) — **MUST NOT** recompute probabilities.
3. **MUST NOT** invent Facts or Features to justify a scenario.
4. **MUST** keep scenario labels/explainability fields consistent with A3 sealed explainability needs (fields present for Report assembly).
5. **MUST NOT** call AI to choose the deterministic scenario set for the core Intelligence path.
6. **MUST** treat Scenario as selection/presentation of outcomes, not as Calibration or Evaluation.

---

## 12. Confidence Coding Rules

1. **MUST** implement Confidence only under `@fas/analysis` `confidence/`.
2. **MUST** assess trust in the sealed Projection using reliability/absence/conflict signals as designed (A1.5 / A1.9 / A0.5) — **MUST NOT** alter Projection probabilities.
3. **MUST NOT** use Confidence as a second probability model or as a place to “nudge” match odds.
4. **MUST** include enough structured fields for Report explainability (A3) without requiring Report to reverse-engineer Confidence.
5. **MUST** respect Confidence policy version pins from the Compatibility Profile.
6. **MUST NOT** read post-match Actual.

---

## 13. Report Coding Rules

1. **MUST** implement sealing and narrative assembly in `@fas/report`.
2. **MUST** take AnalysisResult (and narrative adapter output) as inputs — **MUST NOT** re-run Feature, Rule, or Projection.
3. **MUST** assemble explainability index from sealed structured fields (A3) — **MUST NOT** invent new causal Facts in narrative.
4. **MUST** treat AI narrative as untrusted rewrite over grounded structure — validate/allowlist behavior per existing report patterns; **MUST NOT** let narrative override probabilities or findings.
5. **MUST** compute seal identity/checksum/lineage at seal time; subsequent loads **MUST** treat seals as immutable.
6. **MUST NOT** import Provider packages or Prisma from report domain/use-case modules.
7. **SHOULD** keep MVP deterministic narrative path available without remote AI for V1 Intelligence demos/tests.

---

## 14. Statistics Coding Rules

1. **MUST** implement population metrics and calibration projections in `@fas/statistics`.
2. **MUST** compute only — **MUST NOT** decide Evaluation release gates or auto-promote Compatibility Profiles.
3. **MUST** key metrics/artifacts by pin sets for fair comparison (A1 / A2).
4. **MUST NOT** rewrite Prediction History when fitting calibration artifacts.
5. **MUST** expose artifact identities for Analysis pin consumption on **future** runs only.
6. **MUST NOT** import Nest controllers or perform HTTP in Statistics modules.
7. **MUST NOT** collapse Evaluation Engine responsibilities into Statistics “for convenience.”

---

## 15. Worker Coding Rules

1. **MUST** place durable Evaluate / Calibration / Experiment / Replay / Statistics refresh handlers in `apps/worker` (with `@fas/jobs` as applicable).
2. **MUST** invoke application/engine ports — **MUST NOT** reimplement Projection/Feature/Rule math in handlers.
3. **MUST** keep handlers idempotent under at-least-once delivery assumptions.
4. **MUST NOT** run heavy post-match learning synchronously inside API request threads.
5. **MUST** record job failure explicitly; **MUST NOT** mark success when evaluation/calibration did not complete.
6. **MUST NOT** bypass EvaluationGatePort for promotion side effects.
7. **SHOULD** log pin identities and match/job ids needed for Replay audit — never log secrets or raw provider credentials.

---

## 16. API Coding Rules

1. **MUST** limit `apps/api` Intelligence controllers to transport validation/mapping and use-case invocation.
2. **MUST NOT** embed Evidence→…→Confidence pipeline logic in controllers.
3. **MUST NOT** perform Projection math, Rule evaluation, or Feature extraction inline in controllers.
4. **MUST** map transport errors to HTTP at the edge without leaking internal stack/provider payloads inappropriately.
5. **MUST** enqueue worker jobs for durable post-match/calibration/experiment work rather than blocking the request on long fits.
6. **MUST NOT** add authentication, public exposure, subscriptions, or commercialization endpoints as part of Intelligence Coding Sprints (V1 Freeze).
7. **MUST** keep priming/import bridges thin: call evidence-import/application ports, then AnalyzeMatch — no policy in the bridge beyond sequencing.
8. **SHOULD** follow existing Nest patterns in the repo (e.g. binding decorators already required by Biome) rather than inventing a new transport style.

---

## 17. Dependency Rules

### 17.1 Allowed (Intelligence path)

```text
apps/api / apps/worker
  → @fas/analysis / @fas/report / @fas/application
       → @fas/feature → @fas/evidence (contracts)
       → @fas/rule → @fas/feature (Feature types only)
       → @fas/analysis (projection/scenario/confidence)
            → @fas/feature, @fas/rule, @fas/statistics (artifact/pin reader)
       → @fas/report → @fas/analysis, @fas/prompt, @fas/ai-provider
  → @fas/evidence* / @fas/match
  → @fas/jobs

@fas/database implements ports (adapters depend inward)
@fas/provider-* → Evidence intake only
```

### 17.2 Forbidden (hard fail in review)

| Edge | Forbidden because |
|---|---|
| Feature → Provider / Provider SDK | A1.9 / A1.10 |
| Rule → Evidence tables / Provider JSON | A1.8 |
| Projection → raw Evidence | A1.5 |
| Report → Feature/Rule/Projection recompute | doc 17 / A3 |
| Domain → Prisma / Nest / Provider SDK | doc 18 / AGENTS |
| Statistics → release/promotion decision | A1 / A2 |
| AI adapter → Fact/Feature/Rule/Projection write | A1.9 / A3 |
| Any Intelligence package → new package creation to bypass Freeze | A0 / A4 / B0 |

1. **MUST** run/architecture dependency checks already in the repo when available (`pnpm workspace:check` / quality gates).
2. **MUST NOT** add dependency edges “temporarily” to make a demo pass.

---

## 18. Error Handling Rules

1. **MUST** fail explicitly; **MUST NOT** convert failure into empty success (empty FeatureBundle that pretends completeness, empty RuleResult that pretends evaluation, sealed report without AnalysisResult).
2. **MUST** use typed error/result variants at application boundaries.
3. **MUST NOT** catch-and-ignore; if catch is required for translation, rethrow or return failure with cause preserved safely.
4. **MUST** preserve safe causal context (stage, match id, pin ids, error code) — **MUST NOT** log secrets, raw credentials, or full provider payloads in production paths.
5. **MUST** treat missing Evidence, unresolved conflicts, and pin mismatches as first-class failures or honest degraded states per A1.9/A1.10 — never silent fabrication.
6. **MUST** make seal persistence failures visible to the caller; **MUST NOT** claim report sealed if persistence did not succeed (unless an approved idempotent replay proves identical seal).
7. **SHOULD** distinguish retryable infrastructure failures from non-retryable domain invariant violations.

---

## 19. Versioning Rules

1. **MUST** carry FeatureModelVersion, RuleSetVersion, Projection/Scenario/Confidence/Narrative policy versions, and Compatibility Profile id on every AnalyzeMatch path (A1.11).
2. **MUST** resolve pins in Analysis application — Feature/Rule packages **MUST NOT** silently select “latest” bypassing pins.
3. **MUST** mint new versions when semantics change per A1.11 / A4; **MUST NOT** mutate the meaning of an already-sealed version id.
4. **MUST** record pin set on sealed history/report lineage for Replay and Evaluation fairness.
5. **MUST NOT** retarget historical seals to new calibration/experiment pins.
6. **MUST** apply Promotion/Rollback only to future default pin selection.
7. **MUST** keep Calibration artifact ids pinned explicitly — config may store ids, not re-encode calibration math.
8. **SHOULD** include version ids in test fixtures so Replay tests fail loud on pin drift.

---

## 20. Testing Rules

1. **MUST** add or update tests for every behavior change in a Coding Sprint.
2. **MUST** unit-test pure Feature extractors, Rule evaluators, Projection/Scenario/Confidence policies with fixed fixtures — no network.
3. **MUST** include honest-absence / conflict / pin-mismatch cases — not only happy paths (A1.8 / A1.9 / A1.10).
4. **MUST** prove Report does not recompute Projection (e.g. feed fixed AnalysisResult).
5. **MUST** prove Rule path does not invoke AI.
6. **MUST** cover use-case failure variants (insufficient evidence, incompatible pins).
7. **SHOULD** use recorded cassettes/providers for integration demos — **MUST NOT** require live provider for unit gates.
8. **MUST** run affected quality gates before claiming done: at minimum the repo commands relevant to the change (`pnpm typecheck`, `pnpm test`, and broader `pnpm quality` / `pnpm validate` when the sprint scope warrants).
9. **MUST NOT** delete or weaken tests to greenwash a design violation.
10. **SHOULD** keep acceptance evidence commands listed in the sprint brief/report.

---

## 21. Naming Rules

1. **MUST** use canonical names: `Evidence`, `Fact`, `Feature`, `FeatureBundle`, `Rule`, `RuleResult`, `Projection`, `Scenario`, `Confidence`, `AnalysisResult`, `MatchReport`, `CompatibilityProfile`, `CalibrationArtifact`.
2. **MUST NOT** name probability authors `ScenarioEngine` or `ConfidenceModel` if they mutate distributions — Scenario/Confidence names must match A1.5 responsibilities.
3. **MUST** name use-cases `AnalyzeMatchUseCase`, `GenerateReportUseCase`, etc. (or kebab-case file equivalents already in repo).
4. **MUST** name ports `*Port`, `*Operation`, `*Query`, `*Repository` consistently with existing package style.
5. **MUST** use `PascalCase` for types; `camelCase` for values/functions; kebab-case filenames matching repo convention.
6. **MUST NOT** introduce `PredictionEngine`, `IntelligenceEngine`, or eighth-Engine naming.
7. **MUST NOT** use marketing synonyms that collapse Fact vs Signal vs Finding vs Inference in type names.
8. **SHOULD** prefix pinned version fields with their domain (`featureModelVersion`, not generic `version` alone on bundles).

---

## 22. Review Checklist

Reviewers (human or agent) **MUST** verify before accepting an Intelligence Coding Sprint:

### Gate / scope

- [ ] A4 Coding Gate conditions met; human authorization recorded for this sprint  
- [ ] Diff stays inside stated package ownership (B0/B1); no new packages/Engines  
- [ ] No Bible / Freeze / docs 17 / docs 18 drive-by edits  

### Architecture & dependencies

- [ ] Pipeline order preserved: Evidence → Feature → Rule → Projection → Scenario → Confidence → Narrative → Report → Persistence  
- [ ] No Feature→Provider, Rule→Evidence, Projection→Evidence, Report→recompute edges  
- [ ] Domain free of Nest/Prisma/Provider SDK imports  
- [ ] Prisma only in `@fas/database` adapters  

### Determinism & trust

- [ ] Rules deterministic; no LLM Rule evaluation  
- [ ] AI limited to narrative; cannot write Facts/Features/Findings/Projection  
- [ ] Pre-match path outcome-blind  
- [ ] Honest absence / conflicts handled; no fabrication  

### Versioning & immutability

- [ ] Pins enforced; versions recorded on seals  
- [ ] No history rewrite; promotion affects future pins only  
- [ ] No auto-activation of calibration/experiment defaults  

### Quality

- [ ] Typed results; no `any`; exhaustive unions  
- [ ] Errors explicit; no catch-and-ignore  
- [ ] Tests cover behavior + failure paths  
- [ ] Affected `pnpm` quality gates executed; evidence recorded  

### Language

- [ ] Canonical domain terms; no Engine-inflation naming  

---

## 23. Coding Acceptance Criteria

A Football Intelligence Coding Sprint is acceptable only if:

| # | Criterion |
|---|---|
| 1 | Authorized by A4 Coding Gate + explicit human/sprint authorization (B2 alone is insufficient) |
| 2 | Code lives only in B0/B1-mapped existing packages/apps |
| 3 | No new Engine, no new package, no architecture redesign |
| 4 | No DTO/schema “drive-by” redesign of Freeze contracts outside sprint scope; transport DTOs if needed stay in API edge and do not become domain truth |
| 5 | Domain/application/port/adapter/repository/use-case rules in §§1–7 satisfied |
| 6 | Feature/Rule/Projection/Scenario/Confidence/Report/Statistics rules in §§8–14 satisfied |
| 7 | Worker/API rules in §§15–16 satisfied |
| 8 | Dependency and error-handling rules in §§17–18 satisfied |
| 9 | Versioning and testing rules in §§19–20 satisfied |
| 10 | Naming and Review Checklist in §§21–22 satisfied |
| 11 | Executable validation evidence collected (tests + required quality commands) |
| 12 | Seals remain immutable; learning promotes future pins only |
| 13 | Status claims in any sprint report remain narrower than evidence |

---

## 24. Cursor / Agent Execution Contract

When implementing a future Coding Sprint, agents **MUST**:

1. Read **AGENTS.md**, `docs/PROJECT_STATE.md`, then the sprint’s authorized scope.  
2. Treat **B2 as Coding Law** for how to write Intelligence code; treat **B1** as layout/home; treat **B0** as package mapping; treat **A-series** as semantic design.  
3. Implement only the authorized slice — **MUST NOT** “complete the whole Intelligence program” opportunistically.  
4. Stop and ask when a change would require new packages, Freeze edits, docs 17/18 edits, or Architecture Review triggers (A4 §20).  
5. Prefer small, reversible diffs with tests in the same sprint.  
6. **MUST NOT** claim production coding authorization from the existence of A0–A4, B0, B1, or B2 alone.

---

## 25. What This Document Is / Is Not

| Is | Is not |
|---|---|
| Coding Law for Intelligence sprints | Architecture redesign |
| How to write packages/layers/stages | Package mapping (that is B0) |
| Enforceable MUST/MUST NOT for Cursor | Implementation Blueprint (that is B1) |
| Review + acceptance bar | Authorization to start coding by itself |
| Aligned with Bible / Freeze / docs 17–18 / A0–A4 / B0 / B1 | A license to edit Bible / Freeze / docs 17–18 |

---

## 26. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md) *(read-only)*
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) *(read-only)*
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) *(read-only)*
- [`docs/DEVELOPMENT_WORKFLOW.md`](../../DEVELOPMENT_WORKFLOW.md) *(read-only)*
- [`docs/sprints/A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md)
- [`docs/sprints/A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md)
- [`docs/sprints/A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md)
- [`docs/sprints/A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md)
- [`docs/sprints/A1/A1_8_FOOTBALL_RULE_HIERARCHY.md`](../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md)
- [`docs/sprints/A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md)
- [`docs/sprints/A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md)
- [`docs/sprints/A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md`](../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md)
- [`docs/sprints/A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md`](../A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md)
- [`docs/sprints/A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md`](../A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md)
- [`docs/sprints/A3/A3_FOOTBALL_INTELLIGENCE_EXPLAINABILITY_FRAMEWORK.md`](../A3/A3_FOOTBALL_INTELLIGENCE_EXPLAINABILITY_FRAMEWORK.md)
- [`docs/sprints/A4/A4_FOOTBALL_INTELLIGENCE_GOVERNANCE_FRAMEWORK.md`](../A4/A4_FOOTBALL_INTELLIGENCE_GOVERNANCE_FRAMEWORK.md)
- [`docs/sprints/B0/B0_FOOTBALL_INTELLIGENCE_ARCHITECTURE_MAPPING.md`](../B0/B0_FOOTBALL_INTELLIGENCE_ARCHITECTURE_MAPPING.md)
- [`docs/sprints/B1/B1_FOOTBALL_INTELLIGENCE_IMPLEMENTATION_BLUEPRINT.md`](../B1/B1_FOOTBALL_INTELLIGENCE_IMPLEMENTATION_BLUEPRINT.md)

---

*End of B2 Football Intelligence Coding Specification. Coding Law only — no production code, no redesign, no coding authorization by itself.*
