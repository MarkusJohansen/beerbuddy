# CLAUDE.md

Working conventions for this repository. They apply to human contributors too —
nothing here is agent-specific except the tone.

[README.md](README.md) is what the project is. [ARCHITECTURE.md](ARCHITECTURE.md) is
how it works. This file is what will bite you.

## Orientation

BeerBuddy is a **catalogue of 2,410 US craft beers with votes and comments** — a
React SPA talking to a Bun + Hono API over HTTP/JSON, backed by PostgreSQL. The
whole stack runs under podman.

It began as IT2810 coursework (autumn 2023) and its stack was rebuilt in
`openspec/changes/modernize-stack/`. The documentation is still the artefact most
worth keeping accurate: the counts and defects in these files are derived from the
data and the code, and a silent change leaves them lying.

## Commands

Everything goes through the Makefile, which runs the tools inside containers. You do
not need Bun, Node or PostgreSQL on the host — only podman.

```bash
make init            # first time: env files, dependencies, build, start
make up / make down  # start / stop
make check           # exactly what CI runs
make help            # the rest
```

```bash
make test-frontend   # 85 tests. No network. Seconds. Run constantly
make test-backend    # 30 route-contract tests against a throwaway database
make lint            # both packages
make typecheck       # both packages
```

**Podman's machine must be running first** — `podman machine start`.

**After adding a frontend dependency, `make up-build` is not enough.** `compose.yaml`
mounts an anonymous volume at `/app/node_modules` so the bind mount of `./frontend`
does not shadow the image's modules. That volume persists across image rebuilds, so a
newly installed package is present in the image and absent in the running container,
and Vite fails with `Failed to resolve import "…". Does the file exist?` while
everything else — `make check` included, because it runs in a one-off container that
mounts the repo — stays green. Remove the volume:

```bash
podman rm -f beerbuddy_frontend_1
podman volume rm "$(podman volume ls -q | grep beerbuddy_frontend_)"
make up
```

**Three `.env` files are not in git.** `make env` creates them from the
`.env.example` files. Both required values fail loudly now: the backend exits at
startup naming `DATABASE_URL`, and the frontend build fails without
`VITE_APP_BACKEND_URL`.

## Hard rules

Breaking one of these usually fails quietly, which is why they are rules rather than
preferences.

1. **Never expose this backend on an untrusted network, and never describe it as
   production-ready.** `X-User-Id` is a client-supplied UUID with no verification —
   anyone can send anyone else's. State this plainly whenever it is relevant. It is
   the one thing the documentation must not omit.

2. **Do not remove the `ORDER BY` tiebreak in `listBeers`.** Most beers have zero
   votes, so `vote_sum` alone leaves thousands of rows tied and the planner free to
   order them differently per page — which, under offset pagination, duplicates and
   skips rows as you scroll. `beer_name ASC, beer_id` after the user's sort is what
   makes the order total. It looks redundant. It is not. A test covers it.

3. **Keep every request-derived value bound.** `sql`…`` binds; `sql.unsafe()` binds
   its second argument. The only text ever assembled into a statement is an
   `ORDER BY` fragment chosen by key from a frozen map. Do not add a second exception
   — the string-interpolated SQL this replaced was a real, exploitable injection.

4. **Keep the route declarations in `app.ts` chained.** Hono infers `AppType` from
   that single expression. Split them into separate `app.get(...)` statements and the
   routes vanish from the type, and the frontend silently stops type-checking them.

5. **Do not make the range sliders a plain `<input type="range">`.** `radix-ui` is a
   dependency for exactly one component: the ABV and IBU filters are two-thumb
   ranges and the native element has one thumb. It looks like the obvious thing to
   delete. MUI was carried for the same reason before it, and replacing it required
   demonstrating the replacement rather than assuming it — `slider.test.tsx` asserts
   thumb independence, the announced bounds, arrow/Home/End keys and axe. Any future
   replacement clears the same bar.

