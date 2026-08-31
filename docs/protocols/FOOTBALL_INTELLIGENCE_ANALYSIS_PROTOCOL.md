# Football Intelligence Analysis Protocol

## Protocol metadata

| Field | Value |
|---|---|
| Protocol id | `fip.analysis-protocol` |
| Protocol version | `fip.analysis-protocol.v1` |
| Status | **ACTIVE — canonical documentation protocol** |
| Effective date | 2026-08-31 |
| Document class | Non-numbered operational governance protocol; **not an Architecture document** |
| Provider binding | **Provider-agnostic**; capabilities and canonical Evidence govern suitability |
| Scope | PRE_MATCH football analysis by Agents using the existing AI-FSA system |
| Runtime enforcement | Partial; not-yet-enforced behavior is identified explicitly |
| Last governance review | FIP-2 P0, 2026-08-31 |
| Last conformance review | Not run; FIP-2 P3 is not authorized |
| Supersedes | No prior canonical protocol |

This is the single canonical Agent-facing protocol for Football Intelligence
match analysis. It standardizes how Agents parse, research, invoke and explain
an AI-FSA PRE_MATCH analysis. It does not change any domain, API, model,
Provider or runtime contract.

## 1. Authority and ownership

The authority hierarchy remains:

```text
Project Bible / accepted ADRs / owning numbered contracts
  → Architecture Freeze and approved implementation gates
  → PROJECT_STATE for current runtime status
  → docs/40_PRODUCT_ROADMAP.md for product sequencing
  → this canonical Football Intelligence Analysis Protocol
  → Agent skill/rule pointers
  → conversation-specific instructions
```

When this protocol conflicts with a higher-authority source, stop and request
review. Do not alter the protocol interpretation to avoid correcting the owning
document.

Owning references:

- mission, epistemic boundaries and publication:
  `docs/00_PROJECT_BIBLE.md`, `docs/03_AI_PRINCIPLES.md`;
- domain and Evidence:
  `docs/02_DOMAIN_MODEL.md`, `docs/10_EVALUATION_ENGINE.md`,
  `docs/50_EVIDENCE_CATALOG.md`;
- architecture and package direction:
  `docs/04_ARCHITECTURE.md`, `docs/14_MONOREPO.md`,
  `docs/17_ANALYSIS_PIPELINE.md`, accepted ADRs;
- API direction:
  `docs/13_API.md` plus current implementation and delivery evidence;
- implemented V2 slice:
  `docs/34_V2_ARCHITECTURE_ALIGNMENT.md`,
  `docs/35_V2_FIRST_VERTICAL_SLICE_SPECIFICATION.md`;
- current production/runtime state: `docs/PROJECT_STATE.md`;
- product sequencing: `docs/40_PRODUCT_ROADMAP.md`;
- provider capability limitations:
  `docs/sprints/PREDICTION_VERTICAL_SLICE/PVS-3.3_PROVIDER_CAPABILITY_AND_DATA_COVERAGE_AUDIT.md`;
- protocol planning:
  `docs/sprints/PREDICTION_VERTICAL_SLICE/FIP-1_FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL_PLANNING.md`.

This protocol owns Agent execution order, research discipline, coverage and
failure presentation, API invocation responsibility, integrity review and the
final Agent output shape. It does not own or redefine Evidence schemas,
Features, Rules, Projection mathematics, Match Script parameters, Calibration,
Evaluation History, Providers or API implementation.

## 2. Operating model

### 2.1 Stable protocol invariants

These rules apply to every Agent and every conversation:

- PRE_MATCH only.
- Evidence before inference.
- Provider payloads reach analysis only through approved mapping and Evidence.
- External web observations are not Provider Facts.
- Missing data remains missing.
- CORE failure is fail-closed.
- No silent recorded fallback in a real-current claim.
- No Agent recomputation of deterministic outputs.
- No post-match leakage into a pre-match analysis.
- Market observations remain supporting signals, not football truth.
- Provenance and timestamps accompany factual claims.
- The sealed report is the source for projection outputs.
- A blocked or integrity-failed report is not a successful analysis.

### 2.2 Current implemented/as-built behavior

The repository currently implements:

