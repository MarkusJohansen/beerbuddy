<h1 align="center">BeerBuddy</h1>

<p align="center">
  <strong>Search, filter, rate and discuss 2,410 American craft beers.<br>
  A React + GraphQL project built for IT2810 Web Development at NTNU, autumn 2023.</strong>
</p>

<!-- Text, not shields.io. Six badge images would be six remote fetches at the top of a
     README for a project whose whole sustainability argument is "fetch less". -->
<p align="center">
  <code>react&nbsp;18&nbsp;+&nbsp;typescript</code> &nbsp;
  <code>graphql&nbsp;over&nbsp;express</code> &nbsp;
  <code>sqlite&nbsp;or&nbsp;mysql</code> &nbsp;
  <code>2,410&nbsp;beers</code> &nbsp;
  <code>84&nbsp;unit&nbsp;tests&nbsp;·&nbsp;7&nbsp;e2e</code> &nbsp;
  <code>archived</code>
</p>

<p align="center">
  <img src="./images/main.png" width="820"
       alt="The BeerBuddy main page: a dark interface with a left sidebar holding beer-style, IBU and ABV filters, a search field and sort control across the top, and a scrolling list of beer cards. Each card shows the beer name, its brewery, and an up/down vote control with the running score between the arrows.">
</p>