6. **Do not add dependencies.** Minimal dependency count is a *graded* requirement
   and the reasoning is written down in
   [`docs/sustainability.md`](docs/sustainability.md), with the current figures. The
   count is 41 direct, down from 55 — and it survived replacing the component
   library only because six controls use native elements instead of the Radix
   packages shadcn would otherwise install. Reach for `<details>`, `<dialog>`,
   `<select>`, `<input type="checkbox">`, `<label>` and `<hr>` before reaching for a
   package. If something genuinely needs a new one, say what it replaces and why the
   argument in that document no longer holds.

7. **Accessibility failures are test failures.** `jest-axe` assertions run inside the
   unit suite. Two of the elements the interface leans on — `<dialog>` and Radix's
   slider — are stubbed in `src/vitest-setup.ts` because jsdom implements neither
   `showModal()` nor `ResizeObserver`; without those stubs every test touching the
   filter panel throws before it reaches an assertion. When a snapshot or axe assertion fails, read the diff — do not reach
   for `-u`. The suite is render-plus-snapshot, so it is good at catching markup
   change and weak at catching wrong behaviour; a passing snapshot proves less than
   it looks like. An axe failure is the behavioural half.

8. **Type-checking the frontend needs the backend's source and `node_modules`.** The
   Makefile and the production Dockerfile mount the whole repository for that reason.
   Mount only `frontend/` and `AppType` resolves to nothing, every response type
   becomes `unknown`, and the build fails in a way that looks unrelated.

9. **The backend has no automated check other than `make test-backend`.** If you
   change a query or a route and do not add a test, nothing verified it. Say so
   rather than implying coverage that does not exist.

## Things that are now enforced, not remembered

Three former rules are gone because code enforces them. Do not reintroduce the
patterns that made them necessary:

- **Cache invalidation** is a middleware mounted on the API router, so a mutating
  route added later invalidates without its author writing any invalidation code. It
  used to be a `myCache.flushAll()` call every resolver had to remember, and
  forgetting it left stale reads for 24 hours.
- **Per-user cache isolation** comes from the cache key including `X-User-Id`. It
  used to depend on the id being interpolated into the request body that the cache
  hashed.
- **Style filter coverage** is computed as a complement of what the API reports. It
  used to be 15 names in `Filters.tsx` and 85 in the backend that had to cover
  exactly 100 styles, with nothing enforcing it.

## Do not helpfully fix these

