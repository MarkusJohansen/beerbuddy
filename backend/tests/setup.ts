import { SQL } from "bun";

/**
 * Builds a disposable test database before any test file is imported.
 *
 * Preloaded via bunfig.toml, which matters for ordering: this rewrites
 * DATABASE_URL to point at the test database, and src/db.ts reads that variable
 * when it is first imported. Running afterwards would point the tests at the
 * development data.
 *
 * The catalogue is seeded once here; per-test isolation is a truncate of the
 * tables tests actually write to.
 */

const adminUrl =
  process.env.DATABASE_URL ??
  "postgres://beerbuddy:beerbuddy@localhost:5433/beers";

const testUrl = new URL(adminUrl);
testUrl.pathname = "/beers_test";

const admin = new SQL(adminUrl);
await admin`DROP DATABASE IF EXISTS beers_test`;
await admin`CREATE DATABASE beers_test`;
await admin.end();

const schema = await Bun.file(
  new URL("../db/01-schema.sql", import.meta.url)
).text();
const seed = await Bun.file(
  new URL("../db/02-seed.sql", import.meta.url)
).text();

// COPY … FROM stdin is a psql client construct, not a server statement. Rewriting
// the generated seed into INSERTs here keeps one seed file for both the container
// entrypoint and the tests, instead of maintaining two.
const seedStatements = seed
  .split(/^COPY /m)
  .slice(1)
  .map((block) => {
    const [header = "", ...lines] = block.split("\n");
    const match = header.match(/^(\w+) \(([^)]*)\) FROM stdin;/);
    if (!match) return "";
    const [, table, columns] = match;
    const rows = lines
      .slice(0, lines.indexOf("\\."))
      .filter(Boolean)
      .map(
        (line) =>
          "(" +
          line
            .split("\t")
            .map((v) => `'${v.replace(/\\t/g, "\t").replace(/'/g, "''")}'`)
            .join(",") +
          ")"
      );
    return rows.length
      ? `INSERT INTO ${table} (${columns}) VALUES ${rows.join(",")};`
      : "";
  })
  .filter(Boolean);

const db = new SQL(testUrl.toString());
await db.unsafe(schema);
for (const statement of seedStatements) await db.unsafe(statement);
await db.end();

process.env.DATABASE_URL = testUrl.toString();
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.CACHE_TTL_SECONDS = "300";
