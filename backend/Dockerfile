# Backend image. Bun runs TypeScript directly, so there is no build step and no
# dist/ that nothing consumes.

FROM docker.io/oven/bun:1.4.2-slim AS base
WORKDIR /app

# Dependencies resolve from the lockfile alone, so this layer is invalidated only
# when the lockfile changes, not on every source edit.
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Development: compose bind-mounts the source over this, and --hot reloads it.
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bun", "--hot", "src/index.ts"]

# Production: no dev server, no test tooling, non-root.
FROM base AS prod
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
USER bun
EXPOSE 3000
CMD ["bun", "src/index.ts"]
