# CLAUDE.md

Working conventions for this repository. They apply to human contributors too — nothing
here is agent-specific except the tone.

[README.md](README.md) is what the project is. [ARCHITECTURE.md](ARCHITECTURE.md) is how
it works. This file is what will bite you.

## Orientation

BeerBuddy is a **catalogue of 2,410 US craft beers with votes and comments** — a React
SPA talking to an Express + GraphQL backend over one endpoint, backed by SQLite locally
and MySQL on the NTNU VM.

It is **archived coursework** (IT2810, autumn 2023). That matters for how you work here:
the code is not evolving toward anything, the defects in
[README § Known problems](README.md#known-problems) are known and written down, and the
documentation is the artefact most worth keeping accurate. Treat this as a repository
being maintained for readers, not for users.

## Commands

```bash
# backend — :3000, GraphiQL at /graphql
cd backend && npm install && npm run dev

# frontend — :5173
cd frontend && npm install && npm run dev

cd frontend && npm run test:vitest      # 84 unit tests. No network. Seconds. Run constantly
cd frontend && npm run lint             # --max-warnings 0
cd frontend && npm run prettier:check
cd frontend && npm run build            # tsc && vite build — the type-check gate
cd backend  && npm run lint && npm run prettier:check
```

`npm run dev` in `backend/` runs the TypeScript directly through `tsx`. There is no build
step; `npm run build` emits a `dist/` that nothing consumes.

**Both packages need a `.env` that is not in git.** `cp .env.example .env` in `backend/`
and `frontend/`. If the interface fails with unexplained network errors, this is why —
`VITE_APP_BACKEND_URL` is `undefined` and every call is `fetch(undefined)`. Check it
before debugging anything else.

## Hard rules

Breaking one of these usually fails quietly, which is why they are rules rather than
preferences.

1. **Never run the e2e suite casually.** `npm run test:e2e` drives the *deployed site* at
   `it2810-15.idi.ntnu.no` and **writes to the shared production database**. It needs the
   NTNU VPN, it interferes with anyone else running it, and aborting a run leaks test
   users and comments because cleanup is the last step. Run it when you have a reason to,
   never as a reflex. `test:vitest` is the suite for ordinary work.

2. **Every mutating resolver must end with `myCache.flushAll()`.** There is no finer
   invalidation — `caching.ts` keys on an MD5 of the whole request body and has a 24-hour
   TTL. A write that forgets the flush leaves stale reads for a day. Adding a write
   without it is the easiest silent bug in the repository.

3. **Do not remove the `ORDER BY` tiebreak in `beerResolver.beers`.** Most beers have zero
   votes, so `ORDER BY vote_sum` alone leaves thousands of rows tied and the database free
   to order them differently per page — which, under offset pagination, duplicates and
   skips rows as you scroll. `beer_name ASC, beer_id` after the user's sort is what makes
   the order total. It looks redundant. It is not.

4. **Do not remove MUI.** It is a second component library carried for exactly one
   component: Ant Design's `Slider` failed the accessibility audits, so the ABV and IBU
   sliders are MUI's. This looks like obvious bloat to delete and it is a deliberate
   accessibility decision — see
   [`docs/accessibility.md`](docs/accessibility.md#material-ui-components).

5. **Do not add dependencies.** Minimal dependency count is a *graded* requirement here
   and the reasoning is written down in [`docs/sustainability.md`](docs/sustainability.md).
   The absence of a GraphQL client is the load-bearing example: dropping Apollo is why
   queries are template literals. If something genuinely needs a new package, say what it
   replaces and why the argument in that document no longer holds.

6. **Accessibility failures are test failures.** `vitest-axe` assertions run inside the
   unit suite. When a snapshot or axe assertion fails, read the diff — do not reach for
   `-u`. The suite is render-plus-snapshot, so it is good at catching markup change and
   weak at catching wrong behaviour; a passing snapshot proves less than it looks like.

7. **`userId` must stay interpolated into the query string, not passed as a GraphQL
   variable.** The response cache keys on the request body, so the id being *in* the body
   is what stops user A's `reaction` values from being served to user B. The cache's
   correctness rests on how the fetch strings are built.

8. **Keep the two style literals in sync.** The 15 named styles in `Filters.tsx` and the
   85 in `resolvers.ts`'s `otherStyles` together cover exactly the 100 distinct styles in
   `beers.csv`. Nothing enforces it. Change one and a style becomes unreachable in the UI.

9. **`backend/database.db` is tracked.** It will show as modified the moment you use the
   app. Do not commit it as a side effect of unrelated work — `git checkout -- database.db`
   to discard.

## Do not helpfully fix these

The known defects are documented on purpose. **Fix one only when asked**, and treat the
fix as a documentation change too — README and ARCHITECTURE both describe them by name,
so a silent fix leaves the docs lying.

That applies to: the string-interpolated SQL in `resolvers.ts`, the cache storing write
responses, the missing `env_file` on the `backend` compose service, the mobile ABV
precedence bug in `Beer.tsx`, the `/login` vs `/project2/login` disagreement, the dead
`start-backend.sh` and `wait-for-database.sh`, and the tracked `database.db`.

The one thing to state plainly whenever it is relevant: **this backend is unsafe on an
untrusted network** and the SQL injection is not theoretical. Never present it as
production-ready, and never write documentation that omits it.

## Style, as this codebase writes it

- **One directory per component**, holding `Component.tsx`, `Component.module.css`,
  `Component.test.tsx` and `__snapshots__/`. Follow it for anything new.
- **CSS Modules per component.** Colours come from the `ConfigProvider` theme tokens in
  `main.tsx`, not from component styles. `ant-design-overrides.css` is for library
  internals the tokens cannot reach — a last resort, not a first one.
- **Responsiveness is JavaScript**, via `useWindowDimensions()`, branching at 768 and
  1000 px. That is the existing pattern; match it rather than mixing in media queries.
  The breakpoints are magic numbers duplicated across files — if you find yourself adding
  a seventh copy, that is the moment to extract a constant.
- **State is `FilterContext` plus local `useState`.** No Redux, no query cache, no
  normalised store. Do not introduce one for four screens.
- **JSDoc on exported functions and components.** The existing code is consistent about
  this; keep it.
- **Raw SQL, not Sequelize models.** Sequelize is a driver here and nothing more. The
  catalogue query needs a window function and a correlated subquery, both awkward through
  an ORM.

## Commits

**This repository uses [Conventional Commits](docs/contribution.md)** — `feat:`, `fix:`,
`docs:`, lowercase, imperative, no trailing period, with the issue number in the footer:

```
feat: add pagination component

#1
```

That **overrides the global `[type][Domain] Summary` convention** — match the history in
this repository, which is uniformly conventional-commit style.

Merge requests: reviewed by another person, rebased onto `main`, squashed.
`docs/contribution.md` has the issue labels and the full rules.

## Documentation

The docs are dense, cross-linked and full of specific numbers, and every number is
derivable from the source data. **If you change behaviour, change the document that
describes it** — `README.md`, `ARCHITECTURE.md`, and the per-package READMEs all state
concrete counts and defects.

Before claiming a figure, derive it. `backend/build/beers.csv` and `breweries.csv` are the
source of truth for dataset numbers, and they must be parsed as real CSV — beer names
contain commas, so `awk -F,` silently gives wrong answers on the style and name columns.

## Before you say it is done

```bash
cd frontend && npm run lint && npm run prettier:check && npm run test:vitest && npm run build
cd backend  && npm run lint && npm run prettier:check
```

Those are exactly the CI gates in `.gitlab-ci.yml`, which runs on merge requests only and
never runs the e2e suite. There are **no backend tests** — if you changed a resolver,
nothing automated checked it, so say so rather than implying coverage that does not exist.
