import { sql } from "./db.ts";
import { conflict, forbidden, notFound } from "./errors.ts";

/**
 * ASCII unit separator. Style names are joined on it and split back out by
 * string_to_array in the catalogue query; it cannot occur in a style name.
 */
const STYLE_DELIMITER = String.fromCharCode(31);

export type Reaction = "upvote" | "downvote" | "unreact";
export type Sort = "top" | "low" | "atoz" | "ztoa";

/**
 * ORDER BY fragments, chosen by key from this frozen map.
 *
 * A sort direction cannot be a bound parameter, so it is the one part of a query
 * assembled as text — and it is assembled only from values defined here, never
 * from caller input. The route validator rejects any `sort` outside these keys
 * before a query runs.
 *
 * Every entry ends in `beer_name ASC, beer_id`. Most beers have zero votes, so
 * ordering by vote_sum alone leaves thousands of rows tied and the planner free to
 * return them in a different order per page — which, under offset pagination,
 * duplicates and skips rows as the user scrolls. The tiebreak is what makes the
 * order total. It looks redundant. It is not.
 */
const ORDER_BY: Readonly<Record<Sort, string>> = Object.freeze({
  top: "vote_sum DESC, beer_name ASC, beer_id",
  low: "vote_sum ASC, beer_name ASC, beer_id",
  atoz: "beer_name ASC, beer_id",
  ztoa: "beer_name DESC, beer_id",
});

export type BeerListItem = {
  beer_id: number;
  beer_name: string;
  brewery_name: string;
  vote_sum: number;
  reaction: Reaction;
  beer_count: number;
};

export type CatalogueFilters = {
  size: number;
  start: number;
  sort: Sort;
  search: string;
  /** Whole percentages, as the interface shows them. Stored as a fraction. */
  minAbv: number;
  maxAbv: number;
  minIbu: number;
  maxIbu: number;
  styles: string[];
  userId: string | null;
};

/** The catalogue: filtered, sorted and paginated, with this caller's votes. */
export const listBeers = async (
  f: CatalogueFilters
): Promise<BeerListItem[]> => {
  const text = `
    SELECT
      b.id                                   AS beer_id,
      b.name                                 AS beer_name,
      br.name                                AS brewery_name,
      COALESCE(SUM(CASE v.vote_type
        WHEN 'upvote'   THEN 1
        WHEN 'downvote' THEN -1
        ELSE 0 END), 0)::int                 AS vote_sum,
      COALESCE(uv.vote_type, 'unreact')      AS reaction,
      (COUNT(*) OVER ())::int                AS beer_count
    FROM beers b
    JOIN breweries br ON br.id = b.brewery_id
    LEFT JOIN votes v  ON v.beer_id = b.id
    LEFT JOIN votes uv ON uv.beer_id = b.id AND uv.user_id = $9
    WHERE b.abv BETWEEN $1 AND $2
      AND b.ibu BETWEEN $3 AND $4
      AND lower(b.name) LIKE $5
      -- Styles arrive as one delimiter-joined bound parameter, split server-side.
      -- Bun's sql.unsafe() sends a JS array as a scalar string, so binding it
      -- straight against text[] fails with "malformed array literal". chr(31) is
      -- the ASCII unit separator and cannot occur in a style name.
      AND ($6::text IS NULL OR b.style = ANY(string_to_array($6, chr(31))))
    GROUP BY b.id, b.name, br.name, uv.vote_type
    ORDER BY ${ORDER_BY[f.sort]}
    LIMIT $7 OFFSET $8`;

  return (await sql.unsafe(text, [
    f.minAbv / 100,
    f.maxAbv / 100,
    f.minIbu,
    f.maxIbu,
    `%${f.search.toLowerCase()}%`,
    f.styles.length > 0 ? f.styles.join(STYLE_DELIMITER) : null,
    f.size,
    f.start,
    f.userId,
  ])) as BeerListItem[];
};

export type BeerDetail = {
  id: number;
  name: string;
  style: string;
  abv: number;
  ibu: number;
  ounces: number;
  brewery_name: string;
  rating: number;
  vote_count: number;
  comment_count: number;
  user_vote: Reaction;
};

/** One beer with its vote and comment aggregates. */
export const getBeer = async (
  id: number,
  userId: string | null
): Promise<BeerDetail> => {
  const [row] = (await sql`
    SELECT
      b.id, b.name, b.style, b.abv, b.ibu, b.ounces,
      br.name                              AS brewery_name,
      COALESCE(r.rating, 0)::int           AS rating,
      COALESCE(r.vote_count, 0)::int       AS vote_count,
      COALESCE(c.comment_count, 0)::int    AS comment_count,
      COALESCE(uv.vote_type, 'unreact')    AS user_vote
    FROM beers b
    JOIN breweries br ON br.id = b.brewery_id
    LEFT JOIN (
      SELECT beer_id,
             SUM(CASE vote_type
               WHEN 'upvote' THEN 1 WHEN 'downvote' THEN -1 ELSE 0 END) AS rating,
             COUNT(*) FILTER (WHERE vote_type IN ('upvote','downvote')) AS vote_count
      FROM votes GROUP BY beer_id
    ) r ON r.beer_id = b.id
    LEFT JOIN (
      SELECT beer_id, COUNT(*) AS comment_count FROM comments GROUP BY beer_id
    ) c ON c.beer_id = b.id
    LEFT JOIN votes uv ON uv.beer_id = b.id AND uv.user_id = ${userId}
    WHERE b.id = ${id}`) as BeerDetail[];

  if (!row) throw notFound("beer");
  return row;
};

