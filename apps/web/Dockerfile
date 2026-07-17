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
  && pnpm exec turbo prune @fas/web --docker

FROM base AS builder

ARG API_BASE_URL="http://api:3001"
ENV API_BASE_URL="$API_BASE_URL"

COPY --from=pruner /app/out/json/ .
COPY scripts/install-git-hooks.mjs ./scripts/install-git-hooks.mjs

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  HUSKY=0 pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

RUN pnpm exec turbo run build --filter=@fas/web

FROM node:24.18.0-slim AS runner

ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"

WORKDIR /app

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

WORKDIR /app/apps/web

EXPOSE 3000

USER node

CMD ["sh", "-c", "trap 'kill -TERM \"$child\" 2>/dev/null || true; wait \"$child\"; exit $?' TERM INT; node server.js & child=$!; wait \"$child\""]
