import { describe, expect, test, beforeEach } from "bun:test";

import { app } from "../src/app.ts";
import { sql } from "../src/db.ts";
import { clearCache } from "../src/cache.ts";

/**
 * Route contract tests.
 *
 * There were no backend tests before this change, so a resolver could break with
 * nothing catching it. Each block below corresponds to a scenario in
 * openspec/changes/modernize-stack/specs/.
 *
 * Requests go through Hono's app.request(), so nothing binds a port and the suite
 * can run alongside a running dev stack.
 */

type Catalogue = {
  beers: { beer_id: number; beer_name: string; vote_sum: number }[];
  totalCount: number;
};
type Beer = { rating: number; vote_count: number; user_vote: string };
type Comments = { comments: { id: number; comment_text: string }[] };
type Styles = { styles: string[] };
type Session = { id: string; isNewUser: boolean };
type Created = { id: number };
type Failure = { error: { message: string; code: string } };
type Counted = { count: number };

/** Response.json() is typed unknown; these tests assert on wire shape. */
const read = async <T>(res: Response): Promise<T> => (await res.json()) as T;

const get = (path: string, init?: RequestInit) => app.request(path, init);

const send = (
  method: string,
  path: string,
  bodyValue: unknown,
  userId?: string
) =>
  app.request(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "X-User-Id": userId } : {}),
    },
    body: JSON.stringify(bodyValue),
  });

const post = (path: string, bodyValue: unknown, userId?: string) =>
  send("POST", path, bodyValue, userId);

const put = (path: string, bodyValue: unknown, userId?: string) =>
  send("PUT", path, bodyValue, userId);

/** A beer id present in the seeded catalogue. */
const BEER = 1436;

const makeUser = async (username: string, id: string) => {
  await post("/api/session", { username, uuid: id });
  return id;
};

const countOf = async (query: Promise<Counted[]>) => (await query)[0]!.count;

beforeEach(async () => {
  await sql`TRUNCATE comments, votes, users RESTART IDENTITY CASCADE`;
  clearCache();
});

describe("catalogue", () => {
  test("returns beers and a total count", async () => {
    const res = await get("/api/beers?size=2");
    expect(res.status).toBe(200);
    const body = await read<Catalogue>(res);
    expect(body.beers).toHaveLength(2);
    expect(body.totalCount).toBe(2410);
  });

  test("style filter matches the data", async () => {
    const body = await read<Catalogue>(
      await get("/api/beers?size=1&styles=Altbier")
    );
    const expected = await countOf(
      sql`SELECT COUNT(*)::int AS count FROM beers WHERE style = 'Altbier'`
    );
    expect(body.totalCount).toBe(expected);
    expect(body.totalCount).toBeGreaterThan(0);
  });

  test("a style containing punctuation still filters", async () => {
    const style = "Extra Special / Strong Bitter (ESB)";
    const body = await read<Catalogue>(
      await get(`/api/beers?size=1&styles=${encodeURIComponent(style)}`)
    );
    const expected = await countOf(
      sql`SELECT COUNT(*)::int AS count FROM beers WHERE style = ${style}`
    );
    expect(body.totalCount).toBe(expected);
    expect(body.totalCount).toBeGreaterThan(0);
  });

  test("every style the API offers is present in the catalogue", async () => {
    const body = await read<Styles>(await get("/api/styles"));
    const rows = (await sql`
      SELECT DISTINCT style FROM beers ORDER BY style`) as {
      style: string;
    }[];
    expect(body.styles).toEqual(rows.map((r) => r.style));
    // 99 named styles plus the empty one carried for the five beers without a
    // style, which the interface reaches through its "Other" option.
    expect(body.styles).toHaveLength(100);
    expect(body.styles).toContain("");
  });

  test("paging a tied sort yields each beer exactly once", async () => {
    // Every beer has zero votes here, so the sort key ties across the whole
    // catalogue — exactly the case the ORDER BY tiebreak exists for.
    const seen: number[] = [];
    for (let start = 0; start < 300; start += 100) {
      const body = await read<Catalogue>(
        await get(`/api/beers?size=100&start=${start}&sort=top`)
      );
      seen.push(...body.beers.map((b) => b.beer_id));
    }
    expect(seen).toHaveLength(300);
    expect(new Set(seen).size).toBe(300);
  });

  test("the same page twice is the same order", async () => {
    const once = await read<Catalogue>(
      await get("/api/beers?size=20&start=40")
    );
    clearCache();
    const twice = await read<Catalogue>(
      await get("/api/beers?size=20&start=40")
    );
    expect(twice.beers).toEqual(once.beers);
  });
});

