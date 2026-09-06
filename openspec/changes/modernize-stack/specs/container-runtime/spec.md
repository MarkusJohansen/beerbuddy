## ADDED Requirements

### Requirement: The whole stack runs under podman from a clean checkout

A developer with podman and a clean checkout SHALL be able to start the entire system —
database, backend and frontend — with one command, without installing Bun, Node or
PostgreSQL on the host, and without access to any university network or VPN.

#### Scenario: First run on a clean machine

- **WHEN** a developer clones the repository and runs the documented start command
- **THEN** the interface is reachable in a browser and lists beers, with no host-installed
  runtime or database

#### Scenario: No network dependency

- **WHEN** the stack is started while disconnected from any institutional network
- **THEN** all services start and the catalogue loads

### Requirement: Services start in dependency order

The backend SHALL NOT begin serving until the database is accepting connections. Ordering
SHALL be expressed through container health checks, not through a polling shell script
committed to the repository.

#### Scenario: Cold start race

- **WHEN** the stack is started from cold, where the database takes longer to initialise
  than the backend takes to build
- **THEN** the first request to the API succeeds, rather than failing against an
  unavailable database

#### Scenario: No wait scripts remain

- **WHEN** the repository is searched for shell scripts that poll for database availability
- **THEN** none are present

### Requirement: Every service reads its own configuration

Each service SHALL receive its configuration explicitly. A service SHALL NOT silently fall
back to defaults for values that determine which database or backend it talks to; a missing
required value SHALL fail the service at startup with a message naming the variable.

#### Scenario: Missing backend configuration

- **WHEN** the backend starts without its database connection variable set
- **THEN** it exits immediately with a message naming the missing variable, rather than
  starting and failing per-request

#### Scenario: Missing frontend configuration

- **WHEN** the frontend is built without its API base URL set
- **THEN** the build fails with a message naming the variable, rather than producing a bundle
  that issues requests to `undefined`

### Requirement: Development and production images are distinct and correct

The development configuration SHALL support hot reload for both frontend and backend. The
production image SHALL contain a compiled frontend bundle and no development tooling, SHALL
run as a non-root user, and SHALL be built from pinned base image versions.

#### Scenario: Editing under development

- **WHEN** a developer edits a component while the development stack is running
- **THEN** the browser reflects the change without a container rebuild

#### Scenario: Production image contents

- **WHEN** the production image is inspected
- **THEN** it contains no dev server, no test tooling, and its default user is not root

### Requirement: The frontend is served under one consistent base path

Client-side routes SHALL resolve identically in development and in a deployed image. The
application SHALL NOT carry two disagreeing notions of its base path.

#### Scenario: Deep link after deployment

- **WHEN** a user opens a client-side route directly by URL against the production image
- **THEN** the application renders that route rather than a not-found page

#### Scenario: Same paths in both modes

- **WHEN** the same client-side route is opened in development and in the production image
- **THEN** the path is identical in both

### Requirement: End-to-end tests run against a disposable local stack

The end-to-end suite SHALL drive a locally started stack backed by a disposable database. It
SHALL NOT target a shared deployed instance, SHALL NOT require a VPN, and SHALL NOT write to
data that another person's run depends on.

#### Scenario: Concurrent runs

- **WHEN** two developers run the end-to-end suite at the same time
- **THEN** neither run observes or disturbs the other's data

#### Scenario: Aborted run

- **WHEN** an end-to-end run is interrupted before its cleanup step
- **THEN** discarding the stack's volume returns the environment to a clean state, and no
  shared instance retains test users or comments

### Requirement: Continuous integration verifies both packages

CI SHALL run lint, format check, type check and unit tests for frontend and backend on every
merge request, using the same commands a developer runs locally. The backend SHALL have
automated tests covering its route contract, so that resolver-layer changes are not
unverified.

#### Scenario: Backend change with no test coverage gap

- **WHEN** a change alters a route handler's behaviour in a way that breaks the contract
- **THEN** CI fails on a backend test, not only on manual inspection

#### Scenario: Local and CI parity

- **WHEN** a developer runs the documented pre-commit command set locally and it passes
- **THEN** the same checks pass in CI, because they are the same commands
