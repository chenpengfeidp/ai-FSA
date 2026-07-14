# FAS Product Definition

## 1. Document Status

- Product: Football Analysis System (FAS)
- Milestone: M0 — Architecture Design
- Scope: v1 analysis engine
- Governing principles: [PROJECT BIBLE](./00_PROJECT_BIBLE.md)

This document defines product intent and boundaries. It does not authorize implementation details that conflict with the Project Bible.

## 2. Product Vision

FAS is an evidence-based football analysis workspace that improves through structured pre-match analysis and post-match review. It is not a score-prediction toy, betting executor, or generic AI chat interface.

The product turns source-backed match facts, market signals, reusable knowledge, qualified rules, and comparable historical cases into a reviewable analysis. After a match, FAS compares the analysis with the result, identifies which assumptions held or failed, and feeds validated learning back into the system.

The long-term product advantage is not a single correct call. It is a transparent, versioned learning loop:

`evidence -> analysis -> outcome -> review -> validated learning`

## 3. Product Principles

1. **Evidence before intuition.** Material claims cite their source and observation time.
2. **Separate epistemic layers.** Facts, market signals, rules, cases, and AI inference remain distinguishable.
3. **Reviewability by default.** Every analysis can be reproduced from a frozen input snapshot.
4. **Qualified rules only.** Rules expose sample size, confidence, applicability, and limitations.
5. **Explanations over verdicts.** The AI describes causal reasoning, uncertainty, and counter-signals.
6. **Long-term calibration.** Product success is measured across a body of reviewed analyses.
7. **Human accountability.** AI output is a draft analytical artifact, not an unquestionable decision.

## 4. Goals

### 4.1 v1 Goals

- Produce structured pre-match analyses from normalized match evidence.
- Preserve the exact facts, signals, knowledge, rules, cases, prompt version, and model configuration used.
- Support a governed knowledge base, rule library, and case library.
- Perform post-match reviews against recorded outcomes.
- Track rule usefulness and analysis calibration over time.
- Make every conclusion traceable to evidence or explicitly label it as inference.
- Provide stable APIs and a web workspace for analysts without requiring a user/account system.

### 4.2 Success Metrics

The initial release is successful when:

- 100% of published analyses have an immutable input snapshot.
- 100% of factual claims in structured output reference one or more evidence records.
- 100% of applied rules record rule version, sample size, confidence, and applicability result.
- At least 95% of completed matches with published analyses receive a review within the operational review window.
- Re-running an analysis with the same snapshot, prompt version, provider model, and deterministic settings produces a semantically equivalent structured result.
- Failed AI runs are observable, retryable, and never silently published.
- Analysts can distinguish facts, market signals, rule findings, case analogies, and inference without reading raw prompts.

Prediction hit rate alone is not a release criterion. Calibration, evidence coverage, and learning quality are primary.

## 5. Non-goals

The following are explicitly outside v1:

- Live or in-play match analysis.
- User registration, login, roles, teams, or tenant isolation.
- Subscriptions, payments, entitlements, or commercialization.
- Notifications by email, SMS, push, or messaging platforms.
- Automated wagering, bookmaker integration, stake sizing, or financial advice.
- Social feeds, public comments, or content publishing networks.
- A universal sports platform beyond football.
- Fully autonomous promotion of AI-generated knowledge or rules.
- Training a proprietary foundation model.
- Guaranteeing match outcomes or presenting inference as fact.

Deployment is intended for a trusted, controlled environment in v1. Before public exposure, authentication and authorization are mandatory future work.

## 6. Target Users

### 6.1 Primary: Football Analyst

Needs to collect evidence, request a pre-match analysis, inspect reasoning, compare similar cases, and conduct a post-match review. Values traceability and consistency over decorative prose.

### 6.2 Primary: Methodology Owner

Maintains knowledge and rules, evaluates samples and confidence, approves new versions, and retires misleading logic. Values governance, version history, and performance statistics.

