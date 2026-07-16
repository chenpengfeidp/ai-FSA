# Sprint 8 Architecture Alignment Proposal

## 1. Proposal Record

- Proposal date: 2026-07-16
- Delivery milestone: Milestone 3A — Repository Bootstrap
- Affected decision: `docs/21_ARCHITECTURE_SIGNOFF.md`, MF-02
- Affected proposed Sprint: Sprint 8 — Prisma No-model Bootstrap
- Proposal status: Approved and applied
- Implementation status: Not started and not authorized
- Change type: Documentation-only architecture alignment proposal

This proposal records a verified incompatibility between the pre-alignment MF-02 command wording and Prisma CLI `7.8.0`.

Approval and application are recorded in `docs/sprints/SPRINT8_ARCHITECTURE_ALIGNMENT_APPROVAL.md`. The approval does not authorize Sprint 8, install Prisma, or change repository implementation.

## 2. Evidence Collected

### 2.1 Pre-alignment Binding Wording

Before alignment, MF-02 stated:

> Use explicit Prisma config selection, `--allow-no-models`, and a non-secret CI validation URL. Verify commands from both repository root and database-package context.

Source:

```text
docs/21_ARCHITECTURE_SIGNOFF.md
Section 4 — Must Fix Before Implementation
MF-02 — Prisma No-model Bootstrap Contract
```

The decision is binding because the architecture sign-off narrows and conditions the implementation plan.

### 2.2 Approved Prisma Version

`docs/20_IMPLEMENTATION_PLAN.md` selects:

- Prisma CLI: `7.8.0`;
- Prisma Client: `7.8.0`;
- Prisma PostgreSQL adapter: `7.8.0`.

Sprint 8 must not silently select another Prisma release to satisfy obsolete command wording.

### 2.3 Executable CLI Evidence

The exact approved CLI was queried on 2026-07-16:

```bash
pnpm dlx prisma@7.8.0 generate --help
```

The command completed successfully and reported:

```text
Generate artifacts (e.g. Prisma Client)

Usage

  $ prisma generate [options]

Options
          -h, --help   Display this help message
            --config   Custom path to your Prisma config file
            --schema   Custom path to your Prisma schema
               --sql   Generate typed sql module
             --watch   Watch the Prisma schema and rerun after a change
         --generator   Generator to use (may be provided multiple times)
          --no-hints   Hides hint messages but still outputs errors and warnings
    --require-models   Do not allow generating a client without models
```

The help output contains no `--allow-no-models` option.

This was a read-only compatibility check. It did not add a repository dependency or modify a tracked file.

### 2.4 Supporting Prisma 7 Contract

The Prisma 7 generation contract uses:

- `prisma.config.ts` for datasource URL configuration;
- `prisma-client` as the current generator provider;
- a required explicit generated-client output;
- no-model generation as the default behavior;
- `--require-models` when callers want generation to fail unless at least one model exists.

The executable CLI help is the primary evidence for the available command flags.

## 3. Current Prisma 7.8.0 CLI Behavior

### Default Behavior

With a valid Prisma config, generator block, datasource, and zero models:

```bash
prisma generate --config prisma.config.ts
```

is the supported no-model generation command.

No opt-in allow flag is required.

### Strict Model-required Behavior

Prisma `7.8.0` exposes:

```bash
prisma generate --config prisma.config.ts --require-models
```

This command requires at least one model.

For the approved zero-model bootstrap schema, it should exit non-zero for the specific reason that the schema contains no model.

### Unsupported Behavior

Prisma `7.8.0` does not expose:

```bash
prisma generate --allow-no-models
```

Using that flag would fail argument parsing rather than prove the intended no-model contract.

An unknown-option failure is not valid acceptance evidence for MF-02.

## 4. Why the Conflict Exists

MF-02 correctly identified the architectural requirement:

- bootstrap must not invent domain tables;
- no-model generation must be explicit and testable;
- configuration location must be deterministic;
- validation must use a non-secret URL;
- root and package execution contexts must both work.

The conflict is limited to the selected CLI mechanism.

The sign-off assumed that Prisma offered an affirmative `--allow-no-models` option. Prisma `7.8.0` instead:

1. permits no-model generation by default;
2. exposes the inverse `--require-models` option;
3. does not recognize `--allow-no-models`.

Following MF-02 literally would therefore produce a guaranteed CLI argument error.

Ignoring MF-02 and silently using default generation would bypass a binding architecture condition.

Changing Prisma versions solely to recover the assumed flag would contradict the approved exact dependency baseline and the rule against mixing Prisma versions.

A narrow documentation alignment is therefore required before Sprint 8 implementation.

## 5. Recommended Wording Change

Replace only the MF-02 **Decision** sentence.

### Current Wording

> **Decision:** Use explicit Prisma config selection, `--allow-no-models`, and a non-secret CI validation URL. Verify commands from both repository root and database-package context.

### Recommended Wording

> **Decision:** Use explicit Prisma config selection, Prisma `7.8.0` default no-model generation, and a non-secret validation URL. Prove the zero-model boundary with two complementary checks: default `prisma generate` must succeed, while a controlled `prisma generate --require-models` command must fail specifically because the schema contains no models. Verify validation and generation from both repository-root and database-package contexts. Do not treat an unknown-option, configuration, environment, dependency, or path-resolution failure as no-model evidence.

### Unchanged MF-02 Content

The following should remain unchanged:

- review finding;
- architectural rationale;
- impact;
- owner;
- target milestone.

The proposal changes no architectural objective, package boundary, datasource decision, version selection, or milestone scope.

## 6. Acceptance Interpretation After Alignment

If approved, MF-02 acceptance should require:

