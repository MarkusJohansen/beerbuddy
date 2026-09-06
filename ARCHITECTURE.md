# Architecture

How BeerBuddy is put together, why it is put together that way, and which parts of it are
load-bearing. [`README.md`](./README.md) is the tour; this is the reference.

Line references are to the state of the repository at the time of writing. Where a design
decision has a reason, the reason is given. Where it does not, that is said too.

---

## Contents

| | |
| --- | --- |
| [1. The shape of the system](#1-the-shape-of-the-system) | three processes, one endpoint |
| [2. The GraphQL surface](#2-the-graphql-surface) | every field, argument and return shape |
| [3. The request path](#3-the-request-path) | from `fetch` to SQL and back |
| [4. Caching](#4-caching) | what is cached, keyed on what, invalidated when |
| [5. The data model](#5-the-data-model) | five tables, and the joins that matter |
| [6. The query that does the work](#6-the-query-that-does-the-work) | `beers` explained line by line |
| [7. Identity](#7-identity) | what "logged in" means here, and what it does not |
| [8. Frontend structure](#8-frontend-structure) | routing, state, data fetching, responsiveness |
| [9. Accessibility as architecture](#9-accessibility-as-architecture) | the parts that are structural, not cosmetic |
| [10. Testing](#10-testing) | the two suites and what each can prove |
| [11. Build and deployment](#11-build-and-deployment) | CI, containers, the VM |
| [12. Invariants](#12-invariants) | break one of these and the failure is silent |
| [13. Known constraints](#13-known-constraints) | real, and not about to be fixed |
| [14. What is deliberately absent](#14-what-is-deliberately-absent) | and why |
| [15. Where a change attaches](#15-where-a-change-attaches) | if this were picked up again |

---

## 1. The shape of the system

Three processes, and one HTTP endpoint between them.

```
┌──────────────────────────┐
│ browser                  │   React 18 + Vite, served on :5173 in dev
│  React SPA               │   4 routes, one shared context, no client cache
└───────────┬──────────────┘
            │  POST http://<host>:3000/graphql
            │  Content-Type: application/json
            │  { "query": "{ beers(size: 10 …) }" }     ← the query is a template
            ▼                                             string, built per call site
┌──────────────────────────┐
│ node                     │   express :3000
│  cacheMiddleware         │   ① md5(url+body) → NodeCache, 24 h
│  express-graphql         │   ② parse, validate args, dispatch on rootValue
│  resolvers               │   ③ build one SQL string
│  sequelize               │   ④ .query() — raw SQL, no models, no ORM mapping
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ database                 │   SQLite file (dev) or MySQL/MariaDB (prod, compose)
│  5 tables                │   selected by $DATABASE at process start
└──────────────────────────┘
```

**Sequelize is used only as a driver.** No models are defined, no associations, no
migrations, no `sync()`. Every call is `sequelize.query(<string>)` and every result is
cast to a hand-written row type. The library is there because it abstracts two dialects
behind one connection object, and for nothing else. That is a defensible use of it — and
it does mean the schema in `build/tables.sql` and the queries in `resolvers.ts` have no
mechanical link, so a column rename breaks at runtime rather than at build time.

**There is no application build for the backend.** `npm run dev` runs `tsx` over the
TypeScript directly. `npm run build` exists and emits to `dist/`, but nothing in the
repository consumes that output — not the Dockerfile, not CI, not compose.

### Why SQLite and MySQL both

The original design was Postgres in a container. The group's virtual machine would not run
Docker, so that design died. SQLite replaced it because it needs no server process, which
makes cloning-and-running a one-step operation for a marker — but SQLite was the wrong
answer for the graded deployment, where the requirement was to demonstrate handling a
large result set. Hence both: SQLite as the zero-setup default, MySQL for the VM, chosen
at process start by one ternary in `db.ts`.

The cost of that choice is a schema written twice. `build/tables.sql` is MySQL syntax with
the SQLite variants commented out beside them (`AUTO_INCREMENT` vs
`AUTOINCREMENT`, the leading `CREATE DATABASE` block). Switching dialects means editing
comments in a `.sql` file, which nothing verifies.

---

## 2. The GraphQL surface

`schema.ts` declares three schemas which `server.ts` merges into one. All nine fields sit
on `Query`. `scalar Any` is declared but never given a resolver — it is an opaque
passthrough, so the response is whatever the resolver returned, unvalidated.

### Reads

| Field | Arguments | Returns |
| --- | --- | --- |
| `beers` | `size: Int!`, `start: Int`, `userId: String!`, `sort: String`, `search: String`, `minAbv: Int`, `maxAbv: Int`, `minIbu: Int`, `maxIbu: Int`, `styles: Any` | Array of `{ beer_id, beer_name, brewery_name, vote_sum, reaction, beer_count }` |
| `beer` | `id: Int!`, `userId: String!` | **A one-element array** of `{ abv, ibu, name, style, ounces, id, brewery_name, rating, vote_count, comment_count, user_vote }` |
| `comments` | `id: Int!` (the *beer* id), `size: Int!`, `start: Int` | Array of `{ comment_text, created_at, id, user_id, username }`, newest first |

`beer` returning an array rather than an object is why every caller writes
`data.data.beer[0]`. It is a leaked implementation detail — the resolver returns the raw
rowset — and it is now load-bearing in three call sites.

### Writes (declared as queries)

| Field | Arguments | Returns | Notes |
| --- | --- | --- | --- |
| `loginOrSignUp` | `username: String!`, `uuid: String!` | `{ id, isNewUser: "yes" \| "no" }` | The only identity call the app makes. Idempotent on username. |
| `login` | `username: String!` | Array of `{ id }` | Used by `protectRoute` as a consistency check. Read-only despite the name. |
| `signUp` | `username: String!` | `id` | Superseded by `loginOrSignUp`; the frontend never calls it. Note the schema declares only `username`, while the resolver destructures `{ username, uuid }` — so `uuid` arrives `undefined` and the insert writes a null id. |
| `updateUser` | `userId: String!`, `username: String!` | `"You updated your user!"` | No frontend caller. |
| `deleteUser` | `userId: String!` | `"You deleted your user!"` | No frontend caller — but the **e2e suite** uses it to clean up. Cascades to votes and comments. |
| `react` | `userId: String!`, `beerId: Int!`, `action: String!` | `"You reacted!"` | `action` ∈ `upvote \| downvote \| unreact`, validated in the resolver. Throws if you repeat your current reaction. |
| `comment` | `userId: String!`, `beerId: Int!`, `comment: String!` | `"You commented!"` | Length and content validated **client-side only**. |
| `deleteComment` | `userId: String!`, `commentId: Int!` | `"You deleted your comment!"` | Ownership enforced in both the `SELECT` guard and the `DELETE`'s `WHERE`. |

Every write returns a human-readable string, and errors surface as GraphQL errors from a
thrown `Error`. There is no machine-readable status; the frontend distinguishes success
from failure by whether `response.ok` held, which means a GraphQL-level error inside a
200 response reads as success at several call sites.

### There is no query document anywhere

Queries are built as template literals at the point of use — in
`useFetchMoreBeers.tsx`, `useFetchBeer.tsx`, `protectRoute.tsx`, `Voter.tsx`,
`CommentBar.tsx`, `CommentItem.tsx`, `LogIn.tsx` and `Beer.tsx`. No fragments, no
variables, no generated types, no shared client module. Values are interpolated straight
into the query string, so a username containing a `"` produces a syntactically invalid
GraphQL document, and a beer id is spliced in unquoted.

This is the single largest structural difference from a conventional GraphQL frontend, and
it is the reason a schema change has to be found by grepping.

---

## 3. The request path

Follow one catalogue load end to end.

**1 — The component asks.** `App.tsx` mounts and calls `useFetchMoreBeers()`, which reads
the five filter values out of `FilterContext` and the user id out of `localStorage`.

**2 — The query is assembled.** `fetchMore(reset?, noFilters?)` builds the string. The two
flags matter:

- `reset: true` → `start: 0` and the response *replaces* the list, rather than appending.
  Also persists the current filters to `localStorage`, and scrolls the list container back
  to the top.
- `noFilters: true` → sends the defaults regardless of context state, and writes the
  defaults to `localStorage`. This is what *Reset Filters* uses: it clears the context and
  re-queries in the same action, because clearing state alone would leave the old results
  on screen until something else triggered a fetch.

Page size is fixed at 10, and `start` is `beers.length` — offset pagination driven by how
many rows the client already holds.

**3 — `cacheMiddleware` intercepts.** See [§4](#4-caching).

**4 — `express-graphql` dispatches.** The merged schema validates that argument names and
scalar types match, then calls the matching key on `rootValue`. Because `rootValue` is a
flat spread of all three resolver objects, **field names share one namespace across the
three schemas** — two resolvers with the same field name would silently shadow.

**5 — The resolver builds SQL.** One string, interpolated, no bind parameters. Dissected
in [§6](#6-the-query-that-does-the-work).

**6 — `sqlQuery()` executes it.** `resolvers.ts` wraps every call in one helper that takes
`query[0]` (Sequelize returns `[rows, metadata]`) and, on failure, **returns the string
`"Error in query"` instead of throwing.** Callers that check for it convert it to a thrown
`Error`; callers that do not — `comments`, `beer`, `beers`, `login` — return that string
to the client, where it arrives as a JSON string body where an array was expected. The
frontend then calls `.map` on it. That is the failure mode to expect when a query is
malformed.

**7 — The response is cached on the way out and returned.**

**8 — The component renders.** `setBeers(reset ? data.data.beers : [...beers, ...])`.
There is no loading state on the list and no error state; a failed fetch leaves the
previous rows on screen.

---

## 4. Caching

`backend/caching.ts`, 45 lines, and the most consequential 45 lines in the backend.

```
key = md5( req.originalUrl + JSON.stringify(req.body) )
store = NodeCache, stdTTL = 86400 s (24 h)
```

On a hit the middleware sends the stored body and **does not call `next()`** — GraphQL is
never invoked. On a miss it monkey-patches `res.send` to write the outgoing body into the
cache before delegating to the original, then calls `next()`.

**What that key implies.** Every request goes to the same URL, so the key is effectively
the request body: the query text, byte for byte. Whitespace differences produce different
keys. Because `userId` is interpolated into the query text rather than passed as a
variable, per-user responses key separately and cannot leak between users — correct, but
by accident of the fetch style rather than by design.

**Invalidation is total and manual.** Every mutating resolver ends with
`myCache.flushAll()`. There is no per-key or per-entity invalidation, so one vote empties
the cache for every beer, every filter combination and every user. On a site with this
traffic profile that is the right trade — a correct cache with a crude eviction beats a
clever one that serves a stale vote count.

**The ordering defect.** The flush happens *inside* the resolver; the response is written
to the cache *after* the resolver returns, by the patched `res.send`. So a write's own
response ends up cached in the freshly-emptied store. Concretely:

```
POST { comment(userId:"u" beerId:5 comment:"Nice") }   → INSERT, flushAll, cache["…"] = "You commented!"
POST { comment(userId:"u" beerId:5 comment:"Nice") }   → cache HIT. No INSERT. Reports success.
```

Any intervening write flushes the entry and restores correct behaviour, which is why this
is rarely seen. Errors cache identically: a `signUp` rejected for a duplicate username
returns that same error for 24 h, or until the next write.

**The fix, if this were revived,** is to skip caching for known write fields — or, better,
to introduce a real `type Mutation` so the middleware can branch on operation type instead
of guessing from a body it has to re-parse.

---

## 5. The data model

Five tables, in `backend/build/tables.sql`.

```
breweries                       beers                          users
──────────────                  ──────────────                 ──────────────
id      INTEGER PK   ◄────┐     number  INTEGER                 id       VARCHAR(255) PK  ← a UUID v4
name    TEXT              └──── brewery_id INTEGER FK           username TEXT              ← no UNIQUE
city    TEXT                    id      INTEGER PK  ◄──┐                     ▲
state   TEXT                    name    TEXT           │                     │
                                style   TEXT           │                     │
                                abv     REAL  ← 0–0.128│                     │
                                ibu     REAL  ← 0–138, 0 = absent │                     │
                                ounces  REAL           │                     │
                                                       │                     │
                     votes ─────────────────────────────┤                     │
                     ──────────────                    │                     │
                     id        PK AUTO_INCREMENT       │                     │
                     beer_id   FK ────────────────────►┤                     │
                     user_id   FK ─────────────────────┼─────────────────────┤ ON DELETE CASCADE
                     vote_type CHECK IN (upvote,       │                     │
                                         downvote,     │                     │
                                         unreact)      │                     │
                                                       │                     │
                     comments ─────────────────────────┤                     │
                     ──────────────                    │                     │
                     id           PK AUTO_INCREMENT    │                     │
                     beer_id      FK ─────────────────►┘                     │
                     user_id      FK ───────────────────────────────────────►┘ ON DELETE CASCADE
                     comment_text TEXT
                     created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

Things this schema does and does not guarantee:

- **`users.username` has no `UNIQUE` constraint.** Uniqueness is enforced only by a
  `SELECT … LIMIT 1` check inside `signUp`, `updateUser` and `loginOrSignUp` — a
  check-then-insert with no transaction around it. Two simultaneous signups for the same
  name both pass the check and both insert. Since the entire identity model rests on
  "username maps to one id", this is the schema's most important missing constraint.
- **`votes` has no unique key on `(user_id, beer_id)`.** One vote per user per beer is
  enforced by the `react` resolver reading before writing, with the same race.
- **`ON DELETE CASCADE` runs from `users` only.** Deleting a user removes their votes and
  comments. Deleting a beer is not modelled — the catalogue is static.
- **`vote_type = 'unreact'`** is a stored row, not an absent one. Clearing a vote updates
  the row rather than deleting it, so `votes` accumulates rows for every beer anyone ever
  touched.
- **`abv` and `ibu` are `REAL` and never `NULL`.** The seed generator writes `0` for a
  missing value (`row.abv ? row.abv : 0`). 1,005 beers have a fabricated `ibu` of 0 and 62
  a fabricated `abv` of 0. See [§13](#13-known-constraints).

### How the seed file is produced

`build/createSeedFile.js` truncates `database-seed.sql`, appends `build/tables.sql`, then
streams both CSVs into two multi-row `INSERT` statements. It escapes `'` by doubling it
and trims leading whitespace from brewery `state`.

The two CSV streams are independent and unordered, so **which `INSERT` block lands first
is not deterministic.** `beers` references `breweries(id)`, so if the beers block is
written first the file will not load under a database that enforces foreign keys at
insert time. MySQL and SQLite are both permissive enough by default that this has not
bitten, which is exactly why it is worth writing down.

---

## 6. The query that does the work

`beerResolver.beers` in `resolvers.ts` is where the catalogue's behaviour actually lives.
Reading it once explains most of the frontend.

```sql
SELECT
  beers.id AS beer_id,
  beers.name AS beer_name,
  breweries.name AS brewery_name,
  SUM(CASE WHEN votes.vote_type = 'upvote'   THEN  1
           WHEN votes.vote_type = 'downvote' THEN -1
           ELSE 0 END)                        AS vote_sum,      -- ① the score
  IFNULL((SELECT vote_type FROM votes
          JOIN users ON votes.user_id = users.id
          WHERE users.id = '<userId>'
            AND votes.beer_id = beers.id), 'unreact')
                                              AS reaction,      -- ② this user's own vote
  COUNT(beers.id) OVER()                      AS beer_count     -- ③ the full match count
FROM beers
JOIN      breweries ON beers.brewery_id = breweries.id
LEFT JOIN votes     ON beers.id = votes.beer_id
WHERE
  beers.abv >= <minAbv/100> AND beers.abv <= <maxAbv/100>       -- ④ percent → fraction
  AND beers.ibu >= <minIbu> AND beers.ibu <= <maxIbu>
  AND LOWER(beers.name) LIKE '%<search>%'                       -- ⑤
  [ AND beers.style IN ('…','…') ]                              -- ⑥
GROUP BY beers.id, beers.name, breweries.name
ORDER BY <vote_sum DESC | vote_sum ASC | beer_name ASC | beer_name DESC>,
         beer_name ASC, beer_id                                 -- ⑦ stable tiebreak
LIMIT <size> OFFSET <start>;
```

**① `vote_sum` is derived, never stored.** Recomputed on every page of every query. At
2,410 beers this costs nothing measurable, and it removes a denormalised counter that
would need maintaining on every vote.

**② `reaction` is a correlated subquery per row**, so the same catalogue looks different
to different users, and the response for user A cannot be reused for user B — which is
also why the cache keys them apart.

**③ `COUNT(*) OVER()` is the reason the UI can say "1,304 results" and know when to stop
scrolling.** The window function is evaluated after `GROUP BY` and before `LIMIT`, so it
counts matching beers, not returned rows. Every row carries the same value; the frontend
reads it off row 0 (`beers[0]?.beer_count`) and compares it against `beers.length` to set
`hasMore`. If the result set is empty there is no row 0, `beer_count` is `undefined`, and
`hasMore` is `false` — which is the correct behaviour, reached by accident.

**④ The ABV unit conversion lives here**, and only here. The slider emits integer
percentages; the column stores fractions; the resolver divides by 100. Three
representations of one quantity, converted at one point — but the display conversion
(`× 100`) happens separately in `Beer.tsx`, which is where it goes wrong on mobile.

**⑤ Search is a leading-wildcard `LIKE`,** so no index can serve it; it is a scan. At this
row count that is fine. `LOWER()` on the column makes the match case-insensitive on the
haystack; the needle is lowercased client-side in `Actionbar.tsx` before it enters the
context. Both halves are needed and they live in different files.

**⑥ The `Other` bucket.** The frontend offers 15 named styles plus `Other`. When `Other`
is checked the resolver pushes a hardcoded array of 85 further style names onto the
requested list. 15 + 85 = 100, which is exactly the number of distinct styles in the data,
and the two lists currently cover it with no gaps and no dead entries — verified, not
assumed.

That is a coincidence maintained by hand. The 85 are a literal in `resolvers.ts`, the 15
are a literal in `Filters.tsx`, the 100 live in the CSV, and **nothing checks that the
three still agree.** A style added to the dataset is silently unreachable through the UI
until both literals are edited. One of the 85 is the empty string, which is how beers with
a blank `style` column stay reachable at all.

**⑦ The tiebreak matters.** Most beers have zero votes, so `ORDER BY vote_sum` alone
leaves thousands of rows tied and the database free to return them in any order —
different orders on different pages, which with offset pagination means duplicated and
skipped rows as you scroll. Appending `beer_name ASC, beer_id` makes the order total, and
the pagination correct.

---

## 7. Identity

**What exists:** a `users` row holding a UUID v4 and a username, and two `localStorage`
keys (`userNameBeerBuddy`, `userIdBeerBuddy`) holding the same pair on the client.

**What does not exist:** passwords, sessions, tokens, cookies, an `Authorization` header,
any server-side notion of who is calling. The `userId` is an ordinary GraphQL argument.

So the security model is: **the user id is the credential, it is sent in cleartext as data,
and it is not secret.** Anyone who obtains an id can vote and comment as that user and
delete their account. Ids are UUID v4, so they are not guessable — but they are visible in
`localStorage`, in every request body, and in the GraphiQL console.

`protectRoute()` runs on mount of `App` and `Beer`, and before voting and commenting. It
asks the server for the id belonging to the stored username and redirects to `/login` when
the stored id disagrees, clearing `localStorage` first. That catches a stale or
hand-edited client — it is a consistency check, not an authentication check, and it is
worth being precise about the difference: nothing on the server ever refuses a request.

For a public catalogue of beer opinions, marked as coursework, that is a proportionate
design. It is written down here so nobody mistakes it for more than it is.

**Logout takes two steps to do one thing.** The button in `App.tsx` removes only
`userIdBeerBuddy`, then reloads. On the reloaded page `protectRoute()` finds a username
with no id, calls `resetLocalStorage()` — which removes both keys — and redirects to
`/login`, where `LogIn.tsx` finds no stored username and renders the form. The end state
is correct. It depends on the guard running, though, which is the same reason the
username must not be cleared first: `protectRoute` treats *either* key missing as a
reset, and that is what completes the logout.

---

## 8. Frontend structure

### Routing

`main.tsx` mounts four routes under `BrowserRouter basename="/"`:

| Route | Component | Guard |
| --- | --- | --- |
| `/login` | `LogIn` | none — auto-submits if a username is already stored |
| `/` | `App` | `protectRoute()` in a mount effect |
| `/beer/:id` | `Beer` | `protectRoute()` in a mount effect |
| `*` | `FallbackPage` | none |

The guard runs *after* first paint, so a signed-out visitor briefly sees the page before
being redirected. Ant Design's dark algorithm and four token overrides are configured once
here, at the `ConfigProvider`, which is why individual components rarely set colours.

### State

`FilterContext` holds exactly five values — `searchString`, `IBU`, `ABV`, `styles`,
`sorting` — and it is the only shared state in the application. It is initialised from
`localStorage` on first render, so a returning visitor keeps their filters.

Everything else is local `useState`. There is no Redux, no query cache, no normalised
store: fetched data lives in the component that fetched it and is re-fetched when a
dependency changes. For four screens that is the right amount of machinery.

The re-fetch triggers are worth listing, because they are the whole data flow:

| Change | Effect |
| --- | --- |
| `searchString` or `sorting` | `BeerList` effect → `fetchMore(true)` — immediate re-query, list replaced |
| Filter sliders / checkboxes | **nothing**, until *Apply Filters* calls `fetchMore(true)` |
| *Reset Filters* | clears the context **and** calls `fetchMore(true, true)` in one action |
| Scroll to bottom | `InfiniteScroll` → `fetchMore()` — appends the next 10 |
| `newVote` / `newComment` toggles | `useFetchBeer` effect → re-fetch the beer |

The `newVote`/`newComment` booleans are flip-flags: a child calls `onSuccess`, the parent
inverts the boolean, the effect's dependency array notices and re-fetches. It is a
change-notification channel built out of a value nobody reads.

### Optimistic voting

`Voter` keeps the current reaction locally and computes the displayed score as
`props.votes + values[localAction] − values[serverAction]`, where `values` maps
`upvote → 2`, `unreact → 1`, `downvote → 0`. The differences between those numbers are
what matter: switching from downvote to upvote moves the score by 2, and from neutral by
1. The number therefore moves the instant you click, and the server value replaces it on
the next fetch. Nothing reconciles a failed request — the fetch's result is not inspected
— so a vote that fails on the server stays visible until a reload.

### Responsiveness

There is no CSS-only responsive layout. `useWindowDimensions()` subscribes to `resize` and
returns live pixel dimensions, and components branch on them in JavaScript at three
breakpoints:

| Width | What changes |
| --- | --- |
| `> 1000` | Sidebar filters visible; the filter modal is force-closed |
| `≤ 1000` | Sidebar hidden; filters move into a modal behind the filter button |
| `> 768` | Desktop `BeerAttribute` tiles; `Select` for sorting; text "Comment" button |
| `≤ 768` | `MobileBeerAttribute`; `SortingButton` dropdown; icon-only submit |

This is a real trade. It gives one source of truth for a breakpoint and lets a branch swap
component trees rather than restyle one — but it renders on every resize event, it ships
both component trees to every client, and the breakpoints are duplicated as magic numbers
across six files rather than living in a shared constant or a media query.

---

## 9. Accessibility as architecture

Some of the accessibility work is structural rather than cosmetic, and removing it would
break behaviour rather than looks. Those parts belong here; the full account is in
[`docs/accessibility.md`](./docs/accessibility.md).

- **`vitest-axe` runs inside the unit suite.** Accessibility violations fail
  `npm run test:vitest` like any other assertion, so a regression blocks CI rather than
  waiting for a review.
- **MUI is a dependency for exactly one component.** Ant Design's `Slider` failed the
  audits, so the ABV and IBU sliders are MUI's, restyled to match. That is why the project
  carries two component libraries — a real cost, taken deliberately, recorded here so
  nobody "simplifies" it away.
- **The infinite scroll has a keyboard escape.** `App.tsx` binds `Escape` to focus the
  skip-link, because a keyboard user inside a list that grows as they reach its end can
  otherwise never reach anything after it. Without this the page is a trap.
- **The result counter is content, not decoration.** "1,304 results / Searched for: X /
  Sorted by: Y" is rendered as text in a labelled region, so a screen reader user learns
  that a filter changed the result set. Sighted users infer that from the list moving.

The `Escape` binding has an implementation problem worth noting: `onEscape` is called
during render and adds a `window` listener with no cleanup, so listeners accumulate on
every render of `App`.

---

## 10. Testing

| | `npm run test:vitest` | `npm run test:e2e` |
| --- | --- | --- |
| Count | 84 tests, 17 files | 7 tests × 3 browsers |
| Needs a backend | no | **the deployed one** |
| Needs the VPN | no | yes |
| Runtime | seconds | ~1.5 min |
| Isolated | yes | **no — shared production database** |
| What it proves | a component renders as before, and passes axe | a real user journey works end to end |

The unit suite is render-plus-snapshot with axe assertions. Snapshots make it excellent at
catching unintended markup change and poor at catching wrong behaviour: a component that
renders the wrong data consistently keeps passing. `FilterContext` and `protectRoute` are
the two non-component tests, and `protectRoute`'s is the only place a fetch is mocked.

The e2e suite drives `it2810-15.idi.ntnu.no` — not a local server, not a fixture. It
creates real users, casts real votes and posts real comments against the production
database, then calls `deleteUser` to clean up. Everything in
[§13](#13-known-constraints) about it follows from that one fact.

**The backend has no test of its own.** Nine resolvers, every SQL string in the system,
and the cache middleware are covered only by whatever the browser suite happens to
exercise. If one change were worth making to this repository, it would be a handful of
resolver tests against a throwaway SQLite file — the seed file already exists, and
`sqlQuery` is the only seam that would need to move.

---

## 11. Build and deployment

**CI** (`.gitlab-ci.yml`, `node:19`, `only: merge_requests`): lint frontend, lint backend,
prettier frontend, prettier backend, `test:vitest`, frontend build. Five stages are
declared including `deploy`; no deploy job exists. Deployment to the VM was manual.

**Containers.** Both Dockerfiles are `node:21.2.0-alpine`, `npm install`, `CMD npm run
dev`. They run development servers; the frontend Dockerfile still carries the commented-out
`npm ci --omit=dev` cache-mount block it was scaffolded from. `compose.yaml` bind-mounts
each source directory over `/app` with an anonymous volume protecting `node_modules`, so
edits on the host are live in the container. Useful for development, wrong for production,
and there is no second compose file for production.

**The VM.** `it2810-15.idi.ntnu.no`, MySQL, frontend served under `/project2`, backend on
`:3000`. The `/project2` base path is the origin of the routing inconsistency in
[§13](#13-known-constraints); how the production bundle was actually built and served is
not recorded anywhere in this repository, which is itself the gap.

---

## 12. Invariants

Break one of these and the failure is quiet rather than loud.

1. **The catalogue query's `ORDER BY` must stay total.** Offset pagination over a
   non-deterministic order duplicates and skips rows. The `beer_name ASC, beer_id`
   tiebreak after the user's chosen sort is what prevents it.
2. **`beer_count` must come from the same query as the rows.** It drives both the result
   counter and the end of the infinite scroll; computing it separately would let the two
   disagree mid-scroll.
3. **Every mutating resolver must call `myCache.flushAll()` before returning.** There is
   no finer invalidation. A write that forgets it leaves stale reads for up to 24 hours.
4. **ABV crosses three representations** — fraction in the database, integer percent in
   the filters, formatted percent on screen. Every boundary crossing must convert. This is
   already violated once, on mobile.
5. **A missing `ibu` or `abv` is stored as `0`, not `NULL`.** Any query that treats 0 as a
   measured value inherits 1,005 fabricated data points.
6. **The 85 styles in `resolvers.ts` and the 15 in `Filters.tsx` must together cover every
   style in the data**, or a style becomes unreachable through the UI. They currently do,
   exactly — 15 + 85 = the 100 in the CSV. Nothing enforces it.
7. **`userId` must be interpolated into the query text, not passed as a GraphQL variable**
   — otherwise every user shares a cache key and sees another user's `reaction` values.
   The cache's correctness rests on a property of how the fetch strings are built.
8. **The comment ownership check must exist in both places** — the render condition in
   `CommentItem` and the `WHERE` clause in `deleteComment`. The first is a convenience;
   only the second is enforcement.
9. **Deleting a user must cascade.** The FK carries it. Without it, orphaned votes would
   still count toward `vote_sum` and orphaned comments would break the `JOIN users`.

---

## 13. Known constraints

Stated because they are real. The headline defects are in
[README § Known problems](./README.md#known-problems); these are the structural limits
underneath them.

**SQL is assembled by string interpolation, everywhere.** Not a subset of the resolvers —
all of them. This bounds what the project can safely be: local, trusted-network,
demonstration software. Sequelize's bind parameters are available and the change is
confined to `resolvers.ts`.

**Identity is unauthenticated by construction.** [§7](#7-identity). Adding real
authentication is not a patch; it is a server-side session concept that does not currently
exist anywhere in the stack.

**Uniqueness is enforced by check-then-insert, not by a constraint.** Username uniqueness
and one-vote-per-beer are both application-level reads followed by writes with no
transaction and no unique index. Concurrent requests can violate both. At this traffic
level it has not happened; the schema is what would make it impossible.

**42 % of IBU values are fabricated zeroes.** The most user-visible consequence of the
seed generator's `value ? value : 0`. Raising the IBU filter's minimum above 0 removes
1,005 beers that may or may not be bitter. Fixing it means seeding `NULL` and teaching the
`WHERE` clause and the display path to handle it — three coordinated changes.

**Search cannot scale.** `LIKE '%term%'` is a full scan by definition. Fine at 2,410 rows,
and the wrong shape at 100,000.

**Offset pagination drifts under writes.** `LIMIT 10 OFFSET n` over an order that includes
`vote_sum` means a vote cast while you are scrolling can shift a beer across a page
boundary, and you see it twice or not at all. Keyset pagination is the fix; it was not
worth it here.

**The e2e suite is not isolated.** It writes to production. Two concurrent runs interfere;
an aborted run leaks users and comments because cleanup is the last step; a slow VM looks
identical to a failed assertion. `retries: 2` papers over the last of those.

**Two component libraries ship to every client.** Ant Design and MUI, for one slider. The
reason is good ([§9](#9-accessibility-as-architecture)) and the bundle cost is real, and
it sits awkwardly beside the sustainability argument for minimal dependencies.

**Nothing records how production was built.** No production Dockerfile, no deploy job, no
serving config for the `/project2` base path. That is why the `basename` / `protectRoute`
/ test-expectation disagreement cannot be resolved by reading this repository.

---

## 14. What is deliberately absent

| Not here | Why |
| --- | --- |
| A GraphQL client (Apollo, urql) | Argued explicitly: Apollo brings subscriptions, tracing and cloud integration this project never uses, and the dependency weight contradicts the sustainability requirement. `fetch` is the whole client. The cost is paid in [§2](#2-the-graphql-surface) — no variables, no fragments, no generated types. |
| `type Mutation` | Not a decision so much as a consequence: `buildSchema` blocks were written with `Query` and never revisited. It is the root of the caching defect in [§4](#4-caching). |
| Sequelize models and migrations | Raw SQL was preferred for control over the window function and the correlated subquery in [§6](#6-the-query-that-does-the-work), both awkward through an ORM. Migrations are unnecessary for a schema that ships as one seed file. |
| A light theme | Dark by default is the sustainability argument, and a half-committed second theme is two mediocre designs. |
| Server-side comment validation | The regex lives only in `CommentBar`. Any client that skips it can post anything. |
| A password | See [§7](#7-identity). The threat model is coursework. |
| Backend tests | The gap, not a decision. |
| `signUp`, `updateUser`, `deleteUser` in the UI | `loginOrSignUp` superseded the first; the other two are reachable only through GraphiQL, and `deleteUser` exists in practice for e2e cleanup. |
| Rate limiting, request logging, health checks | Nothing operational was built. The VM was started by hand. |

---

## 15. Where a change attaches

If this were picked up again, in the order the seams allow:

**Parameterise the SQL.** One file, nine resolvers, mechanical: `sqlQuery` already funnels
every call through one place, so it can take `(sql, replacements)` and pass them to
`sequelize.query`. Everything else in the system is unaffected. This is the change that
converts the project from "demo only" to "safe to expose".

**Give the backend tests.** `sqlQuery` is the seam. Point `db.ts` at a temporary SQLite
file seeded from `database-seed.sql`, and the nine resolvers become testable without a
browser, a VPN, or the production database.

**Introduce `type Mutation`.** Moves six fields, makes `cacheMiddleware` able to branch on
operation type instead of caching writes, and lets the client stop pretending a delete is
a read. It is a breaking change to every write call site — but there are only six.

**Type the responses.** Replacing `scalar Any` with real object types makes the schema the
contract instead of the `SELECT`, and makes the duplicated `Beer` interfaces in
`types.ts`, `useFetchMoreBeers.tsx` and `BeerList.tsx` generatable rather than
hand-maintained.

**Make the e2e suite hermetic.** Point `playwright.config.ts` at a `webServer` running
locally against a scratch database. The tests themselves barely change — the URLs are
hardcoded in `beerbuddy.spec.ts` and would move to `baseURL`. This removes the VPN
requirement, the interference between runs, and the leaked test data in one move.

**Seed `NULL` for missing measurements**, and teach the filter and the display to say
"unknown". Three coordinated edits — `createSeedFile.js`, the `WHERE` clause in `beers`,
and the attribute tiles — and it makes 42 % of the catalogue honest.
