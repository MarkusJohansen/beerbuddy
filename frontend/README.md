# BeerBuddy frontend

React 19 + Vite 8, TypeScript 6, Ant Design 5 (plus MUI for one component).

## Running it

From the repository root:

```bash
make up             # the whole stack; interface on :5173
make test-frontend  # 85 unit tests
make logs           # follow
```

Vite hot-reloads inside the container — `vite.config.ts` sets
`server.watch.usePolling`, because podman bind mounts on macOS do not deliver the
filesystem events the default watcher listens for.

## Talking to the API

**Every request goes through `src/api/client.ts`.** There are no `fetch` calls
anywhere else, and no request strings built by hand.

```ts
import { fetchBeers, setReaction } from "../api/client";

const page = await fetchBeers({ size: 10, start: 0, sort: "top", ... });
await setReaction(beerId, "upvote");
```

The client is typed from the backend's own route definitions:

```ts
import type { AppType } from "../../../backend/src/app.ts";
const client = hc<AppType>(import.meta.env.VITE_APP_BACKEND_URL, { ... });
```

That import is type-only and erased at build time, so nothing from the backend ends
up in the bundle. What it buys is that **a change to a backend response breaks
`bun run build` here**, naming the component that read the old field — instead of
failing at runtime as `undefined`.

Two consequences worth knowing:

- **Type-checking this package needs the backend's source and `node_modules`.** The
  Makefile and the production Dockerfile both mount the whole repository. Mounting
  only `frontend/` makes `AppType` resolve to nothing and collapses every response
  type to `unknown`.
- **`src/types/types.ts` is derived, not written.** `Beer`, `BeerListItem`,
  `Comment` and `ReactionType` come from the client's inferred return types. To
  change one, change the backend query it comes from.

Failures throw. The API signals them with status codes, so calls use `try`/`catch`
rather than inspecting return values for an error string.

### Identity

`localStorage.userIdBeerBuddy` is sent as `X-User-Id` on every request, added by the
client. It is a UUID this browser generated — it identifies you, it does not
authenticate you.

## Layout

```
src/
├── api/client.ts        the typed caller — every request
├── components/          one directory per component:
│                        Component.tsx, Component.module.css,
│                        Component.test.tsx, __snapshots__/
├── context/             FilterContext — filters, sorting, and the style list
├── pages/               App (catalogue), Beer, LogIn, FallbackPage
├── utils/
│   ├── beerStyles.ts        the 15 named styles and how "Other" expands
│   ├── useFetchBeer.tsx     one beer
│   ├── useFetchMoreBeers.tsx  the catalogue, paginated
│   ├── protectRoute.tsx     route guard
│   └── useWindowDimensions.tsx
├── types/types.ts       derived from the client
├── vitest-setup.ts      jest-axe matcher, jsdom matchMedia stub
└── vitest.d.ts          the matcher's Vitest type
tests/                   Playwright
```

## Conventions

- **One directory per component**, holding the component, its CSS Module, its test
  and its snapshots. Follow it for anything new.
- **CSS Modules per component.** Colours come from the Ant Design theme tokens in
  `main.tsx`, not from component styles. `ant-design-overrides.css` is for library
  internals the tokens cannot reach — a last resort.
- **Responsiveness is JavaScript**, via `useWindowDimensions()`, branching at 768 and
  1000 px. Match that rather than mixing in media queries. The breakpoints are magic
  numbers duplicated across files; a seventh copy is the moment to extract a
  constant.
- **State is `FilterContext` plus local `useState`.** No Redux, no query cache, no
  normalised store, for four screens.
- **JSDoc on exported functions and components.** The existing code is consistent
  about it.

## The two component libraries

Ant Design does everything except the ABV and IBU sliders, which are MUI's.

**This is deliberate and MUI must not be removed.** Ant Design's `Slider` failed the
accessibility audit under Firefox Accessibility, WAVE and aXe. See
[`docs/accessibility.md`](../docs/accessibility.md#material-ui-components) — removing
it requires demonstrating a replacement that passes the axe assertions first.

Ant Design stays on the 5 line. antd 6 supports React 19 natively but is a breaking
major; 5.29 works here because every `message` call goes through `App.useApp()`
rather than the static API React 19 breaks, so no compatibility patch is needed.

## Beer styles

The filter panel names 15 styles individually and offers **Other**. "Other" expands
to the complement — every style `GET /api/styles` reports that is not one of the 15 —
computed in `utils/beerStyles.ts`.

This used to be 15 names here and 85 in the backend, which together had to cover
exactly the 100 distinct styles in the data with nothing enforcing it; editing either
made a style unreachable in the interface. The complement cannot drift.

`""` is one of those 100 — five beers have no style — so it stays in the complement
and is never rendered as its own checkbox. `"Other"` is also a real style name in the
dataset as well as the label, so ticking it matches both.

## Tests

```bash
make test-frontend   # 85 tests
make test-e2e        # Playwright against a disposable local stack
```

Unit tests are render, snapshot and `jest-axe`. **Accessibility failures are test
failures** — all of them pass; when one does not, read the violation rather than
reaching for `-u`.

The suite is render-plus-snapshot, which is good at catching markup change and weak
at catching wrong behaviour. A passing snapshot proves less than it looks like.

Components are unit-tested against a mocked `api/client`, not a mocked `fetch` —
`vi.mock("../../api/client", ...)`.

Playwright drives a stack `make test-e2e` starts on its own ports and destroys
afterwards. It needs no VPN and touches no shared database. Running it directly needs
host Bun and `bunx playwright install`.
