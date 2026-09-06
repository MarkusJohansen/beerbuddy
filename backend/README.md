# BeerBuddy API

Bun + Hono + PostgreSQL. Eleven routes over the beer catalogue.

> **No authentication.** `X-User-Id` is a UUID the browser generated. Any client can
> send any value, including someone else's. Do not expose this on an untrusted
> network.

## Running it

From the repository root, not from here:

```bash
make up              # the whole stack
make logs-backend    # follow this service
make restart-backend # reload after an edit — bun --hot does not work over the mount
make psql            # a shell on the database
```

To run the backend on the host instead, with working hot reload (needs Bun ≥ 1.2):

```bash
make dev-backend
```

## Layout

```
src/
├── index.ts     entry point — port and fetch handler
├── app.ts       the chained route declarations, validators, CORS, error handler.
│                Exports AppType, which is what the frontend types itself against
├── queries.ts   every SQL statement in the project
├── cache.ts     GET-only response cache, router-level invalidation
├── db.ts        the one Bun.sql handle
├── env.ts       required configuration, validated at startup
└── errors.ts    ApiError and the single error body shape
db/
├── 01-schema.sql  tables, constraints, indexes
└── 02-seed.sql    generated — do not edit by hand
build/
├── beers.csv, breweries.csv   the source data
└── generate-seed.ts           regenerates 02-seed.sql (`make seed`)
tests/
├── setup.ts       builds a disposable beers_test database before any test imports
└── api.test.ts    30 route-contract tests
```

## Configuration

| Variable            | Required | Default                 | Notes                                      |
| ------------------- | -------- | ----------------------- | ------------------------------------------ |
| `DATABASE_URL`      | **yes**  | —                       | the process exits at startup naming it if unset |
| `CORS_ORIGINS`      | no       | `http://localhost:5173` | comma-separated allowlist; never a wildcard |
| `PORT`              | no       | `3000`                  |                                            |
| `CACHE_TTL_SECONDS` | no       | `300`                   | GET responses only                          |
| `STATIC_DIR`        | no       | unset                   | set only in the production image, where the API also serves the bundle |

Under compose these come from `compose.yaml`; `backend/.env` only needs to exist.

## API reference

All paths are under `/api`. Reads are `GET`; anything that changes state is not.

Identity is the `X-User-Id` header — a client-supplied UUID, **not authentication**.
Reads work without it, with per-user fields returning `unreact`.

### Reads

#### `GET /api/beers`

The catalogue, filtered, sorted and paginated.

| Query      | Type                              | Default | Notes                          |
| ---------- | --------------------------------- | ------- | ------------------------------ |
| `size`     | int 1–100                         | `10`    | bounded, so no unbounded pages |
| `start`    | int ≥ 0                           | `0`     | offset                         |
| `sort`     | `top`\|`low`\|`atoz`\|`ztoa`      | `top`   | anything else is a 400         |
| `search`   | string ≤ 200                      | `""`    | case-insensitive, substring    |
| `minAbv` / `maxAbv` | number 0–100             | `0`/`13`| whole percentages              |
| `minIbu` / `maxIbu` | number 0–1000            | `0`/`138`|                               |
| `styles`   | repeated string                   | none    | `?styles=Altbier&styles=Cider` |

```json
{
  "beers": [
    { "beer_id": 1436, "beer_name": "Pub Beer", "brewery_name": "10 Barrel Brewing Company",
      "vote_sum": 0, "reaction": "unreact" }
  ],
  "totalCount": 2410
}
```

`totalCount` is how many beers match the filters, returned once rather than repeated
on every row as the old API did.

#### `GET /api/beers/:id`

One beer with its aggregates. `404` if there is no such beer.

```json
{ "id": 1436, "name": "Pub Beer", "style": "American Pale Lager", "abv": 0.05,
  "ibu": 0, "ounces": 12, "brewery_name": "10 Barrel Brewing Company",
  "rating": 0, "vote_count": 0, "comment_count": 0, "user_vote": "unreact" }
```

`abv` is a fraction — 0.05 is 5%.

#### `GET /api/beers/:id/comments`

Newest first. `size` (1–100, default 10) and `start` (default 0).

```json
{ "comments": [ { "id": 1, "comment_text": "…", "created_at": "2026-09-06T…",
                  "user_id": "…", "username": "alice" } ] }
```

#### `GET /api/styles`

