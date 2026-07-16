# Sprint 8 Architecture Alignment Approval

## Approval Record

- Approval date: 2026-07-16
- Decision body: FAS Architecture Board
- Proposal reviewed: `docs/sprints/SPRINT8_ARCHITECTURE_ALIGNMENT.md`
- Governing document aligned: `docs/21_ARCHITECTURE_SIGNOFF.md`
- Affected decision: MF-02 — Prisma No-model Bootstrap Contract
- Decision: **APPROVED**
- Change type: Documentation-only architecture alignment
- Sprint 8 implementation status: Not started and not authorized

## Approved Wording

The Architecture Board approved the following replacement for the MF-02 **Decision** sentence:

> **Decision:** Use explicit Prisma config selection, Prisma `7.8.0` default no-model generation, and a non-secret validation URL. Prove the zero-model boundary with two complementary checks: default `prisma generate` must succeed, while a controlled `prisma generate --require-models` command must fail specifically because the schema contains no models. Verify validation and generation from both repository-root and database-package contexts. Do not treat an unknown-option, configuration, environment, dependency, or path-resolution failure as no-model evidence.

The approved wording replaces the unsupported `--allow-no-models` command assumption with the verified Prisma `7.8.0` contract:

- default generation permits a zero-model schema;
- `--require-models` provides controlled negative evidence;
- explicit config selection remains required;
- a non-secret validation URL remains required;
- repository-root and database-package execution contexts remain required.

## Files Modified

### Modified

- `docs/21_ARCHITECTURE_SIGNOFF.md`
  - replaced only the MF-02 **Decision** sentence.

### Created

- `docs/sprints/SPRINT8_ARCHITECTURE_ALIGNMENT_APPROVAL.md`
  - records Architecture Board approval and the applied wording.

No other existing file was modified.

## Change Isolation Confirmation

Only the MF-02 **Decision** sentence changed in the architecture sign-off.

The following MF-02 content remains unchanged:

- review finding;
- architectural rationale;
- impact;
- owner;
- target milestone.

All other architecture-sign-off decisions remain unchanged, including:

- MF-01 and MF-03 through MF-18;
- all deferred decisions;
- all documentation-alignment decisions;
- all rejected recommendations;
- conditions of approval;
- final Architecture Board decision.

No ADR, implementation plan, Sprint specification, Sprint report, application file, package manifest, dependency, lockfile, or tool configuration was modified.

## Sprint 8 Status

This approval resolves the MF-02 wording conflict only.

It does not:

- authorize Sprint 8 implementation;
- install Prisma;
- create `@fas/database`;
- add a model, migration, datasource runtime, or generated client;
- change a dependency version;
- connect an application to PostgreSQL;
- modify application code;
- begin Sprint 9.

Sprint 8 remains unimplemented and requires separate explicit implementation authorization.

## Approval Confirmation

## MF-02 ARCHITECTURE ALIGNMENT APPROVED AND APPLIED

The governing sign-off now matches executable Prisma CLI `7.8.0` behavior while preserving the original zero-model architecture intent.