- `GET /api/matches/upcoming`;
- `POST /api/analyze` using home team, away team and optional date;
- `POST /api/analyze/match/:matchId`;
- `GET /api/evidence/match/:matchId`;
- fixture resolution with explicit not-found and some ambiguity responses;
- Provider Adapter → FAS domain → Evidence normalization/import;
- the five-Evidence CORE analysis path;
- deterministic Feature and Rule stages;
- Feature → Football State → Match Script → Projection V2;
- Unified Matrix-derived scoreline, goal-range, BTTS and O/U outputs;
- sealed report policy/version/checksum metadata;
- Match Center metadata indicating recorded schedule fallback.

Current live/runtime limitations are owned by `docs/PROJECT_STATE.md`. At this
protocol version, the 2026 API-Football live smoke remains blocked by
current-season entitlement. A recorded demonstration does not prove current
live capability.

### 2.3 Future/not-yet-enforced behavior

The following protocol requirements are not yet enforced end to end by the
runtime:

- request fields for `analysisTime`, timezone, cutoff and requested markets;
- transport-level rejection of started/finished fixtures;
- cutoff-aware Evidence queries;
- configurable freshness checks;
- cross-source conflict and Evidence supersession services;
- External Evidence intake/normalization;
- a runtime CORE/IMPORTANT/OPTIONAL coverage service;
- `allowRecordedFallback=false` on analyze requests;
- guaranteed fallback provenance in every analysis report;
- automated Agent conformance tests.

Agents must not describe these as implemented. Where a required condition
cannot be verified manually from available artifacts, return an explicit
blocked/unknown result.

## 3. Request parsing

For every request, preserve the original user text and derive a normalized
request record:

```json
{
  "originalRequest": "分析 皇马 vs 皇家社会",
  "requestedHomeTeam": "皇马",
  "requestedAwayTeam": "皇家社会",
  "competition": null,
  "requestedDate": null,
  "requestedKickoff": null,
  "analysisTime": "ISO-8601",
  "timezone": "IANA timezone",
  "requestedMarkets": [
    "1X2",
    "SCORELINES",
    "GOAL_RANGE",
    "BTTS",
    "OVER_UNDER_2_5"
  ],
  "mode": "PRE_MATCH",
  "allowRecordedFallback": false
}
```

Rules:

- Team order is user intent, not authoritative home/away orientation.
- Resolve aliases through the current fixture catalog; do not rely on Agent
  memory.
- Capture `analysisTime` from the current clock.
- Treat competition/date/kickoff as constraints requiring verification.
- Requested markets filter presentation only. They never trigger alternative
  probability calculations.
- If the request is empty or cannot identify two teams, return
  `INVALID_REQUEST`.

The JSON shape is a protocol record, not an implemented API DTO.

## 4. Fixture discovery

1. Capture the current time before fixture selection.
2. Query `GET /api/matches/upcoming`.
3. Inspect the response body, including Provider modes and recorded-fallback
   metadata.
4. Match both requested teams using the system's normalized identities.
5. Apply user-provided competition/date constraints.
6. Cross-check the candidate fixture against an authoritative current schedule
   source.
7. Record match id, resolved teams, orientation, competition, kickoff,
   schedule source and Provider source.
8. Continue only with an upcoming, uniquely identified fixture.

Do not select a historical fixture because it is the newest search result.
Do not substitute an odds event identity for a football fixture without an
existing resolved binding.

## 5. Fixture disambiguation

Return `FIXTURE_AMBIGUOUS` when user intent does not identify one fixture.
Present each candidate with:

- match id;
- resolved home and away teams;
- competition;
- kickoff and timezone;
- schedule/Provider source;
- whether requested orientation was swapped;
- analyzable status.

Ask the user to choose one candidate. Do not select the fixture that produces a
preferred projection.

As-built caveat: the current resolver may deterministically choose the earliest
of multiple non-identical upcoming fixtures when no date is supplied. If that
choice does not clearly match the user's intent, the Agent must still expose
the choice and seek clarification. Changing resolver behavior belongs to a
later separately authorized phase.

## 6. PRE_MATCH cutoff

FIP permits only:

```text
analysisTime < verified kickoff
```

Set `analysisCutoff = analysisTime`. Every observation used for the analysis
must have been available at or before that cutoff.

Before invoking analysis:

- verify kickoff from current fixture data;
- compare kickoff with the captured analysis time;
- reject started, suspended-in-play or completed matches as `NOT_PRE_MATCH`;
- exclude final scores, in-play events and post-match reports;
- record timezone and UTC representation.

Current enforcement caveat: analyze endpoints do not yet accept or validate an
analysis cutoff. The Agent performs this gate from verified fixture data. If
fixture status or kickoff cannot be verified, do not claim a compliant
PRE_MATCH analysis.

