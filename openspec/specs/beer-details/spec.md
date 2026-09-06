## Purpose

The single-beer page: everything known about one beer, its aggregate score, and the
attributes drawn from the source dataset. Voting and commenting on that page are specified
in `beer-voting` and `beer-comments`.

## Requirements

### Requirement: Single Beer Query
The system SHALL expose a `beer` query returning one beer's attributes, aggregate vote figures, comment count and the requesting user's own vote.

The row carries `abv`, `ibu`, `name`, `style`, `ounces`, `id`, `brewery_name`, `rating`
(net votes), `vote_count`, `comment_count` and `user_vote`. `user_vote` is `unreact` when
the user has never voted on this beer.

#### Scenario: A beer is requested
- **WHEN** a client posts `beer(id: <id>, userId: "<id>")`
- **THEN** the beer's attributes, its brewery name, its net rating, its vote and comment counts and the caller's own vote are returned

#### Scenario: A beer nobody has voted on is requested
- **WHEN** no `votes` rows exist for the beer
- **THEN** `rating` and `vote_count` are null and `user_vote` is `unreact`

### Requirement: Vote Count Excludes Withdrawn Votes
The system SHALL count only `upvote` and `downvote` rows towards `vote_count`, while `rating` sums them as +1 and −1.

Withdrawing a vote writes an `unreact` row rather than deleting; those rows contribute
nothing to either figure.

#### Scenario: A user withdraws their vote
- **WHEN** a user changes their reaction to `unreact`
- **THEN** the beer's `vote_count` no longer includes them and `rating` is unchanged by them

### Requirement: Beer Detail Presentation
The system SHALL present the brewery, the beer name, the voter, the number of reviews the score is based on, and the beer's attributes.

The review line reads "Based on N review(s)", singularising at exactly one and showing 0
when `vote_count` is null.

#### Scenario: A beer with one review is shown
- **WHEN** `vote_count` is 1
- **THEN** the page reads "Based on 1 review"

#### Scenario: A beer with no reviews is shown
- **WHEN** `vote_count` is null
- **THEN** the page reads "Based on 0 reviews"

### Requirement: Beer Attributes
The system SHALL display Style, ABV, IBU and Volume for a beer, converting ABV from its stored fraction to a percentage and suffixing Volume with `oz`.

On viewports wider than 768 px the four attributes render individually and IBU is omitted
when it is 0. Below that width they render as a compact mobile list.

#### Scenario: A beer's ABV is shown on a wide viewport
- **WHEN** a beer with `abv` 0.075 is displayed above 768 px
- **THEN** the ABV attribute reads "7.5%"

#### Scenario: A beer without a meaningful IBU is shown on a wide viewport
- **WHEN** a beer's `ibu` is 0
- **THEN** the IBU attribute is not rendered

#### Scenario: A beer's ABV is shown on a narrow viewport
- **WHEN** a beer with `abv` 0.075 is displayed at or below 768 px
- **THEN** the ABV attribute reads "0.075%"
- **AND** this is a known defect: `*` binds tighter than `??` in the mobile branch, so the multiplication applies to the fallback, never the value

### Requirement: Detail Page Loading And Error States
The system SHALL show a spinner while the beer is loading and an error message when the fetch fails.

#### Scenario: The beer is still loading
- **WHEN** the beer query has not resolved
- **THEN** a centred spinner is shown in place of the page

#### Scenario: The beer fetch fails
- **WHEN** the network response is not ok
- **THEN** the failure is logged and the page reports "Error fetching beer"

### Requirement: Detail Page Refetches After A Write
The system SHALL refetch the beer whenever the user casts a vote or posts or deletes a comment on that page.

#### Scenario: The user votes on the detail page
- **WHEN** a vote succeeds
- **THEN** the beer is refetched so the rating and review count reflect it

#### Scenario: The user posts or deletes a comment
- **WHEN** a comment is posted or deleted
- **THEN** both the beer and the first page of comments are refetched
