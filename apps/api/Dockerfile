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
  && pnpm exec turbo prune @fas/api --docker

FROM base AS builder

COPY --from=pruner /app/out/json/ .
COPY scripts/install-git-hooks.mjs ./scripts/install-git-hooks.mjs

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  HUSKY=0 pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

RUN pnpm exec turbo run build --filter=@fas/api

FROM base AS production-dependencies

ENV NODE_ENV="production"

COPY --from=pruner /app/out/json/ .
COPY scripts/install-git-hooks.mjs ./scripts/install-git-hooks.mjs

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  HUSKY=0 pnpm install --prod --frozen-lockfile

FROM node:24.18.0-slim AS runner

ENV NODE_ENV="production"
ENV HOST="0.0.0.0"
ENV PORT="3001"

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=production-dependencies --chown=node:node /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=production-dependencies --chown=node:node /app/packages/evidence/node_modules ./packages/evidence/node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=node:node /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder --chown=node:node /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder --chown=node:node /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=builder --chown=node:node /app/packages/evidence/dist ./packages/evidence/dist
COPY --from=builder --chown=node:node /app/packages/evidence/package.json ./packages/evidence/package.json
COPY --from=builder --chown=node:node /app/packages/match/dist ./packages/match/dist
COPY --from=builder --chown=node:node /app/packages/match/package.json ./packages/match/package.json

WORKDIR /app/apps/api

EXPOSE 3001

USER node

CMD ["sh", "-c", "trap 'kill -TERM \"$child\" 2>/dev/null || true; wait \"$child\"; exit $?' TERM INT; node dist/main.js & child=$!; wait \"$child\""]
