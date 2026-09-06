import type {
  fetchBeer,
  fetchBeers,
  fetchComments,
  fetchStyles,
} from "../api/client";

/**
 * Application types, derived from the API client's inferred response types
 * rather than restated by hand.
 *
 * These follow the backend's route definitions automatically: change a column in
 * a query and the shape here changes with it, so the compiler points at every
 * component that read the old field. Restating them would reintroduce exactly the
 * drift this change removed.
 */

/** One beer with its aggregates, as GET /api/beers/:id returns it. */
export type Beer = Awaited<ReturnType<typeof fetchBeer>>;

/** One row of the catalogue, as GET /api/beers returns it. */
export type BeerListItem = Awaited<
  ReturnType<typeof fetchBeers>
>["beers"][number];

/** One comment, as GET /api/beers/:id/comments returns it. */
export type Comment = Awaited<ReturnType<typeof fetchComments>>[number];

/** The styles present in the catalogue. */
export type Style = Awaited<ReturnType<typeof fetchStyles>>[number];

/** A vote a user can hold on a beer. */
export type ReactionType = Beer["user_vote"];

/** An option in the sorting dropdown. */
export type SortingItem = {
  key: string;
  label: string;
};
