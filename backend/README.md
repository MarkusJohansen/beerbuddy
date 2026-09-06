# BeerBuddy backend

Express + GraphQL + Sequelize, on `:3000`. One endpoint, nine resolvers, five tables, and
a database that is either a SQLite file or a MySQL server depending on one environment
variable.

For the design — the request path, the caching layer, the data model and the full field
reference — see [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

| | |
| --- | --- |
| [Run it](#run-it) | SQLite, in three commands |
| [Configuration](#configuration) | every variable `db.ts` reads |
| [The API](#the-api) | the nine fields, and how to explore them |
| [Running against MySQL](#running-against-mysql) | the long way, and the container way |
| [Resetting and reseeding](#resetting-and-reseeding) | when the database is in a bad state |
| [Regenerating the seed file](#regenerating-the-seed-file) | if the dataset changes |
| [Scripts](#scripts) | the full `package.json` table |
| [Before you commit](#before-you-commit) | the CI gates |

---

## Run it

SQLite is the default and needs no setup: `database.db` ships seeded, in the repository.

```bash
cd backend
cp .env.example .env    # DATABASE=sqlite3
npm install
npm run dev
```

`App listening at port 3000`. Open <http://localhost:3000/graphql> for GraphiQL.

`npm run dev` is `nodemon` watching `**/*.ts` and re-executing through `tsx`. There is no
compile step — the TypeScript runs directly.

---

## Configuration

`db.ts` calls `dotenv`'s `config()` and then makes one decision:

```ts
process.env.DATABASE === "sqlite3"  ?  open ./database.db  :  connect to MySQL
```

**That comparison is exact, and the fallback is MySQL.** A missing `.env`, a typo, or
`DATABASE=sqlite` all send you down the MySQL branch, where the connection fails against
whatever is (or is not) listening on `localhost:3306`. If the backend starts and every
query errors, check this first.

| Variable | Meaning | Default in code |
| --- | --- | --- |
| `DATABASE` | `sqlite3` → the file database. Anything else, including unset → MySQL. | none |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `user` |
| `DB_PASS` | MySQL password | `""` |
| `DB_NAME` | MySQL database | `beers` |

The port `3000` is hardcoded in `server.ts`. CORS is `origin: "*"`.

---

## The API

One endpoint, `POST /graphql`. Every operation — including the writes — is a field on
`Query`; there is no `type Mutation`. Full argument and return-shape reference is in
[`ARCHITECTURE.md § 2`](../ARCHITECTURE.md#2-the-graphql-surface).

| | Fields |
| --- | --- |
| Read | `beers`, `beer`, `comments` |
| Write | `loginOrSignUp`, `login`, `signUp`, `updateUser`, `deleteUser`, `react`, `comment`, `deleteComment` |

**GraphiQL is enabled** (`graphiql: true` in `server.ts`) and is the fastest way to see
what a resolver returns — which matters here, because every field is declared `scalar Any`
and the schema tells you nothing about the response shape.

```graphql
{ beers(size: 5 start: 0 userId: "any-string" sort: "top") }
```

Two things to know before you rely on the output:

- **`beer` returns a one-element array**, not an object. Every caller writes
  `data.data.beer[0]`.
- **A failed query returns the string `"Error in query"` where an array was expected**,
  rather than raising a GraphQL error. `sqlQuery()` catches and stringifies. Some
  resolvers check for it and throw; the read resolvers do not.

> **Do not expose this server to an untrusted network.** Every resolver builds its SQL by
> string interpolation, with no bind parameters anywhere — see
> [`ARCHITECTURE.md § 13`](../ARCHITECTURE.md#13-known-constraints). It is safe as local
> coursework and unsafe as anything else.

---

## Running against MySQL

The deployed instance uses MySQL; SQLite is the local default. You need MySQL only if you
are reproducing production behaviour or working on dialect-specific SQL.

### With Docker Compose (from the repository root)

```bash
cp .env.example .env         # ROOT_PASS, DB_NAME
docker compose up --build
```

MariaDB 10.4 comes up with `backend/database-seed.sql` mounted into
`/docker-entrypoint-initdb.d/`, so it seeds itself on first boot.

> **Known issue:** the `backend` service in `compose.yaml` has no `env_file`. `DATABASE`
> is therefore unset inside the container, `db.ts` takes the MySQL branch, and `DB_HOST`
> falls back to `localhost` — which is the backend container itself, not `mysqldb`. Add
> this to the `backend` service to make it work:
>
> ```yaml
>     env_file:
>       - ./backend/.env      # containing DB_HOST=mysqldb
> ```

### Installing MySQL directly

```bash
brew install mysql          # macOS
sudo apt-get install mysql-server   # debian/ubuntu
# windows: https://dev.mysql.com/downloads/installer/
```

Start it (`brew services start mysql`, `sudo service mysql start`, or `mysqld start`),
then create the credentials the defaults expect:

```sql
-- in `sudo mysql` (or `sudo mysql -u root -p`)
CREATE USER 'user'@'localhost' IDENTIFIED BY 'Password12345678*';
GRANT ALL PRIVILEGES ON *.* TO 'user'@'localhost';
FLUSH PRIVILEGES;
```

Then seed the schema and data — `database-seed.sql` begins with `DROP DATABASE IF EXISTS
beers; CREATE DATABASE beers; USE beers;`, so it is self-contained:

```sql
source ./database-seed.sql;
exit;
```

Point `backend/.env` at it (`DATABASE=mysql`, plus the credentials above) and
`npm run dev`.

*If `CREATE USER` fails because the user exists, use `ALTER USER` instead. If the grant
still will not let you connect, fall back to the `root` account and set `DB_USER=root`.*

---

## Resetting and reseeding

**SQLite.** `database.db` is committed, so a reset is either a checkout or a rebuild:

```bash
# discard local votes and comments, restore the committed database
git checkout -- database.db

# or rebuild from the seed file
rm database.db
sqlite3 database.db < database-seed.sql
```

The rebuild needs two edits to `database-seed.sql` first, because the file is written for
MySQL: comment out the leading `DROP DATABASE` / `CREATE DATABASE` / `USE` block, and swap
`AUTO_INCREMENT` for `AUTOINCREMENT` in the two `PRIMARY KEY` columns. Both alternatives
are already present in `build/tables.sql` as comments.

That `database.db` is tracked at all is a wart — it conflicts on merge and carries
whatever data the last committer had. It is also why the quickstart has no seeding step.

**MySQL.** `source ./database-seed.sql;` in the console. The file drops and recreates the
database, so this is a full reset.

---

## Regenerating the seed file

Only needed if `build/beers.csv` or `build/breweries.csv` changes.

```bash
npm run build:seedfile
```

`build/createSeedFile.js` truncates `database-seed.sql`, writes `build/tables.sql`, then
streams both CSVs into two multi-row `INSERT` statements, doubling `'` to escape it.

Two things to check in the output:

- **Block order is not deterministic.** The two CSV streams finish independently, so the
  `beers` block can land before `breweries` — which `beers.brewery_id` references. Neither
  MySQL nor SQLite rejects it by default, but if a load ever fails on a foreign key, this
  is why.
- **Missing measurements become `0`, not `NULL`** (`row.abv ? row.abv : 0`). That is where
  the 1,005 fabricated IBU zeroes and 62 fabricated ABV zeroes come from — see
  [README § The data](../README.md#the-data).

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | `nodemon` + `tsx`, restarting on any `.ts` change |
| `npm start` | The server once, through `tsx`, no watcher |
| `npm run build` | `tsc` → `dist/`. Nothing in the repository consumes the output |
| `npm run build:seedfile` | Regenerate `database-seed.sql` from the CSVs |
| `npm run lint` | ESLint, `--max-warnings 0` |
| `npm run prettier:check` | Formatting check — a CI gate |
| `npm run prettier:write` | Apply formatting |

**`start-backend.sh` and `wait-for-database.sh` are dead.** Nothing invokes either. The
first installs nvm and runs `dist/server.js`, and its final line is a stray markdown code
fence that makes it a syntax error. The second polls *Postgres*, left over from the
containerised design that was abandoned when the VM turned out not to run Docker.

---

## Before you commit

```bash
npm run lint && npm run prettier:check
```

Both run in CI on every merge request. There are no backend tests — the resolvers are
exercised only through the frontend's Playwright suite, which is a real gap and the
easiest one to close ([`ARCHITECTURE.md § 15`](../ARCHITECTURE.md#15-where-a-change-attaches)).
