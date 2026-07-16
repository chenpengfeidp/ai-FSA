# Sprint 8 Specification Revision — pnpm Build Approval Allowlist

## Revision Status

- Date: 2026-07-16
- Sprint: 8
- Revision type: Implementation allowlist correction
- Specification: `docs/sprints/SPRINT8_SPECIFICATION.md`
- Implementation status: Paused
- Resumption authorized by this revision: No

## Reason for Revision

The first authorized Sprint 8 installation attempt exposed a missing implementation allowlist entry.

pnpm `11.13.0` requires an explicit repository-owned lifecycle-build decision for:

- `prisma`;
- `@prisma/engines`.

Without those decisions, `pnpm install` exits with `ERR_PNPM_IGNORED_BUILDS`. pnpm records build policy in `pnpm-workspace.yaml`, but that file was not in the original Sprint 8 implementation allowlist.

The implementation stopped at the prescribed boundary. Any automatic unapproved change to `pnpm-workspace.yaml` was reverted before this revision.

## Approved Specification Changes

The Sprint 8 specification now:

1. adds `pnpm-workspace.yaml` to the exact implementation allowlist;
2. permits build approval only for exact `prisma@7.8.0` and `@prisma/engines@7.8.0` matchers;
3. requires the pre-existing `sharp` build approval to remain unchanged;
4. prohibits wildcard, unversioned, additional, or unrelated Sprint 8 lifecycle-build decisions;
5. adds repository-integrity acceptance criteria for the restricted approval;
6. adds `git diff -- pnpm-workspace.yaml` to the final validation review;
7. records the installation and supply-chain risk created by missing or overly broad build approval;
8. records that Sprint 8 remains paused after this documentation-only revision.

No dependency version, architecture decision, ADR, application behavior, or Sprint 8 functional scope changed.

## Validation Impact

The existing normal and frozen installation commands remain mandatory:

```bash
pnpm install
pnpm install --frozen-lockfile
```

The final integrity review now also requires:

```bash
git diff -- pnpm-workspace.yaml
```

The diff must prove that:

- only exact `prisma@7.8.0` and `@prisma/engines@7.8.0` build approvals were added;
- the pre-existing `sharp` approval remains unchanged;
- no unrelated workspace policy changed.

## Files Modified by This Revision

- `docs/sprints/SPRINT8_SPECIFICATION.md`
- `docs/sprints/SPRINT8_SPECIFICATION_REVISION.md`

No implementation file, architecture document, ADR, project-state document, or prior Sprint artifact was modified by this revision.

Pre-existing partial Sprint 8 implementation changes were left untouched.

## Stop Confirmation

This revision corrects the specification only.

Sprint 8 implementation has not resumed. A separate explicit instruction is required before implementation may continue.
