# Architecture

How BeerBuddy works, and why it is built this way.

[README.md](README.md) is what the project is and how to run it. This file is the
internals. [CLAUDE.md](CLAUDE.md) is what will bite you.

> **This backend has no authentication.** The caller's identity is a UUID the
> browser generated and sends in a header; anyone can send any value. Do not put
> this on an untrusted network, and do not present it as production-ready.

## Contents

1. [The shape of the system](#1-the-shape-of-the-system)
2. [The HTTP surface](#2-the-http-surface)
3. [The request path](#3-the-request-path)
4. [Caching](#4-caching)
5. [The data model](#5-the-data-model)
6. [The query that does the work](#6-the-query-that-does-the-work)
7. [Identity](#7-identity)
8. [Frontend structure](#8-frontend-structure)
9. [Accessibility as architecture](#9-accessibility-as-architecture)
10. [Testing](#10-testing)
11. [Build and deployment](#11-build-and-deployment)
12. [Invariants](#12-invariants)
13. [Decisions](#13-decisions)
14. [Known constraints](#14-known-constraints)
15. [What is deliberately absent](#15-what-is-deliberately-absent)
16. [Where a change attaches](#16-where-a-change-attaches)

---

## 1. The shape of the system

Three processes in development, two in the production image.

```
┌──────────────┐        HTTP/JSON         ┌──────────────┐      SQL      ┌────────────┐
│  React SPA   │ ───────────────────────▶ │  Hono API    │ ────────────▶ │ PostgreSQL │
│  Vite :5173  │ ◀─────────────────────── │  Bun :3000   │ ◀──────────── │  18 :5433  │
└──────────────┘   X-User-Id header       └──────────────┘   Bun.sql     └────────────┘
```

All three run under podman, started with `make up`. Nothing needs installing on the
host except podman itself — not Bun, not Node, not PostgreSQL.

In the production image the web tier collapses: the backend serves the built bundle
through `hono/serve-static`, so a deployed BeerBuddy is the app container plus the
database. That is what gives the SPA a single base path in every environment.

**Runtime is Bun.** Bun executes TypeScript directly, so there is no build step for
the backend, no transpiler in the dependency list, and no `dist/` that nothing
consumes. Bun also reads `.env` natively, which is why `dotenv` is gone.

### One database, one dialect

PostgreSQL is the only engine, in every environment. The catalogue query needs a
window function and a correlated subquery; the vote write needs `ON CONFLICT`; the
style filter needs an array parameter. All three are used, and `db/01-schema.sql`
is applied unmodified everywhere.

## 2. The HTTP surface

Eleven routes, resource-oriented. Reads are `GET`; state changes are `POST`,
`PATCH`, `PUT` or `DELETE`.

| Method   | Path                      | Purpose                                   |
| -------- | ------------------------- | ----------------------------------------- |
| `GET`    | `/api/beers`              | filtered, sorted, paginated catalogue     |
| `GET`    | `/api/beers/:id`          | one beer with aggregates                  |
| `GET`    | `/api/beers/:id/comments` | paginated comments, newest first          |
| `GET`    | `/api/styles`             | distinct styles present in the catalogue  |
| `GET`    | `/api/session`            | the user the caller's id belongs to       |
| `POST`   | `/api/session`            | resolve or create a user for a username   |
| `PATCH`  | `/api/users/:id`          | rename a user                             |
| `DELETE` | `/api/users/:id`          | delete a user, cascading votes + comments |
| `PUT`    | `/api/beers/:id/reaction` | set this user's vote (idempotent)         |
| `POST`   | `/api/beers/:id/comments` | add a comment                             |
| `DELETE` | `/api/comments/:id`       | delete a comment you wrote                |

### Types cross the wire without codegen

`backend/src/app.ts` exports `AppType` — the type of the chained route
declarations. `frontend/src/api/client.ts` imports it and builds a `hono/client`
caller from it:

```ts
import type { AppType } from "../../../backend/src/app.ts";
const client = hc<AppType>(import.meta.env.VITE_APP_BACKEND_URL, { ... });
```

The import is type-only and erased at build time, so nothing from the backend
reaches the bundle. What it buys is that request shapes and response bodies are
checked by `tsc` at both ends. Rename a column in `queries.ts` and the frontend
build fails, naming the component that read the old field.

There is **no code generation step**, no committed generated client, and no API
client library on the wire. `frontend/src/types/types.ts` derives its types from the
client's inferred returns rather than restating them:

```ts
export type Beer = Awaited<ReturnType<typeof fetchBeer>>;
```

Because the frontend type-checks against the backend's source, building the frontend
needs `backend/src` and the backend's `node_modules` present. The repository-root
`Dockerfile` and the `Makefile` both mount the whole repo for that reason; mounting
only `frontend/` collapses every inferred type to `unknown`.

Route declarations are **chained** in `app.ts`. Breaking the chain into separate
`app.get(...)` statements silently drops routes from `AppType`, and the frontend
stops type-checking them.

### Errors

Failure is signalled by status code, never by a `200` carrying an error string.
Every failing response has one shape:

```json
{ "error": { "message": "beer not found", "code": "not_found" } }
```

`400` validation, `403` ownership, `404` missing, `409` duplicate username, `500`
anything unexpected. A `500` body is always the generic message — driver text, SQL
and stack traces are logged, never returned. A test renames a table mid-run to force
a real driver error and asserts none of it leaks.

## 3. The request path

```
request
  → cors               (origin allowlist from CORS_ORIGINS; no wildcard)
  → invalidateOnWrite  (mounted on the router; drops the cache after a write)
  → identity           (X-User-Id header → c.get("userId"))
  → zod validator      (path params, query, body — rejects before the handler runs)
  → cacheGet           (GET only; serves a hit, stores a 200)
  → handler            (calls src/queries.ts)
  → Bun.sql            (bound parameters)
```

Validation runs before the handler and before the cache, so an invalid request never
reaches a query and never occupies a cache slot. The validated value *is* the
handler's input type, so a handler cannot read a field it did not validate.

## 4. Caching

`backend/src/cache.ts` is an in-memory `Map` with a TTL, and two middlewares.

**`cacheGet` applies to GET routes only**, and refuses any other method outright.
Write responses are therefore uncacheable by construction.

**The key is path + validated query + `X-User-Id`.** The caller is part of the key
rather than a value that happens to sit inside a hashed request body, which is what
stops one user's `reaction` values being served to another. It no longer depends on
how the frontend builds its requests.

**`invalidateOnWrite` is mounted once on the API router** and clears the cache after
any non-GET request that returns under 400. Nothing has to be remembered inside a
handler. A mutating route added tomorrow invalidates correctly without its author
writing invalidation code — which is the point, because the previous design required
every mutating resolver to call `myCache.flushAll()` and silently served stale reads
for 24 hours if one forgot.

It purges everything rather than tracking per-entity tags. Tags would need each route
to declare them, reintroducing the thing a handler can forget, and the catalogue is
2,410 rows. There is a `ponytail:` comment on the function saying so.

`cacheGet` is annotated `MiddlewareHandler` rather than left inferred. It returns a
text body on a hit, and Hono folds a middleware's return type into every route it is
mounted on — left inferred, each cached route's response type gains a `string`
variant and the frontend's typed client can no longer see the JSON shape.

## 5. The data model

Five tables. `db/01-schema.sql`, applied by the postgres image from
`/docker-entrypoint-initdb.d` on an empty volume only — so restarting the stack
never re-runs it and never duplicates the catalogue.

```
breweries ──< beers ──< votes >── users
                   └──< comments >──┘
```

- **`breweries`** — 558 rows. id, name, city, state.
- **`beers`** — 2,410 rows. id, name, style, abv, ibu, ounces, brewery_id.
- **`users`** — id (client-supplied UUID), username **unique**.
- **`votes`** — one row per user per beer, `UNIQUE (user_id, beer_id)`, `vote_type`
  constrained to `upvote` / `downvote` / `unreact`.
- **`comments`** — user_id, beer_id, comment_text, created_at.

Three details that are easy to get wrong:

**`abv` and `ibu` are `DOUBLE PRECISION`, not `REAL`.** float4 cannot represent 0.05
and serialises it as `0.05000000074505806`, which reaches the interface as an ABV of
5.000000074%.

**`abv` is a fraction** (0.05 = 5%), matching `beers.csv`. The API takes whole
percentages and divides.

**Missing `abv` and `ibu` are stored as `0`, not `NULL`.** 62 beers have no abv and
1,005 — 42% of the catalogue — have no ibu. The range filters treat a missing value
as 0, so storing `NULL` would silently drop those 1,005 beers from any ibu-filtered
query.

`users.username` is unique in the schema. It previously was not; the resolvers
enforced it with a check-then-insert that two concurrent signups could both pass.

### How the seed is produced

`backend/build/generate-seed.ts` parses `beers.csv` and `breweries.csv` and emits
`db/02-seed.sql`. Run it with `make seed`.

It emits `COPY … FROM stdin` rather than `INSERT`: the native bulk path, four escape
characters instead of SQL string quoting, one statement per table. Breweries are
written before beers so the foreign key resolves — the previous script raced two
async streams and got the order by luck.

The CSVs are parsed as real CSV. Beer names contain commas and quotes, so splitting
on `,` gives wrong answers on the name and style columns.

## 6. The query that does the work

`listBeers` in `backend/src/queries.ts`. One statement returning the page, each
beer's vote total, this caller's own vote, and the total match count.

Everything derived from the request is a **bound parameter** — including the `LIKE`
pattern, `LIMIT`/`OFFSET`, and the style list. Two parts deserve explanation.

**The style filter is one delimiter-joined parameter, split server-side:**

```sql
AND ($6::text IS NULL OR b.style = ANY(string_to_array($6, chr(31))))
```

Bun's `sql.unsafe()` sends a JS array as a scalar string, so binding an array
directly against `text[]` fails with *malformed array literal*. `chr(31)` is the
ASCII unit separator and cannot occur in a style name.

**The sort direction is the one part assembled as text**, because a direction cannot
be bound. It is selected by key from a frozen map, never built from caller input, and
the validator rejects any `sort` outside the four known keys before a query runs.

```ts
const ORDER_BY = Object.freeze({
  top:  "vote_sum DESC, beer_name ASC, beer_id",
  low:  "vote_sum ASC,  beer_name ASC, beer_id",
  atoz: "beer_name ASC, beer_id",
  ztoa: "beer_name DESC, beer_id",
});
```

**Every entry ends in the beer's name and primary key, and that is load-bearing.**
Most beers have zero votes, so ordering by `vote_sum` alone leaves thousands of rows
tied and the planner free to return them in a different order per page — which,
under offset pagination, duplicates and skips rows as the user scrolls. The tiebreak
is what makes the order total. It looks redundant. It is not, and there is a test
that pages the catalogue and asserts each beer appears exactly once.

## 7. Identity

`X-User-Id` carries a UUID the browser generated at first sign-in and kept in
`localStorage`. It decides which votes a response reflects and which comments the
caller may delete.

**It is not authentication.** There is no password, no token, no session, and no
server-side check that the caller is who the id says. Any client can send any value.
The specs, this document and the README all say so; moving it to a header made the
claim explicit rather than making it safe.

What changing it *did* fix is cache correctness. The id used to be interpolated into
the GraphQL query string, and the cache keyed on an MD5 of the request body — so the
id being *inside* the body was the only thing stopping user A's `reaction` values
reaching user B. Correctness rested on how the frontend built fetch strings. It now
rests on an explicit cache key.

Deleting a user cascades to their votes and comments through the foreign keys.

## 8. Frontend structure

**Routing** — `react-router-dom` v7, four routes, `basename="/"`. One base path in
development and in the production image, because the backend serves the bundle with
an `index.html` fallback so a deep link resolves on a direct hit.

**State** — `FilterContext` plus local `useState`. No Redux, no query cache, no
normalised store, for four screens. The context also loads `GET /api/styles` once and
exposes `allStyles`.

**Style filters are derived from the data.** The panel names 15 styles individually
and offers "Other". "Other" expands to the complement — every style the API reports
that is not one of the 15 — computed in `utils/beerStyles.ts`. Previously this was 15
names in `Filters.tsx` and 85 in the backend's `otherStyles`, which together had to
cover exactly the 100 distinct styles in the data with nothing enforcing it; editing
one made a style unreachable. The complement cannot drift.

Note that `""` is one of those 100: five beers have no style, and the empty string
must stay in the "Other" complement for them to remain selectable. `GET /api/styles`
returns it deliberately, and it is never rendered as an option of its own. `"Other"`
is itself a real style name in the dataset as well as the label, so selecting it
matches both the literal style and the complement — as it did before.

**Responsiveness is JavaScript**, via `useWindowDimensions()`, branching at 768 and
1000 px. Those breakpoints are magic numbers duplicated across files; a seventh copy
is the moment to extract a constant.

**Two component libraries.** Ant Design throughout, and MUI for exactly one
component — the ABV and IBU sliders. Ant Design's `Slider` failed the accessibility
audit. See [`docs/accessibility.md`](docs/accessibility.md#material-ui-components)
before deleting what looks like obvious bloat.

## 9. Accessibility as architecture

Accessibility failures are test failures. `jest-axe` assertions run inside the unit
suite, and every one of them passes.

The matcher comes from `jest-axe@11` registered through `expect.extend` in
`src/vitest-setup.ts`, with its Vitest type declared in `src/vitest.d.ts`. It used to
come from `vitest-axe`, which was last published in October 2022 and predates
Vitest 1.0; the assertions are unchanged and one dependency is gone.

The suite is render-plus-snapshot, so it is good at catching markup change and weak
at catching wrong behaviour. A passing snapshot proves less than it looks like. When
an axe assertion fails, read it — that one is behavioural.

## 10. Testing

| Suite            | Command              | What it covers                        |
| ---------------- | -------------------- | ------------------------------------- |
| Frontend unit    | `make test-frontend` | 85 tests: render, snapshot, axe       |
| Backend contract | `make test-backend`  | 30 tests: routes, injection, cache    |
| End-to-end       | `make test-e2e`      | Playwright against a disposable stack |

**The backend suite is new.** There were no backend tests before; a resolver could
break with nothing catching it. Each block corresponds to a scenario in
`openspec/changes/modernize-stack/specs/`. Requests go through Hono's
`app.request()`, so nothing binds a port and the suite runs alongside a dev stack.
`tests/setup.ts` builds a disposable `beers_test` database from `db/*.sql` before any
test file is imported.

Four of those tests assert that injection attempts are matched as literal text and
that the tables survive.

**End-to-end drives a local stack.** `make test-e2e` starts the dev compose file with
an override that puts it on its own ports under its own project name, runs Playwright,
and removes the volume. It does not need a VPN, does not touch a shared database, and
cannot disturb a running `make up`. Previously it drove the deployed site and wrote to
the shared production database, so aborting a run leaked test users and comments onto
everyone else.

## 11. Build and deployment

**Development** — `make up`. Three services, source bind-mounted.

**Production** — `make prod-up`. Two containers on pinned bases, multi-stage, running
as `bun` rather than root, with no dev server or test tooling in the image.

**Startup order is a health check.** The backend waits on
`depends_on: condition: service_healthy`, driven by `pg_isready`. The previous setup
had a `wait-for-database.sh` polling script that nothing invoked.

**CI is GitHub Actions** (`.github/workflows/ci.yml`), running the same commands the
Makefile runs locally. It replaced `.gitlab-ci.yml`, which targeted the NTNU GitLab
instance the project was originally hosted on and therefore never ran against this
GitHub remote.

**There is no deployment target.** The NTNU VM is gone and nothing replaced it. The
production compose file is the production *shape*, runnable locally.

### Hot reload, honestly

Vite's HMR works inside the container because `vite.config.ts` sets
`server.watch.usePolling`. **Bun's `--hot` does not**: podman bind mounts on macOS do
not deliver inotify events, so the watcher never fires. After a backend edit, run
`make restart-backend`. If you want real backend hot reload, `make dev-backend` runs
PostgreSQL in podman and the backend on the host — that needs host Bun ≥ 1.2.

## 12. Invariants

Things nothing enforces, that will fail quietly.

1. **The `ORDER BY` tiebreak in `listBeers` must stay.** Section 6 explains why. A
   test covers it.
2. **All SQL values stay bound.** `sql``` binds; `sql.unsafe()` binds its second
   argument. The only text assembled into a statement is an `ORDER BY` fragment from
   a frozen map.
3. **Route declarations stay chained** in `app.ts`, or they vanish from `AppType`.
4. **MUI stays** for the ABV/IBU sliders. Section 8.
5. **Dependency count is graded.** See [`docs/sustainability.md`](docs/sustainability.md).
   If something needs a new package, say what it replaces.
6. **The frontend build needs the backend's source and node_modules.** Section 2.
7. **`X-User-Id` is never described as authentication.** Section 7.

Three invariants the old architecture needed are now enforced by code rather than by
discipline: cache invalidation after writes (mounted middleware), per-user cache
isolation (the key includes the caller), and the two style lists staying in sync (the
complement is computed).

## 13. Decisions

Why the stack is what it is. The full write-up, with alternatives, is in
[`openspec/changes/modernize-stack/design.md`](openspec/changes/modernize-stack/design.md).

### Hono, not GraphQL

The GraphQL layer was a costume. All six mutating operations were declared as
`type Query`, every return type was `scalar Any`, and there was no GraphQL client —
the frontend interpolated values into query strings by hand. Three dependencies and a
hand-maintained schema bought one POST endpoint and zero type safety.
`express-graphql` had also been archived by the GraphQL Foundation and takes no more
fixes.

Hono runs natively on Bun and infers the client type from the route definitions, so
the contract is checked at both ends with no generated artefact.

*Rejected:* GraphQL Yoga — modernises the server but keeps `scalar Any` and
mutations-as-queries, which were the actual problem. tRPC — another client runtime
dependency, and it makes HTTP semantics opaque, which defeats GET-only caching.

### PostgreSQL 18, not SQLite or MySQL

The app straddled two dialects whose differences leaked into the seed file as
commented-out alternatives. PostgreSQL removes the fork and brings real `CHECK`
constraints, `ON CONFLICT` for the vote upsert, and array parameters — the last
eliminating the interpolated `IN (...)` list that was the widest injection surface.

*Rejected:* SQLite alone — genuinely adequate at this scale and simpler, but the brief
asked for the database to run as a podman service, and vote and comment writes are
concurrent.

### `Bun.sql`, not a driver package

Bun ships a PostgreSQL client with tagged-template binding, so the safe form is also
the shortest form. This removed `sequelize`, `mysql2` and `sqlite3` for no replacement
dependency. Sequelize was only ever a driver here — the catalogue query needs a window
function and a correlated subquery, both awkward through an ORM.

*Risk:* `Bun.sql` is younger than `pg`. The query surface is ten statements, and
swapping it is contained behind `src/queries.ts`.

### TypeScript 6.0.3, not 7

TypeScript 7 (the native port) is current, but `typescript-eslint@8` declares
`typescript: >=4.8.4 <6.1.0`. Type-aware linting is a CI gate, so the linter sets the
ceiling. TS 7 is a follow-up once the peer range moves.

### antd stays on 5

antd 6 shipped and supports React 19 natively, but it is a breaking major and
component code was out of scope for this change. antd 5.29 works under React 19 here
because every `message` call goes through `App.useApp()` rather than the static API
that React 19 breaks — so no compatibility patch package is needed.

### The classic hook lint rules, not v7's

`eslint-plugin-react-hooks` v7's recommended preset adds the React Compiler rules.
They flag ten pre-existing patterns: the `ref.current = prop` assignment in
`BeerList`, `Filters` and `App`, and the setState-then-fetch shape in every data hook.
Those are worth addressing, but rewriting the data-fetching layer is a separate change
from a version bump, so the config enables the two rules
`plugin:react-hooks/recommended` meant on v4 and says why.

## 14. Known constraints

Real limitations, stated rather than hidden.

- **No authentication.** Section 7. This is the big one.
- **No rate limiting.** Any client can write as fast as it likes.
- **Offset pagination.** Correct, because of the tiebreak, but it re-scans on deep
  pages. Fine for 2,410 rows.
- **The cache purges wholesale on any write.** A single vote empties it. Acceptable at
  this size; measure before adding tags.
- **The bundle is one 1,019 kB chunk** (320 kB gzipped). No code splitting.
- **Backend hot reload does not work in-container on macOS.** Section 11.
- **Five beers have no style** and are only reachable through the "Other" filter.
- **`vote_type = 'unreact'`** is stored as a row rather than the row being deleted, so
  an "unreacted" vote still occupies a row. It counts as 0 in every aggregate.
- **Ten React Compiler lint rules are switched off.** Section 13.

## 15. What is deliberately absent

- **A GraphQL client.** There is no GraphQL.
- **A state management library.** Four screens.
- **An ORM.** Raw SQL, because the catalogue query needs it.
- **A codegen step.** Types cross the wire by inference.
- **A CSS framework.** CSS Modules per component; colours from the antd theme tokens
  in `main.tsx`.
- **A deployment target.** Section 11.

## 16. Where a change attaches

| To change…                     | Start at                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------- |
| A route's shape                | `backend/src/app.ts` (the chained declarations)                                  |
| What a query returns           | `backend/src/queries.ts`                                                         |
| The schema                     | `backend/db/01-schema.sql`, then `make reset`                                    |
| Caching                        | `backend/src/cache.ts`                                                           |
| How the frontend calls the API | `frontend/src/api/client.ts`                                                     |
| Application types              | `frontend/src/types/types.ts` (derived — usually you change the backend instead) |
| Filter options                 | `frontend/src/utils/beerStyles.ts`                                               |
| Theme and colours              | `frontend/src/main.tsx`                                                          |
| How anything starts            | `Makefile`, `compose.yaml`                                                       |

Adding a route: declare it in the chain in `app.ts` with a Zod validator, put its SQL
in `queries.ts`, and it inherits validation, the error shape and cache invalidation.
If it is a `GET` you want cached, add `cacheGet` to it. Then add a test to
`backend/tests/api.test.ts` — nothing else guards the backend.