The remaining known defects are documented on purpose in
[README § Known problems](README.md#known-problems). **Fix one only when asked**, and
treat the fix as a documentation change too — README and ARCHITECTURE both describe
them by name, so a silent fix leaves the docs lying.

That applies to: the absent authentication, the absent rate limiting, the cache
purging wholesale on any write, backend hot reload not working in-container on macOS,
the ten React Compiler lint rules switched off, the five styleless beers reachable
only through "Other", and `unreact` being stored as a row rather than deleting one.

The 1,019 kB single chunk is no longer one of them: removing Ant Design took the
bundle to **325 kB** (106 kB gzipped). It is still a single chunk, and still over
Vite's 500 kB warning threshold before gzip — but the defect as documented no longer
describes the code.

## Style, as this codebase writes it

- **One directory per component**, holding `Component.tsx`, `Component.test.tsx` and
  `__snapshots__/`. There is no `Component.module.css` any more — the CSS Modules are
  gone, along with Ant Design.
- **Tailwind utilities bound to tokens.** Every colour, type size, spacing step and
  radius comes from `src/styles/tokens.css`, which is the only file allowed to hold a
  colour literal — `no-hardcoded-colours.test.ts` fails the build otherwise. The
  scales are closed: each namespace opens with a `--<namespace>-*: initial` reset, so
  `p-[7px]` and `text-sm` do not exist. That is deliberate. A value genuinely outside
  the scale gets an arbitrary value **and a comment saying why**.
- **shadcn/ui source is ours.** `src/components/ui/` is vendored code, edited in
  place. Anything a later `shadcn add` drops there arrives in upstream's idiom —
  rounded, shadowed, `bg-primary` — and none of those tokens exist here, so it needs
  the same rewrite the first four got.
- **One accent, and it only carries meaning.** A link, an active filter, the user's
  own vote. Not "this button is important". The test is in
  `openspec/specs/design-system/`: strip every accent rule and the hierarchy must
  still read from type, grid and spacing alone.
- **Responsiveness is JavaScript**, via `useWindowDimensions()` compared against
  `MOBILE` and `TABLET` from `src/utils/breakpoints.ts`. Those were literals in seven
  components; they are one module now. The same two values are also declared as
  Tailwind screens in `tokens.css`, because a `@media` condition cannot read a custom
  property — that duplication is deliberate and commented in both files.
- **State is `FilterContext` plus local `useState`.** No Redux, no query cache, no
  normalised store. Do not introduce one for four screens.
- **All API calls go through `src/api/client.ts`.** No `fetch` elsewhere. Components
  are unit-tested by mocking that module, not by mocking `fetch`.
- **`src/types/types.ts` is derived** from the client's inferred returns. To change a
  type, change the backend query behind it.
- **Raw SQL, not an ORM**, all of it in `backend/src/queries.ts`. The catalogue query
  needs a window function and a correlated subquery, both awkward through an ORM.
- **JSDoc on exported functions and components.** The existing code is consistent
  about this; keep it.

## Exploring the code

**Reach for the `codebase-memory` MCP before spawning a search agent.** The graph
answers structural questions — what exists, who calls what, how a flow reaches the
database — for a fraction of the tokens an agent burns reading files.

| Tool               | Use it for                                                  |
| ------------------ | ----------------------------------------------------------- |
| `search_graph`     | find a function, route or component by name or pattern       |
| `trace_path`       | call chains and data flow, e.g. a route down to its SQL      |
| `get_code_snippet` | the exact source of one symbol, by qualified name            |
| `get_architecture` | structure and module layout                                  |
| `search_code`      | graph-augmented text search                                  |
| `query_graph`      | Cypher, for anything the above cannot express                |

If the repository is not indexed yet, run `index_repository` once and then query —
still cheaper than an agent over a codebase this size. `detect_changes` after a large
edit keeps the graph honest.

Questions worth asking it here rather than grepping:

- **What reaches the database?** Everything funnels through `backend/src/queries.ts`;
  `trace_path` from a route handler shows which query a change affects.
- **What breaks if a response field changes?** The frontend types are inferred from
  the backend, so a rename ripples. The graph finds the call sites faster than the
  compiler error does.
- **Who calls `protectRoute`, `useWindowDimensions`, or the API client?** These are
  the three things wired into many components.

Use `Grep`, `Glob` and `Read` directly for single-file lookups, for configs and
Markdown, and always to read a file before editing it — no agent needed for those
either. Spawn a search agent only when the question is genuinely text-based or the
graph cannot answer it, and say in one line why the MCP did not fit.

## Documentation

The docs are dense, cross-linked and full of specific numbers, and every number is
derivable from the source data. **If you change behaviour, change the document that
describes it** — `README.md`, `ARCHITECTURE.md` and the per-package READMEs all state
concrete counts and defects.

Before claiming a figure, derive it. `backend/build/beers.csv` and `breweries.csv`
are the source of truth for dataset numbers, and they must be parsed as real CSV —
beer names contain commas, so `awk -F,` silently gives wrong answers on the style and
name columns.

Architectural decisions belong in [ARCHITECTURE § 13](ARCHITECTURE.md#13-decisions),
with the alternative that was rejected and why.

## Commits

**This repository uses [Conventional Commits](docs/contribution.md)** — `feat:`,
`fix:`, `docs:`, lowercase, imperative, no trailing period, with the issue number in
the footer:

```
feat: add pagination component

#1
```

That **overrides any global `[type][Domain] Summary` convention** — match the history
in this repository, which is uniformly conventional-commit style.

Pull requests are reviewed by another person, rebased onto `main`, and squashed. The
repository is on **GitHub**; `docs/contribution.md` has the issue labels and the full
rules.

## Before you say it is done

```bash
make check
```

That is lint, format check, type check and both unit suites for both packages — the
same commands [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs, so a green
local run means a green CI run.

`make test-e2e` is not part of it. It starts its own disposable stack and is safe to
run, but it is slower and needs browsers installed.
