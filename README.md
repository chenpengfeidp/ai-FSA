# Football Analysis System (FAS)

FAS is an evidence-first, reviewable football analysis platform for a trusted private environment (V1: no users, auth, public deployment, or wagering advice).

The repository is a pnpm/Turborepo TypeScript modular monolith with NestJS API, Next.js web, NestJS worker shells, Compose topology, quality gates, and a working deterministic analysis vertical slice.

## Current Delivery State

**Architecture Freeze: v0.2** (stability cleanup complete; pipeline layer rules enforced).

Live snapshot: [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md)  
AI collaboration entry: [AGENTS.md](AGENTS.md)  
Document/code map: [docs/PROJECT_INDEX.md](docs/PROJECT_INDEX.md)

Implemented (non-exhaustive):

- Platform: `@fas/tsconfig`, `@fas/config`, `@fas/database` (Prisma; P.2 Evidence/Match models; default Evidence mode remains memory)
- Facts path: `@fas/provider-football` (API-Football via API-Sports; FAS domain model before Evidence), `@fas/provider-fixture`
- Odds layer: `@fas/provider-odds` (optional market overlay; not Match Center schedule source when Football Data is active)
- Pipeline: Evidence → Feature → Rule → Analysis → Report → Prompt → AI (`LocalDeterministicNarrativeAdapter` wired at composition root)
- Web Match Center / Session / Workspace / Library (ZH-1/ZH-2 Chinese chrome)

Not in scope without a new gate: Redis, BullMQ, pgvector, microservices, public auth, network AI SDKs. Product sequencing after Architecture Freeze v0.2 is `docs/40_PRODUCT_ROADMAP.md` (next: Sprint F1.1; true xG is Sprint F1.3).

## Current Delivery State Pointer

Read [AGENTS](AGENTS.md) first for repository-wide collaboration rules, then [PROJECT_STATE](docs/PROJECT_STATE.md) for the current milestone, constraints, and next approved step.

## Repository Commands

Run commands from the repository root with Node.js `24.18.0` and pnpm `11.13.0`.

```bash
nvm use 24.18.0
node --version
pnpm --version
pnpm toolchain:check
pnpm toolchain:test
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm boundaries
pnpm quality
DATABASE_URL="<non-secret-local-validation-url>" pnpm prisma:validate
DATABASE_URL="<non-secret-local-validation-url>" pnpm prisma:generate
pnpm typecheck
pnpm test
pnpm build
pnpm validate
```

The root `package.json` is the version authority. `.nvmrc` must agree with its exact Node.js engine. `pnpm-workspace.yaml` enables native exact-version rejection through `engineStrict: true` and `pmOnFail: error`, including when install scripts are disabled.

If a command reports an unsupported toolchain, activate Node.js `24.18.0` with an already installed version manager and invoke an existing pnpm `11.13.0` installation. Do not bypass the check, relax the version declarations, or use npm or Yarn. Re-run `pnpm toolchain:check` before installation.

`pnpm format` is the explicit writing formatter command. Local pre-commit checks use Husky and lint-staged to run Biome only on supported staged files.

Prisma commands require a non-secret PostgreSQL-format `DATABASE_URL` supplied through the process environment. Generated client files remain package-local and ignored.

## Runtime Configuration

API and worker environment configuration is loaded through `@fas/config`.

- `NODE_ENV`: `development`, `test`, or `production`; defaults to `development`.
- `HOST`: API listener host; defaults to `127.0.0.1`.
- `PORT`: API listener port from `1` through `65535`; defaults to `3001`.
- `FOOTBALL_DATA_PROVIDER_MODE`: `recorded` (default) | `live` | `fixture` — Match Center schedule source.
- `API_FOOTBALL_KEY`: required when Football Data mode is `live` (API-Sports `x-apisports-key`).
- `ODDS_PROVIDER_MODE`: `recorded` (default) | `live` | `fixture` — optional odds layer.
- `THE_ODDS_API_KEY`: required when Odds mode is `live`.
- `EVIDENCE_REPOSITORY_MODE`: `memory` (default) | `postgres`.

See `.env.example` for Football Data league ids and Odds sport keys. `pnpm dev:api` loads a local gitignored `.env` via `scripts/dev-api.mjs` (existing process-env values win). Never commit `.env`.

## Container Images

Sprint 9 applies the separately approved Turbo-prune strategy in [Sprint 9 Architecture Alignment Approval](docs/sprints/SPRINT9_ARCHITECTURE_ALIGNMENT_APPROVAL.md). Build each target from the repository root:

```bash
docker build -f apps/api/Dockerfile -t fas-api:sprint9 .
docker build -f apps/worker/Dockerfile -t fas-worker:sprint9 .
docker build -f apps/web/Dockerfile -t fas-web:sprint9 .
```

Run the existing bootstrap behavior with loopback-only published ports:

