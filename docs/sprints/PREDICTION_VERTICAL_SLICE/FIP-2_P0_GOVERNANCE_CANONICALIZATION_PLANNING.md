# FIP-2 P0 — Governance and Canonicalization Planning

## 0. Document status

- Status: **PLANNING COMPLETE / AWAITING HUMAN APPROVAL**
- Date: 2026-08-30
- Type: Planning / Governance only
- Parent: FIP-1 Football Intelligence Analysis Protocol Planning
- Roadmap status: not defined in `docs/40_PRODUCT_ROADMAP.md`
- Implementation authority: **None**
- Proposed canonical target:
  `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`

This document does not create or activate the canonical protocol. It plans the
bounded FIP-2 P0 governance work required to create it after explicit human
approval.

FIP-2 P1, P2, P3 and P4 remain **NOT AUTHORIZED**.

## 1. FIP-1 Review Gate

FIP-1 review result:

**PASS — PLANNING COMPLETE / REVIEWED**

Reviewed document:

`docs/sprints/PREDICTION_VERTICAL_SLICE/FIP-1_FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL_PLANNING.md`

The review confirmed:

- the User Request → Explainable Report lifecycle is complete;
- MatchAnalysisRequest, External Evidence, Coverage, Output and Failure
  contracts are defined;
- the five CORE Evidence requirements and seven foundation Features match the
  implementation;
- Football State consumes Features and Match Script consumes Football State;
- Rules are parallel Feature consumers for findings, confidence,
  recommendation and explainability;
- Market findings remain supporting-only and `channel: none`;
- Unified Matrix remains the source for scoreline, goal-range, BTTS and O/U
  outputs;
- PRE_MATCH, LIVE and POST_MATCH remain separated;
- Provider Fact, External Evidence, Derived Feature, Deterministic Finding,
  Narrative and Actual Result remain separated;
- missing, stale, conflict, entitlement and fallback behavior is specified as
  fail-closed;
- the protocol design is Provider-agnostic;
- current implementation and future protocol requirements are explicitly
  separated;
- no production code, model, Provider, History, Freeze or doc 40 change was
  made.

FIP-1 is formally closed as **Planning Complete / Reviewed**. Its sign-off does
not claim that the protocol is operational.

## 2. P0 goal

Create one stable, non-Architecture, Provider-agnostic operational protocol that
future Agents and new conversations can discover and follow without relying on
chat memory.

The future canonical document must:

- define the authoritative PRE_MATCH analysis workflow;
- distinguish stable protocol rules from current runtime status;
- point to owning architecture/API/domain documents rather than duplicate them;
- provide one discoverable entry point for every Agent;
- prevent alternate Agent-specific analysis playbooks from becoming competing
  sources of truth;
- remain compatible with Architecture Freeze v0.3 and the existing seven
  governed Engines.

## 3. Inputs

FIP-2 P0 implementation would consume:

- `AGENTS.md`;
- `docs/PROJECT_STATE.md`;
- `docs/PROJECT_INDEX.md`;
- `docs/40_PRODUCT_ROADMAP.md`;
- `docs/00_PROJECT_BIBLE.md`;
- accepted ADRs;
- owning numbered domain, Evidence, API and pipeline documents;
- Architecture Freeze v0.3 review;
- FIP-1 Planning and Review/Sign-off;
- PVS-1/PVS-2 transport and Workspace delivery evidence;
- PVS-3.2 live-blocker evidence;
- PVS-3.3 provider capability and coverage audit;
- current production contracts and executable tests.

## 4. P0 outputs

If separately approved, FIP-2 P0 would produce documentation/governance changes
only:

1. one canonical protocol at
   `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`;
2. one short `AGENTS.md` pointer identifying that protocol as the operational
   analysis entry point;
3. one `docs/PROJECT_INDEX.md` entry describing ownership and reading order;
4. one `docs/PROJECT_STATE.md` status entry distinguishing protocol
   canonicalization from operational implementation;
5. a governance review confirming no duplicated architecture, API or model
   source of truth;
6. a P0 completion/sign-off record.