BeerBuddy is a catalogue of US craft beers built on the
[Kaggle Craft Cans dataset](https://www.kaggle.com/datasets/nickhould/craft-cans/data)
— 2,410 beers across 558 breweries. On top of the read-only catalogue it layers the
user-generated half the course required: an account, a vote per beer, and a comment
thread per beer, all persisted server-side.

Two constraints shaped the result more than anything else. **The group's virtual machine
would not run Docker**, which is why a Postgres-in-a-container design became a
single-file SQLite database with a MySQL escape hatch for production. And **the course
graded sustainability and accessibility as first-class requirements**, which is why the
interface is dark by default, why every list is lazily loaded, why filters only fire on
an explicit *Apply*, and why the backend answers repeat queries out of a memory cache
instead of the database. Those are design decisions with reasons, and the reasons are
written down in [`docs/sustainability.md`](./docs/sustainability.md) and
[`docs/accessibility.md`](./docs/accessibility.md).

This repository is **archived coursework**. It works, and it also carries the kind of
defects a four-person team ships against a deadline. They are catalogued honestly in
[Known problems](#known-problems) rather than left for you to discover.

---

## How a request is answered

Every operation in the system — reads and writes alike — is one `POST /graphql`.

```
browser
   │  POST /graphql   { query: "{ beers(size: 10 start: 0 userId: \"…\" …) }" }
   ▼
cacheMiddleware ─── key = md5(originalUrl + body) ─── hit? ──► cached JSON, no DB touch
   │                                                           (NodeCache, 24 h TTL)
   ▼ miss
express-graphql ─── mergeSchemas(beerSchema, userSchema, actionSchema)
   │                rootValue = { …beerResolver, …userResolver, …actionResolver }
   ▼
resolver ─── builds one SQL string ─── Sequelize.query() ─┬─► database.db      (SQLite)
   │                                                      └─► beers            (MySQL)
   │
   ├─ read   beers · beer · comments ──────────► rows ─────► response, then cached
   │
   └─ write  react · comment · deleteComment ──► myCache.flushAll(), then the response
             login · signUp · updateUser …       (so the next read cannot serve a stale
                                                  vote count out of the cache)
```

Three things about that diagram are worth stating out loud, because they are unusual and
none of them is an accident of drawing:

- **There is no `type Mutation`.** `react`, `comment`, `deleteComment`, `signUp`,
  `updateUser` and `deleteUser` are all declared as fields on `Query`. The schema
  therefore does not distinguish a read from a write, and neither does anything upstream
  of the resolvers.
- **Every field returns `scalar Any`.** The GraphQL layer validates argument names and
  types, and nothing else. Response shape is a contract between the resolver's `SELECT`
  and the component that reads it, enforced only by TypeScript types the frontend
  declares locally.
- **The cache sits in front of GraphQL, not behind it**, so it is keyed on the raw
  request body rather than on the operation. Two clients asking the identical question
  share an answer; two clients asking the same question about different `userId`s do not,
  because the id is in the body.

[**ARCHITECTURE.md**](./ARCHITECTURE.md) walks the whole path with file pointers, gives
the complete GraphQL reference and data model, and records what is invariant and what is
merely current.

---

## Contents

| | |
| --- | --- |
| [Quickstart](#quickstart) | four commands to a running site |
| [Configuration](#configuration) | the environment variables, and the fact that none are committed |
| [Every command](#every-command) | the full script table for both packages |
| [Using it](#using-it) | accounts, filtering, voting, commenting |
| [Repository layout](#repository-layout) | what each directory is for |
| [The data](#the-data) | what is in the dataset, and where it is thin |
| [Testing](#testing) | what the 84 unit tests and 7 e2e tests actually cover |
| [Known problems](#known-problems) | the defects, stated rather than discovered |
| [Documentation index](#documentation-index) | every other document in the repository |
| [Vocabulary](#vocabulary) | ABV, IBU, and the terms the schema uses |
| [Contributing](#contributing) | conventions, and who wrote this |

---

## Quickstart

**What you need:** Node 19+ (the CI images use `node:19`; the Dockerfiles pin
`node:21.2.0-alpine`), and nothing else. SQLite ships with the repository as a
committed `backend/database.db`, already seeded.

```bash
git clone <this-repo> && cd beerbuddy

# 1. tell each package where things are — see Configuration below
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env

# 2. backend on :3000  (leave running)
cd backend && npm install && npm run dev

# 3. frontend on :5173 (second terminal)
cd frontend && npm install && npm run dev
```

Open <http://localhost:5173>. You will land on the login page — enter any name and you
are in. GraphiQL is served alongside the API at <http://localhost:3000/graphql>, which is
the fastest way to see what a resolver actually returns.

**The hosted instance** lives at <http://it2810-15.idi.ntnu.no/project2> and needs the
NTNU network or its VPN. It runs MySQL rather than SQLite, because SQLite was not the
right answer for the marked deployment — see
[`docs/sustainability.md`](./docs/sustainability.md#database).

### With Docker Compose

```bash
cp .env.example .env      # ROOT_PASS and DB_NAME for the MariaDB container
docker compose up --build
```

This brings up MariaDB 10.4 seeded from `backend/database-seed.sql`, the backend, and the
frontend. Both application containers run their **dev** servers with the source
bind-mounted, so this is a development environment, not a production one. Read
[Known problems](#known-problems) before you rely on it — the `backend` service is missing
its `env_file` and will not reach the database until you add one.

### Running against MySQL locally, without Docker

Set `DATABASE` to anything other than `sqlite3` in `backend/.env`, fill in the
credentials, and seed the schema — full walkthrough in
[`backend/README.md`](./backend/README.md#running-against-mysql).

---

## Configuration

**No `.env` file is committed, and none is generated for you.** `.env` is gitignored, so
a fresh clone has no `VITE_APP_BACKEND_URL` — the frontend then calls `fetch(undefined)`
and every screen fails with a network error that says nothing about the cause. This is
the single most likely reason a first run does not work. The three `.env.example` files
exist to make it a copy rather than a guess.

**`frontend/.env`** — read by Vite at build time. Only `VITE_`-prefixed names are exposed
to the bundle.

| Variable | Meaning | Local value |
| --- | --- | --- |
| `VITE_APP_BACKEND_URL` | The full GraphQL endpoint URL. Interpolated into every `fetch` in the app. | `http://localhost:3000/graphql` |

**`backend/.env`** — read by `dotenv` in `db.ts`. If `DATABASE` is exactly `sqlite3`,
every other variable here is ignored and Sequelize opens `./database.db`.

| Variable | Meaning | Default in code |
| --- | --- | --- |
| `DATABASE` | `sqlite3` selects the file database. **Any other value — including unset — selects MySQL.** | none; unset means MySQL |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `user` |
| `DB_PASS` | MySQL password | `""` |
| `DB_NAME` | MySQL database | `beers` |

**`.env` at the repository root** — read only by `compose.yaml`, for the MariaDB service.

| Variable | Meaning |
| --- | --- |
| `ROOT_PASS` | `MYSQL_ROOT_PASSWORD` for the MariaDB container |
| `DB_NAME` | `MYSQL_DATABASE` for the MariaDB container |

The backend port (`3000`) and the frontend port (`5173`) are hardcoded, in
`backend/server.ts` and `frontend/vite.config.ts` respectively.

---

## Every command

Run from `backend/` or `frontend/` as indicated. There is no root-level `package.json`.

| Command | Where | What it does |
| --- | --- | --- |
| `npm run dev` | backend | `nodemon` + `tsx`, restarting on any `.ts` change. Serves GraphQL and GraphiQL on `:3000`. |
| `npm start` | backend | The same server through `tsx`, once, without the watcher. |
| `npm run build` | backend | `tsc` only. Emits JS; nothing in the repository consumes the output. |
| `npm run build:seedfile` | backend | Regenerates `database-seed.sql` from `build/tables.sql` + the two CSVs. Run this only if the dataset changes. |
| `npm run dev` | frontend | Vite dev server on `:5173`, `host: true` so it is reachable from the LAN. |
| `npm run build` | frontend | `tsc && vite build` → `dist/`. Type errors fail the build. |
| `npm run preview` | frontend | Serves the built `dist/` — the closest local approximation of production. |
| `npm run test` | frontend | `test:vitest` then `test:e2e`. **Needs the NTNU VPN**, because the e2e suite drives the deployed site. |
| `npm run test:vitest` | frontend | The 84 unit tests. No network, no backend, ~seconds. This is the one to run before a commit. |
| `npm run test:e2e` | frontend | The 7 Playwright tests across chromium, firefox and webkit. ~1.5 min. |
| `npm run test:headed` | frontend | The same suite, chromium only, visible browser, 500 ms between steps. |
| `npm run test:parallel` | frontend | Two workers. Faster, and **not recommended** — the VM shares one database across runs. |
| `npm run coverage` | frontend | Vitest coverage to the terminal and to `coverage/index.html`. |
| `npm run lint` | both | ESLint, `--max-warnings 0`. Matches the CI gate. |
| `npm run prettier:check` | both | Formatting check. Also a CI gate. |
| `npm run prettier` / `prettier:write` | frontend / backend | Writes the formatting fixes. |
| `docker compose up --build` | root | MariaDB + backend + frontend, all in dev mode. |

CI (`.gitlab-ci.yml`) runs lint, prettier, `test:vitest` and the frontend build — on
merge requests only, and never the e2e suite.

---

## Using it

### Accounts

There is no password. You enter a username; the client generates a UUID v4 and calls
`loginOrSignUp`, which either returns the existing row for that username or inserts a new
one. The username and the id are then kept in `localStorage` under
`userNameBeerBuddy` and `userIdBeerBuddy`, and that pair is the whole session.

Every protected page calls `protectRoute()` on mount, which re-asks the server for the id
belonging to the stored username and bounces you to `/login` if the two disagree. That is
a consistency check, not authentication: **any client that knows a `userId` can act as
that user**, because the id travels as a plain argument and nothing verifies it. Treat
usernames as public and non-secret, because they are.

<p align="center"><img src="./images/login.png" width="640" alt="The BeerBuddy login screen: a dark page with the BeerBuddy logo, a single Username field, and a Submit button."></p>

### Finding a beer

The sidebar filters on **beer style** (15 named styles plus an `Other` bucket that
expands to the remaining 85), **IBU** (0–138) and **ABV** (0–13 %). The action bar adds
free-text search over the beer name and four sort orders: most popular, least popular,
A–Z, Z–A.

Filters do **not** apply as you move them. You press *Apply Filters*, and only then does a
request go out — a deliberate choice to avoid a request per slider tick, argued in
[`docs/sustainability.md`](./docs/sustainability.md#delayed-searching-sorting-and-filtering).
Search and sort are the exception: those re-query immediately, because a search box that
needs a second confirmation feels broken.

Sorting and filtering run in SQL over the entire catalogue, not over the ten rows
currently on screen. The result count above the list is `COUNT(*) OVER()` from the same
query, so it reflects the full match set and drives when the infinite scroll stops.

Your last applied filter set is written to `localStorage` and restored on the next visit.

### Voting and commenting

<p align="center"><img src="./images/beer.png" width="640" alt="A BeerBuddy beer detail page showing the brewery name, the beer name, the vote control and score, four attribute tiles for Style, ABV, IBU and Volume, and a list of user comments below with a comment input at the bottom."></p>

One vote per user per beer, upvote or downvote; clicking your own vote again clears it.
The displayed score updates locally the instant you click and is reconciled on the next
fetch, so the number moves without a round trip.

Comments are 1–200 characters, must not start with a space, and must contain at least one
alphanumeric character. You can delete your own comments and only your own — the delete
control renders only when the comment's `user_id` matches your stored id, and the
`deleteComment` resolver repeats that check in its `WHERE` clause.

---

## Repository layout

```
backend/          express + graphql + sequelize. No build step at runtime; tsx runs the TS
  server.ts         app assembly: cors, body-parser, the cache middleware, graphqlHTTP
  schema.ts         three buildSchema() blocks, merged in server.ts. Every field is `Any`
  resolvers.ts      every resolver, and every SQL string in the system
  db.ts             the one Sequelize instance; picks SQLite or MySQL from $DATABASE
  caching.ts        the NodeCache middleware, and myCache which resolvers flush
  database.db       a seeded SQLite database, committed to git
  database-seed.sql generated — schema + 2,968 INSERT rows
  build/
    tables.sql        the schema, written for MySQL with the SQLite variants in comments
    beers.csv         2,410 rows from the Kaggle dataset
    breweries.csv     558 rows
    createSeedFile.js concatenates tables.sql and the two CSVs into database-seed.sql

frontend/         react 18 + vite + typescript
  src/main.tsx      routes, and the antd dark theme token overrides
  src/pages/        App (catalogue), Beer (detail), LogIn, FallbackPage (404)
  src/components/   one directory per component: .tsx, .module.css, .test.tsx, snapshot
  src/context/      FilterContext — search, IBU, ABV, styles, sorting. The only shared state
  src/utils/        useFetchMoreBeers, useFetchBeer, useWindowDimensions, protectRoute
  src/types/        Beer and SortingItem. Partially adopted — most components redeclare
  tests/            the Playwright suite (points at the deployed VM, not at localhost)
  public/           SVG icons — every image in the interface is an SVG, on purpose

docs/             accessibility, sustainability, requirements, contribution conventions
images/           README and docs screenshots, plus the audit-tool captures
.gitlab/          the merge request template
compose.yaml      mariadb + backend + frontend, all in dev mode
ARCHITECTURE.md   the design, the full API reference, the invariants and the constraints
```

**One directory per component**, each holding its markup, its CSS module, its test and
its snapshot. It is more directories than a flat layout, and it means a component and
everything that describes it move together.

---

## Tech stack, and why

Course requirements fixed part of this: React, TypeScript, Vite, Vitest, a custom GraphQL
backend and a database the group runs themselves were all mandated. Everything else was
a choice, and the choices had reasons.

### Frontend

| | Why this one |
| --- | --- |
| [React 18 + TypeScript](https://react.dev) | Required by the course. |
| [Vite](https://vitejs.dev) | Required. Also what makes `tsc && vite build` a type-checking gate rather than just a bundle step. |
| [React Router](https://reactrouter.com/en/main) | Four routes, one of them a `*` fallback. Nothing exotic is asked of it. |
| [Ant Design](https://ant.design) | Carries most of the interface. Accessible defaults out of the box, and one `ConfigProvider` supplies the dark theme to every component at once. |
| [MUI](https://mui.com) | **For exactly one component.** Ant Design's `Slider` failed the accessibility audits, so the ABV and IBU sliders are MUI's, restyled to match. Shipping a second component library for one control is a real cost, taken deliberately — see [`docs/accessibility.md`](./docs/accessibility.md#material-ui-components). |
| [react-infinite-scroll-component](https://www.npmjs.com/package/react-infinite-scroll-component) | Lazy loading was a sustainability requirement, and this is a small wrapper rather than a virtualisation framework. |
| [uuid](https://www.npmjs.com/package/uuid) | Client-side v4 ids, so signup needs no server round trip to allocate one. |
| [Vitest](https://vitest.dev/) + `vitest-axe` | Vitest required; the axe integration is the part that matters, because it makes accessibility a failing test rather than a review comment. |
| [Playwright](https://playwright.dev) | Cross-browser end-to-end journeys in three engines from one spec file. |
| **No GraphQL client** | The deliberate omission. See below. |

### Backend

| | Why this one |
| --- | --- |
| [Express](https://expressjs.com) + [express-graphql](https://graphql.org) | Chosen **over Apollo Server**, explicitly: Apollo brings subscriptions, tracing and cloud integration this project never uses, and that dependency weight contradicts the sustainability requirement the project is graded on. The [argument in full](https://httptoolkit.com/blog/simple-graphql-server-without-apollo/). |
| [TypeScript](https://www.typescriptlang.org) via `tsx` | Types without a build step — `tsx` runs the source directly, so there is no `dist/` to keep in sync. |
| [Sequelize](https://sequelize.org) | Used **only as a driver**: no models, no associations, no migrations. It is here because it puts SQLite and MySQL behind one connection object, and for nothing else. Raw SQL was preferred for the window function and correlated subquery the catalogue query needs. |
| [SQLite](https://www.sqlite.org/index.html) | The zero-setup default. No server process, so cloning and running is one step. |
| [MySQL](https://www.mysql.com) | The deployed database, because SQLite was the wrong answer for demonstrating a large result set on the VM. |
| [node-cache](https://www.npmjs.com/package/node-cache) + `crypto` | In-process response caching keyed on an MD5 of the request. Fewer repeated database queries was the sustainability argument; the implementation has a defect, recorded under [Known problems](#known-problems). |

**On not using a GraphQL client.** Dropping Apollo saved the bundle, and it also gave up
what a client provides: query documents, variables, fragments, generated types and a
normalised cache. Queries here are template literals built at each call site with values
interpolated directly into the string. The bundle argument is sound; the cost is that a
schema change has to be found by grepping, and that a username containing a `"` produces
an invalid GraphQL document. Both halves of that trade are real.

The other dependency decisions, framed as energy and bandwidth rather than as
architecture, are in [`docs/sustainability.md`](./docs/sustainability.md).

---

## The data

| | |
| --- | --- |
| Beers | 2,410 |
| Breweries | 558 |
| Distinct styles in the data | 100 |
| Styles offered as filter checkboxes | 15, plus `Other` covering the remaining 85 — together, exactly the 100 |
| ABV range | 0.001–0.128 — stored as a **fraction**, displayed as a percentage |
| IBU range | 4–138 in the source; **0–138 as seeded**, because absent means `0` |
| Beers with **no IBU** in the source | **1,005 — 42 %**, seeded as `0`, not as `NULL` |
| Beers with **no ABV** in the source | 62, likewise seeded as `0` |

That last pair matters when you use the filters. Missing values became zeroes at seed
time, so a beer whose bitterness was never recorded is indistinguishable from a beer
measured at 0 IBU. **Raise the IBU minimum above 0 and 42 % of the catalogue silently
disappears** — not because those beers are mild, but because nobody recorded a number.
The interface does not say so. Same shape of problem for the 62 beers with no ABV.

Votes and comments are not part of the dataset; they accumulate in `votes` and `comments`
as people use the site.

---

## Testing

**84 unit tests across 17 files** (`npm run test:vitest`), covering every component, the
filter context and `protectRoute`. The style is render-plus-snapshot with
`@testing-library/react`, with `vitest-axe` assertions layered on for accessibility
violations — which is why an accessibility regression shows up as a failing unit test
rather than as a note in a review.

**7 Playwright tests** (`npm run test:e2e`) across chromium, firefox and webkit: login,
the beer page, voting, commenting, search, sorting and style filtering.

The e2e suite has a property worth knowing before you run it: **it drives the deployed
site at `it2810-15.idi.ntnu.no` and writes to the shared production database.** It is not
hermetic and it is not sandboxed. Consequences, all of them real:

- It requires the NTNU network or VPN, and no amount of local setup substitutes.
- Two people running it simultaneously will interfere with each other.
- Aborting a run mid-way leaves test users and test comments behind, because cleanup is
  the last step.
- A slow VM is indistinguishable from a broken assertion. The config retries twice.

`npm run test:vitest` has none of those properties. Run it constantly; run the e2e suite
deliberately.

The backend has no tests of its own. Its behaviour is exercised only through the e2e
suite, which is a real coverage gap: the resolvers hold every SQL string in the system
and nothing tests them directly.

<p align="center"><img src="./frontend/tests/testResults.png" width="620" alt="Terminal output from a Playwright run listing the login, beer-page, vote, comment, search, sorting and style-filtering tests passing across chromium, firefox and webkit."></p>

---

## Known problems

Stated because they are real, not because they are about to be fixed. This is archived
coursework; the value here is that the next reader does not have to rediscover them.

**Every resolver builds SQL by string interpolation.** Search terms, usernames, comment
bodies and user ids all go straight into the query text — `LIKE '%${searchQuery}%'`,
`VALUES ('${username}', '${uuid}')`, and so on throughout `backend/resolvers.ts`. There is
no parameterisation anywhere. **Do not point this backend at data you care about, and do
not expose it to an untrusted network.** Sequelize supports bind parameters; adopting them
is a mechanical change confined to one file, and it is the first thing to do if this is
ever revived.

**The cache stores write responses too.** `cacheMiddleware` wraps `res.send` for every
`POST /graphql` without distinguishing reads from writes. A mutating resolver calls
`myCache.flushAll()` and *then* returns, so its own response is written into the
just-emptied cache. A byte-identical repeat of that request within 24 h is answered from
the cache and never reaches the database. The visible case is a duplicate comment: post
the same text on the same beer twice and the second one reports success without inserting
anything. Error responses are cached on the same path.

**`compose.yaml`'s backend service has no `env_file`.** The `frontend` and `mysqldb`
services load one; `backend` does not. So `DATABASE` is unset inside the container,
`db.ts` takes the MySQL branch, and `DB_HOST` falls back to `localhost` — which inside
that container is the container itself, not `mysqldb`. The stack comes up and the backend
cannot reach the database. Adding `env_file: ./backend/.env` with `DB_HOST=mysqldb` fixes
it.

**ABV renders wrong on narrow screens.** `Beer.tsx` builds the mobile attribute list with
`String(beer?.abv ?? 0 * 100) + "%"`. `*` binds tighter than `??`, so the multiplication
applies to the fallback and never to the value: mobile shows `0.075%` where desktop
correctly shows `7.5%`. The desktop branch a few lines down does
`(beer.abv * 100).toFixed(1)` and is right.

**`protectRoute` redirects to `/login`, its test expects `/project2/login`.** The
deployment is served under `/project2`, `main.tsx` sets `basename="/"`, and the redirect
is an absolute path. The three do not agree with each other, and which one is wrong
depends on how the production bundle is built and served — which this repository does not
record.

**Two files are dead and one is broken.** `backend/wait-for-database.sh` polls
*Postgres*, left over from the containerised design that the VM's missing Docker support
killed; nothing invokes it. `backend/start-backend.sh` installs nvm and runs
`dist/server.js`, and its last line is a literal triple-backtick — a markdown fence pasted
into a shell script, which makes it a syntax error. Neither file is referenced by any npm
script, Dockerfile or CI job.

**`backend/database.db` is committed.** A binary SQLite file in version control: it
conflicts on every merge that touches it, it carries whatever votes and comments the last
committer happened to have, and it makes "reset the database" ambiguous. It is also the
reason the quickstart above works with no seeding step, which is presumably why it is
there.

**`scalar Any` gives up GraphQL's main advantage.** The schema validates arguments and
nothing else. Every response is untyped at the boundary and re-declared by hand in the
components that consume it — `Beer` in `src/types/types.ts`, and a near-identical
duplicate inside `useFetchMoreBeers.tsx` and `BeerList.tsx`. When a `SELECT` changes,
nothing tells you which components broke.

**Writes are declared as queries.** No `type Mutation` exists. GraphQL clients, caches and
tooling all assume a `query` is safe to repeat and safe to cache; here, one of them
deletes your account.

---

## Documentation index

| | |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | the design, the full GraphQL reference, the data model, invariants and constraints |
| [backend/README.md](./backend/README.md) | running the API, both database modes, reseeding |
| [frontend/README.md](./frontend/README.md) | running the interface, and every test command in detail |
| [docs/accessibility.md](./docs/accessibility.md) | the UX and screen-reader work, and the four audit tools used to check it |
| [docs/sustainability.md](./docs/sustainability.md) | the energy-and-bandwidth reasoning behind the design decisions |
| [docs/requirements.md](./docs/requirements.md) | the course requirements, each answered against what was built |
| [docs/contribution.md](./docs/contribution.md) | commit format, issue labels, merge request rules |

---

## Vocabulary

| Term | What it means here |
| --- | --- |
| **ABV** | Alcohol by volume. Stored as a fraction (`0.075`), shown as a percentage (`7.5 %`), and filtered as an integer percentage (`0`–`13`). Three representations of one number — a frequent source of confusion in this codebase. |
| **IBU** | International Bitterness Units, 0–138 here. Absent for 42 % of the catalogue, and stored as `0` when absent. |
| **Style** | The beer's category — `American IPA`, `Hefeweizen`. 100 exist in the data; the filter names 15 and folds the other 85 into `Other`. |
| **Reaction** | A vote: `upvote`, `downvote` or `unreact`. `unreact` is a stored row, not a deleted one — a `CHECK` constraint permits all three. |
| **`vote_sum`** | A beer's score: upvotes minus downvotes, computed in SQL per query, never stored. |
| **`beer_count`** | The size of the full result set for the current filters, returned on every row via `COUNT(*) OVER()`. Drives the result counter and the end of the infinite scroll. |
| **Reset vs. Apply** | *Apply* sends the filters as set. *Reset* clears them **and** re-queries with the defaults, in one action. |

---

## Contributing

Conventions are in [`docs/contribution.md`](./docs/contribution.md): Conventional Commits
with a trailing issue reference, an issue per task with acceptance criteria, and merge
requests reviewed by another member, rebased onto `main` and squashed.

Before you push, run the same gates CI runs:

```bash
cd frontend && npm run lint && npm run prettier:check && npm run test:vitest && npm run build
cd ../backend && npm run lint && npm run prettier:check
```

Built for **IT2810 Web Development**, NTNU, autumn 2023, by:

- Sondre Alfnes
- Erik Menkin Lysfjord
- Frederik Andreas Brunvoll Farstad
- Markus Aleksander Råkil Johansen