```bash
docker run --rm -e NODE_ENV=production -e HOST=0.0.0.0 -e PORT=3001 -p 127.0.0.1:3001:3001 fas-api:sprint9
docker run --rm fas-worker:sprint9
docker run --rm -e NODE_ENV=production -e HOSTNAME=0.0.0.0 -e PORT=3000 -p 127.0.0.1:3000:3000 fas-web:sprint9
```

These images also remain independently runnable without Compose or PostgreSQL.

## Local Compose Topology

Create a local ignored Compose environment file from the committed example:

```bash
cp .env.example .env
```

The example contains local-only placeholders for the PostgreSQL database, user, password, and loopback-published API and web ports. Replace them only with local development values. Never commit `.env`.

Start the default PostgreSQL, API, and web topology and wait for health:

```bash
docker compose up --build --detach --wait --wait-timeout 120
```

The API is available at `http://127.0.0.1:3001`, and the web application is available at `http://127.0.0.1:3000` with the example values. PostgreSQL is private to the project-owned Compose network and publishes no host port.

The worker is excluded from default startup. Run its existing one-shot bootstrap behavior through the explicit profile:

```bash
docker compose --profile worker run --rm worker
```

Stop the long-running application services within the demonstrated shutdown bound:

```bash
docker compose stop --timeout 10 api web
```

Remove the containers, private network, and local PostgreSQL data volume:

```bash
docker compose --profile worker down --volumes --remove-orphans --timeout 10
```

API `/health/ready` can ping PostgreSQL when `DATABASE_CLIENT_MODE=live`. Evidence persistence defaults to in-memory unless `EVIDENCE_REPOSITORY_MODE=postgres` with a migrated database. Public deployment, auth, CI image publication, and Redis/BullMQ remain out of scope without a new gate.

## Reading Order

Read the numbered documents in order:

1. [00_PROJECT_BIBLE](docs/00_PROJECT_BIBLE.md)
2. [01_PRODUCT](docs/01_PRODUCT.md)
3. [02_DOMAIN_MODEL](docs/02_DOMAIN_MODEL.md)
4. [03_AI_PRINCIPLES](docs/03_AI_PRINCIPLES.md)
5. [04_ARCHITECTURE](docs/04_ARCHITECTURE.md)
6. [05_PROMPT_ENGINE](docs/05_PROMPT_ENGINE.md)
7. [06_KNOWLEDGE_ENGINE](docs/06_KNOWLEDGE_ENGINE.md)
8. [07_RULE_ENGINE](docs/07_RULE_ENGINE.md)
9. [08_CASE_ENGINE](docs/08_CASE_ENGINE.md)
10. [09_REVIEW_ENGINE](docs/09_REVIEW_ENGINE.md)
11. [10_EVALUATION_ENGINE](docs/10_EVALUATION_ENGINE.md)
12. [11_STATISTICS_ENGINE](docs/11_STATISTICS_ENGINE.md)
13. [12_DATABASE](docs/12_DATABASE.md)
14. [13_API](docs/13_API.md)
15. [14_MONOREPO](docs/14_MONOREPO.md)
16. [15_DEVELOPMENT_GUIDE](docs/15_DEVELOPMENT_GUIDE.md)
17. [16_IMPLEMENTATION_ROADMAP](docs/16_IMPLEMENTATION_ROADMAP.md)
18. [17_ANALYSIS_PIPELINE](docs/17_ANALYSIS_PIPELINE.md)
19. [18_BACKEND_ARCHITECTURE](docs/18_BACKEND_ARCHITECTURE.md)
20. [19_DATABASE_ERD](docs/19_DATABASE_ERD.md)
21. [20_IMPLEMENTATION_PLAN](docs/20_IMPLEMENTATION_PLAN.md)
22. [21_ARCHITECTURE_SIGNOFF](docs/21_ARCHITECTURE_SIGNOFF.md)
23. [22_MILESTONE_3A_GATE](docs/22_MILESTONE_3A_GATE.md)
24. [23_RELEASE_BASELINE](docs/23_RELEASE_BASELINE.md)

For the live map of what is implemented vs target-only, prefer [PROJECT_INDEX](docs/PROJECT_INDEX.md) and [PROJECT_STATE](docs/PROJECT_STATE.md) over older numbered-doc status headers.

## Architecture Decision Records

- [ADR-001: Modular Monolith and TypeScript Monorepo](docs/decisions/ADR-001-modular-monolith-and-typescript-monorepo.md)
- [ADR-002: PostgreSQL Durable Jobs for V1](docs/decisions/ADR-002-postgresql-durable-jobs-for-v1.md)
- [ADR-003: Provider-Neutral AI and Staged Retrieval](docs/decisions/ADR-003-provider-neutral-ai-and-staged-retrieval.md)
- [ADR-004: Append-only Match Result Versions](docs/decisions/ADR-004-append-only-match-result-versions.md)
