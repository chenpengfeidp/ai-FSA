# FAS REST API Design

## 1. Scope

This document defines the v1 HTTP contract for FAS. The API supports match/evidence management, governed knowledge/rules/cases, asynchronous pre-match analysis, post-match review, evaluation reports, and statistics projections.

V1 has no user or authentication system and must run only in a trusted private environment. Authentication, authorization, tenant boundaries, and public rate limiting are prerequisites for public deployment.

Base path:

```text
/api/v1
```

OpenAPI is generated from the NestJS transport layer and treated as a release artifact. Shared TypeScript contracts may be generated from or validated against that specification, but transport DTOs do not become domain models.

## 2. Protocol Conventions

- HTTPS outside local development.
- JSON request and response bodies use `application/json`.
- Field names use `camelCase`; timestamps are RFC 3339 UTC strings.
- IDs are UUID strings.
- Monetary/betting operations do not exist.
- Unknown request fields are rejected for commands.
- Empty optional values are omitted rather than sent as `null`, except where `null` explicitly clears a field.
- `Accept-Language` may affect display labels only, never stored analytical meaning.
- Every response includes `X-Request-Id`; callers may send one.

## 3. Resource and State Conventions

- `POST` creates a resource or initiates a command.
- `GET` is side-effect free.
- `PATCH` applies a partial mutable-draft update.
- `PUT` replaces a singular value such as verified match result.
- `DELETE` is limited to unreferenced drafts; governed/history records are retired instead.
- Lifecycle commands use explicit subresources, for example `POST /rules/{id}/versions/{version}/activate`.
- Long-running work returns `202 Accepted` and a job resource.
- Published/versioned resources are immutable.

## 4. Headers

| Header | Direction | Use |
|---|---|---|
| `X-Request-Id` | Both | End-to-end correlation |
| `Idempotency-Key` | Request | Required for retryable creates/commands |
| `If-Match` | Request | Required for optimistic updates, using the current ETag |
| `ETag` | Response | Resource row/revision version |
| `Location` | Response | Created resource or job URL |
| `Retry-After` | Response | Rate limit or temporary unavailability |

An idempotency key is scoped to route and command type. Reusing it with a different request body returns `409 IDEMPOTENCY_KEY_REUSED`.

## 5. Standard Envelopes

### 5.1 Single Resource