No runtime, API, schema, Provider or model change belongs to P0.

## 5. Canonical source-of-truth model

The future protocol must have limited authority:

```text
Project Bible / accepted ADRs / owning numbered contracts
  → Architecture Freeze and approved implementation gates
  → PROJECT_STATE for current runtime status
  → docs/40_PRODUCT_ROADMAP.md for product sequencing
  → canonical Football Intelligence Analysis Protocol
  → Agent skill/rule pointers
  → conversation-specific instructions
```

The protocol owns:

- Agent execution order;
- request normalization and fixture-disambiguation behavior;
- PRE_MATCH cutoff procedure;
- web-research and source-priority procedure;
- coverage/freshness/conflict/failure presentation;
- API invocation responsibility;
- report-integrity audit;
- final Explainable Match Analysis format;
- Agent/FAS responsibility boundary.

The protocol does not own:

- Evidence domain schema;
- Feature or Rule definitions;
- Projection mathematics;
- Match Script parameters;
- Calibration lifecycle;
- Evaluation History;
- Provider implementations;
- API endpoint implementation;
- current credential/entitlement state;
- product roadmap sequencing.

## 6. Stable protocol versus live policy status

To prevent documentation drift, the future canonical protocol must separate:

### Stable invariants

- Evidence before inference;
- no Provider bypass;
- no Agent recomputation;
- no silent fallback;
- no post-match leakage;
- PRE_MATCH-only scope;
- fail-closed CORE gate;
- provenance and source requirements;
- Unified Matrix integrity checks;
- market supporting-only boundary.

### Live status references

Mutable facts remain linked rather than copied where possible:

- active production policy pin;
- active parameter artifact;
- Provider modes;
- current entitlement blockers;
- current endpoint availability;
- current package/model versions.

`docs/PROJECT_STATE.md` remains the live delivery/status source. The protocol
may state required integrity assertions, but it must direct Agents to verify
their current expected values against PROJECT_STATE and the sealed report.

## 7. Required canonical protocol coverage

The future
`docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md` must contain at
least the following sections.

### 7.1 Request parsing

- extract teams, competition/date hints, requested markets and language;
- treat requested team order as intent, not resolved orientation;
- reject empty or materially underspecified input;
- preserve original user text for audit.

### 7.2 Fixture discovery

- query the current Match Center fixture catalog;
- normalize team names using the existing resolver behavior;
- apply date/competition constraints;
- cross-check current fixture identity against an authoritative schedule source;
- return resolved/not-found/ambiguous states explicitly.

### 7.3 Fixture disambiguation

- provide candidate match id, teams, competition, kickoff and source;
- require user selection when intent remains ambiguous;
- document the existing earliest-upcoming resolver behavior as an as-built
  caveat until a separately authorized contract change occurs;
- never choose a historical fixture merely because it is the latest search hit.

### 7.4 PRE_MATCH cutoff

- capture `analysisTime`, timezone, kickoff and cutoff;
- allow only observations available at or before cutoff;
- return `NOT_PRE_MATCH` for started or finished fixtures;
- state clearly that current transport enforcement is pending FIP-2 P1.

### 7.5 Research

- define the search order by data domain;
- require opening and inspecting primary sources;
- preserve publication, effective, retrieval and observation times;
- keep factual quotation separate from Agent summary;
- record unavailable research instead of filling it from memory.

### 7.6 Source priority

- official competition/league and club sources for fixture/lineup/availability;
- licensed/official structured sources for statistics and xG;
- named bookmaker/authorized aggregator for market observations;
- reputable media only for attributed, timestamped, corroborated facts;
- aggregator/search snippet/forum/prediction content never as sole CORE support.

### 7.7 Freshness

- bind each requirement to a freshness rule;
- enforce event-driven invalidation for schedule, lineup, injury and manager
  changes;
- exclude post-cutoff observations;
- distinguish `FRESH`, `STALE` and `UNKNOWN`;
- identify current implementation gaps without claiming enforcement.

### 7.8 Coverage gate

