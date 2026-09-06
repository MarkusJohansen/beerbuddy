import { Hono, type ValidationTargets } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { zValidator } from "@hono/zod-validator";
import { z, type ZodType } from "zod";

import { env } from "./env.ts";
import { ApiError, notFound, type ErrorBody } from "./errors.ts";
import { cacheGet, invalidateOnWrite } from "./cache.ts";
import * as db from "./queries.ts";

/**
 * The caller's id, taken from the X-User-Id header.
 *
 * This is an identity claim, not authentication. The value is a UUID the browser
 * generated and stored in localStorage, and any client can send any value. It
 * determines which votes a response reflects and which comments a caller may
 * delete; it proves nothing. Treat this API as unsafe on an untrusted network.
 */
type Vars = { Variables: { userId: string | null } };

/** Rejects a write that arrived without an identity. */
const requireUser = (userId: string | null): string => {
  if (!userId)
    throw new ApiError(400, "identity_required", "X-User-Id required");
  return userId;
};

/**
 * A validator that reports failures in the API's own error shape.
 *
 * zValidator's default rejection is a serialised ZodError, which is a second error
 * format leaking out of one endpoint family. This names the offending fields and
 * says nothing about the schema internals.
 */
const validate = <Target extends keyof ValidationTargets, T extends ZodType>(
  target: Target,
  schema: T
) =>
  zValidator(target, schema, (result, c) => {
    if (result.success) return;
    const fields = [
      ...new Set(
        result.error.issues.map((i) => i.path.join(".")).filter(Boolean)
      ),
    ];
    const body: ErrorBody = {
      error: {
        message: fields.length
          ? `Invalid or missing: ${fields.join(", ")}`
          : "Invalid request",
        code: "invalid_request",
      },
    };
    return c.json(body, 400);
  });

/** Repeated query params arrive as a scalar when there is exactly one. */
const stringList = z.preprocess(
  (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.string().min(1)).max(200)
);

const catalogueQuery = z.object({
  // Bounded so a caller cannot ask for the whole catalogue in one response.
  size: z.coerce.number().int().min(1).max(100).default(10),
  start: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["top", "low", "atoz", "ztoa"]).default("top"),
  search: z.string().max(200).default(""),
  minAbv: z.coerce.number().min(0).max(100).default(0),
  maxAbv: z.coerce.number().min(0).max(100).default(13),
  minIbu: z.coerce.number().min(0).max(1000).default(0),
  maxIbu: z.coerce.number().min(0).max(1000).default(138),
  styles: stringList,
});

const paginationQuery = z.object({
  size: z.coerce.number().int().min(1).max(100).default(10),
  start: z.coerce.number().int().min(0).default(0),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });
const userIdParam = z.object({ id: z.string().min(1).max(255) });

const usernameBody = z.object({ username: z.string().min(1).max(255).trim() });
const sessionBody = usernameBody.extend({ uuid: z.string().min(1).max(255) });
const reactionBody = z.object({
  action: z.enum(["upvote", "downvote", "unreact"]),
});
const commentBody = z.object({ comment: z.string().min(1).max(2000).trim() });

/**
 * The API routes.
 *
 * Chained rather than registered separately: Hono infers the client type from this
 * expression, and the frontend's typed caller is built from it. Breaking the chain
 * silently drops routes from `AppType` and the frontend stops type-checking them.
 */
const api = new Hono<Vars>()
  .use("*", invalidateOnWrite)
  .use("*", async (c, next) => {
    c.set("userId", c.req.header("X-User-Id") ?? null);
    await next();
  })

  .get("/beers", validate("query", catalogueQuery), cacheGet, async (c) => {
    const q = c.req.valid("query");
    const rows = await db.listBeers({ ...q, userId: c.get("userId") });
    return c.json({
      beers: rows.map(({ beer_count: _drop, ...beer }) => beer),
      totalCount: rows[0]?.beer_count ?? 0,
    });
  })

  .get("/beers/:id", validate("param", idParam), cacheGet, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await db.getBeer(id, c.get("userId")));
  })

  .get(
    "/beers/:id/comments",
    validate("param", idParam),
    validate("query", paginationQuery),
    cacheGet,
    async (c) => {
      const { id } = c.req.valid("param");
      const { size, start } = c.req.valid("query");
      return c.json({ comments: await db.listComments(id, size, start) });
    }
  )

  .get("/styles", cacheGet, async (c) =>
    c.json({ styles: await db.listStyles() })
  )

  .get("/session", async (c) => {
    const userId = c.get("userId");
    if (!userId) throw notFound("user");
    return c.json(await db.getUser(userId));
  })

  .post("/session", validate("json", sessionBody), async (c) => {
    const { username, uuid } = c.req.valid("json");
    return c.json(await db.resolveUser(username, uuid));
  })

  .patch(
    "/users/:id",
    validate("param", userIdParam),
    validate("json", usernameBody),
    async (c) => {
      await db.renameUser(
        c.req.valid("param").id,
        c.req.valid("json").username
      );
      return c.json({ ok: true });
    }
  )

  .delete("/users/:id", validate("param", userIdParam), async (c) => {
    await db.deleteUser(c.req.valid("param").id);
    return c.json({ ok: true });
  })

  .put(
    "/beers/:id/reaction",
    validate("param", idParam),
    validate("json", reactionBody),
    async (c) => {
      const userId = requireUser(c.get("userId"));
      await db.setReaction(
        userId,
        c.req.valid("param").id,
        c.req.valid("json").action
      );
      return c.json({ ok: true });
    }
  )

  .post(
    "/beers/:id/comments",
    validate("param", idParam),
    validate("json", commentBody),
    async (c) => {
      const userId = requireUser(c.get("userId"));
      const id = await db.addComment(
        userId,
        c.req.valid("param").id,
        c.req.valid("json").comment
      );
      return c.json({ id }, 201);
    }
  )

  .delete("/comments/:id", validate("param", idParam), async (c) => {
    const userId = requireUser(c.get("userId"));
    await db.deleteComment(userId, c.req.valid("param").id);
    return c.json({ ok: true });
  });

export const app = new Hono()
  .use(
    "/api/*",
    cors({
      origin: env.corsOrigins,
      allowHeaders: ["Content-Type", "X-User-Id"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    })
  )
  .route("/api", api);

app.onError((err, c) => {
  if (err instanceof ApiError) {
    const body: ErrorBody = {
      error: { message: err.message, code: err.code },
    };
    return c.json(body, err.status);
  }
  // Anything else is a bug or an outage. Log it in full, tell the caller nothing:
  // driver text, SQL and stack traces must not reach a response body.
  console.error(err);
  const body: ErrorBody = {
    error: { message: "Internal server error", code: "internal" },
  };
  return c.json(body, 500);
});

app.notFound((c) => {
  const body: ErrorBody = {
    error: { message: "Not found", code: "not_found" },
  };
  return c.json(body, 404);
});

/**
 * Serves the built frontend in the production image, where STATIC_DIR is set.
 * Unknown paths fall back to index.html so client-side routes resolve on a direct
 * hit, which is what gives the SPA one base path in every environment.
 */
if (env.staticDir) {
  const root = env.staticDir;
  app.use("/*", serveStatic({ root }));
  app.get("*", serveStatic({ path: "index.html", root }));
}

/** The type the frontend's typed client is built from. */
export type AppType = typeof api;