### 6.3 Secondary: System Operator

Imports match data, monitors analysis jobs, resolves provider or data-quality failures, and manages backups. Values idempotency, diagnostics, and safe recovery.

### 6.4 Future, Not v1

Researchers, editorial teams, paying subscribers, and public consumers may be supported later, but their identity, access, and commercialization needs must not distort the first analysis-engine milestone.

## 7. Core Concepts

- **Match:** The fixture and its normalized competition, teams, schedule, status, and outcome.
- **Evidence:** A source-backed observation with provenance and observation time.
- **Fact:** A directly supported, normalized statement about the match context.
- **Market Signal:** A time-dependent observation derived from market data; never treated as ground truth.
- **Knowledge Item:** Versioned domain guidance or methodology approved for retrieval.
- **Rule:** A deterministic, versioned condition set with sample and confidence metadata.
- **Case:** A reviewed historical match packaged for analogy, including why it is similar and where it differs.
- **Analysis:** A versioned pre-match artifact built from a frozen evidence snapshot.
- **Review:** A post-match evaluation of claims, rules, cases, uncertainty, and outcome.
- **Learning Candidate:** A review-derived proposal requiring validation before promotion to knowledge or rules.

## 8. Core Features

### 8.1 Match Workspace

- Create or import a fixture.
- Inspect normalized teams, competition, kickoff, status, and final result.
- View evidence freshness, provenance, conflicts, and missing required fields.
- Prevent analysis publication when critical evidence quality gates fail.

### 8.2 Evidence Management

- Record source, source reference, observation time, ingestion time, and payload checksum.
- Classify observations as fact inputs or market-signal inputs.
- Preserve conflicting observations instead of silently overwriting them.
- Display stale, superseded, and unverifiable evidence.

### 8.3 Pre-match Analysis

- Validate match readiness.
- Freeze an analysis input snapshot.
- Retrieve relevant knowledge and reviewed cases.
- Evaluate applicable rule versions deterministically.
- Assemble prompts from composable templates rather than a single hard-coded prompt.
- Generate a structured response through an OpenAI Responses API provider adapter.
- Validate output schema, citations, confidence, and contradictions before publication.
- Present facts, signals, rule findings, case comparisons, inference, uncertainty, and scenarios separately.

### 8.4 Rule Engine

- Author draft rules as structured conditions and outcomes.
- Record league scope, sample size, confidence, evidence basis, and limitations.
- Version, approve, activate, suspend, and retire rules.
- Explain why a rule matched, did not match, or was inapplicable.
- Track reviewed performance by rule version; never mutate historical evaluations.

### 8.5 Knowledge Base

- Store versioned methodology and football-domain knowledge.
- Attach sources, effective dates, tags, competition scope, and review status.
- Retrieve only approved and effective versions for production analyses.
- Preserve the exact retrieved excerpts in each analysis snapshot.
- Use PostgreSQL text/tag retrieval in v1; add pgvector semantic retrieval in Phase 2.

### 8.6 Case Library

- Build cases from completed and reviewed analyses.
- Capture pre-match context, decisive factors, result, review findings, and reusable lessons.
- Search by competition, teams, tactical/context tags, rule matches, and outcome patterns.
- Require explicit similarity and difference explanations when a case is used.

### 8.7 Post-match Review

- Record and verify the final result.
- Compare claims and scenarios with observed outcome evidence.
- Classify findings as supported, contradicted, inconclusive, or not assessable.
- Evaluate evidence gaps, rule usefulness, case relevance, and inference quality.
- Create learning candidates without automatically modifying approved knowledge or rules.

### 8.8 Evaluation and Statistics

- Define versioned quality criteria, rubrics, qualification policy, and release gates.
- Produce immutable evaluation reports over exact subjects, corpora, baselines, and Statistics projections.
- Compute evidence coverage, review completion, analysis calibration, and failure-rate projections deterministically.
- Aggregate rule statistics by immutable rule version and sufficient sample thresholds.
- Separate descriptive statistics from claims of causality.
- Show confidence intervals or uncertainty where appropriate.

