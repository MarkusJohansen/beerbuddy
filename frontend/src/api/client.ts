import { hc } from "hono/client";

import type { AppType } from "../../../backend/src/app.ts";

/**
 * The typed API caller.
 *
 * `AppType` is the backend's own route chain, imported as a type and erased at
 * build time — nothing from the backend ships in the bundle. Request shapes and
 * response bodies are checked by `tsc`, with no code generation step and no API
 * client library on the wire. Rename a field on the server and `bun run build`
 * fails here.
 *
 * The identity header replaces the userId that used to be interpolated into every
 * GraphQL query string. It is not authentication: the value is a UUID this browser
 * generated, and any client can send any value.
 */
const client = hc<AppType>(import.meta.env.VITE_APP_BACKEND_URL, {
  headers: (): Record<string, string> => {
    const id = localStorage.getItem("userIdBeerBuddy");
    return id ? { "X-User-Id": id } : {};
  },
});

/** The shape every failing response uses. */
type ErrorBody = { error: { message: string; code: string } };

/**
 * Builds an Error from a failed response.
 *
 * The old API answered every request with HTTP 200 and signalled failure by
 * putting an error string in the body, so callers had to inspect values to notice
 * a problem. Status codes carry that now, and every call below narrows on
 * `res.ok` — which is also what lets TypeScript drop the error variant and type
 * the returned body as the success shape alone.
 */
const fail = async (res: {
  status: number;
  json: () => Promise<unknown>;
}): Promise<Error> => {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  return new Error(body?.error.message ?? `Request failed (${res.status})`);
};

export type Sort = "top" | "low" | "atoz" | "ztoa";
export type Reaction = "upvote" | "downvote" | "unreact";

export type CatalogueQuery = {
  size: number;
  start: number;
  sort: Sort;
  search: string;
  minAbv: number;
  maxAbv: number;
  minIbu: number;
  maxIbu: number;
  styles: string[];
};

/** The catalogue, filtered, sorted and paginated. */
export const fetchBeers = async (query: CatalogueQuery) => {
  const res = await client.beers.$get({
    query: {
      size: String(query.size),
      start: String(query.start),
      sort: query.sort,
      search: query.search,
      minAbv: String(query.minAbv),
      maxAbv: String(query.maxAbv),
      minIbu: String(query.minIbu),
      maxIbu: String(query.maxIbu),
      styles: query.styles,
    },
  });
  if (!res.ok) throw await fail(res);
  return res.json();
};

/** One beer, with this caller's own vote. */
export const fetchBeer = async (id: number) => {
  const res = await client.beers[":id"].$get({ param: { id: String(id) } });
  if (!res.ok) throw await fail(res);
  return res.json();
};

/** A beer's comments, newest first. */
export const fetchComments = async (
  beerId: number,
  size: number,
  start: number
) => {
  const res = await client.beers[":id"].comments.$get({
    param: { id: String(beerId) },
    query: { size: String(size), start: String(start) },
  });
  if (!res.ok) throw await fail(res);
  return (await res.json()).comments;
};

/**
 * Every style present in the catalogue, including the empty one.
 *
 * The empty style is returned on purpose: five beers have no style, and the
 * interface's "Other" option is the complement of the styles it names
 * individually, so the empty string must be in that complement for those beers to
 * stay selectable. It is never rendered as an option of its own.
 */
export const fetchStyles = async () => {
  const res = await client.styles.$get();
  if (!res.ok) throw await fail(res);
  return (await res.json()).styles;
};

/**
 * The user the stored id belongs to, or null when it belongs to nobody.
 *
 * Backs the route guard. Unlike the old check, which looked up a username and
 * compared ids client-side, this validates the id the browser is actually sending.
 */
export const fetchSession = async () => {
  const res = await client.session.$get();
  if (res.status === 404) return null;
  if (!res.ok) throw await fail(res);
  return res.json();
};

/** Resolves a username to a user, creating one if there is none. */
export const createSession = async (username: string, uuid: string) => {
  const res = await client.session.$post({ json: { username, uuid } });
  if (!res.ok) throw await fail(res);
  return res.json();
};

/** Renames a user. */
export const renameUser = async (id: string, username: string) => {
  const res = await client.users[":id"].$patch({
    param: { id },
    json: { username },
  });
  if (!res.ok) throw await fail(res);
};

/** Deletes a user, and by cascade their votes and comments. */
export const deleteUser = async (id: string) => {
  const res = await client.users[":id"].$delete({ param: { id } });
  if (!res.ok) throw await fail(res);
};

/** Sets this user's vote on a beer. Idempotent. */
export const setReaction = async (beerId: number, action: Reaction) => {
  const res = await client.beers[":id"].reaction.$put({
    param: { id: String(beerId) },
    json: { action },
  });
  if (!res.ok) throw await fail(res);
};

/** Adds a comment to a beer. */
export const addComment = async (beerId: number, comment: string) => {
  const res = await client.beers[":id"].comments.$post({
    param: { id: String(beerId) },
    json: { comment },
  });
  if (!res.ok) throw await fail(res);
  return res.json();
};

/** Deletes a comment this user wrote. */
export const deleteComment = async (commentId: number) => {
  const res = await client.comments[":id"].$delete({
    param: { id: String(commentId) },
  });
  if (!res.ok) throw await fail(res);
};
