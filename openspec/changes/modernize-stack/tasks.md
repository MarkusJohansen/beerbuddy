## 1. Database

- [x] 1.1 Write `backend/db/schema.sql` for PostgreSQL 18: `breweries`, `beers`, `users`, `votes`, `comments`, with a unique constraint on `users.username`, a unique constraint on `(user_id, beer_id)` in `votes` to support upsert, `vote_type` as a `CHECK`-constrained value, and `ON DELETE CASCADE` where the current schema has it. No commented-out alternatives for another engine.
- [x] 1.2 Add the indexes the catalogue query needs — `beers.style`, `beers.abv`, `beers.ibu`, `lower(beers.name)`, `votes.beer_id`, `comments.beer_id` — and record why each exists.
- [x] 1.3 Rewrite `backend/build/createSeedFile.js` as TypeScript run by Bun, parsing `beers.csv` and `breweries.csv` with a real CSV parser and emitting PostgreSQL `COPY` or multi-row `INSERT` statements. Verify the output row counts against the CSVs.
- [x] 1.4 Delete `backend/database-seed.sql` and the tracked `backend/database.db`. No `.gitignore` entry was added: nothing in the tree can produce that file any more, so the entry would guard against something that cannot happen.

## 2. Backend data layer

- [x] 2.1 Replace `backend/db.ts` with a `Bun.sql` connection module reading a single `DATABASE_URL`, failing at startup with a named-variable message when it is absent.
- [x] 2.2 Port the catalogue query to bound parameters: array parameter for the style filter, bound `LIKE` pattern for search, bound `LIMIT`/`OFFSET`, and sort direction chosen from a fixed server-side map keyed by the enumerated `sort` value.
- [x] 2.3 Preserve the total ordering — user sort, then `beer_name ASC`, then `beer_id` — and leave a comment explaining that most beers have zero votes so the tiebreak is what makes offset pagination correct.
- [x] 2.4 Port the single-beer, comments, user and reaction queries to bound parameters. Replace the read-then-insert-or-update vote logic with a single `INSERT ... ON CONFLICT (user_id, beer_id) DO UPDATE`.
- [x] 2.5 Replace the `"Error in query"` sentinel string with thrown errors, so failures cannot be mistaken for empty result sets by a `.length` check.

## 3. Backend HTTP layer

- [x] 3.1 Add Hono, Zod and `@hono/zod-validator`; remove `express`, `express-graphql`, `graphql`, `@graphql-tools/schema`, `body-parser`, `cors`, `sequelize`, `mysql2`, `sqlite3`, `node-cache`, `tsx`, `nodemon`, `dotenv`, and the `crypto` and `fs` packages that shadow stdlib modules.
- [x] 3.2 Define the ten routes from the `http-api` spec with Zod validators on path params, query and body. Bound `size` to a maximum. Export `AppType` from a single entry module.
- [x] 3.3 Implement the error shape `{"error":{"message","code"}}` and status mapping — 400 validation, 403/404 ownership and missing rows, 409 duplicate username, 500 unexpected — with driver text, SQL and stack traces excluded from responses.
- [x] 3.4 Read caller identity from `X-User-Id`, defaulting per-user fields to `unreact` when absent.
- [x] 3.5 Replace `caching.ts` with GET-only middleware keyed on path, validated query and caller id, with tag-based invalidation declared on mutating routes rather than called inside handlers.
- [x] 3.6 Restrict CORS to an origin allowlist from environment, with a development default and no wildcard.
- [x] 3.7 Serve the built frontend bundle via `hono/serve-static` with SPA fallback, active only in the production image.
- [x] 3.8 Delete `schema.ts`, `resolvers.ts`, `server.ts`, `caching.ts`, `start-backend.sh` and `wait-for-database.sh`.

## 4. Backend tests

- [x] 4.1 Add a `bun test` setup that starts a throwaway PostgreSQL container, applies schema and seed, and tears it down.
- [x] 4.2 Cover every scenario in the `http-api` spec: status codes, the error shape, validation rejections, idempotent reaction, ownership on comment deletion, and absent-identity reads.
- [x] 4.3 Cover the `data-store` injection scenarios — search, style filter, identity header, sort — asserting the literal-match outcome and that tables survive.
- [x] 4.4 Cover cache behaviour: writes never replayed, reads reflect writes, cached reads do not cross users, and a mutating route with no handler-level cache call still invalidates.
- [x] 4.5 Cover pagination totality — page the full catalogue by vote total and assert every beer appears exactly once.

## 5. Podman stack

- [x] 5.1 Rewrite `compose.yaml` for podman: `postgres:18-alpine` with a health check and a named volume, backend and frontend depending on it via `condition: service_healthy`. Give every service an explicit `env_file` — the `backend` service currently has none.
- [x] 5.2 Rewrite `backend/Dockerfile` and `frontend/Dockerfile` on pinned `oven/bun:1.4.2-*` bases, multi-stage, non-root, with dev targets that hot reload and a production target holding no dev tooling.
- [x] 5.3 Add a production compose file where the backend serves the bundle, so the deployed shape is two containers.
- [x] 5.4 Update `.env.example` files for `DATABASE_URL`, the CORS allowlist and the frontend API base; delete the `DATABASE=sqlite3` engine switch documentation.
- [x] 5.5 Verify a cold start on an empty volume serves the catalogue, and a restart on an existing volume preserves votes and comments without duplicating the catalogue.

## 6. Frontend tooling