Every distinct style in the catalogue — 100 of them, including the empty string,
which five beers have. The interface reaches those through its "Other" option, which
is the complement of the styles it names individually. Returned deliberately; never
render it as an option of its own.

```json
{ "styles": ["", "Abbey Single Ale", "Altbier", "…"] }
```

#### `GET /api/session`

The user the caller's `X-User-Id` belongs to. `404` if the header is missing or the
id belongs to nobody. Backs the interface's route guard.

```json
{ "id": "…", "username": "alice" }
```

### Writes

#### `POST /api/session`

Sign in or sign up — the same call. Creates the user if the username is new, returns
the existing one otherwise, so a second caller sending a different `uuid` for a
taken username gets the original id back.

```json
// → { "username": "alice", "uuid": "<generated>" }
// ← { "id": "…", "isNewUser": true }
```

#### `PATCH /api/users/:id`

Rename. `409` if the username is taken, `404` if the user does not exist.

```json
// → { "username": "alice2" }   ← { "ok": true }
```

#### `DELETE /api/users/:id`

Deletes the user, and by cascade their votes and comments. `404` if unknown.

#### `PUT /api/beers/:id/reaction`

Sets this user's vote. **Idempotent** — sending the same vote twice leaves one vote,
and sending a different one replaces it. `PUT` rather than `POST` for that reason.

```json
// → { "action": "upvote" | "downvote" | "unreact" }   ← { "ok": true }
```

Requires `X-User-Id`. `400` for an unknown action, `404` for an unknown beer or user.

#### `POST /api/beers/:id/comments`

```json
// → { "comment": "Best beer ever!" }   ← 201 { "id": 12 }
```

1–2000 characters, trimmed. Requires `X-User-Id`.

#### `DELETE /api/comments/:id`

Deletes a comment **you wrote**. `403` for someone else's, `404` if unknown.

### Errors

Status codes carry failure; a `200` never contains an error. Every failure has one
shape:

```json
{ "error": { "message": "beer not found", "code": "not_found" } }
```

| Status | `code`              | When                                     |
| ------ | ------------------- | ---------------------------------------- |
| `400`  | `invalid_request`   | validation failed; the message names the fields |
| `400`  | `identity_required` | a write arrived with no `X-User-Id`      |
| `403`  | `forbidden`         | someone else's comment                   |
| `404`  | `not_found`         | no such beer, user or comment            |
| `409`  | `conflict`          | username already taken                   |
| `500`  | `internal`          | anything unexpected                      |

A `500` body is always the generic message. Driver text, SQL and stack traces are
logged, never returned — there is a test that forces a real driver error and asserts
none of it leaks.

## Caching

`GET` only, keyed on path + validated query + `X-User-Id`. Write responses are
uncacheable by construction, and the caller being part of the key is what stops one
user's `reaction` values reaching another.

Invalidation is a middleware mounted on the router, not a call inside each handler.
**A mutating route you add tomorrow invalidates correctly without you writing
invalidation code.** A response served from cache carries `X-Cache: HIT`.

## Database

PostgreSQL 18, the only engine. `db/01-schema.sql` and `db/02-seed.sql` are applied
by the postgres image from `/docker-entrypoint-initdb.d` on an **empty volume only**,
so restarts never re-run them and never duplicate the catalogue.

To change the schema, edit `01-schema.sql` and then `make reset` — which destroys
local votes and comments.

To regenerate the seed after changing the CSVs, `make seed`.

All SQL lives in `src/queries.ts` and **every request-derived value is bound**. Two
things there need care, both explained in the file and in
[ARCHITECTURE § 6](../ARCHITECTURE.md#6-the-query-that-does-the-work):

- the style filter is a delimiter-joined parameter split by `string_to_array`,
  because `sql.unsafe()` will not bind a JS array as `text[]`;
- the `ORDER BY` tiebreak is load-bearing and must not be removed.

## Tests

```bash
make test-backend
```

30 tests through Hono's `app.request()`, so nothing binds a port and the suite can
run alongside a dev stack. `tests/setup.ts` creates a throwaway `beers_test`
database from `db/*.sql` before any test file is imported.

Coverage is the route contract, the error shape, cache behaviour, idempotent voting,
comment ownership, pagination totality and four SQL-injection attempts.

**There is no other automated check on this package.** If you change a query and do
not add a test, nothing verified it.