## 7. Web research procedure

Research exists to verify fixture context and document Evidence coverage. It
does not create an alternative projection input path.

Search in this order:

1. official competition/league match centre;
2. official club sites and verified official team announcements;
3. official federation/league disciplinary, lineup and referee sources;
4. authorized or licensed structured data providers;
5. reputable attributed sports reporting;
6. aggregators and search results for discovery only.

For each retained observation:

- open and inspect the source page;
- quote or capture the precise factual claim;
- identify subject and match;
- record source URL and publisher;
- record publication, effective, observation and retrieval times when
  available;
- preserve uncertainty terms such as “expected” or “reported”;
- seek a second source when the primary source is not authoritative;
- record conflicts instead of selecting a convenient claim.

Never use a search snippet, prediction page, anonymous post or LLM memory as
the sole source for a CORE or IMPORTANT fact.

## 8. Source priority

Use domain-specific priority:

- fixture, kickoff, competition:
  official competition → official clubs → licensed fixture provider →
  reputable data site;
- confirmed lineup:
  official competition team sheet or official club announcement → licensed
  provider;
- injury/availability:
  official club/competition statement → licensed provider → corroborated
  reputable reporting;
- suspension:
  official federation/league record → official club → licensed provider;
- statistics and xG:
  official/licensed structured source with a declared definition and window;
- manager/registration:
  official club/league registration → licensed provider → corroborated
  reputable reporting;
- odds:
  named bookmaker feed or authorized market aggregator with snapshot time.

Different metric definitions remain separate. Do not average conflicting
facts. Different bookmaker quotes are parallel market observations, not
football-fact conflicts.

If equally authoritative official sources conflict on fixture identity,
kickoff or orientation, return `CORE_EVIDENCE_CONFLICT`.

## 9. Freshness

Freshness is evaluated at the analysis cutoff.

Protocol thresholds:

- fixture/kickoff:
  - within 48 hours of kickoff: retrieved within 6 hours;
  - farther from kickoff: retrieved within 24 hours;
  - any official schedule change invalidates the previous observation;
- TEAM_FORM, STATISTICS and xG windows:
  - contain completed matches only;
  - stop before the analysis cutoff;
  - refresh after either team completes a newer match;
- injuries/suspensions:
  - normally within 24 hours;
  - within 12 hours of kickoff: within 6 hours;
  - a later official update invalidates earlier status;
- confirmed lineup:
  - valid only after official publication;
  - retrieved within 15 minutes;
  - before publication, status is `NOT_PUBLISHED`, not an empty lineup;
- manager/club/squad:
  - within 7 days;
  - appointment, transfer or registration changes invalidate earlier data;
- match context:
  - bind rest/congestion to a schedule snapshot;
  - recompute after schedule changes;
- odds:
  - more than 2 hours before kickoff: within 60 minutes;
  - within 2 hours of kickoff: within 15 minutes;
  - preserve bookmaker, market, line and observed time;
- external statements:
  - preserve publication/effective/retrieval times;
  - missing publication time means `UNKNOWN`.

These thresholds are protocol policy, not current runtime validation. Current
normalizers generally mark imported Evidence `fresh`, and Evidence queries do
not enforce cutoff/freshness. If an Agent cannot independently verify the
required freshness, use `UNKNOWN` or `STALE`; do not state that the runtime
validated it.

## 10. Coverage gate

Classify each data requirement:

- `CORE`: failure blocks a successful projection claim.
- `IMPORTANT`: absence permits only a visibly partial analysis.
- `OPTIONAL`: absence is neutral and explicit.
- `UNAVAILABLE`: not published, unsupported, stale, conflicted, inaccessible or
  not implemented, with a reason.

Use coverage states:

- `AVAILABLE`
- `PARTIAL`
- `UNAVAILABLE`
- `STALE`
- `CONFLICTED`
- `UNKNOWN`

Use missing reasons:

- `NOT_PUBLISHED`
- `NOT_COVERED`
- `NOT_ENTITLED`
- `PROVIDER_FAILED`
- `STALE`
- `CONFLICT`
- `NOT_IMPLEMENTED`
- `FALLBACK_STATUS_UNKNOWN`

Coverage summaries do not create a new confidence score. Preserve projection
confidence and intelligence confidence as separate sealed outputs.

## 11. CORE data requirements

The current non-blocked V2 path requires exactly:

- one `MATCH_INFO`;
- home `TEAM_FORM`;
- away `TEAM_FORM`;
- home `STATISTICS`;
- away `STATISTICS`.

