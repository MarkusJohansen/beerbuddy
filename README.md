# BeerBuddy

A catalogue of **2,410 US craft beers** from **558 breweries**, with votes and
comments. A React SPA talking to a Bun + Hono API over HTTP/JSON, backed by
PostgreSQL. Everything runs under podman.

> **This backend has no authentication and is unsafe on an untrusted network.**
> A user is a UUID the browser generated and sends in a header; anyone can send
> any value. It is a coursework catalogue, not a production service. See
> [Known problems](#known-problems).

---

## Quickstart

You need **podman**. Nothing else — not Bun, not Node, not PostgreSQL.

```bash
make init
```

That copies the `.env` files, resolves dependencies, builds the images and starts
the stack. When it finishes:

| | |
| ---------- | ---------------------------------------- |
| Interface  | <http://localhost:5173>                   |
| API        | <http://localhost:3000/api/beers>         |
| Database   | `postgres://beerbuddy@localhost:5433/beers` |

`make help` lists everything else.

```bash
make up          # start
make down        # stop, keeping data
make reset       # destroy the volume and reseed  — DELETES LOCAL DATA
make logs        # follow
make check       # everything CI runs
```

> **Podman on macOS**: the machine has to be running first — `podman machine start`.

---

## How a request is answered

```
Browser                 Hono (Bun)                     PostgreSQL
   │  GET /api/beers?size=10&sort=top                       │
   │  X-User-Id: <uuid>                                     │
   ├───────────────────────▶│                               │
   │                        │ cors → invalidate → identity  │
   │                        │ → validate (zod) → cache      │
   │                        ├──────────────────────────────▶│
   │                        │   one statement, bound params │
   │                        │◀──────────────────────────────┤
   │◀───────────────────────┤ { beers: [...], totalCount }  │
```

The frontend does not build request strings by hand. It calls a typed client whose
types come from the backend's own route definitions, so a mismatch fails the build
rather than the request. [ARCHITECTURE.md](ARCHITECTURE.md#2-the-http-surface)
explains how.

---

## Configuration

Three `.env` files, none of them in git. `make env` creates them from the
`.env.example` files next to them.

| File               | Holds                                                    |
| ------------------ | -------------------------------------------------------- |
| `.env`             | database name, user, password — read by compose           |
| `backend/.env`     | `DATABASE_URL`, `CORS_ORIGINS`, `PORT`, `CACHE_TTL_SECONDS` |
| `frontend/.env`    | `VITE_APP_BACKEND_URL`                                    |

Under compose the backend's values are supplied by `compose.yaml`; the file only
needs to exist. The values in `backend/.env.example` are for running the backend
directly on the host against the database compose publishes on **5433**.

Both required values now fail loudly rather than quietly:

- The backend **exits at startup** naming `DATABASE_URL` if it is unset, instead of
  starting and failing on every request.
- The frontend **build fails** if `VITE_APP_BACKEND_URL` is unset, instead of
  emitting a bundle where every call is `fetch(undefined)`.

---

## Every command

Everything goes through the Makefile, which runs the tools inside containers.

### Running

| Command                | Does                                                     |
| ---------------------- | -------------------------------------------------------- |
| `make init`            | first-time setup: env files, dependencies, build, start   |
| `make up` / `down`     | start / stop the dev stack                                |
| `make up-build`        | rebuild images, then start                                |
| `make restart-backend` | reload backend code after an edit (see [hot reload](#hot-reload)) |
| `make dev-backend`     | database in podman, backend on the host with real hot reload |
| `make logs`            | follow all logs (`logs-backend`, `logs-db` for one)       |
| `make ps`              | service status                                            |
| `make psql`            | a psql shell on the running database                      |

### Data

| Command      | Does                                                    |
| ------------ | ------------------------------------------------------- |
| `make seed`  | regenerate `backend/db/02-seed.sql` from the CSVs        |
| `make reset` | destroy the database volume and start fresh              |

### Checks

| Command              | Does                                              |
| -------------------- | ------------------------------------------------- |
| `make check`         | lint, format, type check, both test suites        |
| `make test`          | both unit suites                                  |
| `make test-backend`  | 30 route-contract tests against a throwaway database |
| `make test-frontend` | 85 render, snapshot and accessibility tests       |
| `make test-e2e`      | Playwright against a disposable stack             |
| `make lint`          | both packages                                     |
| `make format`        | write Prettier formatting                         |
| `make typecheck`     | both packages                                     |

### Production shape

| Command          | Does                                        |
| ---------------- | ------------------------------------------- |
| `make prod-up`   | two-container production stack on **:8080** |
| `make prod-down` | stop it                                     |
| `make build`     | build the production image                  |

### Cleanup

| Command      | Does                                                |
| ------------ | --------------------------------------------------- |
| `make clean` | stop every stack and remove their volumes            |
| `make nuke`  | clean, plus locally built images and `node_modules`  |

---

## Using it

### Accounts

Enter a username. That is the whole flow — no password, no email, no verification.
The API creates the user if the name is new and returns the existing one if not, so
signing in and signing up are the same request. The browser keeps the returned id in
`localStorage` and sends it as `X-User-Id`.

**This is not authentication.** It identifies you to the catalogue; it does not
protect anything.

### Finding a beer

The catalogue lists 10 at a time and loads more as you scroll. You can:

- **search** by name (case-insensitive, matches anywhere in the name),
- **filter** by ABV (0–13%), IBU (0–138) and style,
- **sort** by most popular, least popular, A–Z or Z–A.

Filters apply when you press the button, not as you type.

The style panel names 15 styles and offers **Other**, which covers everything else
in the catalogue. That list is computed from the data rather than hardcoded, so a
style can never become unreachable.

### Voting and commenting

One vote per person per beer; voting again replaces it, and clicking the same arrow
twice clears it. Comments are 1–200 characters and you can delete your own.

---

## Tech stack, and why

### Frontend

| | |
| ---------------- | ---------------------------------------------------------- |
| React 19 + Vite 8 | SPA, four routes                                           |
| TypeScript 6      | strict                                                     |
| Ant Design 5      | components                                                 |
| MUI 9             | **one component** — the ABV/IBU sliders. antd's `Slider` failed the accessibility audit. Do not delete it; see [`docs/accessibility.md`](docs/accessibility.md#material-ui-components). |
| `hono/client`     | the typed API caller — no codegen, no client library on the wire |
| CSS Modules       | one per component; colours from the antd theme tokens in `main.tsx` |
| Vitest 5 + jest-axe | 85 tests, accessibility assertions included              |

### Backend

| | |
| ---------------- | ------------------------------------------------------------ |
| Bun 1.4          | runtime, package manager and test runner. Runs TypeScript directly, so there is no build step and no transpiler dependency |
| Hono 4           | routing; exports its own types to the frontend                |
| Zod 4            | request validation at the trust boundary                      |
| `Bun.sql`        | PostgreSQL client. Tagged templates bind parameters, so the short form is the safe one |
| PostgreSQL 18    | the only database, in every environment                       |

No ORM: the catalogue query needs a window function and a correlated subquery, both
awkward through one. No GraphQL: see
[ARCHITECTURE § Decisions](ARCHITECTURE.md#13-decisions).

**41 direct dependencies**, down from 55 — and 14 of them are runtime, down from 24.
Dependency count is a graded requirement; see
[`docs/sustainability.md`](docs/sustainability.md).

---

## The data

Two CSVs in `backend/build/`, from a public craft-beer dataset:

| File            | Rows  | Columns                                              |
| --------------- | ----- | ---------------------------------------------------- |
| `beers.csv`     | 2,410 | number, abv, ibu, id, name, style, brewery_id, ounces |
| `breweries.csv` | 558   | id, name, city, state                                 |

**100 distinct styles**, of which one is the empty string — five beers have no style
recorded. **62 beers have no ABV** and **1,005 (42%) have no IBU**; both are stored
as `0`, which is how the range filters have always treated them.

`make seed` regenerates `backend/db/02-seed.sql` from these. Parse them as real CSV
if you write anything that reads them — beer names contain commas, so `awk -F,`
gives wrong answers on the name and style columns.

---

## Testing

```bash
make test-frontend   # 85 tests, seconds, no network
make test-backend    # 30 tests against a throwaway database
make test-e2e        # Playwright against a disposable local stack
```

The frontend suite is render-plus-snapshot plus `jest-axe`. It is good at catching
markup change and weak at catching wrong behaviour, so a passing snapshot proves
less than it looks like. **Accessibility failures are test failures** — when an axe
assertion fails, read it rather than reaching for `-u`.

The backend suite is new; there were no backend tests before. It covers the route
contract, the error shape, cache behaviour and four SQL-injection attempts.

`make test-e2e` starts its own stack on its own ports and destroys the volume
afterwards. It needs no VPN, touches no shared database, and cannot disturb a
running `make up`.

---

## Hot reload

Vite hot-reloads inside the container. **The backend does not** — podman bind mounts
on macOS do not deliver the filesystem events Bun's `--hot` watches for. After a
backend edit:

```bash
make restart-backend
```

Or run the backend on the host, where hot reload works (needs Bun ≥ 1.2 —
`bun upgrade`):

```bash
make dev-backend
```

---

## Repository layout

```
├── Makefile                  every command
├── compose.yaml              dev stack (frontend, backend, db)
├── compose.prod.yaml         production shape (app, db)
├── compose.e2e.yaml          override: own ports, own project, throwaway volume
├── Dockerfile                production image — builds both packages
├── backend/
│   ├── src/
│   │   ├── app.ts            routes + validation; exports AppType
│   │   ├── queries.ts        all SQL
│   │   ├── cache.ts          GET-only cache, router-level invalidation
│   │   ├── db.ts             the one Bun.sql handle
│   │   ├── env.ts            required config, validated at startup
│   │   └── errors.ts         the single error shape
│   ├── db/                   01-schema.sql, 02-seed.sql → initdb
│   ├── build/                CSVs + generate-seed.ts
│   └── tests/                route contract tests
├── frontend/
│   ├── src/api/client.ts     the typed caller — every request goes through here
│   ├── src/components/       one directory per component
│   ├── src/context/          FilterContext
│   ├── src/pages/            App, Beer, LogIn, Fallback
│   └── tests/                Playwright
├── docs/                     accessibility, sustainability, contribution, requirements
└── openspec/changes/modernize-stack/   the spec this stack was built from
```

---

## Known problems

Documented on purpose. Fix one only when asked, and update this section when you do.

- **There is no authentication.** `X-User-Id` is a client-supplied UUID. Anyone can
  send anyone else's id and vote, comment or delete as them. This is the one that
  matters, and it is why the API must not be exposed on an untrusted network.
- **No rate limiting.** Any client can write as fast as it likes.
- **The cache purges wholesale on any write.** One vote empties it. Fine at 2,410
  rows; measure before adding tag-based invalidation.
- **The bundle is a single 1,019 kB chunk** (320 kB gzipped). No code splitting.
- **Backend hot reload does not work in-container on macOS.** See above.
- **Ten React Compiler lint rules are switched off** because they flag pre-existing
  patterns in the data-fetching layer. See
  [ARCHITECTURE § Decisions](ARCHITECTURE.md#13-decisions).
- **Five beers have no style** and are reachable only through the "Other" filter.
- **An "unreacted" vote still occupies a row** rather than being deleted. It counts
  as 0 everywhere.

### Fixed by this stack

Recorded because the older documentation described them, and they are gone:

- **SQL injection.** Every value is bound now. Four tests assert it.
- **The cache storing write responses.** Only `GET` is cacheable.
- **Cache invalidation depending on each resolver remembering to call it.** The
  router does it.
- **`/login` versus `/project2/login`.** One base path everywhere.
- **The `backend` compose service having no `env_file`.** Every service has one.
- **The tracked `database.db`.** Data lives in a volume; `git status` stays clean.
- **The dead `start-backend.sh` and `wait-for-database.sh`.** Deleted; ordering is a
  health check.
- **The two style lists drifting apart.** "Other" is computed.

---

## Documentation

| | |
| ------------------------------------------------ | ---------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)                | how it works, and why              |
| [CLAUDE.md](CLAUDE.md)                            | conventions and the sharp edges    |
| [backend/README.md](backend/README.md)            | the API in detail                  |
| [frontend/README.md](frontend/README.md)          | components and state               |
| [docs/accessibility.md](docs/accessibility.md)    | the audit, and why MUI is here     |
| [docs/sustainability.md](docs/sustainability.md)  | the graded sustainability argument |
| [docs/contribution.md](docs/contribution.md)      | commits, branches, review          |
| [docs/requirements.md](docs/requirements.md)      | the original coursework brief      |
| `openspec/changes/modernize-stack/`               | the spec, design and tasks for this stack |

---

## Vocabulary

| Term      | Means                                                          |
| --------- | -------------------------------------------------------------- |
| **ABV**   | alcohol by volume, as a percentage. Stored as a fraction        |
| **IBU**   | International Bitterness Units, 0–138 here                      |
| **Style** | the beer's category, e.g. "American IPA". 100 distinct values   |
| **Ounces**| container size                                                  |
| **Vote sum** | upvotes minus downvotes                                      |

---

## Contributing

[Conventional Commits](docs/contribution.md) — `feat:`, `fix:`, `docs:`, lowercase,
imperative, no trailing period, issue number in the footer.

```
feat: add pagination component

#1
```

Before opening a pull request:

```bash
make check
```

That is exactly what [CI](.github/workflows/ci.yml) runs.
