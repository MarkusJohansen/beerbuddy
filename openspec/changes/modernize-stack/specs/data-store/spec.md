## ADDED Requirements

### Requirement: One database engine

The system SHALL use PostgreSQL as its only database engine, in every environment. It SHALL
NOT carry a second dialect, a runtime engine-selection branch, or a schema file containing
commented-out alternatives for another engine.

#### Scenario: No engine switch exists

- **WHEN** the backend starts
- **THEN** it connects to PostgreSQL using a connection URL, with no code path selecting a
  different engine based on an environment value

#### Scenario: Same schema everywhere

- **WHEN** the schema is applied for local development and for a deployed instance
- **THEN** it is the same file, applied unmodified, with no lines to comment or uncomment

### Requirement: All SQL uses bound parameters

Every value derived from a request SHALL reach the database as a bound parameter. String
interpolation of request-derived values into SQL text SHALL NOT occur, including inside
`IN (...)` lists, `LIKE` patterns, `LIMIT`/`OFFSET`, and `ORDER BY`.

Sort direction, which cannot be bound, SHALL be selected from a fixed server-side map keyed
by an enumerated value, never assembled from caller input.

#### Scenario: Injection through a text filter

- **WHEN** a client searches for `'; DROP TABLE beers; --`
- **THEN** the search returns beers whose names contain that literal text, the `beers` table
  still exists, and no additional statement is executed

#### Scenario: Injection through a style filter

- **WHEN** a client sends a style value containing a quote and a trailing SQL fragment
- **THEN** the value is compared as a literal style name and matches nothing

#### Scenario: Injection through the identity header

- **WHEN** a request carries an `X-User-Id` header containing SQL syntax
- **THEN** it is compared as a literal id and no additional statement is executed

#### Scenario: Sort parameter cannot inject

- **WHEN** a client passes a `sort` value outside the enumerated set
- **THEN** the request is rejected with `400` and no query is executed

### Requirement: Catalogue ordering is total

The catalogue query SHALL produce a total order, so that offset pagination neither
duplicates nor skips rows. Because most beers have a zero vote total, the user's chosen sort
SHALL always be followed by deterministic tiebreak columns ending in the beer's primary key.

#### Scenario: Paging a tied sort

- **WHEN** a client pages through the whole catalogue sorted by vote total
- **THEN** every beer appears exactly once across all pages

#### Scenario: Repeating a page

- **WHEN** the same page is requested twice with no intervening writes
- **THEN** both responses contain the same beers in the same order

### Requirement: Style filters are derived from the data

The set of styles offered by the interface SHALL be derived from the styles present in the
catalogue, not from a hand-maintained list duplicated across frontend and backend. A style
present in the data SHALL therefore always be reachable through the interface.

#### Scenario: Every style is reachable

- **WHEN** the interface's style filter options are compared against `SELECT DISTINCT style`
- **THEN** every style in the catalogue is selectable, and no offered style is absent from
  the catalogue

#### Scenario: Grouping does not hide styles

- **WHEN** the interface groups less common styles under a single option
- **THEN** selecting that option filters by exactly the styles not individually listed

### Requirement: Schema and seed data are applied reproducibly

Starting the stack from a clean state SHALL produce a database containing the full
catalogue, without a manual step. Seed application SHALL be idempotent with respect to
repeated container starts on an existing volume.

#### Scenario: First start

- **WHEN** the stack is started with no existing database volume
- **THEN** the backend serves the full beer catalogue once the database reports healthy

#### Scenario: Restart on existing data

- **WHEN** the stack is restarted against an existing volume holding user votes and comments
- **THEN** those votes and comments are still present and seeding does not duplicate the
  catalogue

### Requirement: The database is not a tracked file

The repository SHALL NOT track a database file that the running application writes to.
Database state SHALL live in a container volume.

#### Scenario: Using the app leaves the tree clean

- **WHEN** a developer runs the stack and votes on a beer
- **THEN** `git status` reports no modified files
