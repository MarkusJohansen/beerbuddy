## Why

The stack has aged out from under the app. `express-graphql` was archived by the GraphQL
Foundation and takes no more fixes; `graphql` is a major version behind; Sequelize is
carried purely as a driver for raw SQL; and the app straddles two SQL dialects (SQLite
locally, MariaDB on the VM) whose differences leak into `database-seed.sql` as commented-out
alternatives. Deployment targets a single NTNU VM that will not outlive the course.

The GraphQL layer in particular is a costume, not an architecture: all six mutating
operations are declared as `type Query`, every return type is `scalar Any`, and there is no
GraphQL client — the frontend interpolates values into query strings by hand. Three
dependencies and a hand-maintained schema buy one POST endpoint and zero type safety.

## What Changes

- **BREAKING** — GraphQL is removed. The single `POST /graphql` endpoint is replaced by
  resource-oriented HTTP routes served by Hono. All eight frontend call sites move to a
  typed `hono/client` caller; types are inferred from the route definitions, with no
  codegen step and no client library on the wire.
- **BREAKING** — reads become `GET` and writes become `POST`/`PATCH`/`DELETE`. Responses
  carry meaningful status codes instead of HTTP 200 with an error string in the body.
- **BREAKING** — SQLite and MariaDB are both dropped for a single PostgreSQL 17 instance.
  One dialect, one seed file, no `DATABASE=sqlite3` string comparison selecting an engine.
- All SQL moves to bound parameters. This closes the string-interpolation injection
  documented in README § Known problems; it is a consequence of changing the client, not a
  separate fix.
- The hand-rolled MD5-of-request-body response cache is replaced by a keyed read-through
  cache on GET routes only. Write responses become uncacheable by construction, closing a
  second documented defect. `myCache.flushAll()` after every mutating resolver — currently
  an unenforced convention and the repo's easiest silent bug — is replaced by invalidation
  the route layer performs.
- Node + `tsx` + `nodemon` are replaced by Bun as runtime, package manager and test runner.
  Bun reads `.env` and executes TypeScript natively, so `dotenv`, the transpile step and the
  unused `dist/` output all go away.
- Deployment to `it2810-15.idi.ntnu.no` is replaced by a podman stack that runs the same
  three services locally and in CI. The e2e suite stops driving a shared production database.
- Frontend tooling moves to Bun, Vite 7, React 19, Vitest 3 and ESLint 9 flat config.
  Component code, antd and MUI are untouched — MUI stays for the ABV/IBU sliders per the
  accessibility decision in `docs/accessibility.md`.

## Capabilities

### New Capabilities

- `http-api`: the transport contract — resource routes, request validation, status codes,
  error shape, and which responses may be cached.
- `data-store`: a single PostgreSQL instance — schema, seeding, parameterised access, and
  the ordering guarantees the catalogue query depends on.
- `container-runtime`: podman-based build and run for frontend, backend and database,
  replacing VM deployment as the way the system is stood up.

### Modified Capabilities

<!-- None. openspec/specs/ has no baseline specs on main; the behaviour these three
     capabilities describe was previously undocumented as requirements. -->

## Impact

- **Removed dependencies**: `express`, `express-graphql`, `graphql`, `@graphql-tools/schema`,
  `body-parser`, `cors`, `sequelize`, `mysql2`, `sqlite3`, `node-cache`, `tsx`, `nodemon`,
  `dotenv`, `crypto`, `fs`. The last two are stdlib shadowed by junk packages.
- **Backend**: `server.ts`, `schema.ts`, `resolvers.ts`, `db.ts`, `caching.ts` all rewritten
  or deleted. There are no backend tests today, so nothing automated guards this — the
  change adds them.
- **Frontend**: eight fetch call sites, `vite.config.ts`, ESLint config, `package.json`,
  Playwright config. Snapshots regenerate for genuine markup reasons under React 19.
- **Infrastructure**: `compose.yaml`, both `Dockerfile`s, `.gitlab-ci.yml`,
  `start-backend.sh` and `wait-for-database.sh` (both already dead) — replaced or deleted.
- **Docs**: `README.md`, `ARCHITECTURE.md`, both package READMEs and `docs/sustainability.md`
  describe the old stack in specific, derived detail and are rewritten alongside. The
  Known problems section shrinks; the SQL injection entry is retired rather than reworded.
- **Not in scope**: the beer/brewery dataset, component markup, the FilterContext state
  model, and the antd + MUI pairing.
