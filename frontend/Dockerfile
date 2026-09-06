# Frontend image. Development only — the production bundle is built by the
# repository-root Dockerfile and served by the backend, so a deployed BeerBuddy is
# two containers rather than three and the SPA has one base path.

FROM docker.io/oven/bun:1.4.2-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["bun", "run", "dev", "--host"]