- [x] 6.1 Replace `package-lock.json` with `bun.lock`; move all scripts to `bun run`.
- [x] 6.2 Bump Vite 4→8, React 18→19, Vitest 0.34→5, ESLint 8→10 with flat config, TypeScript 5.0→6.0.3, jsdom, Testing Library and Playwright to current. Hold antd at the 5 line.
- [x] 6.3 Replace `vitest-axe` with `jest-axe@11` via `expect.extend(toHaveNoViolations)`; remove `vitest-axe` and `@types/jest-axe`.
- [x] 6.4 Regenerate snapshots as an isolated commit containing no other change. Read the axe assertion results rather than accepting them — a failing axe assertion is a finding, not churn.
- [x] 6.5 Repoint `playwright.config.ts` from `it2810-15.idi.ntnu.no` to the local podman stack, with a `webServer` that starts it.
- [x] 6.6 Fail the frontend build when `VITE_APP_BACKEND_URL` is unset, rather than emitting a bundle that fetches `undefined`.

## 7. Frontend API client

- [x] 7.1 Add a single `src/api/client.ts` building `hc<AppType>` with the base URL and the `X-User-Id` header, replacing eight ad-hoc `fetch` calls.
- [x] 7.2 Move `useFetchMoreBeers`, `useFetchBeer`, `protectRoute`, `Voter`, `CommentItem`, `CommentBar`, `Beer` and `LogIn` onto the typed client. Delete every GraphQL template literal.
- [x] 7.3 Fetch style options from `GET /api/styles`; keep the 15 individually named styles in `Filters.tsx` and derive "other" as the complement instead of hardcoding 85 names.
- [x] 7.4 Populate `src/types/types.ts` from the client's inferred response types, retiring its `//TODO use this file more`.
- [x] 7.5 Verify no `VITE_APP_BACKEND_URL` string interpolation or `data.data.` access remains.

## 8. CI

- [x] 8.1 Replace CI with `.github/workflows/ci.yml`: lint, format, type check and test for both packages, plus a backend job with a PostgreSQL service. The remote is GitHub, so `.gitlab-ci.yml` had never run against it; it and the GitLab merge-request template were deleted.
- [x] 8.2 Confirm the documented local command set and the CI job set are the same commands.

## 9. Documentation

- [x] 9.1 Rewrite `README.md`: stack, commands, podman quick start, and a Known problems section reduced to what is still true. Retire the SQL injection entry rather than rewording it; keep the unauthenticated-identity statement prominent.
- [x] 9.2 Rewrite `ARCHITECTURE.md` for the Hono route layer, the PostgreSQL data layer, the tag-invalidated cache and the podman topology. Re-derive every dataset figure from the CSVs with a real CSV parser.
- [x] 9.3 Rewrite `backend/README.md` and `frontend/README.md`.
- [x] 9.4 Update `docs/sustainability.md` with the new dependency count and re-derived figures; update `docs/accessibility.md` for the `jest-axe` change while restating why MUI is retained.
- [x] 9.5 Rewrite `CLAUDE.md`: hard rules 1, 2, 3, 7, 8 and 9 either no longer apply or are now enforced by code. Replace the "do not helpfully fix these" list with what genuinely remains.
- [x] 9.6 Add an API reference for the routes, stating that `X-User-Id` is an unauthenticated claim. It lives in `backend/README.md` rather than a separate file, and covers eleven routes — `GET /api/session` was added during implementation to back the interface's route guard, which the old `login` query had provided.

## 10. Close-out

- [x] 10.1 Run the full gate for both packages: lint, format check, type check, unit tests, backend tests, build.
- [ ] 10.2 Run the e2e suite once against the local podman stack to confirm it passes without a VPN. **Not done.** The config, the compose override and the spec's URLs and helpers were all rewritten and type-check, but the suite was never executed — it needs Playwright browsers on the host (`bunx playwright install`). Treat it as unverified.
- [x] 10.3 Count dependencies before and after; confirm the total fell and record the figure in `docs/sustainability.md`.
- [x] 10.4 Confirm `git status` is clean after exercising the running app.


## Deviations from the plan

- **Cache invalidation is a wholesale purge, not tag-based.** `design.md` proposed
  tags. Tags would need every mutating route to declare them, which reintroduces the
  thing a handler can forget — the exact failure the change set out to remove. A
  purge mounted on the router cannot be forgotten, and the catalogue is 2410 rows.
  Marked with a `ponytail:` comment in `src/cache.ts`.
- **An eleventh route, `GET /api/session`.** The route guard used to look a user up
  by username and compare ids client-side; nothing validated the id the browser
  actually sends. The new route validates it.
- **`GET /api/styles` returns the empty style.** Five beers have no style, and the
  interface's "Other" option is a complement — so the empty string has to be in it
  for those beers to stay selectable, as they were before.
- **TypeScript 6.0.3, not 7.** `typescript-eslint@8` peer-caps at `<6.1.0` and
  type-aware linting is a CI gate.
- **Ten React Compiler lint rules left off.** `eslint-plugin-react-hooks` v7 flags
  pre-existing patterns in the data-fetching layer. Adopting them is a refactor, not
  a version bump.
- **Snapshots were already failing on `main`.** `Logo.tsx` renders `href="/"` there
  while its committed snapshot expected `/project2`, so the documented "84 passing
  tests" did not hold before this change. Regenerating repaired that rather than
  masking anything; the suite is 85 tests now, because a test that had been nested
  inside another `it()` — and therefore never ran — now does.
