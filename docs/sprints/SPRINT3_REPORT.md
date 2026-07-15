# Sprint 3 Report — Platform Foundation

## Status

Sprint 3 is complete.

The repository now has one reusable platform package, `@fas/tsconfig`, which owns shared TypeScript compiler policy for the root, API, web, and worker configurations. No application source, runtime behavior, football-domain logic, AI, database, transport contract, repository, entity, or domain model was introduced.

## Implementation Summary

- Created the private `@fas/tsconfig` workspace package.
- Added strict base, Node.js, NestJS, and Next.js configuration variants.
- Exposed exactly four JSON subpaths through the package export map.
- Made the root TypeScript configuration consume the shared base.
- Made API and worker configurations consume the NestJS variant.
- Made the web configuration consume the Next.js variant.
- Added explicit `workspace:*` development dependencies to all four consumers.
- Regenerated the pnpm lockfile from the workspace manifests.
- Preserved all application-specific source paths, output paths, generated-type includes, and declaration overrides locally.

## Files Changed

### Created

- `packages/tsconfig/package.json`
- `packages/tsconfig/base.json`
- `packages/tsconfig/node.json`
- `packages/tsconfig/nest.json`
- `packages/tsconfig/next.json`
- `docs/sprints/SPRINT3_REPORT.md`

### Modified

- `package.json`
- `tsconfig.base.json`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/worker/package.json`
- `apps/worker/tsconfig.json`
- `pnpm-lock.yaml`
- `docs/PROJECT_STATE.md`

No file under `apps/*/src/` changed.

## Design Decisions

- The package has no default export because it has no runtime module API.
- Public API is limited to:
  - `@fas/tsconfig/base.json`
  - `@fas/tsconfig/node.json`
  - `@fas/tsconfig/nest.json`
  - `@fas/tsconfig/next.json`
- `base.json` owns framework-neutral strictness, declaration defaults, source maps, JSON-module resolution, and no-emit defaults.
- `node.json` owns the ES2023 and NodeNext runtime baseline.
- `nest.json` adds only decorator and metadata requirements.
- `next.json` owns browser libraries, bundler resolution, JSX, incremental compilation, Next.js plugin configuration, and web type packages.
- Consumer configurations retain only application-specific overrides and file-selection rules.
- Root and applications declare the internal package explicitly rather than relying on accidental root resolution.
- No scripts were added to `@fas/tsconfig`; static JSON policy is validated through configuration resolution and consumer builds.
- pnpm removed stale lockfile importers for absent `config`, `logger`, and `shared-types` workspaces while regenerating the lockfile. No corresponding package or functionality was removed by Sprint 3 because those workspaces did not exist at implementation start.

## Validation Evidence

All validation completed successfully under:

- Node.js `24.18.0`
- pnpm `11.13.0`
- TypeScript `6.0.3`
- Turborepo `2.10.5`

Observed evidence:

- pnpm recognized five workspace projects: the root plus four child packages.
- Workspace validation reported four child packages.
- `@fas/tsconfig` was listed as a private workspace package.
- TypeScript resolved root, API, web, and worker configurations.
- Node package resolution resolved all four exported JSON subpaths to `packages/tsconfig`.
- The Turborepo dry-run graph contained only API, web, worker, and `@fas/tsconfig`.
- API and worker typechecking passed with inherited NestJS settings.
- Next.js route type generation and web typechecking passed.
- NestJS API and worker production builds passed.
- Next.js production build passed.
- Frozen lockfile installation passed.
- IDE diagnostics reported no errors in the changed configuration files.
- No prohibited Prisma, Redis, BullMQ, or OpenAI dependency was found in affected manifests or the lockfile.
- `packages/tsconfig` contains exactly five files and no `src/` directory.
- Git reported no application-source diff.

## Commands Executed

```bash
pnpm install

pnpm exec tsc --showConfig --project tsconfig.base.json
pnpm exec tsc --showConfig --project apps/api/tsconfig.json
pnpm exec tsc --showConfig --project apps/web/tsconfig.json
pnpm exec tsc --showConfig --project apps/worker/tsconfig.json

node --input-type=module -e \
  'for (const path of ["@fas/tsconfig/base.json", "@fas/tsconfig/node.json", "@fas/tsconfig/nest.json", "@fas/tsconfig/next.json"]) console.log(`${path} -> ${import.meta.resolve(path)}`)'

pnpm workspace:check
pnpm turbo run typecheck build --dry=json
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm validate
```

Additional diff, file-set, dependency-name, whitespace, and IDE-diagnostic checks were used to verify scope.

## Known Limitations

- `@fas/tsconfig` contains declarative JSON only and has no standalone build or typecheck script.
- Its executable contract is proven through TypeScript resolution and all immediate consumer builds.
- TypeScript remains pinned to the approved `6.0.3` compatibility fallback.
- No runtime configuration, observability, contract, domain, database, job, test utility, container, or CI capability was added.
- Pre-existing documentation alignment items remain outside Sprint 3.

## Remaining Work

Remaining Milestone 3A work includes:

- quality tooling and executable boundary enforcement;
- automated application tests;
- typed runtime configuration and observability when application-source consumers are authorized;
- Prisma no-model and PostgreSQL bootstrap;
- container packaging and deterministic runtime smoke validation;
- security gates and CI;
- approved documentation alignment.

Sprint 3 does not complete Milestone 3A or canonical v0.1. Sprint 4 was not started.
