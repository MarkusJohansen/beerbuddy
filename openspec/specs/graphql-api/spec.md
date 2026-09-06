## Purpose

The transport: one Express server, one GraphQL endpoint, one response cache, one database
connection. Everything the frontend does goes through here.

This capability records the API as it is, including the parts that are wrong. **This
backend is unsafe on an untrusted network** — every resolver builds SQL by string
interpolation and the injection is not theoretical. Nothing here is production-ready.

## Requirements

### Requirement: Single GraphQL Endpoint
The system SHALL serve all operations over `POST /graphql` on port 3000, with GraphiQL enabled and CORS open to every origin.

Three schemas — beer, user and action — are merged into one and their resolvers spread into
a single root value. Static files under `public/` are also served.

#### Scenario: A client issues any operation
- **WHEN** a JSON body containing a `query` field is posted to `/graphql`
- **THEN** it is resolved against the merged schema

#### Scenario: A developer opens the endpoint in a browser
- **THEN** the GraphiQL explorer is served

#### Scenario: A browser on another origin calls the API
- **THEN** the request is permitted, because CORS `origin` is `*`

### Requirement: Writes Are Declared As Queries
The system SHALL expose its mutating operations — `react`, `comment`, `deleteComment`, `signUp`, `loginOrSignUp`, `updateUser`, `deleteUser` — as GraphQL queries, because no `Mutation` type is defined.

GraphQL clients, caches and tooling assume a query is safe to repeat and safe to cache.
Here one of them deletes an account. This shape is what makes the write-caching defect
below possible.

#### Scenario: A mutating operation is called
- **WHEN** a client sends `{ react(...) }` as a query
- **THEN** the write is performed

### Requirement: Untyped Responses
The system SHALL return every payload through the `scalar Any` type, validating arguments but not results.

Response shapes are re-declared by hand in the components that consume them — `Beer` in
`src/types/types.ts` and near-identical duplicates inside `useFetchMoreBeers.tsx` and
`BeerList.tsx`. Changing a `SELECT` breaks consumers silently.

#### Scenario: A resolver's selected columns change
- **THEN** no type error is raised at the API boundary and no consumer is flagged

### Requirement: Response Caching Keyed On The Request Body
The system SHALL cache responses in memory, keyed on the MD5 of the request URL concatenated with the JSON request body, with a 24-hour time to live.

There is no finer invalidation than a full flush. The key covers the whole body, so any
difference in the query string — including the interpolated `userId` — produces a different
entry.

#### Scenario: An identical request is repeated
- **WHEN** the same body is posted twice within 24 hours with no intervening write
- **THEN** the second is answered from the cache without reaching the database

#### Scenario: Two users issue otherwise-identical requests
- **WHEN** the bodies differ only by the interpolated `userId`
- **THEN** the keys differ and neither user sees the other's per-user fields

### Requirement: Every Mutating Resolver Flushes The Cache
The system SHALL call `myCache.flushAll()` at the end of every resolver that writes to the database.

A write that omits the flush leaves stale reads for up to 24 hours. This is the easiest
silent bug in the repository to introduce.

#### Scenario: A resolver writes to the database
- **WHEN** any insert, update or delete completes
- **THEN** the whole cache is flushed before the resolver returns

### Requirement: Write Responses Are Cached
The system SHALL cache the responses of write operations and error responses on the same path as reads, because the middleware wraps `res.send` for every request without distinguishing them.

A mutating resolver flushes the cache and *then* returns, so its own response is written
into the just-emptied cache. This is a known defect, documented rather than fixed — see
README § Known problems.

#### Scenario: A write response is stored
- **WHEN** a mutating resolver returns after flushing
- **THEN** its response is written to the cache under its request's key

#### Scenario: An error response is stored
- **WHEN** a resolver returns an error
- **THEN** that error is cached and replayed for an identical request within the TTL

### Requirement: SQL Is Built By String Interpolation
The system SHALL be understood to build every query by interpolating arguments directly into SQL text, with no parameterisation anywhere.

Search terms, usernames, comment bodies and user ids all go straight into the query text.
Sequelize supports bind parameters; adopting them is a mechanical change confined to
`backend/resolvers.ts`, and it is the first thing to do if this is ever revived. Until
then, do not point this backend at data worth keeping and do not expose it to an untrusted
network.

#### Scenario: Any resolver receives a string argument
- **THEN** that string is concatenated into the SQL statement unescaped

#### Scenario: The API is documented or described
- **THEN** the SQL injection is stated plainly and the backend is never presented as production-ready

### Requirement: Database Selected By Environment
The system SHALL connect through Sequelize to SQLite when `DATABASE` is `sqlite3` and to MySQL otherwise, reading host, port, user, password and database name from the environment.

Sequelize is used as a driver only; queries are raw SQL because the catalogue query needs a
window function and a correlated subquery. Both packages require a `.env` that is not in
git — copy `.env.example`. A frontend whose `VITE_APP_BACKEND_URL` is undefined fetches
`undefined` and fails with unexplained network errors.

#### Scenario: Local development
- **WHEN** `DATABASE` is `sqlite3`
- **THEN** the tracked `backend/database.db` file is used

#### Scenario: Deployed on the NTNU VM
- **WHEN** `DATABASE` is anything else
- **THEN** MySQL is used, falling back to `localhost:3306` when host and port are unset

#### Scenario: The backend container is started from compose
- **WHEN** the `backend` compose service runs
- **THEN** it has no `env_file`, takes the MySQL branch with `DB_HOST` defaulting to `localhost`, and cannot reach `mysqldb` — a known defect