These must produce:

- `attackRatingHome`;
- `attackRatingAway`;
- `defenseRatingHome`;
- `defenseRatingAway`;
- `momentumHome`;
- `momentumAway`;
- `homeAdvantage`.

Verify imported Evidence using `GET /api/evidence/match/:matchId` when
available. Missing foundation Features block Projection publication.

Do not redefine payloads or feature mathematics here. Refer to the owning
Evidence/Feature contracts and current implementation.

H2H is optional to Projection mathematics. The current live football adapter
may impose H2H as an operational bundle gate. Report such a failure as an
adapter/provider limitation, not a sixth model CORE requirement.

## 12. IMPORTANT and OPTIONAL coverage

IMPORTANT:

- injuries, suspensions and player availability;
- confirmed lineup after publication;
- advanced statistics;
- provider-backed xG/xGA;
- objective Match Context;
- Club, Player and Manager Intelligence;
- venue and referee identity;
- near-kickoff market snapshot.

OPTIONAL:

- H2H for analytical enrichment;
- venue/formation detail;
- spreads, totals and multi-book market context;
- currently unused domains only when a governed source and consumer exist.

Confirmed lineup is currently report/raw Evidence rather than a complete direct
Feature family. Expected lineup is not confirmed lineup. Deep pressing,
transition-chain, shot-map and PSxG facts remain unavailable without an
approved source.

## 13. External web Evidence boundary

An Agent-collected web observation is `EXTERNAL_EVIDENCE`, not
`PROVIDER_FACT`.

It must retain:

- match and subject identity;
- exact factual claim;
- source class, publisher and URL;
- publication/effective/observed/retrieved times;
- verification and freshness states;
- corroborating sources;
- conflicts and notes.

Until an approved intake and normalizer exist:

- it remains outside the Evidence repository;
- it cannot create Features or Rules;
- it cannot modify Football State, Match Script, Projection or confidence;
- it appears only in a clearly separated research/coverage section;
- it cannot repair missing CORE imported Evidence;
- it cannot be described as used by the model.

LLM text is narrative/inference. It never becomes External Evidence merely
because it sounds plausible.

## 14. Provider abstraction

The protocol is capability-based:

```text
Source Connector
  → Provider Adapter or External Observation Collector
  → FAS Domain Mapping
  → Evidence Normalizer and Validation
  → Canonical Evidence
  → Feature / Rule / Analysis Pipeline
```

A Provider capability declaration includes:

- supported Evidence types;
- competition/season coverage;
- entitlement;
- current/historical availability;
- latency/freshness expectations;
- provider and source identities;
- failure semantics;
- licensing and retention constraints.

No vendor is mandatory at protocol level. A source is suitable only when an
approved adapter maps it into canonical Evidence. Official websites remain
External Evidence unless such an adapter/intake exists. Market providers remain
market sources, not football-fact providers.

## 15. API invocation responsibility

The Agent:

1. resolves request intent;
2. obtains and verifies the upcoming fixture;
3. performs the PRE_MATCH and fallback checks;
4. invokes `POST /api/analyze` or the unambiguous match-id endpoint;
5. inspects the response body, not only HTTP status;
6. retrieves match Evidence when needed for coverage review;
7. audits sealed report integrity;
8. explains the unchanged sealed outputs.

AI-FSA:

- selects configured Provider adapters;
- maps Provider data to FAS domain shapes;
- normalizes and stores Evidence;
- extracts Features;
- evaluates Rules;
- computes Football State;
- activates Match Scripts;
- computes Projection V2 and the Unified Matrix;
- computes deterministic confidence/recommendation;
- assembles the sealed report and provenance.

The current API may return HTTP 200 with `{ "ok": false }`. Treat that body as
a failure.

For a real-current claim, inspect Match Center metadata for Provider mode and
`usedRecordedFallback`. If fallback was used, label the result
`RECORDED_FALLBACK` and do not present it as live. If fallback state cannot be
linked reliably to the analyzed fixture/report, return
`FALLBACK_STATUS_UNKNOWN`; FIP-2 P1/P3 must address runtime propagation and
conformance.

## 16. Integrity audit

Before presenting Projection output, verify from the sealed report and current
PROJECT_STATE:

- expected production projection policy pin;
- expected production parameter artifact;
- `scorelinesBasis`;
- Football State presence and checksum;
- Match Script set presence and checksum;
- Unified Matrix presence, derivation policy and checksum;
- no V1 fallback;
- no blocked projection;
- Provider mode and fallback status;
- imported Evidence identity and side orientation;
- limitations and missing-data fields.

