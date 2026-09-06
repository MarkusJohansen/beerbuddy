# Sustainability

## Design

We have decided to make our entire site "dark mode" by default as this requires less energy to display on a screen than a bright website. The design is also mostly comprised of text and icons which are quite sustainable.

## Lazy loading

Both the list of beers on the main page as well as the comments on each beer are lazy loaded. This means that the browser only fetches and loads the beers and comments that are about to appear on the screen when scrolling. This saves a lot of energy as we avoid unnecessary calls to the server and unnecessary loading and rendering of elements that are not visible.

## Fetching

Our fetching does not fetch more data than necessary, saving a lot of bandwidth and energy. For example, when fetching a beer, we only fetch the comments for that beer, not all comments for all beers. We also only fetch the first 10 beers when loading the main page, and then fetch more when the user scrolls down.

## Database

The project runs a single PostgreSQL 18 instance, in every environment.

It previously carried two engines — SQLite locally and MySQL on the virtual machine —
which meant two dialects, two sets of behaviour to reason about, and a schema file
holding commented-out alternatives for each. Maintaining two paths costs more
developer time and more CI work than either path saves in resources, and the
differences between them were a source of defects rather than of efficiency.

One engine also lets the catalogue be read in a single statement. The list query
returns the page, each beer's vote total, the caller's own vote and the total match
count together, using a window function and an upsert that neither of the previous
engines supported the same way. Fewer round trips is less work for both machines.

The database runs as a container with a named volume, so no database file is
tracked in git and no developer needs a database installed on their machine.

## The API

The API is resource-oriented HTTP/JSON. Each route returns exactly the fields the
screen needs and nothing more, which is what keeps responses small.

This replaced a GraphQL layer that was not doing GraphQL work: every operation,
including the six that write, was declared as a query, and every response type was
`scalar Any`. There was no GraphQL client either — the frontend built query strings
by interpolation. It cost three dependencies and a hand-maintained schema to get one
endpoint, and none of the bandwidth argument for GraphQL applied, because no client
was ever selecting fields.

The replacement also removed a real waste: responses to writes used to be cached.
Only `GET` is cacheable now, so a repeated write reaches the database exactly once
instead of being answered from a stale entry.

## Delayed searching, sorting and filtering

The website will not update immediately when you start typing in the searchbar or start selecting filters or sorting methods. Instead, it will wait for the user to press a button confirming their search/choice, and then fetch the results. This saves a lot of bandwidth and energy as we avoid unnecessary calls to the server.

## User handling

Instead of relying on a third party SaaS/BaaS for user handling, we have implemented our own user handling. This way we avoid unnecessary calls to a third party server, saving bandwidth and energy.

## Images

Our icons and images are made with SVG. This means that they are very small in size and can be scaled to any size without losing quality. This is a more sustainable solution than using PNG or JPG images.

## Hosting

The project no longer targets a hosted deployment. It was previously served from a
virtual machine in Norway, which kept data close to its users; that machine is gone
and nothing replaced it.

What remains is a production image that runs the API and the built bundle from a
single container, so a deployment would be two processes rather than three. Serving
the frontend from the same origin as the API also removes a cross-origin preflight
from every request.

## Dependencies

We keep dependencies to a minimum. Every install and update costs energy, and every
package is code that has to be fetched, audited and updated.

The current count, direct dependencies only:

| | Runtime | Dev | Total |
| -------- | ------: | --: | ----: |
| Backend  | 3 | 6 | 9 |
| Frontend | 11 | 21 | 32 |
| **Total** | **14** | **27** | **41** |

That is down from **55** (24 runtime, 31 dev). The backend fell from 25 to 9.

Twenty-two backend packages were removed and six added. The removals were possible
because the runtime does more:

- **Bun runs TypeScript directly**, so `tsx` and `nodemon` are unnecessary and there
  is no build step or `dist/` output.
- **Bun reads `.env` natively**, so `dotenv` is unnecessary.
- **Bun ships a PostgreSQL client**, so `sequelize`, `mysql2` and `sqlite3` are all
  unnecessary — and Sequelize was only ever a driver here, since the catalogue query
  needs raw SQL anyway.
- **Dropping GraphQL** removed `express`, `express-graphql`, `graphql`,
  `@graphql-tools/schema`, `body-parser` and `cors`; Hono covers routing and CORS.
- **`crypto` and `fs`** were npm packages shadowing Node's own modules. Neither did
  anything.

On the frontend, `vitest-axe` was removed in favour of `jest-axe`, which was already
present and is still maintained — the accessibility assertions are unchanged and the
dependency count fell by one. `@types/uuid` and `autoprefixer` went too, the first
because `uuid` now ships its own types and the second because nothing used it.

The frontend's type-safety across the API costs no runtime dependency at all: the
types are imported from the backend's source and erased at build time, so nothing
from the backend reaches the bundle and there is no generated client to maintain.

`@emotion/react` and `@emotion/styled` are the two packages added since. They
replace nothing. MUI declares them as *optional* peer dependencies, so an install
omits them, but `@mui/styled-engine` imports them unconditionally — the ABV and IBU
sliders MUI is carried for cannot render without them. Leaving them undeclared saved
no package; it only meant a clean install produced a frontend that failed on import,
which is how CI found them.

If something genuinely needs a new package, say what it replaces and why the
argument above no longer holds.

## Caching

Our backend utilizes caching to improve efficiency and sustainability. By storing frequently accessed data in cache, we reduce the need for repeated database queries, saving CPU usage and energy. This also provides faster response times, enhancing user experience while conservely using resources.