## 9. Primary Workflows

### 9.1 Pre-match

1. Register or import a scheduled match.
2. Ingest and normalize evidence.
3. Resolve or acknowledge conflicts and freshness warnings.
4. Request analysis.
5. Freeze the input snapshot.
6. Retrieve approved knowledge and cases; evaluate active rules.
7. Generate and validate the AI analysis.
8. Review the draft and publish the immutable analysis revision.

### 9.2 Post-match

1. Record final result and outcome evidence.
2. Open the published pre-match analysis and its frozen snapshot.
3. Evaluate claims, scenarios, applied rules, and selected cases.
4. Publish the review.
5. Update derived statistics asynchronously.
6. Create learning candidates for methodology-owner validation.

## 10. Product States and Governance

- Analyses: `draft -> running -> generated -> validated -> published`, with `failed` and `superseded` terminal alternatives.
- Knowledge, rule, and case versions: `draft -> approved | rejected`; stable roots separately follow `inactive -> active -> retired`, with Rule roots also permitting suspension.
- Reviews: `draft -> completed`.
- Learning candidates: `proposed -> accepted | rejected`; acceptance creates a new draft/version, never edits an approved artifact in place.

Only approved, effective artifacts participate in production analysis. Publication makes an analysis revision immutable.

## 11. Long-term Roadmap

### M0 — Architecture Design

Define product boundaries, architecture, database, API, monorepo, and development standards.

### M1 — Foundation

Create the Turborepo, Docker Compose environment, Next.js workspace, NestJS API, worker process, Prisma schema, observability baseline, and CI quality gates.

### M2 — Prompt Engine

Implement versioned prompt templates, structured output contracts, provider abstraction, OpenAI Responses API integration, validation, and run audit records.

### M3 — Knowledge Engine

Deliver governed knowledge authoring and deterministic metadata/full-text retrieval.

### M4 — Rule Engine

Deliver rule lifecycle, deterministic evaluation, explanations, sample/confidence constraints, and immutable versions.

### M5 — Case and Analysis Engines

Deliver case retrieval, frozen snapshots, end-to-end pre-match orchestration, analyst inspection, and publication.

### M6 — Review Engine

Deliver outcome ingestion, claim-level review, learning candidates, and case creation.

### M7 — Evaluation Engine

Deliver versioned assessment policy, quality criteria, qualification gates, baseline comparisons, and immutable reports.

### M8 — Statistics Engine

Deliver deterministic calibration, evidence-quality, rule-version, review-completion, and operational metric projections.

### M9 — v1 Hardening

Complete recovery testing, security review, performance testing, data-provider resilience, backup/restore drills, and operational documentation.

### Phase 2

- Redis-backed caching, distributed locks, and BullMQ scaling where measured load requires them.
- pgvector semantic retrieval with embedding version governance and retrieval evaluation.
- Multiple data providers and stronger reconciliation.
- Authentication, authorization, and multi-user workflows before external access.
- Optional live analysis only after a separate data, latency, safety, and product design.

### Later

Commercialization, subscriptions, notifications, public publishing, and additional sports require separate product decisions and are not implied by the v1 architecture.

## 12. Product Risks

- **False authority:** mitigated by explicit uncertainty, evidence citations, and review.
- **Data leakage across time:** mitigated by observation timestamps and frozen pre-match snapshots.
- **Rule overfitting:** mitigated by sample thresholds, versioned statistics, holdout evaluation, and human approval.
- **Prompt/model drift:** mitigated by prompt, provider, model, parameter, and output version capture.
- **Provider dependency:** mitigated by a provider interface and provider-neutral domain contracts.
- **Knowledge contamination:** mitigated by approval workflow and no automatic promotion from AI output.
- **Scope creep:** mitigated by the v1 non-goals and milestone gates above.