describe("validation", () => {
  test("rejects an oversized page", async () => {
    const res = await get("/api/beers?size=100000");
    expect(res.status).toBe(400);
    expect(await read<Failure>(res)).toEqual({
      error: { message: "Invalid or missing: size", code: "invalid_request" },
    });
  });

  test("rejects a non-numeric id", async () => {
    expect((await get("/api/beers/not-a-number")).status).toBe(400);
  });

  test("rejects an unknown sort without querying", async () => {
    const res = await get("/api/beers?sort=vote_sum;DROP TABLE beers");
    expect(res.status).toBe(400);
    expect(await countOf(sql`SELECT COUNT(*)::int AS count FROM beers`)).toBe(
      2410
    );
  });

  test("rejects an unknown reaction", async () => {
    const user = await makeUser("val", "u-val");
    const res = await put(
      `/api/beers/${BEER}/reaction`,
      { action: "sideways" },
      user
    );
    expect(res.status).toBe(400);
    expect(await countOf(sql`SELECT COUNT(*)::int AS count FROM votes`)).toBe(
      0
    );
  });
});

describe("errors", () => {
  test("missing beer is 404 in the standard shape", async () => {
    const res = await get("/api/beers/999999");
    expect(res.status).toBe(404);
    expect(await read<Failure>(res)).toEqual({
      error: { message: "beer not found", code: "not_found" },
    });
  });

  test("duplicate username is 409", async () => {
    await makeUser("taken", "u-1");
    await makeUser("other", "u-2");
    const res = await send("PATCH", "/api/users/u-2", { username: "taken" });
    expect(res.status).toBe(409);
  });

  test("deleting another user's comment is refused", async () => {
    const alice = await makeUser("alice", "u-alice");
    const bob = await makeUser("bob", "u-bob");
    const created = await read<Created>(
      await post(`/api/beers/${BEER}/comments`, { comment: "mine" }, alice)
    );

    const res = await app.request(`/api/comments/${created.id}`, {
      method: "DELETE",
      headers: { "X-User-Id": bob },
    });
    expect(res.status).toBe(403);
    expect(
      await countOf(sql`SELECT COUNT(*)::int AS count FROM comments`)
    ).toBe(1);
  });

  test("a write without identity is refused", async () => {
    const res = await put(`/api/beers/${BEER}/reaction`, { action: "upvote" });
    expect(res.status).toBe(400);
  });

  test("a read route does not answer a write method's path", async () => {
    expect((await get(`/api/beers/${BEER}/reaction`)).status).toBe(404);
  });

  test("an id beyond int4 is a clean 404, not a driver error", async () => {
    const res = await get("/api/beers/2147483648");
    expect(res.status).toBe(404);
  });

  test("a database failure leaks no SQL, table names or stack trace", async () => {
    // Forces a genuine driver error through the real error handler by removing a
    // table the catalogue joins, then putting it back whatever the assertions do.
    await sql`ALTER TABLE breweries RENAME TO breweries_hidden`;
    try {
      const res = await get(`/api/beers/${BEER}`);
      expect(res.status).toBe(500);

      const text = JSON.stringify(await read<Failure>(res));
      expect(text).toBe(
        JSON.stringify({
          error: { message: "Internal server error", code: "internal" },
        })
      );
      expect(text).not.toMatch(/SELECT|breweries|relation|\.ts:/);
    } finally {
      await sql`ALTER TABLE breweries_hidden RENAME TO breweries`;
    }
  });
});

describe("SQL injection", () => {
  test("search is matched as literal text", async () => {
    const res = await get(
      `/api/beers?size=5&search=${encodeURIComponent("'; DROP TABLE beers; --")}`
    );
    expect(res.status).toBe(200);
    expect((await read<Catalogue>(res)).totalCount).toBe(0);
    expect(await countOf(sql`SELECT COUNT(*)::int AS count FROM beers`)).toBe(
      2410
    );
  });

  test("style filter is matched as a literal style name", async () => {
    const res = await get(
      `/api/beers?size=5&styles=${encodeURIComponent("' OR 1=1 --")}`
    );
    expect(res.status).toBe(200);
    expect((await read<Catalogue>(res)).totalCount).toBe(0);
  });

  test("the identity header is matched as a literal id", async () => {
    const res = await get(`/api/beers/${BEER}`, {
      headers: { "X-User-Id": "' OR 1=1 --" },
    });
    expect(res.status).toBe(200);
    expect((await read<Beer>(res)).user_vote).toBe("unreact");
  });

  test("a comment containing SQL is stored as text", async () => {
    const user = await makeUser("injector", "u-inj");
    const payload = "'); DROP TABLE comments; --";
    await post(`/api/beers/${BEER}/comments`, { comment: payload }, user);

    const body = await read<Comments>(await get(`/api/beers/${BEER}/comments`));
    expect(body.comments[0]!.comment_text).toBe(payload);
  });
});

