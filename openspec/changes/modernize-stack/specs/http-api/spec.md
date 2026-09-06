## ADDED Requirements

### Requirement: Resource-oriented HTTP routes

The backend SHALL expose the catalogue over resource-oriented HTTP routes rather than a
single GraphQL endpoint. Retrieval SHALL use `GET`; state changes SHALL use `POST`, `PATCH`,
`PUT` or `DELETE` according to their semantics.

The route set SHALL be:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/beers` | filtered, sorted, paginated catalogue |
| `GET` | `/api/beers/:id` | one beer with aggregates |
| `GET` | `/api/beers/:id/comments` | paginated comments |
| `GET` | `/api/styles` | distinct beer styles present in the catalogue |
| `POST` | `/api/session` | resolve or create a user for a username |
| `PATCH` | `/api/users/:id` | rename a user |
| `DELETE` | `/api/users/:id` | delete a user |
| `PUT` | `/api/beers/:id/reaction` | set this user's vote |
| `POST` | `/api/beers/:id/comments` | add a comment |
| `DELETE` | `/api/comments/:id` | delete own comment |

#### Scenario: Reading the catalogue

- **WHEN** a client issues `GET /api/beers?size=10&start=0&sort=top`
- **THEN** the response is `200` with a JSON body containing a `beers` array and a
  `totalCount` integer

#### Scenario: A write is not reachable by GET

- **WHEN** a client issues `GET /api/beers/1/reaction`
- **THEN** the response is `404` or `405`, and no vote is recorded

#### Scenario: Setting a vote is idempotent

- **WHEN** a client issues `PUT /api/beers/1/reaction` with `{"action":"upvote"}` twice
- **THEN** both responses are `200` and the beer's vote total reflects exactly one upvote
  from that user

### Requirement: End-to-end type inference without codegen

The frontend SHALL call the backend through a typed client derived from the server's own
route definitions, so that request shapes and response bodies are checked by `tsc` at build
time. The project SHALL NOT introduce a schema-to-types code generation step, a committed
generated client, or a runtime API-client dependency.

#### Scenario: Response field misuse fails the build

- **WHEN** frontend code reads a field that a route's response type does not declare
- **THEN** `bun run build` fails type-checking, without the app having been started

#### Scenario: Request shape misuse fails the build

- **WHEN** frontend code omits a required query parameter or passes a wrong-typed one
- **THEN** `bun run build` fails type-checking

### Requirement: Request validation at the trust boundary

Every route SHALL validate path parameters, query parameters and request bodies against a
declared schema before any handler logic runs. Invalid input SHALL be rejected with `400`
and a JSON body naming the offending fields. Handlers SHALL NOT receive unvalidated input.

Pagination `size` SHALL be bounded to prevent unbounded result sets. `action` on a reaction
SHALL be constrained to `upvote`, `downvote` or `unreact`.

#### Scenario: Out-of-range pagination

- **WHEN** a client requests `GET /api/beers?size=100000`
- **THEN** the response is `400` and no query is executed against the database

#### Scenario: Unknown reaction

- **WHEN** a client sends `PUT /api/beers/1/reaction` with `{"action":"sideways"}`
- **THEN** the response is `400` and no vote is recorded

#### Scenario: Non-numeric identifier

- **WHEN** a client requests `GET /api/beers/not-a-number`
- **THEN** the response is `400`

### Requirement: Meaningful status codes and a single error shape

The API SHALL signal failure through HTTP status codes, not through a `200` response whose
body contains an error string. Error responses SHALL share one JSON shape:
`{"error": {"message": string, "code": string}}`.

Database and other unexpected failures SHALL return `500` with a generic message, and SHALL
NOT include driver text, SQL, or stack traces in the response body.

#### Scenario: Missing beer

- **WHEN** a client requests a beer id that does not exist
- **THEN** the response is `404` with the standard error shape

#### Scenario: Duplicate username

- **WHEN** a client renames a user to a username already taken
- **THEN** the response is `409` with the standard error shape

#### Scenario: Deleting another user's comment

- **WHEN** a client issues `DELETE /api/comments/:id` for a comment it did not author
- **THEN** the response is `403` or `404`, and the comment is not deleted

#### Scenario: Database failure is not leaked

- **WHEN** a query fails at the driver level
- **THEN** the response is `500` and the body contains no SQL text, table names, or stack trace

### Requirement: Caller identity is an explicit, unauthenticated claim

Routes whose response varies per user SHALL take the caller's id from an `X-User-Id`
request header rather than from an interpolated query string. This identity is a
client-supplied UUID and SHALL NOT be treated as authentication: it is an identity claim
that any client can forge, and the documentation SHALL say so wherever the API is described.

#### Scenario: Per-user field reflects the header

- **WHEN** two clients request the same beer with different `X-User-Id` values
- **THEN** each response's `reaction` field reflects that caller's own vote

#### Scenario: Absent identity

- **WHEN** a read is issued with no `X-User-Id` header
- **THEN** the response is `200` and per-user fields are `unreact`

### Requirement: Only reads are cacheable, and cache keys include the caller

The read-through response cache SHALL apply to `GET` routes only. Responses to mutating
requests SHALL NOT be stored under any circumstances. Cache keys for per-user responses
SHALL incorporate the caller's id, so one user's `reaction` values can never be served to
another.

Invalidation SHALL be performed by the route layer rather than by a call each handler is
expected to remember. A newly added mutating route SHALL therefore invalidate correctly
without its author writing invalidation code.

#### Scenario: A write response is never replayed

- **WHEN** a client posts a comment twice with an identical body
- **THEN** both requests reach the handler and two comments exist

#### Scenario: Reads reflect writes immediately

- **WHEN** a user votes on a beer and then re-reads that beer
- **THEN** the response shows the new vote total, not a pre-write cached copy

#### Scenario: Cached reads do not cross users

- **WHEN** user A reads a beer, then user B reads the same beer
- **THEN** user B's `reaction` field reflects user B's vote, not user A's

#### Scenario: A new write route invalidates without bespoke code

- **WHEN** a mutating route is added without any explicit cache call in its handler
- **THEN** a subsequent read of affected data returns post-write state

### Requirement: Cross-origin access is restricted to known origins

The API SHALL accept cross-origin requests only from a configured allowlist of origins,
supplied by environment variable with a development default. It SHALL NOT respond with a
wildcard origin.

#### Scenario: Unlisted origin

- **WHEN** a browser request arrives from an origin not in the allowlist
- **THEN** the response omits `Access-Control-Allow-Origin` for that origin