- classify requirements as CORE, IMPORTANT, OPTIONAL or UNAVAILABLE;
- block on missing/stale/conflicted CORE requirements;
- allow explicit partial coverage for IMPORTANT gaps;
- keep OPTIONAL absence neutral;
- never convert absence to a default football fact.

### 7.9 CORE data

The canonical protocol must preserve the current minimum:

- `MATCH_INFO`;
- home/away `TEAM_FORM`;
- home/away `STATISTICS`;
- `attackRatingHome/Away`;
- `defenseRatingHome/Away`;
- `momentumHome/Away`;
- `homeAdvantage`.

The protocol must distinguish the five-Evidence model gate from additional
adapter-level gates such as current live H2H requirements.

### 7.10 External web Evidence boundary

- web observations remain `EXTERNAL_EVIDENCE`;
- they cannot become Provider Fact without an approved intake/normalizer;
- they cannot enter Features or Projection directly;
- expected lineups remain expected, never confirmed;
- LLM statements never substitute for facts.

### 7.11 Provider abstraction

```text
Source Connector
  → Provider Adapter or External Observation Collector
  → FAS Domain Mapping
  → Evidence Normalizer
  → Canonical Evidence
```

The protocol defines capabilities and provenance, not vendor-specific logic.

### 7.12 API invocation responsibility

- Agent resolves intent and calls the existing API;
- AI-FSA imports, validates and computes deterministic outputs;
- Agent checks discriminated response bodies, including HTTP 200 failures;
- no direct Agent invocation of projection formulas;
- no second probability calculation.

### 7.13 Integrity audit

Verify from the sealed report:

- production policy pin;
- parameter artifact;
- scoreline basis;
- Football State and Match Script presence;
- Unified Matrix provenance/checksum;
- 1X2, scoreline, goal range, BTTS and O/U lineage;
- Provider mode and fallback state;
- blocked/degraded/failure status.

### 7.14 Fail-closed behavior

- fixture not found/ambiguous;
- not PRE_MATCH;
- CORE missing/stale/conflicted;
- Provider not entitled/not covered/unavailable;
- import/projection/report failure;
- policy mismatch;
- silent fallback uncertainty;
- report-integrity failure.

No blocked state may be presented as a successful prediction.

### 7.15 Output contract

Use one fixed Explainable Match Analysis shape:

- Fixture;
- Data Coverage;
- Team Strength;
- Recent Form;
- Injuries/Suspensions;
- Lineup;
- Advanced Stats;
- xG;
- Match Context;
- Manager/Player Intelligence;
- Odds/Market;
- Football State;
- Match Script;
- 1X2, scorelines, goal range, BTTS and O/U;
- both confidence contracts;
- Key Drivers;
- Risks;
- Missing Data;
- Provenance.

### 7.16 Provenance

Retain:

- match and subject identity;
- provider/source ids;
- source URL where applicable;
- provider method/mode;
- published/effective/observed/retrieved timestamps;
- analysis cutoff;
- freshness and verification state;
- model/policy versions and checksums;
- fallback state.

### 7.17 Agent versus FAS responsibility

Agent:

- request parsing;
- fixture clarification;
- web research;
- source/freshness/conflict/coverage review;
- API orchestration;
- sealed-output explanation.

FAS:

- Provider mapping and Evidence normalization;
- Feature extraction;
- Rule evaluation;
- Football State;
- Match Script;
- Projection V2;
- Unified Matrix;
- deterministic confidence/recommendation;
- sealed report and checksums.

### 7.18 Mandatory prohibitions

- no silent fallback;
- no Agent recomputation;
- no post-match leakage;
- no invented facts;
- no market-to-football probability substitution;
- no candidate promotion or in-run tuning;
- no blocked report publication;
- no wagering-advice claim.

### 7.19 Cross-Agent reuse

- every Agent reads `AGENTS.md`, PROJECT_STATE and the canonical protocol;
- Agent rules/skills contain pointers, not duplicated protocol bodies;
- examples are labelled recorded/live/blocked accurately;
- a protocol version and review status are visible;
- superseded protocol versions remain traceable but are not active.

## 8. Protocol lifecycle and version governance