describe("reactions", () => {
  test("setting the same vote twice counts once", async () => {
    const user = await makeUser("voter", "u-voter");
    for (let i = 0; i < 2; i++) {
      const res = await put(
        `/api/beers/${BEER}/reaction`,
        { action: "upvote" },
        user
      );
      expect(res.status).toBe(200);
    }

    const beer = await read<Beer>(await get(`/api/beers/${BEER}`));
    expect(beer.rating).toBe(1);
    expect(beer.vote_count).toBe(1);
  });

  test("changing a vote replaces it", async () => {
    const user = await makeUser("switcher", "u-switch");
    await put(`/api/beers/${BEER}/reaction`, { action: "upvote" }, user);
    await put(`/api/beers/${BEER}/reaction`, { action: "downvote" }, user);

    expect((await read<Beer>(await get(`/api/beers/${BEER}`))).rating).toBe(-1);
  });
});

describe("cache", () => {
  test("a repeated write is never answered from cache", async () => {
    const user = await makeUser("commenter", "u-comment");
    const payload = { comment: "identical text" };
    await post(`/api/beers/${BEER}/comments`, payload, user);
    await post(`/api/beers/${BEER}/comments`, payload, user);

    expect(
      await countOf(sql`SELECT COUNT(*)::int AS count FROM comments`)
    ).toBe(2);
  });

  test("a read reflects a write that followed it", async () => {
    const user = await makeUser("fresh", "u-fresh");
    expect((await read<Beer>(await get(`/api/beers/${BEER}`))).rating).toBe(0);

    await put(`/api/beers/${BEER}/reaction`, { action: "upvote" }, user);

    expect((await read<Beer>(await get(`/api/beers/${BEER}`))).rating).toBe(1);
  });

  test("a cached read is not served across users", async () => {
    const alice = await makeUser("ca", "u-ca");
    await makeUser("cb", "u-cb");
    await put(`/api/beers/${BEER}/reaction`, { action: "upvote" }, alice);

    const asAlice = await read<Beer>(
      await get(`/api/beers/${BEER}`, { headers: { "X-User-Id": alice } })
    );
    const asBob = await read<Beer>(
      await get(`/api/beers/${BEER}`, { headers: { "X-User-Id": "u-cb" } })
    );

    expect(asAlice.user_vote).toBe("upvote");
    expect(asBob.user_vote).toBe("unreact");
    // Both see the same public total; only the per-user field differs.
    expect(asBob.rating).toBe(1);
  });

  test("a GET is actually cached", async () => {
    expect((await get("/api/beers?size=1")).headers.get("X-Cache")).toBeNull();
    expect((await get("/api/beers?size=1")).headers.get("X-Cache")).toBe("HIT");
  });

  test("invalidation needs no per-handler code", async () => {
    // The invalidating middleware is mounted on the router, not written into each
    // handler, so this holds for any mutating route added later.
    const user = await makeUser("inv", "u-inv");
    await get("/api/beers?size=1&sort=top");
    expect(
      (await get("/api/beers?size=1&sort=top")).headers.get("X-Cache")
    ).toBe("HIT");

    await put(`/api/beers/${BEER}/reaction`, { action: "upvote" }, user);

    expect(
      (await get("/api/beers?size=1&sort=top")).headers.get("X-Cache")
    ).toBeNull();
  });
});

describe("users", () => {
  test("the same username resolves to the same id", async () => {
    const first = await read<Session>(
      await post("/api/session", { username: "repeat", uuid: "u-first" })
    );
    const second = await read<Session>(
      await post("/api/session", { username: "repeat", uuid: "u-second" })
    );

    expect(first).toEqual({ id: "u-first", isNewUser: true });
    expect(second).toEqual({ id: "u-first", isNewUser: false });
  });

  test("deleting a user removes their votes and comments", async () => {
    const user = await makeUser("doomed", "u-doomed");
    await put(`/api/beers/${BEER}/reaction`, { action: "upvote" }, user);
    await post(`/api/beers/${BEER}/comments`, { comment: "bye" }, user);

    const res = await app.request(`/api/users/${user}`, { method: "DELETE" });
    expect(res.status).toBe(200);

    expect(await countOf(sql`SELECT COUNT(*)::int AS count FROM votes`)).toBe(
      0
    );
    expect(
      await countOf(sql`SELECT COUNT(*)::int AS count FROM comments`)
    ).toBe(0);
  });
});
