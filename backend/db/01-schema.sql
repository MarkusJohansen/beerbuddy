-- BeerBuddy schema — PostgreSQL.
--
-- Applied by the postgres image from /docker-entrypoint-initdb.d on an empty data
-- volume only, so restarting the stack never re-runs it and never duplicates the
-- catalogue. The database itself is created by POSTGRES_DB; there is no CREATE
-- DATABASE here and no engine-specific alternative to comment in or out.

CREATE TABLE breweries (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL,
    city  TEXT NOT NULL,
    state TEXT NOT NULL
);

-- abv is a fraction (0.05 = 5%), matching beers.csv. The API takes whole
-- percentages and divides, as the original did.
--
-- abv and ibu are NOT NULL with a 0 default because 62 rows in beers.csv have no
-- abv and 1005 have no ibu, and the range filters treat those as 0. Storing NULL
-- would silently drop 42% of the catalogue from any ibu-filtered query.
CREATE TABLE beers (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    style      TEXT NOT NULL,
    -- DOUBLE PRECISION, not REAL: float4 cannot hold 0.05 and serialises it as
    -- 0.05000000074505806, which reaches the interface as an ABV of 5.000000074%.
    abv        DOUBLE PRECISION NOT NULL DEFAULT 0,
    ibu        DOUBLE PRECISION NOT NULL DEFAULT 0,
    ounces     DOUBLE PRECISION NOT NULL,
    brewery_id INTEGER NOT NULL REFERENCES breweries(id)
);

CREATE TABLE users (
    id       TEXT PRIMARY KEY,
    -- The original schema had no uniqueness here; the resolvers enforced it with a
    -- check-then-insert that two concurrent signups could both pass.
    username TEXT NOT NULL UNIQUE
);

-- One row per user per beer. The unique constraint is what lets a vote be an
-- upsert instead of the original select-then-insert-or-update.
CREATE TABLE votes (
    id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    beer_id   INTEGER NOT NULL REFERENCES beers(id),
    vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote', 'unreact')),
    UNIQUE (user_id, beer_id)
);

CREATE TABLE comments (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    beer_id      INTEGER NOT NULL REFERENCES beers(id),
    comment_text TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes below exist for specific query shapes. Each notes which.

-- Catalogue filter: WHERE abv BETWEEN, ibu BETWEEN, style = ANY($n).
CREATE INDEX beers_style_idx ON beers (style);
CREATE INDEX beers_abv_idx   ON beers (abv);
CREATE INDEX beers_ibu_idx   ON beers (ibu);

-- Catalogue search is LOWER(name) LIKE '%…%'. A btree on lower(name) cannot serve
-- a leading wildcard, so this is a trigram index; without pg_trgm the search
-- degrades to a sequential scan over 2410 rows, which is survivable but pointless.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX beers_name_trgm_idx ON beers USING gin (lower(name) gin_trgm_ops);

-- Catalogue sort tiebreak: ORDER BY …, name, id.
CREATE INDEX beers_name_id_idx ON beers (name, id);

-- Vote aggregation joins and the per-user reaction lookup.
CREATE INDEX votes_beer_idx ON votes (beer_id);

-- Comment count aggregate and the per-beer comment list, newest first.
CREATE INDEX comments_beer_created_idx ON comments (beer_id, created_at DESC);