Current expected values are documented in PROJECT_STATE. At protocol activation
they are `projectionPolicyPin = "v2"`, parameter artifact
`projection.v3.replay`, and scoreline basis `match_script_merged_v2`. The Agent
must still compare the actual sealed report to current PROJECT_STATE rather
than assume these values forever.

Projection lineage:

- Football State consumes Features.
- Match Script consumes Football State.
- Rules are parallel findings/confidence/recommendation/explainability inputs.
- Market Rules use `channel: none`.
- scorelines, goal range, BTTS and O/U derive from one merged matrix.
- 1X2 derives from the same matrix marginals followed by the pinned calibration
  artifact.

Do not present success when lineage or version identity cannot be verified.

## 17. Fail-closed behavior

Standard protocol failures:

- `INVALID_REQUEST`
- `FIXTURE_NOT_FOUND`
- `FIXTURE_AMBIGUOUS`
- `NOT_PRE_MATCH`
- `CORE_EVIDENCE_MISSING`
- `CORE_EVIDENCE_STALE`
- `CORE_EVIDENCE_CONFLICT`
- `PROVIDER_NOT_ENTITLED`
- `PROVIDER_NOT_COVERED`
- `PROVIDER_UNAVAILABLE`
- `EXTERNAL_SOURCE_UNVERIFIED`
- `FALLBACK_STATUS_UNKNOWN`
- `ANALYSIS_IMPORT_FAILED`
- `PROJECTION_BLOCKED`
- `POLICY_PIN_MISMATCH`
- `REPORT_INTEGRITY_FAILED`

Rules:

- CORE failure: do not output successful 1X2, scoreline, goal-range, BTTS or O/U
  conclusions.
- IMPORTANT failure: only return the engine result with
  `PARTIAL_COVERAGE` and explicit limits.
- OPTIONAL failure: preserve explicit absence.
- entitlement/credential failure: report BLOCKED.
- ambiguity: present candidates and await selection.
- conflict: retain all conflicting observations; never choose based on desired
  output.
- recorded fallback: never call it live.
- blocked Projection: never publish as a successful match analysis.

A failure response may contain verified fixture facts and a precise retry or
clarification action. It must not contain invented deterministic output.

## 18. Analysis output contract

Every successful or partial Agent response uses this order:

1. `Fixture`
   - resolved teams/orientation, competition, kickoff, analysis time, cutoff,
     mode and source.
2. `Data Coverage`
   - CORE, IMPORTANT, OPTIONAL and UNAVAILABLE status.
3. `Team Strength`
   - sealed club/attack/defence Features only.
4. `Recent Form`
   - window, sample size, period and provenance.
5. `Injuries/Suspensions`
   - Provider Facts and External Evidence separated.
6. `Lineup`
   - confirmed, not published or unavailable.
7. `Advanced Stats`
8. `xG`
   - definition/window/source or honest absence.
9. `Match Context`
   - objective rest, congestion and competition context.
10. `Manager/Player Intelligence`
11. `Odds / Market`
    - bookmaker, market and observed time; supporting-only.
12. `Football State`
    - sealed dimensions/tags/checksum.
13. `Match Script`
    - sealed active scripts/weights/checksum.
14. `Projection`
    - 1X2;
    - most likely and top scorelines;
    - goal range;
    - BTTS;
    - O/U 2.5;
    - projection confidence;
    - intelligence confidence;
    - recommendation.
15. `Key Drivers`
    - traceable Evidence → Feature → Rule/State → Script → Projection links.
16. `Risks`
17. `Missing Data`
18. `Provenance`

Each data-bearing section includes one of:

- `AVAILABLE`
- `PARTIAL`
- `UNAVAILABLE`
- `STALE`
- `CONFLICTED`
- `UNKNOWN`

Narrative must not claim causal certainty from association, a final score from
a score probability, or model improvement from an unevaluated match.

## 19. Provenance

The final output records:

- original request;
- resolved match id and team orientation;
- competition and kickoff;
- schedule and Provider source;
- Provider mode;
- fallback status;
- source ids and URLs where applicable;
- publication/effective/observed/retrieved times;
- analysis time and cutoff;
- freshness and verification state;
- Evidence ids used by derived Features;
- Feature, Rule, Football State, Match Script, Projection and matrix
  versions/checksums available in the report;
