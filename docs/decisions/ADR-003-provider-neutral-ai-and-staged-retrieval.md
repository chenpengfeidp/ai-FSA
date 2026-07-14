# ADR-003: Provider-Neutral AI and Staged Retrieval

## Status

Accepted

## Date

2026-07-14

## Context

FAS uses AI to draft evidence-backed analysis, but provider output is untrusted and cannot own domain decisions. Provider APIs, SDK types, models, and error envelopes change independently from FAS domain semantics. Analysis must remain reviewable and reproducible through exact input, prompt, schema, model, provider-attempt, validation, and checksum records.

Retrieval quality must also be established before adding embeddings. Approved knowledge and reviewed cases already contain structured metadata, tags, scope, effective dates, and searchable text that can support a measurable v1 baseline.

## Decision

FAS will use a provider-neutral AI generation port and staged retrieval architecture.

- The OpenAI Responses API is the initial v1 adapter behind the provider-neutral TypeScript port.
- Provider SDK objects, request fields, response envelopes, error details, and credentials remain inside the adapter.
- The port accepts provider-neutral model configuration, immutable prompt manifest context, a versioned structured-output schema, correlation identifiers, timeout, and cancellation settings.
- Adapter results are mapped to provider-neutral candidates or typed failures before domain validation.
- Prompt templates, ordered composition manifests, output schemas, model configurations, builder versions, adapter versions, and validators are independently versioned and checksummed.
- Provider output is parsed as `unknown`, validated against the exact closed structured-output schema, mapped to domain types, and subjected to semantic, citation, temporal, contradiction, and policy validation before publication.
- V1 knowledge and case retrieval uses PostgreSQL metadata, tags, scope, effective dates, and full-text search. Exact selections and retrieval reasons are frozen in the analysis snapshot.
- pgvector and versioned embeddings are deferred to Phase 2, after retrieval evaluation demonstrates a need and provides a baseline for recall, relevance, latency, and cost comparisons.

## Consequences

### Positive

- Domain and application logic remain independent of OpenAI-specific contracts.
- A replacement or additional provider can be introduced through a tested adapter.
- Versioned manifests and structured outputs make runs auditable, reproducible in context, and safely validated.
- PostgreSQL retrieval provides a simpler, explainable baseline with exact filters and recorded selection reasons.
- Deferring embeddings avoids premature infrastructure and makes pgvector adoption evidence-driven.

### Negative

- The provider-neutral contract requires mapping work and may expose only capabilities common to supported adapters unless extensions are carefully designed.
- Provider-specific improvements may require adapter capability negotiation without leaking vendor logic inward.
- Closed schemas and multi-stage validation add implementation and operational complexity.
- PostgreSQL full-text retrieval may miss semantically similar content that does not share useful terms.
- Adding pgvector later requires embedding lifecycle, chunking, indexing, evaluation, and migration work.

## Alternatives Considered

- **Use OpenAI SDK types throughout the application:** rejected because it couples domain behavior, persistence, and tests to one provider.
- **Accept free-form model prose:** rejected because it cannot provide a safe, versioned publication contract or reliable claim-level validation.
- **Add pgvector in v1:** deferred because retrieval quality, corpus size, and semantic-search benefit have not yet been measured against a metadata/full-text baseline.
- **Use an external vector database:** rejected for v1 because it adds another system of record and operational dependency before demonstrated need.
- **Allow the Prompt Engine to retrieve directly:** rejected because hidden retrieval would weaken snapshot reproducibility and module ownership.

## Adoption/Review Triggers

Review the provider decision when:

- provider reliability, capability, cost, latency, governance, or model availability no longer meets release thresholds;
- a second provider is required for approved resilience or comparative evaluation;
- the provider-neutral port cannot represent a required capability without unsafe vendor leakage;
- structured-output or replay requirements materially change.

Evaluate pgvector in Phase 2 when:

- retrieval evaluation identifies material recall or relevance gaps in metadata/full-text search;
- the approved corpus is large enough to justify semantic indexing;
- representative tests define acceptable relevance, latency, cost, and explainability thresholds;
- embedding model, dimensions, chunking version, source checksum, and re-indexing governance are specified.

## References

- [00_PROJECT_BIBLE.md](../00_PROJECT_BIBLE.md)
- [03_AI_PRINCIPLES.md](../03_AI_PRINCIPLES.md)
- [04_ARCHITECTURE.md](../04_ARCHITECTURE.md)
- [12_DATABASE.md](../12_DATABASE.md)
- [14_MONOREPO.md](../14_MONOREPO.md)
- [15_DEVELOPMENT_GUIDE.md](../15_DEVELOPMENT_GUIDE.md)
