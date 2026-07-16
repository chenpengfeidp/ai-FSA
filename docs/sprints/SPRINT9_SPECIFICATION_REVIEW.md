# Sprint 9 Specification Review

## Review Record

- Reviewed document: `docs/sprints/SPRINT9_SPECIFICATION.md`
- Review date: 2026-07-16
- Review scope: blocking issues only
- Implementation reviewed: none
- Implementation modified: no
- Architecture documents modified: no
- Specification modified: no

Authorities:

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/20_IMPLEMENTATION_PLAN.md`
- `docs/21_ARCHITECTURE_SIGNOFF.md`

## Decision

**STOP FOR REVISION**

The proposed Sprint 9 subject is correctly sequenced after Prisma bootstrap: container packaging is the next major implementation-plan step, and MF-08 must be resolved before Dockerfiles are created.

However, the specification is not implementation-ready. It makes the unresolved MF-08 packaging choice inside the implementation specification and contains validation/allowlist conflicts that prevent its own acceptance criteria from being executed as written.

Only blocking issues are recorded below.

## Blocking Issue 1 — The specification makes the unresolved MF-08 architecture decision

### Evidence

The specification selects **Turbo prune over pnpm deploy**, declares it approved, requires it in every Dockerfile, and treats that selection as closing MF-08.

`docs/21_ARCHITECTURE_SIGNOFF.md` MF-08 authorizes neither option. It requires one documented packaging path to be chosen before Dockerfiles are created and requires that choice to cover:

- shared packages;
- Prisma-generated output;
- Next.js standalone tracing;
- final-stage commands;
- non-root runtime users.

The specification does not merely apply an already-approved choice; it chooses between two architecture-significant packaging mechanisms. This violates the review requirement that the implementation specification make no architecture decision.

### Why Blocking

Implementation would begin with Dockerfiles whose packaging architecture has not passed the repository's architecture-approval lifecycle. A Sprint report cannot retroactively approve the strategy because reports are evidence records, not architecture authority.

The choice also claims MF-08 closure while intentionally excluding `@fas/database` from every pruned image, so the required Prisma-generated-output packaging case is reasoned about but not executable in this Sprint.

### Required Revision

Before Sprint 9 implementation authorization:

1. approve the packaging choice through the repository's architecture-alignment/gate process;
2. record how the selected path satisfies every MF-08 dimension, including the future Prisma-generated-output case;
3. revise the Sprint specification to consume that approved decision rather than make it.

Do not create Dockerfiles before this gate is resolved.

## Blocking Issue 2 — Prune validation writes outside the exact allowlist

### Evidence

The validation section runs:

```bash
pnpm dlx turbo@2.10.5 prune --scope=@fas/api --docker
pnpm dlx turbo@2.10.5 prune --scope=@fas/worker --docker
pnpm dlx turbo@2.10.5 prune --scope=@fas/web --docker
```

Without distinct `--out-dir` values, Turbo prune writes repository-local generated output under `out/`. The three commands also reuse the same output location.

The exact allowlist does not permit `out/**`, and the current `.gitignore` does not ignore it. The specification states that no other file may change and that final `git status` must contain only allowlisted files.

### Why Blocking

Following the mandated validation commands necessarily creates unallowlisted, unignored repository state. Reusing one output path also prevents reliable inspection of three independent pruned graphs because later commands can overwrite or conflict with earlier output.

### Required Revision

The specification must define one deterministic approach:

- distinct generated prune-output directories that are explicitly allowed, ignored, inspected, and removed; or
- distinct temporary directories outside the repository, with exact commands and cleanup.

It must use the repository-owned Turbo dependency rather than `pnpm dlx` unless a documented reason requires network-fetched execution. The final integrity commands must verify cleanup.

## Blocking Issue 3 — The baseline validation command cannot pass in a clean environment

### Evidence

The specification requires:

```bash
pnpm validate
```

Sprint 8 changed root validation to run Prisma config validation and generation. Both require a process-supplied `DATABASE_URL`. Sprint 8 evidence therefore uses:

```bash
DATABASE_URL="<non-secret-local-validation-url>" pnpm validate
```

No `.env` loading or fallback URL exists or is authorized.

### Why Blocking

The Sprint 9 command fails from a clean shell before testing any Sprint 9 behavior. This contradicts the acceptance claim that `pnpm validate` continues to pass “unmodified from Sprint 8's evidence.”

### Required Revision

Use the exact non-secret process-environment pattern established by Sprint 8 for every root or Turbo command that reaches database generation. Do not add dotenv, a committed URL, or an implicit fallback.

## Blocking Issue 4 — API runtime acceptance is unreachable with the documented command

### Evidence

The API's implemented configuration defaults `HOST` to `127.0.0.1`. The specification runs:

```bash
docker run --rm -p 127.0.0.1:3001:3001 fas-api:sprint9
```

but does not supply a container-internal bind address.

Publishing a Docker port to host loopback does not make a process bound to the container's own `127.0.0.1` reachable through Docker port forwarding.

### Why Blocking

The required API `curl` checks cannot succeed against the existing application behavior. The implementation allowlist correctly prohibits changing application source, so this must be solved by an explicit, non-secret runtime environment value rather than code changes.

### Required Revision

The runtime command must pass the already-supported API configuration needed for container-internal listening (for example, `HOST=0.0.0.0`) while continuing to publish the host port only on `127.0.0.1`.

The specification must clearly distinguish:

- container-internal listener address; and
- host exposure address.

This correction must not claim MF-14 Compose-level host-binding closure.

## Blocking Issue 5 — Runtime acceptance commands are incomplete and nondeterministic

### Evidence

The acceptance criteria require API responses from:

- `GET /`
- `GET /health/live`
- `GET /health/ready`
- `GET /version`

The validation commands omit `GET /`.

They also:

- background `docker run --rm` without assigning a container name or capturing a container ID;
- use the non-executable placeholder `docker stop <container-id>`;
- issue `curl` immediately without a bounded startup wait;
- define no failure-safe cleanup if a curl assertion fails;
- do not assert response bodies, although the criteria require existing responses rather than merely any HTTP 2xx response.

### Why Blocking

The commands cannot deterministically prove all acceptance criteria. They can race application startup, leave containers running after failure, and cannot be copied and executed as written.

This conflicts with `AGENTS.md` evidence-first requirements and with the specification's own claim that every runtime behavior is executable acceptance evidence.

### Required Revision

Define copy-pasteable commands or a bounded validation script that:

1. assigns deterministic container names;
2. waits with an explicit timeout;
3. validates all required endpoints, including `GET /`, and their expected response content;
4. captures worker exit status and required log text;
5. verifies non-root identity with an explicit entrypoint override where needed;
6. always removes containers through a cleanup trap or equivalent failure-safe mechanism.

If such a script is required, add its exact path to the implementation allowlist.

## Scope and Stop-Boundary Assessment

Subject to the blockers above, the intended slice is roadmap-aligned:

- it follows implementation-plan Step 8 after Sprint 8 closed Step 7;
- it correctly excludes Compose, PostgreSQL runtime, worker profile behavior, CI, security scanning, database integration, and Sprint 10;
- it preserves application and shared-package source boundaries;
- it does not claim Milestone 3A completion.

The stop boundary is directionally correct, but it is not executable until the packaging decision, generated-output policy, environment requirement, and runtime evidence commands are corrected.

## Final Recommendation

Do not authorize Sprint 9 implementation from the current specification.

Required sequence:

1. resolve and approve MF-08's packaging-strategy choice;
2. revise only the Sprint 9 specification and any separately authorized approval record;
3. re-review the corrected allowlist and validation commands;
4. obtain separate implementation authorization.

**Review complete. No implementation, architecture document, or specification was modified.**