export type CommentRow = {
  id: number;
  comment_text: string;
  created_at: string;
  user_id: string;
  username: string;
};

/** A beer's comments, newest first. */
export const listComments = async (
  beerId: number,
  size: number,
  start: number
): Promise<CommentRow[]> =>
  (await sql`
    SELECT c.id, c.comment_text, c.created_at, u.id AS user_id, u.username
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.beer_id = ${beerId}
    ORDER BY c.created_at DESC
    LIMIT ${size} OFFSET ${start}`) as CommentRow[];

/**
 * Every style present in the catalogue, including the empty one.
 *
 * The interface derives its filter options from this rather than from a hardcoded
 * list, so a style in the data cannot become unreachable by the two lists drifting
 * apart — which is what the old pairing of 15 names in Filters.tsx and 85 in
 * otherStyles risked, with nothing enforcing the split.
 *
 * The empty style is included on purpose. Five beers have no style, and the
 * interface's "Other" option is the complement of the styles it names
 * individually, so the empty string must be in that complement for those beers to
 * remain selectable — as they were before this change.
 */
export const listStyles = async (): Promise<string[]> => {
  const rows = (await sql`
    SELECT DISTINCT style FROM beers ORDER BY style`) as {
    style: string;
  }[];
  return rows.map((r) => r.style);
};

/**
 * The user an id belongs to.
 *
 * Backs the interface's route guard, which previously looked a user up by the
 * username in localStorage and compared the returned id to the one also in
 * localStorage — a check that never validated the id itself.
 */
export const getUser = async (
  id: string
): Promise<{ id: string; username: string }> => {
  const [row] = (await sql`
    SELECT id, username FROM users WHERE id = ${id}`) as {
    id: string;
    username: string;
  }[];
  if (!row) throw notFound("user");
  return row;
};

/** Finds the user for a username, creating one if there is none. */
export const resolveUser = async (
  username: string,
  id: string
): Promise<{ id: string; isNewUser: boolean }> => {
  const inserted = (await sql`
    INSERT INTO users (id, username) VALUES (${id}, ${username})
    ON CONFLICT (username) DO NOTHING
    RETURNING id`) as { id: string }[];

  if (inserted[0]) return { id: inserted[0].id, isNewUser: true };

  const [existing] = (await sql`
    SELECT id FROM users WHERE username = ${username}`) as { id: string }[];

  if (!existing) throw notFound("user");
  return { id: existing.id, isNewUser: false };
};

/** Renames a user. */
export const renameUser = async (
  userId: string,
  username: string
): Promise<void> => {
  const taken = (await sql`
    SELECT id FROM users WHERE username = ${username} AND id <> ${userId}`) as {
    id: string;
  }[];
  if (taken.length > 0) throw conflict("Username already exists");

  const updated = (await sql`
    UPDATE users SET username = ${username} WHERE id = ${userId}
    RETURNING id`) as { id: string }[];
  if (updated.length === 0) throw notFound("user");
};

/** Deletes a user, and by cascade their votes and comments. */
export const deleteUser = async (userId: string): Promise<void> => {
  const deleted = (await sql`
    DELETE FROM users WHERE id = ${userId} RETURNING id`) as { id: string }[];
  if (deleted.length === 0) throw notFound("user");
};

/**
 * Records this user's vote on a beer.
 *
 * One statement, made idempotent by the unique constraint on (user_id, beer_id).
 * The original read the existing vote, then branched to an UPDATE or an INSERT,
 * and rejected a repeat of the same vote with an error.
 */
export const setReaction = async (
  userId: string,
  beerId: number,
  action: Reaction
): Promise<void> => {
  const [beer] = (await sql`SELECT id FROM beers WHERE id = ${beerId}`) as {
    id: number;
  }[];
  if (!beer) throw notFound("beer");

  const [user] = (await sql`SELECT id FROM users WHERE id = ${userId}`) as {
    id: string;
  }[];
  if (!user) throw notFound("user");

  await sql`
    INSERT INTO votes (user_id, beer_id, vote_type)
    VALUES (${userId}, ${beerId}, ${action})
    ON CONFLICT (user_id, beer_id) DO UPDATE SET vote_type = EXCLUDED.vote_type`;
};

/** Adds a comment, returning its id. */
export const addComment = async (
  userId: string,
  beerId: number,
  text: string
): Promise<number> => {
  const [beer] = (await sql`SELECT id FROM beers WHERE id = ${beerId}`) as {
    id: number;
  }[];
  if (!beer) throw notFound("beer");

  const [user] = (await sql`SELECT id FROM users WHERE id = ${userId}`) as {
    id: string;
  }[];
  if (!user) throw notFound("user");

  const [row] = (await sql`
    INSERT INTO comments (user_id, beer_id, comment_text)
    VALUES (${userId}, ${beerId}, ${text})
    RETURNING id`) as { id: number }[];
  return row!.id;
};

/** Deletes a comment the caller wrote. Returns the beer it belonged to. */
export const deleteComment = async (
  userId: string,
  commentId: number
): Promise<number> => {
  const [row] = (await sql`
    SELECT user_id, beer_id FROM comments WHERE id = ${commentId}`) as {
    user_id: string;
    beer_id: number;
  }[];

  if (!row) throw notFound("comment");
  if (row.user_id !== userId) throw forbidden("Not your comment");

  await sql`DELETE FROM comments WHERE id = ${commentId}`;
  return row.beer_id;
};
