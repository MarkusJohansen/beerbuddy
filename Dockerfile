# Production image: one container serving both the API and the built frontend.
#
# The frontend bundle is baked in and served by Hono with an index.html fallback,
# so a client-side route resolves on a direct hit and the app has the same base
# path in development and in production.

FROM docker.io/oven/bun:1.4.2-slim AS frontend-build
WORKDIR /repo

# Both packages' dependencies: the frontend's typed API client imports the
# backend's route types, so type-checking the frontend needs the backend's source
# and its hono/zod types resolvable. The import is type-only and erased, so
# nothing from the backend reaches the bundle.
COPY frontend/package.json frontend/bun.lock ./frontend/
COPY backend/package.json backend/bun.lock ./backend/
RUN cd frontend && bun install --frozen-lockfile \
 && cd ../backend && bun install --frozen-lockfile

COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
COPY frontend/ ./frontend/

WORKDIR /repo/frontend
# Vite reads this at build time and bakes it into the bundle. vite.config.ts fails
# the build when it is unset, rather than emitting a bundle that fetches undefined.
ARG VITE_APP_BACKEND_URL
ENV VITE_APP_BACKEND_URL=${VITE_APP_BACKEND_URL}
RUN bun run build

FROM docker.io/oven/bun:1.4.2-slim AS backend-deps
WORKDIR /app
COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile --production

FROM docker.io/oven/bun:1.4.2-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV STATIC_DIR=/app/public
COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package.json ./
COPY --from=frontend-build /repo/frontend/dist ./public
USER bun
EXPOSE 3000
CMD ["bun", "src/index.ts"]
