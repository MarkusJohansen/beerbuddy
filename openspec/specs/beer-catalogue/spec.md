## Purpose

Browsing the catalogue: the paginated, filtered list of beers that is the application's
landing surface. Covers what a page of results contains, how pages are requested, and the
ordering guarantee that makes offset pagination safe. Filter and sort *inputs* are
specified separately in `catalogue-filtering`.

The catalogue is a fixed dataset loaded from `backend/build/beers.csv` and
`breweries.csv`: 2,410 beers across 100 distinct styles and 558 breweries. Nothing in the
application adds or edits a beer.

## Requirements

### Requirement: Catalogue Page Query
The system SHALL expose a `beers` query that returns one page of catalogue rows for the given filter, sort and pagination arguments.

Arguments are `size`, `start`, `userId`, `sort`, `search`, `minAbv`, `maxAbv`, `minIbu`,
`maxIbu` and `styles`. Each returned row carries `beer_id`, `beer_name`, `brewery_name`,
`vote_sum` (net votes), `reaction` (the requesting user's own vote) and `beer_count`.

#### Scenario: A page of results is requested
- **WHEN** a client posts `beers(size: 10, start: 0, userId: "<id>", ...)`
- **THEN** at most 10 rows are returned, each joined to its brewery
- **AND** every row carries the requesting user's own reaction for that beer

#### Scenario: A beer has no votes at all
- **WHEN** no rows exist in `votes` for a beer in the page
- **THEN** its `vote_sum` is null-or-zero and its `reaction` is `unreact`

### Requirement: Total Match Count On Every Row
The system SHALL return the total number of beers matching the current filters on every row of every page, as `beer_count`.

`beer_count` comes from `COUNT(beers.id) OVER()`, so it reflects the full filtered set and
not the page. The client reads it from the first row only.

#### Scenario: Client renders the result count
- **WHEN** a page of results arrives
- **THEN** the list header shows `beers[0].beer_count` results
- **AND** shows `0 results` when the page is empty

### Requirement: Total Ordering Under Pagination
The system SHALL append `beer_name ASC, beer_id` to the user's chosen sort so that the row order is total.

Most beers have zero votes. Under `ORDER BY vote_sum` alone thousands of rows tie and the
database is free to order them differently per query, which under `LIMIT`/`OFFSET`
pagination duplicates and skips rows as the user scrolls. The tiebreak is what prevents
this. It looks redundant and is not.

#### Scenario: Scrolling through beers tied on votes
- **WHEN** a user scrolls past several pages of beers that all have a `vote_sum` of 0
- **THEN** no beer appears twice and no beer is skipped

### Requirement: Offset Pagination From The Client
The system SHALL request pages of 10 beers, using the number of beers already held as the offset.

#### Scenario: Infinite scroll reaches the threshold
- **WHEN** the main scroll container passes 99% of its scroll height and `beers.length < beer_count`
- **THEN** the next page is fetched with `start` set to the current `beers.length`
- **AND** the new rows are appended to the existing list

#### Scenario: Filters or sorting are applied
- **WHEN** `fetchMore` is called with `reset` true
- **THEN** the query is issued with `start: 0`, the held list is replaced rather than appended
- **AND** the scroll container is returned to the top

#### Scenario: The whole result set has been seen
- **WHEN** `beers.length` is no longer less than `beer_count`
- **THEN** infinite scrolling stops and an end-of-list message is shown

### Requirement: Requesting User Id Is Interpolated Into The Query Body
The system SHALL interpolate `userId` into the GraphQL query string rather than passing it as a GraphQL variable.

The response cache keys on an MD5 of the request body (see `graphql-api`). The id being
*in* the body is the only thing that stops one user's `reaction` values being served to
another. Moving it to a variable would silently break per-user isolation.

#### Scenario: Two users request the same page of beers
- **WHEN** user A and user B request the same page with the same filters
- **THEN** the request bodies differ, the cache keys differ
- **AND** each receives their own `reaction` values

### Requirement: Beer Card Navigation
The system SHALL render each catalogue row as a card showing the beer name, its brewery and a voter, linking to that beer's detail page.

#### Scenario: User opens a beer from the list
- **WHEN** the user activates a beer card
- **THEN** the application navigates to `/beer/<beer_id>`

#### Scenario: User votes from the list
- **WHEN** the user activates an up- or downvote control inside a card
- **THEN** the vote is cast and navigation to the detail page does not occur
