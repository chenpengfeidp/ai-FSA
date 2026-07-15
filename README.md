# Football Analysis System (FAS)

FAS is an evidence-based, reviewable football analysis platform. The repository currently contains the architecture source of truth, a pnpm/Turborepo foundation, minimal API/web/worker application shells, the shared `@fas/tsconfig` and `@fas/config` packages, the Biome/dependency-cruiser engineering-quality foundation, and focused configuration-contract tests.

No football-domain, AI-engine, database, authentication, or production behavior is implemented. V1 has no user or authentication system, so public deployment is prohibited.

## Current Delivery State

Read [AGENTS](AGENTS.md) first for repository-wide collaboration rules, then [PROJECT_STATE](docs/PROJECT_STATE.md) for the current milestone, completed sprints, constraints, and next approved step.

## Repository Commands

Run commands from the repository root with Node.js `24.18.0` and pnpm `11.13.0`.

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm boundaries
pnpm quality
pnpm typecheck
pnpm test
pnpm build
pnpm validate
```

`pnpm format` is the explicit writing formatter command. Local pre-commit checks use Husky and lint-staged to run Biome only on supported staged files.

## Runtime Configuration

API and worker environment configuration is loaded through `@fas/config`.

- `NODE_ENV`: `development`, `test`, or `production`; defaults to `development`.
- `HOST`: API listener host; defaults to `127.0.0.1`.
- `PORT`: API listener port from `1` through `65535`; defaults to `3001`.

The repository does not load `.env` files automatically. Supply variables through the process environment. Invalid supported values stop startup before NestJS initialization.

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

## Mandatory Paths by Change

- **Product or architecture:** read 00 through 04, then the relevant downstream contracts.
- **Engine work:** read 00, 04, 15, and the relevant engine document from 05 through 11.
- **Analysis workflow:** read 00, 02 through 11, 13, and 17.
- **Data or API:** read 00, 02, 04, 12, 13, 19, and the owning engine document.
- **Backend implementation:** read 00, 02, 04, 12 through 19, and the relevant engine documents.
- **Delivery or repository structure:** read 00, 04, 14 through 16, 18, and 20 through 22.
- **Architecture decision changes:** read 00, 04, 14, 15, and all applicable ADRs; add or supersede an ADR when the decision changes.

## Architecture Decision Records

- [ADR-001: Modular Monolith and TypeScript Monorepo](docs/decisions/ADR-001-modular-monolith-and-typescript-monorepo.md)
- [ADR-002: PostgreSQL Durable Jobs for V1](docs/decisions/ADR-002-postgresql-durable-jobs-for-v1.md)
- [ADR-003: Provider-Neutral AI and Staged Retrieval](docs/decisions/ADR-003-provider-neutral-ai-and-staged-retrieval.md)
- [ADR-004: Append-only Match Result Versions](docs/decisions/ADR-004-append-only-match-result-versions.md)
