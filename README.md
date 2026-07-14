# Football Analysis System (FAS)

FAS is an evidence-based, reviewable football analysis platform. This repository currently contains architecture documentation only; there is no application code yet. V1 has no user or authentication system, so public deployment is prohibited.

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

## Mandatory Paths by Change

- **Product or architecture:** read 00 through 04, then the relevant downstream contracts.
- **Engine work:** read 00, 04, 15, and the relevant engine document from 05 through 11.
- **Data or API:** read 00, 02, 04, 12, 13, and the owning engine document.
- **Delivery or repository structure:** read 00, 04, 14, and 15.
- **Architecture decision changes:** read 00, 04, 14, 15, and all applicable ADRs; add or supersede an ADR when the decision changes.

## Architecture Decision Records

- [ADR-001: Modular Monolith and TypeScript Monorepo](docs/decisions/ADR-001-modular-monolith-and-typescript-monorepo.md)
- [ADR-002: PostgreSQL Durable Jobs for V1](docs/decisions/ADR-002-postgresql-durable-jobs-for-v1.md)
- [ADR-003: Provider-Neutral AI and Staged Retrieval](docs/decisions/ADR-003-provider-neutral-ai-and-staged-retrieval.md)
