# BeerBuddy frontend

React 18 + TypeScript + Vite, on `:5173`. Four routes, one context, no GraphQL client —
every request is a hand-built template string passed to `fetch`.

For the design — routing, state, the fetch triggers, the responsive strategy — see
[`../ARCHITECTURE.md § 8`](../ARCHITECTURE.md#8-frontend-structure).

| | |
| --- | --- |
| [Run it](#run-it) | two commands, plus the one file people forget |
| [Configuration](#configuration) | `VITE_APP_BACKEND_URL`, and what happens without it |
| [Structure](#structure) | where things live |
| [Testing](#testing) | the unit suite, the e2e suite, and how they differ |
| [Coverage](#coverage) | |
| [Scripts](#scripts) | the full `package.json` table |
| [Before you commit](#before-you-commit) | the CI gates |

---

## Run it

```bash
cd frontend
cp .env.example .env    # ← do not skip this
npm install
npm run dev
```

The dev server listens on **`http://localhost:5173`** with `host: true`, so it is also
reachable from other devices on your network.

You need a backend running — [`../backend/README.md`](../backend/README.md) — or a
`VITE_APP_BACKEND_URL` pointed at the deployed one.

---

## Configuration

One variable, and the application does not work without it.

| Variable | Meaning | Local value |
| --- | --- | --- |
| `VITE_APP_BACKEND_URL` | The full GraphQL endpoint URL, interpolated into every `fetch` in the app | `http://localhost:3000/graphql` |

**`.env` is gitignored and is not created for you.** Without it,
`import.meta.env.VITE_APP_BACKEND_URL` is `undefined`, every call becomes
`fetch(undefined)`, and the interface fails with network errors that say nothing about the
cause. Copy `.env.example` first. Vite only exposes `VITE_`-prefixed names to the bundle,
and it reads them at **build** time — restart the dev server after changing the file.

To develop against the deployed backend instead of a local one, set
`VITE_APP_BACKEND_URL=http://it2810-15.idi.ntnu.no:3000/graphql`. That needs the NTNU
network or VPN, and it writes to the shared production database.

---

## Structure

```
src/
  main.tsx          routes + the Ant Design dark theme tokens, configured once
  pages/            App (catalogue) · Beer (detail) · LogIn · FallbackPage (404)
  components/       one directory each: Component.tsx, .module.css, .test.tsx, __snapshots__/
  context/          FilterContext — search, IBU, ABV, styles, sorting. The only shared state
  utils/            useFetchMoreBeers · useFetchBeer · useWindowDimensions · protectRoute
  types/            Beer, SortingItem — partially adopted; several components redeclare these
tests/              the Playwright suite
public/             SVG icons only, no raster images
```

Styling is CSS Modules per component, plus `ant-design-overrides.css` for the handful of
library internals the theme tokens cannot reach. Colours come from the `ConfigProvider` in
`main.tsx`, so components rarely set them.

**Responsiveness is done in JavaScript, not CSS.** `useWindowDimensions()` returns live
dimensions and components branch on them — different component trees at `768` and `1000`
pixels, not different styles. Consequences are in
[`ARCHITECTURE.md § 8`](../ARCHITECTURE.md#8-frontend-structure).

---

## Testing

Two suites with very different properties. Know which one you are running.

| | `npm run test:vitest` | `npm run test:e2e` |
| --- | --- | --- |
| What | 84 unit tests, 17 files | 7 journeys × chromium/firefox/webkit |
| Needs a backend | no | **the deployed one** |
| Needs the NTNU VPN | no | **yes** |
| Runtime | seconds | ~1.5 min |
| Isolated | yes | **no — writes to the production database** |
| Run it | constantly | deliberately |

### Unit tests

```bash
npm run test:vitest
```

Vitest + jsdom + `@testing-library/react`. Render-plus-snapshot, with `vitest-axe`
assertions layered in — **an accessibility regression fails the test suite**, which is how
the accessibility work in [`../docs/accessibility.md`](../docs/accessibility.md) stays
enforced rather than aspirational.

Snapshots make this suite good at catching unintended markup changes and weak at catching
wrong behaviour: a component that consistently renders the wrong data keeps passing. When
a snapshot fails, read the diff before running `-u`.

This is the suite CI runs, and the only one worth running on every change.

### End-to-end tests

```bash
npx playwright install     # once
npm run test:e2e
```

Covers login, the beer page, voting, commenting, search, sorting and style filtering, in
three browsers.

**These tests drive `http://it2810-15.idi.ntnu.no/project2` — the deployed site — and
write to the shared production database.** The URLs are hardcoded in
`tests/beerbuddy.spec.ts`; there is no `baseURL` and no local `webServer`. That single
fact explains everything below:

- **VPN required.** No local setup substitutes.
- **Two people running it at once will interfere.** Same database, same test usernames.
- **Aborting a run leaks data.** Cleanup (`deleteUser`) is the last step, so a cancelled
  run leaves test users and comments behind.
- **A slow VM looks exactly like a broken assertion.** `retries: 2` absorbs most of it; if
  a run fails once, re-running it is a reasonable first response rather than a cover-up.

Variants:

```bash
npm run test:headed     # chromium only, visible browser, 500 ms per step — for debugging
npm run test:parallel   # 2 workers. Faster, and not recommended: the VM struggles
npm run test            # test:vitest, then test:e2e
```

If Playwright itself misbehaves, confirm the browsers are installed
(`npx playwright install`) before looking further —
[docs](https://playwright.dev/docs/intro).

![Playwright terminal output listing the login, beer-page, vote, comment, search, sorting and style-filtering tests passing across chromium, firefox and webkit](tests/testResults.png)

---

## Coverage

```bash
npm run coverage
```

`@vitest/coverage-v8`, printed to the terminal and written as HTML to `coverage/`. Open
`coverage/index.html` for the browsable report. `coverage/` is gitignored.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on `:5173`, LAN-reachable |
| `npm run build` | `tsc && vite build` → `dist/`. Type errors fail the build |
| `npm run preview` | Serve the built `dist/` — the closest local match to production |
| `npm run test` | `test:vitest` then `test:e2e` (needs the VPN) |
| `npm run test:vitest` | The 84 unit tests |
| `npm run test:e2e` | The 7 journeys in three browsers |
| `npm run test:headed` | The same, chromium only, visible, slowed down |
| `npm run test:parallel` | Two workers — not recommended |
| `npm run coverage` | Coverage to terminal and `coverage/` |
| `npm run lint` | ESLint, `--max-warnings 0` |
| `npm run prettier` | Apply formatting |
| `npm run prettier:check` | Formatting check — a CI gate |

---

## Before you commit

The same four gates CI runs on every merge request:

```bash
npm run lint && npm run prettier:check && npm run test:vitest && npm run build
```

CI never runs the e2e suite.
