# Sprint 9 Final Specification Review

## 1. Review Record

- Reviewed specification: `docs/sprints/SPRINT9_SPECIFICATION.md`
- Review date: 2026-07-16
- Review type: Final consistency and implementation-readiness review
- Implementation reviewed: none
- Implementation modified: no
- Dockerfile modified: no
- Architecture document or ADR modified: no

Authorities and governance evidence:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/20_IMPLEMENTATION_PLAN.md`
- `docs/21_ARCHITECTURE_SIGNOFF.md`
- `docs/sprints/SPRINT9_SPECIFICATION_REVIEW.md`
- `docs/sprints/SPRINT9_SPECIFICATION_REVISION.md`
- `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT.md`
- `docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md`

## 2. Final Decision

# APPROVED FOR IMPLEMENTATION

The Sprint 9 specification is internally consistent, aligned with the approved MF-08 architecture decision, and executable within its stated allowlist and stop boundary.

This decision means the specification is ready to receive separate implementation authorization. It does not itself authorize implementation.

## 3. Documentation Corrections Applied During Final Review

The final review found documentation-only consistency issues that were permitted to be corrected in the specification:

1. The status still said MF-08 approval was pending after the approval record existed.
2. The authority list did not reference the alignment proposal, approval, or specification revision.
3. The prerequisite text remained conditional instead of identifying the approved Turbo-prune decision.
4. Turbo prune commands used `--scope=@fas/<app>`, but the installed Turbo `2.10.5` prune CLI accepts target workspaces as positional arguments.
5. The build-source wording referred strictly to Git-tracked files even though Sprint validation normally occurs before commit.
6. Worker log capture used shell-specific shorthand where a portable `cat` command is clearer.

The specification was updated only for those documentation and command corrections. Scope, allowlist, dependencies, exclusions, deliverables, and stop boundary did not expand.

## 4. Architecture Alignment

### Selected Strategy

The specification now consumes, rather than makes, the approved architecture decision:

- Turbo `2.10.5` prune with `--docker`;
- repository-root build contexts;
- application-local multi-stage Dockerfiles;
- pruned root lockfiles and frozen pnpm installation;
- target-filtered Turbo builds;
- builder-local generation;
- Next.js standalone output;
- minimal final-stage artifact copying;
- explicit non-root runtime users.

This matches:

- `SPRINT9_ARCHITECTURE_ALIGNMENT.md` Section 9;
- `SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md` Sections 2 and 3.

### Ownership

The specification preserves approved ownership:

- API owns `apps/api/Dockerfile`;
- worker owns `apps/worker/Dockerfile`;
- web owns `apps/web/Dockerfile` and `apps/web/next.config.ts`;
- root owns `.dockerignore` and current developer documentation;
- shared packages remain unchanged;
- no app consumes `@fas/database`;
- no shared Docker tooling is created without demonstrated reuse.

### Future Prisma Compatibility

The specification does not claim current Prisma image evidence. It correctly requires the approval record to govern future database-consuming images and keeps `@fas/database` absent from all Sprint 9 pruned graphs.

This is consistent with the alignment approval:

- generate Prisma artifacts inside the builder;
- include `@fas/database` only after a declared and authorized app dependency exists;
- copy only runtime artifacts required by package exports;
- never copy host-generated Prisma source or persist a secret URL.

### Approval Boundary

The specification does not expand the strategy approval into:

- Compose;
- PostgreSQL runtime;
- database-aware readiness;
- worker profile behavior;
- deterministic runtime smoke;
- CI or security scanning;
- Sprint 10.

## 5. Previous Blocking-Issue Closure

| Previous blocking issue | Final result | Evidence |
| --- | --- | --- |
| 1. Packaging decision made inside specification | Resolved | Separate alignment and approval select Turbo prune; specification references and consumes them without re-deciding |
| 2. Prune validation creates unallowlisted `out/` | Resolved | Repository-owned Turbo writes three distinct outputs under `mktemp`; trap removes them; final check rejects repository `out/` |
| 3. Root validation lacks `DATABASE_URL` | Resolved | Exact non-secret process-environment value is supplied before `pnpm validate` |
| 4. API container binds only to internal loopback | Resolved | Runtime command sets container `HOST=0.0.0.0` while Docker publishes only to host `127.0.0.1` |
| 5. Runtime validation is incomplete/nondeterministic | Resolved | Deterministic names, bounded retries/timeouts, all endpoint assertions, worker status/log evidence, non-root checks, and cleanup traps are present |

All five blocking issues are genuinely closed at specification level.

## 6. Command Verification

The final review checked the installed Turbo `2.10.5` CLI:

```text
Usage: turbo prune [OPTIONS] [SCOPE]...
--docker
--out-dir <OUTPUT_DIR>
```

The specification was corrected to use:

```bash
pnpm exec turbo prune @fas/api --docker --out-dir ...
pnpm exec turbo prune @fas/worker --docker --out-dir ...
pnpm exec turbo prune @fas/web --docker --out-dir ...
```

The complete temporary-directory prune workflow was executed during review. It:

- completed successfully for all three targets;
- produced each expected application/shared-package subset;
- excluded `@fas/database`;
- removed all temporary output;
- left no repository-local prune state.

No Dockerfile exists yet, so image build/runtime commands appropriately remain implementation acceptance commands rather than review-time evidence.

## 7. Allowlist Review

The implementation allowlist is sufficient for the unchanged scope:

```text
.dockerignore
README.md
docs/15_DEVELOPMENT_GUIDE.md
docs/PROJECT_STATE.md
docs/sprints/SPRINT9_REPORT.md
apps/api/Dockerfile
apps/worker/Dockerfile
apps/web/Dockerfile
apps/web/next.config.ts
```

No additional implementation file is required by the specified workflow:

- prune output is external and temporary;
- runtime validation is expressed as executable shell blocks, not a new script;
- existing application build/start behavior is reused;
- no manifest, lockfile, package source, test, Turbo config, or application source change is authorized.

The stop-on-new-file rule remains explicit.

## 8. Acceptance Testability

Every acceptance group has executable evidence:

### Toolchain and Regression

- exact Node/pnpm identity;
- frozen installation;
- Sprint 8 root validation with non-secret `DATABASE_URL`.

### Pruned Graph

- exact installed Turbo executable;
- independent API/worker/web graph output;
- expected shared packages;
- explicit database-package absence;
- deterministic cleanup.

### Image Build

- one root-context `docker build` command per app;
- deterministic image tags;
- success requires exit `0`.

### Runtime

- deterministic container names;
- bounded HTTP readiness polling;
- per-request timeout;
- exact four-endpoint API response assertions;
- web content assertions;
- internal listener versus host exposure separation;
- bounded API/web stop;
- worker exit-code and startup-log assertions;
- failure-safe container and temporary-log cleanup.

### Non-root

- explicit entrypoint override;
- deterministic identity-check names;
- root UID rejection for all three images.

### Integrity

- allowlist-visible Git status;
- whitespace validation;
- unchanged lockfile;
- no repository-local prune output.

No acceptance criterion depends on an undefined placeholder, manual interpretation, or an unlisted file.

## 9. New Blocking-Issue Scan

No new blocking issue was found.

Specifically:

- no unapproved architecture choice remains;
- no command requires an unauthorized dependency;
- no validation command necessarily mutates an unallowlisted repository path;
- no application-source change is required for internal container listening;
- no Docker/Compose/CI scope leakage exists;
- no criterion claims database-aware readiness or full MF-09/MF-13/MF-14 closure;
- no generated Prisma artifact is required in a current Sprint 9 image;
- no lockfile or workspace-policy change is required.

## 10. Stop-Boundary Review

The stop boundary is correct and enforceable.

Sprint 9 ends after:

- applying the approved packaging strategy;
- building three non-root images;
- validating current API/web/worker behavior;
- preserving repository quality gates;
- writing the Sprint report;
- updating project state.

It explicitly stops before:

- Compose topology or PostgreSQL service;
- worker Compose profile;
- database integration/readiness;
- full runtime smoke;
- CI, Dependabot, or security scanning;
- base-image digest hardening;
- Sprint 10.

This matches `AGENTS.md` sprint isolation and the remaining Must-Fix boundaries in `docs/21_ARCHITECTURE_SIGNOFF.md`.

## 11. Remaining Authorization Requirement

The following governance steps are complete:

- Sprint 9 specification;
- blocking specification review;
- specification revision;
- MF-08 architecture alignment;
- MF-08 architecture approval;
- final specification review.

Implementation remains prohibited until the user grants separate, explicit Sprint 9 implementation authorization referencing the final specification.

## 12. Final Conclusion

# APPROVED FOR IMPLEMENTATION

The specification is ready. No implementation, Dockerfile, application source, package, architecture document, ADR, Sprint report, or project-state file was modified during this final review.