The future canonical document should declare:

- `protocolId`;
- `protocolVersion`;
- status: `DRAFT | REVIEWED | ACTIVE | SUPERSEDED`;
- effective date;
- owning documents;
- approved implementation baseline;
- last conformance review;
- superseded version, if any.

Change rules:

- editorial clarifications may update the same version when semantics do not
  change;
- source-priority, cutoff, coverage, failure or Agent/FAS responsibility changes
  require a reviewed version increment;
- Projection, Feature, Rule, Calibration or Evidence-schema changes are not
  protocol edits and require their owning governance paths;
- the protocol cannot silently override higher-authority documents;
- conflicting higher-authority changes block protocol activation until
  reconciled.

## 9. P0 implementation sequence

If approved, execute only:

1. create the `docs/protocols/` parent after verifying no competing protocol
   exists;
2. create the canonical protocol from reviewed FIP-1 contracts;
3. label implemented behavior versus target/not-yet-enforced behavior;
4. add one pointer in `AGENTS.md`;
5. add ownership and reading-order links in PROJECT_INDEX;
6. update PROJECT_STATE without claiming FIP-2 P1/P2 operational capability;
7. perform a documentation/governance consistency review;
8. publish a P0 completion/sign-off report.

Stop before schemas, runtime enforcement, Agent automation or conformance tests.

## 10. P0 acceptance criteria

FIP-2 P0 implementation is acceptable only when:

1. exactly one canonical protocol exists;
2. it is non-numbered and explicitly non-Architecture;
3. it is Provider-agnostic;
4. it references, rather than replaces, owning contracts;
5. all required coverage in §7 is present;
6. current implementation and future enforcement are visibly separated;
7. AGENTS and PROJECT_INDEX point to the same canonical file;
8. PROJECT_STATE does not overstate live or operational capability;
9. no duplicated Agent rule/skill protocol is created;
10. no production code, API, schema, Provider or model file changes;
11. doc 40 remains unchanged unless separately authorized;
12. FIP-2 P1/P2/P3/P4 remain unstarted.

## 11. Explicit exclusions

P0 must not:

- implement request or coverage schemas;
- change fixture-discovery behavior;
- add PRE_MATCH cutoff enforcement;
- add freshness/conflict services;
- build External Evidence intake;
- create an Agent skill;
- add conformance tests;
- add or configure a Provider;
- purchase credentials;
- modify Projection, Match Script, Unified Matrix, Calibration, Feature or Rule
  mathematics;
- modify Evaluation History;
- start PVS-3.4;
- amend doc 40 without explicit approval.

## 12. FIP-2 separation

`FIP-2 P1 — Contracts and Validation`

- Not authorized.
- Would own transport-neutral schemas, real clock, cutoff-aware Evidence,
  freshness, conflict and supersession behavior.

`FIP-2 P2 — Agent Operational Playbook`

- Not authorized.
- Would own executable Agent instructions, fixture-clarification flow and
  optional skill integration.

`FIP-2 P3 — Cross-Agent Conformance`

- Not authorized.
- Would own golden requests and fail-closed conformance tests.

`FIP-2 P4 — Documentation Integration and Drift Control`

- Not authorized.
- Would own broader canonical/transport documentation reconciliation after
  operational implementation.

## 13. Human approval required next

Before FIP-2 P0 implementation, a human must explicitly approve:

1. FIP-2 P0 as a bounded documentation/governance task outside doc 40, or
   authorize a doc 40 roadmap amendment first;
2. the canonical path
   `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`;
3. adding a short repo-wide pointer to `AGENTS.md`;
4. the protocol ownership/versioning model in §8;
5. the strict separation between documentation canonicalization and FIP-2
   P1/P2/P3/P4 implementation.

Separate approval is required for every later FIP-2 phase.

## 14. Stop condition

This task ends with FIP-1 reviewed/closed and FIP-2 P0 planned. Do not create
the canonical protocol, modify doc 40, start FIP-2 P1/P2/P3/P4, configure a
Provider, start PVS-3.4 or perform calibration/model work.
