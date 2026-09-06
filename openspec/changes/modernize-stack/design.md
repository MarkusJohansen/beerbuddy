## Context

BeerBuddy is a React SPA over an Express + `express-graphql` backend, reading a 2,410-beer
catalogue from SQLite locally and MariaDB on an NTNU VM. The GraphQL layer declares all six
mutating operations as `type Query` and types every response as `scalar Any`; the frontend
has no GraphQL client and builds query strings by interpolation. Sequelize is present only
to hand raw SQL to a driver.

Three of the repository's nine hard rules exist to compensate for this design: mutating
resolvers must remember `myCache.flushAll()`, `userId` must stay interpolated so the
body-hashed cache does not serve one user's votes to another, and two style literals in
separate packages must be kept in sync by hand. Each is a convention nothing enforces.

Constraints carried forward: minimal dependency count is a graded requirement
(`docs/sustainability.md`); MUI stays for the ABV/IBU sliders because antd's `Slider` failed
the accessibility audit (`docs/accessibility.md`); accessibility assertions are test
failures, not warnings.

## Goals / Non-Goals

**Goals:**

- One database engine, one schema file, one dialect.
- An API whose contract is checked by the compiler at both ends, with no codegen step.
- Cache correctness that follows from the transport rather than from developer discipline.
- The whole stack startable under podman on a clean machine, with no VPN and no host runtime.
- Fewer dependencies after the change than before.
- Documentation that describes the system as it then is.

**Non-Goals:**

- Authentication. Identity remains a client-supplied UUID; this change makes that explicit
  and documented, it does not fix it.
- Component markup, the antd + MUI pairing, `FilterContext`, or the dataset.
- Feature work. Behaviour visible to a user is intended to be unchanged.
- Deploying anywhere. The VM target is removed; nothing replaces it.

## Decisions

### Hono over GraphQL Yoga or bare `Bun.serve`

Yoga would modernise the server while preserving the parts that are actually the problem —
`scalar Any`, mutations-as-queries, and a schema hand-maintained beside the types it fails to
enforce. Bare `Bun.serve` means hand-rolling routing and validation.

Hono runs natively on Bun, and `hono/client` infers the client type from the server's route
definitions via the exported `AppType`. Request and response shapes are checked by `tsc` with
no generated artefact and no client library shipped to the browser. Validation is
`@hono/zod-validator`, which makes the validated shape the handler's input type — so a route
cannot read a field it did not validate.

*Alternatives considered*: tRPC (another client runtime dependency, and HTTP semantics become
opaque, which defeats the GET-only caching decision below); Fastify + TypeBox (Node-oriented,
no inferred client); REST + OpenAPI codegen (reintroduces a generation step).

### PostgreSQL 18 as the only engine

The catalogue query uses a window function (`COUNT(*) OVER ()`) and a correlated subquery,
both of which the two current engines support differently enough that `database-seed.sql`
carries commented-out alternatives for each. PostgreSQL removes the fork and brings real
`CHECK` constraints, `ON CONFLICT` for the vote upsert, and array parameters — the last
eliminating the interpolated `IN (...)` list that is the widest injection surface today.