- calibration artifact identity from the sealed report;
- limitations, missing reasons and conflict references.

Do not print, store or cite credentials.

## 20. Agent versus FAS responsibility

Agent-owned:

- parse and preserve the user request;
- clarify fixture ambiguity;
- conduct governed web research;
- classify External Evidence;
- review source priority, freshness, conflicts and coverage;
- invoke existing APIs;
- audit integrity and fallback state;
- explain sealed outputs with citations;
- stop honestly.

FAS-owned:

- Provider integration and mapping;
- canonical Evidence creation;
- deterministic Feature extraction;
- deterministic Rule evaluation;
- Football State;
- Match Script;
- Projection V2;
- Unified Matrix;
- confidence and recommendation;
- report assembly and checksums;
- Evaluation/Calibration lifecycles under separate governance.

The Agent cannot take over a FAS-owned responsibility when the runtime lacks
data or returns failure.

## 21. Mandatory prohibitions

An Agent must not:

- invent a fixture, source, Evidence item, injury, lineup, statistic, xG or
  market observation;
- treat news opinion, prediction feeds or LLM text as Provider Fact;
- bypass Evidence;
- recompute or alter lambda, probabilities, Football State, Match Script,
  Unified Matrix, confidence or recommendation;
- change Projection, Feature, Rule, Match Script or Calibration parameters;
- promote a calibration/model candidate;
- use market prices to replace football probability;
- use LIVE or POST_MATCH data in PRE_MATCH analysis;
- reconstruct a historical pre-match prediction from a final result;
- present recorded data as live;
- hide missing, stale, conflicted or unknown data;
- convert an API/provider failure to empty success;
- publish a blocked Projection;
- provide wagering advice;
- disclose credentials.

## 22. Cross-Agent reuse

Every new Agent or new conversation handling a football match analysis must
read:

1. `AGENTS.md`;
2. `docs/PROJECT_STATE.md`;
3. this protocol;
4. owning references needed for the task.

Agents must not maintain a parallel protocol in prompts, rules or skills. A
future Agent rule/skill may link to this document but may not copy its policy
body. Conversation-specific instructions may narrow the analysis but cannot
weaken higher-authority prohibitions.

Recorded examples must be labelled `RECORDED_DEMO` or `RECORDED_FALLBACK`.
Blocked live examples remain blocked. No example upgrades capability status.

## 23. Protocol lifecycle and version governance

Statuses:

- `DRAFT`: under preparation; not canonical.
- `REVIEWED`: governance review passed; not active.
- `ACTIVE`: current canonical Agent protocol.
- `SUPERSEDED`: retained for audit but not active.

Version rules:

- Editorial corrections that do not change behavior may retain the current
  version with review evidence.
- Changes to source priority, cutoff, freshness, coverage, failure semantics,
  output contract or Agent/FAS responsibility require a reviewed version
  increment.
- Changes to Evidence schemas, APIs, Providers, Feature/Rule logic, Projection,
  Match Script, Calibration or Evaluation History follow their owning
  governance paths; this protocol cannot authorize them.
- A higher-authority conflict blocks activation of the affected protocol
  section until reconciled.
- Supersession must identify the prior protocol version and effective date.
- PROJECT_STATE owns current runtime capability and blockers.
- PROJECT_INDEX owns discoverability and document ownership.
- `docs/40_PRODUCT_ROADMAP.md` owns product sequencing and is not changed by
  this protocol.

## 24. Current limitations and phase boundaries

The canonical documentation protocol is active, but full automated enforcement
is not:

- FIP-2 P1 Contracts and Validation: **NOT AUTHORIZED / NOT STARTED**
- FIP-2 P2 Agent Operational Playbook: **NOT AUTHORIZED / NOT STARTED**
- FIP-2 P3 Cross-Agent Conformance: **NOT AUTHORIZED / NOT STARTED**
- FIP-2 P4 Documentation Integration and Drift Control:
  **NOT AUTHORIZED / NOT STARTED**

Therefore:

- PRE_MATCH cutoff remains an Agent procedure, not an API gate;
- freshness/conflict checks remain Agent review, not runtime services;
- External Evidence remains outside production Evidence;
- no conformance suite proves all Agents follow the protocol;
- live 2026 analysis remains subject to the blocker in PROJECT_STATE;
- the protocol adds no Provider, credential or runtime capability.

Stop after the requested PRE_MATCH analysis or explicit failure. Do not start a
later FIP phase, PVS-3.4, tuning or model promotion automatically.
