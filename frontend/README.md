# BeerBuddy frontend

React 19 + Vite 8, TypeScript 6, Tailwind 4 with shadcn/ui vendored as source.

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
│   │                    Component.tsx, Component.test.tsx, __snapshots__/
│   └── ui/              vendored shadcn/ui source and the native-element
│                        wrappers — edited here, not installed
├── context/             FilterContext — filters, sorting, and the style list
├── pages/               App (catalogue), Beer, LogIn, FallbackPage
├── utils/
│   ├── beerStyles.ts        the 15 named styles and how "Other" expands
│   ├── useFetchBeer.tsx     one beer
│   ├── useFetchMoreBeers.tsx  the catalogue, paginated
│   ├── protectRoute.tsx     route guard
│   ├── breakpoints.ts       MOBILE and TABLET, the only copy
│   └── useWindowDimensions.tsx
├── styles/tokens.css    the palette, scales and Tailwind @theme — the only
│                        file allowed to hold a colour literal
├── types/types.ts       derived from the client
├── vitest-setup.ts      jest-axe matcher, jsdom matchMedia stub
└── vitest.d.ts          the matcher's Vitest type
tests/                   Playwright
```

## Conventions

- **One directory per component**, holding the component, its test and its
  snapshots. There is no CSS Module — they are gone.
- **Tailwind utilities bound to tokens.** Every value comes from
  `styles/tokens.css`, the only file allowed a colour literal;
  `no-hardcoded-colours.test.ts` enforces it. The scales are closed by a
  `--<namespace>-*: initial` reset, so `text-sm` and `p-[7px]` do not exist.
- **One accent, carrying meaning only.** Strip every accent rule and the hierarchy
  must still read from type, grid and spacing alone.
- **Responsiveness is JavaScript**, via `useWindowDimensions()` against `MOBILE` and
  `TABLET` from `utils/breakpoints.ts`. The same values are Tailwind screens in
  `tokens.css`; a `@media` condition cannot read a custom property, so that one
  duplication is deliberate.
- **State is `FilterContext` plus local `useState`.** No Redux, no query cache, no
  normalised store, for four screens.
- **JSDoc on exported functions and components.** The existing code is consistent
  about it.

## Components

There is no component library. `components/ui/` holds four shadcn/ui files vendored
as **source** — `button`, `card`, `input`, `slider` — rewritten against the tokens,
plus small wrappers over native elements: `dialog` (`<dialog>` + `showModal()`),
`select`, `checkbox`, `spinner` and `toast` (an `aria-live` region). The filter groups
are plain `<details>`.

Anything a later `shadcn add` writes there arrives in upstream's idiom — rounded,
shadowed, `bg-primary` — against tokens that do not exist here. It needs the same
rewrite the first four got.

**`radix-ui` is present for one component.** The ABV and IBU filters are two-thumb
ranges and `<input type="range">` has one thumb. MUI was carried for the same reason
before it; replacing it required demonstrating the replacement, which
`components/ui/slider.test.tsx` does — thumb independence, announced bounds,
arrow/Home/End keys and axe. Any future replacement clears the same bar.

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
make test-frontend   # 146 tests
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