```json
{
  "data": {
    "id": "4f26dd7c-d57b-4a24-904c-c91dfe8be3bd",
    "status": "draft"
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

### 5.2 Collection

```json
{
  "data": [],
  "page": {
    "nextCursor": null,
    "hasMore": false
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

Collections use cursor pagination:

- `limit`: default 25, maximum 100;
- `cursor`: opaque server-issued token;
- stable ordering is documented per endpoint;
- filters are conjunctive unless explicitly stated.

### 5.3 Error

```json
{
  "error": {
    "code": "ANALYSIS_EVIDENCE_NOT_READY",
    "message": "Critical evidence is missing or stale.",
    "details": [
      {
        "field": "lineups",
        "reason": "missing"
      }
    ],
    "retryable": false
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

Stable machines consume `code`; human-facing `message` may improve without a major API version.

## 6. Status Codes

| Status | Meaning |
|---|---|
| `200` | Successful read/update/command |
| `201` | Resource created |
| `202` | Asynchronous work accepted |
| `204` | Successful command with no body |
| `400` | Malformed request |
| `404` | Resource not found |
| `409` | State, idempotency, or uniqueness conflict |
| `412` | `If-Match` precondition failed |
| `422` | Semantically invalid input or failed domain invariant |
| `429` | Provider/system rate protection |
| `500` | Unexpected internal failure |
| `502` | External provider invalid/unavailable |
| `503` | Service temporarily not ready |

## 7. API Resource Map

| Resource | Owning module | Database aggregate |
|---|---|---|
| `/competitions`, `/seasons`, `/teams` | Match catalog | Competition, Season, Team |
| `/matches` | Match | Match |
| `/matches/{id}/evidence` | Evidence | Evidence item/source record |
| `/knowledge-items` | Knowledge Engine | Knowledge item/version |
| `/rules` | Rule Engine | Rule/version |
| `/cases` | Case Engine | Case item/version |
| `/analyses` | Analysis Orchestrator | Analysis/snapshot/run/revision |
| `/reviews` | Review Engine | Review/assessments |
| `/learning-candidates` | Review + target engine | Learning candidate |
| `/evaluation-definitions`, `/evaluations`, `/evaluation-reports` | Evaluation Engine | Assessment definitions/runs/criterion results/gate decisions/reports |
| `/statistics` | Statistics Engine | Metric definitions/projections |
| `/jobs` | Operations | Job |

## 8. Catalog and Match Endpoints

### Catalog

- `GET /competitions`
- `POST /competitions`
- `GET /competitions/{competitionId}`
- `GET /competitions/{competitionId}/seasons`
- `POST /competitions/{competitionId}/seasons`
- `GET /teams`
- `POST /teams`
- `GET /teams/{teamId}`

### Matches

- `GET /matches?competitionId=&seasonId=&status=&from=&to=&cursor=&limit=`
- `POST /matches`
- `GET /matches/{matchId}`
- `PATCH /matches/{matchId}`
- `GET /matches/{matchId}/result`
- `GET /matches/{matchId}/result/versions`
- `PUT /matches/{matchId}/result`

Create match request:

```json
{
  "seasonId": "6fa6dc47-c107-42e4-a5cb-e673d8ca5148",
  "kickoffAt": "2026-08-16T15:30:00Z",
  "sourceTimezone": "Europe/London",
  "stage": "Matchday 1",
  "participants": [
    {
      "teamId": "34fbbf59-bd2d-4147-9c50-b5a8e494919d",
      "role": "home"
    },
    {
      "teamId": "7745911f-1b8b-4e71-b8ed-4652783e9a52",
      "role": "away"
    }
  ]
}
```

Verified result request:

```json
{
  "homeScore": 2,
  "awayScore": 1,
  "resultStatus": "verified",
  "evidenceId": "4b1876b4-75f7-4720-8ff4-cb27ce8ef454"
}
```

A verified result requires outcome evidence. The command appends an immutable result version and returns its `resultVersionId`, `version`, checksum, and supersession reference. Correcting a result requires `If-Match`, `supersedesResultVersionId`, and a non-empty `correctionReason`; it never overwrites the prior version. Concurrent correction against a stale root ETag returns `412`.

## 9. Evidence Endpoints

- `GET /matches/{matchId}/evidence?type=&metricKey=&qualityStatus=&observedBefore=`
- `POST /matches/{matchId}/source-records`
- `POST /matches/{matchId}/evidence`
- `GET /evidence/{evidenceId}`
- `POST /evidence-conflicts/{conflictId}/resolve`
- `GET /matches/{matchId}/readiness`

Evidence creation request:

```json
{
  "sourceRecordId": "1bffaf1e-742e-45d4-aeee-cb90743a9214",
  "evidenceType": "fact",
  "subject": {
    "type": "team",
    "id": "34fbbf59-bd2d-4147-9c50-b5a8e494919d"
  },
  "metricKey": "team.player.absence",
  "value": {
    "schemaVersion": 1,
    "playerName": "Example Player",
    "status": "confirmed_out"
  },
  "observedAt": "2026-08-16T10:00:00Z",
  "normalizerVersion": "absence-v1"
}
```

Readiness response:

```json
{
  "data": {
    "matchId": "92cafcd7-edbe-4fb0-836c-f9645f96c7b0",
    "ready": false,
    "evaluatedAt": "2026-08-16T12:00:00Z",
    "cutoffAt": "2026-08-16T12:00:00Z",
    "blockingIssues": [
      {
        "code": "CRITICAL_EVIDENCE_MISSING",
        "metricKey": "team.lineup"
      }
    ],
    "warnings": []
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

## 10. Knowledge API

- `GET /knowledge-items?status=&tag=&competitionId=&query=`
- `POST /knowledge-items`
- `GET /knowledge-items/{id}`
- `POST /knowledge-items/{id}/versions`
- `GET /knowledge-items/{id}/versions/{version}`
- `POST /knowledge-items/{id}/versions/{version}/approve`
- `POST /knowledge-items/{id}/versions/{version}/reject`
- `POST /knowledge-items/{id}/retire`

Version creation request:

```json
{
  "title": "Interpreting short-rest schedules",
  "summary": "Methodology for evaluating limited recovery time.",
  "bodyMarkdown": "Source-backed methodology text.",
  "scope": {
    "competitionIds": [],
    "contexts": ["short_rest"]
  },
  "tags": ["schedule", "recovery"],
  "effectiveFrom": "2026-08-01T00:00:00Z",
  "sources": [
    {
      "sourceRecordId": "d51419bc-6adb-40f9-a34d-dd1d334150a6",
      "excerpt": "Relevant source excerpt",
      "locator": "section-3"
    }
  ]
}
```

Approval is an explicit command with a rationale and idempotency key. Approved versions are immutable.

## 11. Rule API

- `GET /rules?status=&competitionId=&query=`
- `POST /rules`
- `GET /rules/{id}`
- `POST /rules/{id}/versions`
- `GET /rules/{id}/versions/{version}`
- `POST /rules/{id}/versions/{version}/validate`
- `POST /rules/{id}/versions/{version}/approve`
- `POST /rules/{id}/versions/{version}/activate`
- `POST /rules/{id}/suspend`
- `POST /rules/{id}/retire`
- `POST /rules/evaluate-preview`
- `GET /rules/{id}/versions/{version}/statistics`

Rule version request:

```json
{
  "title": "Short rest with defensive absences",
  "description": "Flags elevated uncertainty when rest and availability conditions combine.",
  "conditionSchemaVersion": 1,
  "conditions": {
    "all": [
      {
        "metric": "team.rest_days",
        "operator": "lt",
        "value": 4
      },
      {
        "metric": "team.confirmed_defensive_absences",
        "operator": "gte",
        "value": 2
      }
    ]
  },
  "outcome": {
    "findingKey": "defensive_stability_uncertainty",
    "severity": "medium"
  },
  "scope": {
    "competitionIds": []
  },
  "sampleCount": 184,
  "confidence": 0.71,
  "minimumSampleRequired": 100,
  "validationMethod": "Historical holdout evaluation",
  "limitations": "Does not account for replacement-player quality."
}
```

The preview endpoint never persists an evaluation and returns condition-by-condition explanation. Production evaluation only occurs against a sealed analysis snapshot.

## 12. Case Library API

- `GET /cases?status=&competitionId=&tag=&matchId=&query=`
- `POST /cases`
- `GET /cases/{id}`
- `POST /cases/{id}/versions`
- `GET /cases/{id}/versions/{version}`
- `POST /cases/{id}/versions/{version}/approve`
- `POST /cases/{id}/retire`
- `POST /cases/search-preview`

Case creation requires a completed match and review reference. A selected case response includes retrieval reason, similarities, material differences, and the exact case version.

## 13. Analysis API

### Endpoints

- `GET /analyses?matchId=&status=&from=&to=&cursor=&limit=`
- `POST /analyses`
- `GET /analyses/{analysisId}`
- `GET /analyses/{analysisId}/snapshot`
- `GET /analyses/{analysisId}/runs`
- `GET /analyses/{analysisId}/revisions/{revision}`
- `POST /analyses/{analysisId}/retry`
- `POST /analyses/{analysisId}/publish`
- `POST /analyses/{analysisId}/supersede`
- `GET /analyses/{analysisId}/validations`

### Create Analysis

Request:

```http
POST /api/v1/analyses
Idempotency-Key: 69651dc8-8383-47a8-9240-25bdf2cc8165
Content-Type: application/json
```

```json
{
  "matchId": "92cafcd7-edbe-4fb0-836c-f9645f96c7b0",
  "analysisType": "pre_match",
  "cutoffAt": "2026-08-16T12:00:00Z",
  "modelConfigurationId": "8f19b94e-530d-4f96-aea2-d47bdb284629",
  "options": {
    "knowledgeLimit": 12,
    "caseLimit": 5
  }
}
```

Accepted response:

```http
HTTP/1.1 202 Accepted
Location: /api/v1/jobs/45467036-1a02-498f-873d-c9349a21c97d
```

```json
{
  "data": {
    "analysis": {
      "id": "60c01f79-f74b-4410-8a7c-2705f3da77ce",
      "matchId": "92cafcd7-edbe-4fb0-836c-f9645f96c7b0",
      "status": "running",
      "cutoffAt": "2026-08-16T12:00:00Z"
    },
    "job": {
      "id": "45467036-1a02-498f-873d-c9349a21c97d",
      "type": "analysis.generate",
      "status": "queued"
    }
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

### Analysis Representation

```json
{
  "data": {
    "id": "60c01f79-f74b-4410-8a7c-2705f3da77ce",
    "matchId": "92cafcd7-edbe-4fb0-836c-f9645f96c7b0",
    "analysisType": "pre_match",
    "status": "validated",
    "cutoffAt": "2026-08-16T12:00:00Z",
    "snapshot": {
      "id": "8e5c8242-f8cd-456f-863c-641d6a034ee5",
      "checksum": "sha256-hex",
      "qualitySummary": {
        "blockingIssueCount": 0,
        "warningCount": 2
      }
    },
    "currentRevision": {
      "number": 1,
      "schemaVersion": "analysis-v1",
      "sections": {
        "facts": [],
        "marketSignals": [],
        "ruleFindings": [],
        "caseAnalogies": [],
        "inferences": [],
        "uncertainties": [],
        "scenarios": []
      },
      "validationStatus": "valid",
      "publishedAt": null
    }
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

Every claim in a section has a stable claim key, type, statement, optional confidence, rationale, and typed citations. API consumers must not infer claim type from prose.

### Publish

```json
{
  "revision": 1,
  "expectedChecksum": "sha256-hex",
  "rationale": "Evidence and validation findings reviewed."
}
```

Publication requires `If-Match`, a valid revision, no blocking validation, and a sealed snapshot. It returns `409 ANALYSIS_NOT_PUBLISHABLE` otherwise.

## 14. Job API

- `GET /jobs/{jobId}`
- `POST /jobs/{jobId}/cancel`
- `POST /jobs/{jobId}/retry`

```json
{
  "data": {
    "id": "45467036-1a02-498f-873d-c9349a21c97d",
    "type": "analysis.generate",
    "status": "running",
    "stage": "provider_generation",
    "attempt": 1,
    "maxAttempts": 3,
    "createdAt": "2026-08-16T12:00:01Z",
    "startedAt": "2026-08-16T12:00:02Z",
    "finishedAt": null,
    "resource": {
      "type": "analysis",
      "id": "60c01f79-f74b-4410-8a7c-2705f3da77ce"
    },
    "error": null
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

Job polling should use bounded backoff. Server-sent events or webhooks are not part of v1 because notifications are excluded.

## 15. Review API

- `GET /reviews?analysisId=&matchId=&status=`
- `POST /reviews`
- `GET /reviews/{reviewId}`
- `PATCH /reviews/{reviewId}`
- `PUT /reviews/{reviewId}/claims/{claimId}`
- `PUT /reviews/{reviewId}/rules/{ruleEvaluationId}`
- `PUT /reviews/{reviewId}/cases/{caseVersionId}`
- `POST /reviews/{reviewId}/complete`
- `GET /reviews/{reviewId}/learning-candidates`

Create request:

```json
{
  "analysisRevisionId": "c28cef2f-87ae-46e8-b2cc-05030d84e642"
}
```

Claim assessment:

```json
{
  "assessment": "contradicted",
  "rationale": "The verified outcome evidence shows the stated scenario did not occur.",
  "outcomeEvidenceIds": [
    "4b1876b4-75f7-4720-8ff4-cb27ce8ef454"
  ]
}
```

Complete request:

```json
{
  "overallAssessment": "partially_supported",
  "summary": "Evidence quality was adequate, but the decisive inference overweighted the market signal.",
  "learningCandidates": [
    {
      "candidateType": "methodology",
      "evidenceSummary": "Three reviewed claims show the same weighting issue.",
      "proposal": {
        "schemaVersion": 1,
        "description": "Review market-signal weighting when lineup evidence conflicts."
      }
    }
  ]
}
```

Completion validates required claim/rule/case assessments and atomically creates a statistics refresh job.

## 16. Learning Candidate API

- `GET /learning-candidates?status=&type=&reviewId=`
- `GET /learning-candidates/{id}`
- `POST /learning-candidates/{id}/accept`
- `POST /learning-candidates/{id}/reject`

Accepting requires rationale and creates a draft in the target engine. It never approves or activates that draft.

## 17. Evaluation API

- `GET /evaluation-definitions?status=&subjectType=`
- `POST /evaluation-definitions`
- `GET /evaluation-definitions/{id}`
- `POST /evaluation-definitions/{id}/versions`
- `GET /evaluation-definitions/{id}/versions/{version}`
- `POST /evaluation-definitions/{id}/versions/{version}/approve`
- `POST /evaluation-definitions/{id}/versions/{version}/activate`
- `POST /evaluations`
- `GET /evaluations/{evaluationId}`
- `GET /evaluation-reports/{reportId}`
- `GET /evaluation-reports?definitionId=&subjectType=&gateDecision=&cursor=&limit=`

Evaluation execution is asynchronous and returns `202 Accepted` with a Job resource. Requests identify an exact assessment-definition version and immutable subject or corpus manifest. Reports include qualification, criterion results, exact Statistics projection references, gate decision, baseline comparison, waivers, limitations, schema/computation version, and checksum. The Evaluation API applies policy; it never recomputes Statistics projections.

## 18. Statistics API

- `GET /statistics/quality?from=&to=&competitionId=`
- `GET /statistics/rules/{ruleId}/versions/{version}?from=&to=`
- `GET /statistics/calibration?from=&to=&competitionId=`
- `GET /statistics/reviews?from=&to=`
- `POST /statistics/refresh`

Responses always include:

- metric key and definition version;
- population and filters;
- sample count and minimum required sample;
- value and unit;
- confidence interval where applicable;
- source watermark and computed time.

If the minimum sample is not met, the value may be returned for inspection but includes `qualified: false` and must not be presented as reliable.

Statistics responses are deterministic projection resources. They do not include release, approval, or quality-gate decisions.

## 19. Health and Operations

- `GET /health/live`: process liveness only.
- `GET /health/ready`: database, migration compatibility, and required configuration.
- `GET /version`: build commit, build time, API version, and schema compatibility; no secrets.

Provider availability does not make the API process unready for reads, but analysis readiness reports provider degradation.

## 20. Error Code Families

| Prefix | Examples |
|---|---|
| `VALIDATION_` | Invalid field or schema |
| `MATCH_` | Invalid match state or result |
| `EVIDENCE_` | Missing, stale, conflicted, or cutoff violation |
| `KNOWLEDGE_` | Invalid version or approval state |
| `RULE_` | Invalid condition, insufficient sample, invalid transition |
| `CASE_` | Unreviewed source or invalid version |
| `ANALYSIS_` | Not ready, run failed, invalid output, not publishable |
| `REVIEW_` | Missing outcome, incomplete assessments |
| `EVALUATION_` | Invalid definition, unqualified input, criterion failure, report conflict |
| `STATISTICS_` | Invalid metric, watermark failure, unqualified projection |
| `JOB_` | Not retryable, already completed, lease conflict |
| `PROVIDER_` | Timeout, rate limit, invalid response |
| `CONCURRENCY_` | ETag/precondition conflict |

Errors returned from external providers are translated to stable FAS codes. Raw provider messages are retained only in redacted diagnostics.

## 21. Versioning and Compatibility

### 21.1 API Version

- Major version appears in the URL.
- Additive optional fields and endpoints do not require a new major version.
- Removing/renaming fields, changing meaning, narrowing accepted values, or changing state semantics requires `/api/v2`.
- New enum values are potentially breaking; clients must use an `unknown` fallback, and releases document additions.

### 21.2 Document Schema Version

Analysis content, rule conditions, evidence values, learning proposals, and job payloads carry independent schema versions. API version and document schema version are not the same.

### 21.3 Deprecation

Before public consumers exist, internal deprecations require one release of warning where practical. After external access is introduced:

- publish deprecation dates;
- provide migration guidance;
- emit `Deprecation` and `Sunset` headers;
- support the prior major version for a documented window.

### 21.4 Contract Validation

CI must verify:

- generated OpenAPI is current;
- request/response examples validate;
- web/API contract tests pass;
- database aggregate ownership matches this API map;
- provider-specific fields do not leak into domain resources.

## 22. Security Evolution

V1 relies on network isolation, input/output validation, secret management, audit logs, and least-privilege runtime credentials. Before any public or multi-user use, introduce:

- authenticated identities;
- explicit roles and resource permissions;
- actor identity in all audit events;
- tenant/data isolation if required;
- abuse controls and per-identity rate limits;
- security review of all previously trusted operator endpoints.
