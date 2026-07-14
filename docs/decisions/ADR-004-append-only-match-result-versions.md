# ADR-004: Append-only Match Result Versions

## Status

Accepted

## Date

2026-07-14

## Context

Post-match reviews, evaluation reports, statistics, and historical cases must remain reproducible after an official score is corrected. Updating one mutable result row would silently change the outcome against which an existing review was completed and would violate the Project Bible's reviewability requirement.

FAS therefore needs a stable match-result identity for current-state navigation and immutable result versions for analytical references. Corrections must remain visible, attributable, and concurrency-safe.

## Decision

Match results use a stable aggregate root plus append-only immutable versions.

- Each match has at most one `MatchResult` root.
- The root points to the current `MatchResultVersion`.
- A version records scores, verified outcome-evidence references, checksum, recorded time, status, and optional superseded-version reference.
- The first verified result creates version 1.
- A correction appends the next monotonic version with a mandatory reason and supersession reference; it never updates an earlier version.
- Advancing the root pointer, appending the version, and writing the audit event are one transaction.
- Reviews reference the exact result-version ID. Completed-review uniqueness is `(analysis revision, result version)`.
- Evaluation, Statistics, and Case records inherit exact result-version references through their frozen input manifests.
- Result commands use optimistic concurrency and return immutable version identity and checksum.

## Consequences

### Positive

- Historical reviews remain reproducible after corrections.
- Every correction has an explicit lineage, reason, evidence basis, and audit record.
- Concurrent result corrections can be rejected safely.
- Cases, evaluations, and statistics can state exactly which outcome version they used.
- The model follows the same stable-root/immutable-version pattern as other governed artifacts.

### Negative

- Result reads require a root-to-current-version join.
- Consumers must choose whether they need the current result or a historical version.
- Corrected outcomes may require new reviews and recomputed projections rather than in-place updates.
- Retention and indexing must account for multiple versions, although expected cardinality per match is low.

## Alternatives Considered

- **Update one result row and rely on audit events:** rejected because analytical foreign keys would still resolve to changed content.
- **Copy result fields into every review only:** rejected because it duplicates outcome identity and weakens cross-artifact integrity.
- **Treat a correction as a new match:** rejected because the fixture identity did not change and downstream references would fragment.
- **Event sourcing for the complete Match aggregate:** rejected as unnecessary complexity; append-only result versions provide the required history.

## Adoption/Review Triggers

Review this decision only if:

- a provider supplies materially different result dimensions that cannot share one version lineage;
- regulatory or retention requirements require tombstoning or redaction of outcome evidence;
- event sourcing is adopted for broader, independently justified Match-domain needs;
- result correction volume demonstrates a measured need for archival partitioning.

Any change must preserve exact historical review and evaluation reproducibility.

## References

- [00_PROJECT_BIBLE.md](../00_PROJECT_BIBLE.md)
- [02_DOMAIN_MODEL.md](../02_DOMAIN_MODEL.md)
- [09_REVIEW_ENGINE.md](../09_REVIEW_ENGINE.md)
- [12_DATABASE.md](../12_DATABASE.md)
- [13_API.md](../13_API.md)
- [16_IMPLEMENTATION_ROADMAP.md](../16_IMPLEMENTATION_ROADMAP.md)
- [19_DATABASE_ERD.md](../19_DATABASE_ERD.md)