*Alternatives considered*: SQLite alone (simplest, and genuinely adequate at this scale — but
the change asks for the database to run under podman as a service, and vote/comment writes
are concurrent); MySQL/MariaDB alone (keeps the VM's engine, gains nothing).

### `Bun.sql` over a driver package

Bun ships a PostgreSQL client with tagged-template binding. `sql\`... WHERE id = ${id}\``
binds rather than interpolates, so the safe form is also the shortest form — the failure mode
that produced the current injection is structurally harder to reproduce. This removes
`sequelize`, `mysql2` and `sqlite3` for no replacement dependency.

Requires Bun ≥ 1.2; containers pin 1.4.2. Developers working outside containers need
`bun upgrade` (the host in use is on 1.1.6).

### Cache: GET-only, keyed on route + params + caller, invalidated by tag

Today `caching.ts` MD5s the request body, stores every response including writes, holds them
for 24 hours, and depends on each mutating resolver calling `flushAll()`.

The replacement is middleware applied only to `GET` routes, keyed on path, validated query
parameters and the `X-User-Id` header. Write responses are therefore not cacheable by
construction, and per-user reads cannot cross users because the caller is part of the key
rather than a value that happens to sit in a hashed body.

Invalidation is by tag (`beers`, `beer:<id>`, `comments:<id>`), performed by the route layer
from a declaration on the route rather than by a call inside each handler. Adding a mutating
route without writing invalidation code no longer leaves stale reads for a day — which
retires hard rule 2 rather than restating it.

*Alternatives considered*: HTTP `Cache-Control` and letting the browser cache (does not help
repeated cold clients, and per-user responses need `Vary` discipline that is easy to get
wrong); no cache (the catalogue query is the expensive one and is hit on every scroll).

### Identity in a header, and named as unauthenticated

`X-User-Id` replaces the interpolated `userId`, making the caller an explicit input rather
than a substring of a query. This is not a security improvement — the value is still a
localStorage UUID any client can set — and the specs, the API documentation and the README
all state that. The change removes the *cache-correctness* dependency on interpolation
(hard rule 7), not the trust problem.

### Styles derived from the data

The 15 named styles in `Filters.tsx` and the 85 in `otherStyles` currently partition the 100
distinct styles in `beers.csv` with nothing enforcing the partition (hard rule 8). A
`GET /api/styles` route returns `SELECT DISTINCT style`; the frontend names the 15 it wants to
surface individually and derives "other" as the complement. A style added to the data stays
reachable without editing two files in two packages.

### TypeScript 6.0.3, not 7

TypeScript 7.0.2 is current, but `typescript-eslint@8.69` declares `typescript: >=4.8.4
<6.1.0`. Type-aware linting is a CI gate here, so the linter sets the ceiling. TS 6.0.3 is the
newest version the toolchain agrees on; TS 7 is a follow-up once the peer range moves.

### antd stays on 5.29.3

antd 6 is a breaking major. Component code is explicitly out of scope for this change, so the
frontend takes React 19, Vite 8, Vitest 5 and ESLint 10 but holds antd at the 5 line. MUI
stays as-is for the sliders.

### `jest-axe` replaces `vitest-axe`

`vitest-axe` was last published in October 2022 and predates Vitest 1.0. `jest-axe@11` is
current, already present in `devDependencies`, and its `toHaveNoViolations` matcher works
under Vitest's `expect.extend`. Net effect is one fewer dependency and no custom code.

### Two containers in production, three in development

Development runs Vite, the backend and PostgreSQL as separate services so both sides hot
reload. The production image has the backend serve the built bundle through
`hono/serve-static`, which collapses the web tier to one container and gives the SPA a single
base path — retiring the `/login` versus `/project2/login` disagreement instead of documenting
it. Startup order comes from a PostgreSQL health check, replacing the dead
`wait-for-database.sh`.

## Risks / Trade-offs

- **No backend tests exist to catch a regression in a full backend rewrite.** → Port the route
  contract to `bun test` first, against a throwaway PostgreSQL container, and treat the suite
  as the acceptance gate for the rewrite rather than an afterthought.
- **Snapshot tests will fail en masse under React 19 and cannot all be read carefully.** →
  Bump React and regenerate snapshots as one isolated commit with no other change, so the diff
  is reviewable as markup churn. The axe assertions, which are behavioural, must pass
  unchanged — if one fails, that is a real finding, not churn.
- **`Bun.sql` is younger than `pg` and less battle-tested.** → The query surface is ten
  statements. If it proves unstable, swapping to `postgres` is a contained change behind the
  same module.
- **Hono's inferred client couples frontend build to backend types across package
  boundaries.** → The backend exports `AppType` from a single entry module; the frontend
  imports types only. If the coupling becomes awkward, a hand-written response type file is
  the fallback, at the cost of drift.
- **The change contradicts the repository's own standing instructions** — CLAUDE.md forbids
  adding dependencies, forbids fixing the documented defects unasked, and describes the repo
  as archived coursework not evolving toward anything. → This is an explicitly requested
  modernisation on a branch; net dependency count falls; and the defect fixes are consequences
  of replacing the components that caused them. CLAUDE.md itself is updated as part of the
  change so it stops describing a stack that no longer exists.
- **Documentation is the largest single piece of work**, and its numbers are derived from
  `beers.csv`. → Re-derive every figure with a real CSV parser rather than copying forward;
  `awk -F,` gives wrong answers because beer names contain commas.
- **`database.db` is currently tracked.** → Removing it from the index is a deliberate,
  separately reviewable commit, not a side effect of the PostgreSQL work.

## Migration Plan

There is no running installation to migrate and no user data worth preserving — the shared VM
database holds coursework test data. The branch is a replacement, not a rollout.

Sequencing is chosen so the tree is verifiable at each step:

1. Backend rewritten on Bun + Hono + PostgreSQL, with `bun test` covering the route contract.
2. Podman stack and CI, so the new backend is startable and verified before anything consumes it.
3. Frontend tooling to Bun and current majors, snapshots regenerated as an isolated commit.
4. Frontend call sites moved to the typed client, GraphQL deleted from both sides.
5. Documentation rewritten against the finished system.

Rollback is `git checkout main`; the branch shares no infrastructure with anything running.

## Open Questions

- Should the retired `docs/sustainability.md` dependency-count argument be re-derived against
  the new tree, or rewritten to make a different case? The count improves, so the argument
  survives, but its specific figures all change.
- Is the `guest` reading path worth keeping? Reads currently work with no user id, and the
  specs preserve that, but no interface entry point reaches it.