1. exact Prisma CLI `7.8.0`;
2. explicit `--config` selection;
3. a schema with a PostgreSQL datasource and `prisma-client` generator;
4. explicit package-local generated output;
5. zero models, enums, composite types, and migrations;
6. a clearly non-secret validation URL supplied through process environment;
7. successful schema validation;
8. successful default generation;
9. non-zero `--require-models` execution;
10. output proving that the negative command failed because models are absent;
11. successful commands from repository-root and database-package contexts;
12. no unsupported `--allow-no-models` usage.

The positive and negative pair makes the zero-model contract more explicit than relying on one permissive flag.

## 7. Risk Assessment

### Risk 1 — Silent Dependence on a Default

Default no-model behavior could change in a future Prisma version.

Mitigation:

- retain exact Prisma `7.8.0` pins;
- run positive default generation;
- run the negative `--require-models` proof;
- require a new compatibility review before any Prisma version change.

Residual risk: Low under exact version pinning.

### Risk 2 — Negative-test False Positive

The `--require-models` command could fail because of an invalid config, missing environment value, missing dependency, or incorrect path.

Mitigation:

- run successful validation and default generation first;
- assert a non-zero exit code;
- assert no-model-specific output;
- reject unrelated failure output.

Residual risk: Low with ordered, output-specific assertions.

### Risk 3 — Accidental Model Introduction

A model could be introduced and default generation would still succeed.

Mitigation:

- require the `--require-models` command to fail;
- inspect schema content;
- prohibit migrations and domain models in Sprint 8;
- record the zero-model evidence in the Sprint report.

Residual risk: Low. The negative test becomes a controlled guard against model leakage.

### Risk 4 — Documentation Drift

The implementation plan, Sprint specification, README, Development Guide, or future CI could retain the obsolete flag.

Mitigation:

- make the sign-off correction the governing source;
- align only authorized current implementation documentation during Sprint 8;
- search for active `--allow-no-models` command references before completion;
- preserve historical evidence without treating it as current command guidance.

Residual risk: Medium until alignment is tracked, then Low.

### Risk 5 — Unreviewed Toolchain Substitution

Implementers could select another Prisma version that happens to expose different behavior.

Mitigation:

- retain exact Prisma `7.8.0`;
- prohibit mixed Prisma versions and dependency overrides;
- stop on incompatibility rather than substituting another release.

Residual risk: Low.

### Risk 6 — Architecture Intent Dilution

Removing affirmative flag wording could be misread as weakening the no-domain-model boundary.

Mitigation:

- replace the unsupported flag with stronger paired evidence;
- retain the original rationale;
- require explicit zero-model schema inspection;
- retain the no-model, no-migration Sprint stop boundary.

Residual risk: Low.

## 8. Backward Compatibility

### Repository Compatibility

The proposed wording change:

- modifies no implementation file;
- adds no dependency;
- changes no package manifest;
- changes no lockfile;
- changes no application behavior;
- changes no database schema;
- changes no generated artifact;
- changes no runtime environment;
- changes no API or worker contract.

### Decision Compatibility

The proposal preserves the intent of:

- MF-01 generation ordering;
- MF-02 no-model bootstrap;
- MF-04 exact dependency pins;
- MF-06 Prisma and TypeScript compatibility evidence;
- MF-16 package ownership;
- MF-17 executable boundary proof.

It does not affect any accepted ADR.

### Prisma-version Compatibility

The proposed wording is intentionally scoped to Prisma `7.8.0`.

It must not be generalized to:

- Prisma 6;
- a later Prisma 7 release without verification;
- Prisma 8;
- another ORM.

Any future Prisma version change must re-check CLI help and no-model behavior.

### Historical Compatibility

Existing architecture and gate reports remain valid point-in-time evidence.

After approval:

- the corrected MF-02 wording becomes the current command authority;
- this proposal remains the evidence supporting the correction;
- Sprint 8 remains separately gated and unauthorized until explicit approval.

## 9. Proposed Approval Text

The Architecture Board may use the following approval record:

> **Architecture Alignment Decision — MF-02 Prisma No-model Bootstrap Contract**
>
> **Decision:** APPROVED.
>
> Executable evidence confirms that Prisma CLI `7.8.0` does not support `--allow-no-models`. Prisma `7.8.0` permits generation without models by default and exposes `--require-models` as the inverse strictness option.
>
> Replace the MF-02 Decision sentence with:
>
> “Use explicit Prisma config selection, Prisma `7.8.0` default no-model generation, and a non-secret validation URL. Prove the zero-model boundary with two complementary checks: default `prisma generate` must succeed, while a controlled `prisma generate --require-models` command must fail specifically because the schema contains no models. Verify validation and generation from both repository-root and database-package contexts. Do not treat an unknown-option, configuration, environment, dependency, or path-resolution failure as no-model evidence.”
>
> The MF-02 review finding, rationale, impact, owner, and target milestone remain unchanged.
>
> This alignment changes command mechanics only. It does not authorize a Prisma model, migration, database connection, application integration, dependency-version change, or Sprint 8 implementation.
>
> Sprint 8 remains subject to separate implementation authorization and its approved allowlist, acceptance criteria, validation commands, and stop boundary.

## 10. Approval Outcome

## MF-02 WORDING ALIGNMENT APPROVED AND APPLIED

The approved change:

- is supported by executable Prisma `7.8.0` evidence;
- preserves the original architecture intent;
- strengthens zero-model proof through positive and controlled negative checks;
- avoids an impossible command;
- requires no implementation or dependency change;
- keeps Sprint 8 unimplemented until separately authorized.

After approval:

- do not implement Sprint 8;
- do not install Prisma in the repository;
- do not substitute another Prisma version;
- do not bypass the aligned MF-02 contract;
- obtain separate explicit Sprint 8 implementation authorization.
