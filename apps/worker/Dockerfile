# syntax=docker/dockerfile:1

FROM node:24.18.0-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
  && corepack prepare pnpm@11.13.0 --activate

WORKDIR /app

FROM base AS pruner

COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  HUSKY=0 pnpm install --frozen-lockfile --filter ai-fsa... \
  && pnpm exec turbo prune @fas/worker --docker

FROM base AS builder

COPY --from=pruner /app/out/json/ .
COPY scripts/install-git-hooks.mjs ./scripts/install-git-hooks.mjs

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  HUSKY=0 pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

RUN pnpm exec turbo run build --filter=@fas/worker

FROM base AS production-dependencies

ENV NODE_ENV="production"

COPY --from=pruner /app/out/json/ .
COPY scripts/install-git-hooks.mjs ./scripts/install-git-hooks.mjs

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  HUSKY=0 pnpm install --prod --frozen-lockfile

FROM node:24.18.0-slim AS runner

ENV NODE_ENV="production"

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=production-dependencies --chown=node:node /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=builder --chown=node:node /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=node:node /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder --chown=node:node /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=node:node /app/packages/config/package.json ./packages/config/package.json

WORKDIR /app/apps/worker

USER node

CMD ["node", "dist/main.js"]
