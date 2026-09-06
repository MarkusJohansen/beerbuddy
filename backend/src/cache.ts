import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { env } from "./env.ts";

type Entry = { body: string; expiresAt: number };

const store = new Map<string, Entry>();

/**
 * Cache key: path, query and caller.
 *
 * The caller is part of the key rather than a value that happens to sit inside a
 * hashed request body. That is what stops one user's `reaction` values being
 * served to another, and it no longer depends on how the frontend builds its
 * requests.
 */
const keyFor = (path: string, query: string, userId: string): string =>
  `${path}?${query} ${userId}`;

/**
 * Caches GET responses.
 *
 * Applied per route rather than to everything, and it refuses any other method
 * outright, so a write response cannot be stored however this is mounted. The old
 * middleware hashed the whole request body and cached every response including
 * writes, which meant a repeated comment could be answered from cache and never
 * reach the database.
 */
// Annotated as MiddlewareHandler rather than inferred: this returns a text body on
// a cache hit, and Hono folds a middleware's return type into every route it is
// mounted on. Left inferred, each cached route's response type gains a `string`
// variant and the frontend's typed client can no longer see the JSON shape.
export const cacheGet: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== "GET") return next();

  const url = new URL(c.req.url);
  const key = keyFor(
    url.pathname,
    url.searchParams.toString(),
    c.req.header("X-User-Id") ?? ""
  );

  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return c.body(hit.body, 200, {
      "Content-Type": "application/json",
      "X-Cache": "HIT",
    });
  }
  store.delete(key);

  await next();

  if (c.res.status === 200) {
    const body = await c.res.clone().text();
    store.set(key, {
      body,
      expiresAt: Date.now() + env.cacheTtlSeconds * 1000,
    });
  }
};

/**
 * Drops the cache after any successful write.
 *
 * Mounted once on the API router, so it covers every mutating route that exists
 * or is added later. Nothing has to be remembered in a handler, which is what made
 * the old `myCache.flushAll()` convention the easiest silent bug here: a write
 * that forgot it left stale reads for 24 hours.
 *
 * ponytail: purges everything rather than tracking per-entity tags. Tags would
 * need each route to declare them, reintroducing the thing a handler can forget,
 * and the catalogue is 2410 rows. Move to tags only if hit rate is measured and
 * found wanting.
 */
export const invalidateOnWrite = createMiddleware(async (c, next) => {
  await next();
  if (c.req.method !== "GET" && c.res.status < 400) store.clear();
});

/** Empties the cache. For tests. */
export const clearCache = () => store.clear();
