## Purpose

Up- and downvoting beers. A user holds at most one reaction per beer; the net sum of those
reactions is the beer's score, and it drives the "most popular" and "least popular" sorts
in `catalogue-filtering`.

## Requirements

### Requirement: Cast, Change Or Withdraw A Reaction
The system SHALL accept `upvote`, `downvote` and `unreact` as the reaction a user holds on a beer, storing at most one reaction per user per beer.

`react(userId, beerId, action)` inserts a row when the user has no reaction to that beer
and updates the existing row otherwise. Withdrawal is stored as an `unreact` row, not as a
deletion, so `votes` accumulates a row per user per beer touched.

#### Scenario: A user votes for the first time
- **WHEN** a user with no existing reaction to a beer sends `upvote`
- **THEN** a `votes` row is inserted for that user and beer

#### Scenario: A user changes their reaction
- **WHEN** a user holding `upvote` sends `downvote`
- **THEN** the existing row is updated rather than a second row inserted

#### Scenario: A user withdraws their reaction
- **WHEN** a user holding `upvote` sends `unreact`
- **THEN** the row is updated to `unreact` and stops contributing to the beer's score

### Requirement: Reaction Input Validation
The system SHALL reject an unrecognised action, an unknown user, and a repeat of the reaction the user already holds.

#### Scenario: An action outside the allowed set is sent
- **WHEN** `react` is called with an action other than `upvote`, `downvote` or `unreact`
- **THEN** the operation fails with "Invalid action"

#### Scenario: An unknown user votes
- **WHEN** `react` is called with a `userId` that has no user row
- **THEN** the operation fails with "User does not exist"

#### Scenario: The same reaction is sent twice
- **WHEN** a user holding `upvote` sends `upvote` again
- **THEN** the operation fails with "User has already reacted"

### Requirement: Net Score
The system SHALL compute a beer's score as the number of upvotes minus the number of downvotes.

The same arithmetic backs `vote_sum` in the catalogue query and `rating` on the detail
page: `upvote` counts +1, `downvote` −1, `unreact` 0.

#### Scenario: A beer with mixed reactions is scored
- **WHEN** a beer has three upvotes, one downvote and two withdrawn reactions
- **THEN** its score is 2

### Requirement: Voting Control Behaviour
The system SHALL let a user toggle their reaction from either the catalogue card or the detail page, and SHALL update the displayed total without waiting for a refetch.

Activating the reaction already held sends `unreact`. The displayed total is adjusted
locally from the reaction the row arrived with to the reaction now held; on the detail page
a successful vote additionally triggers a refetch.

#### Scenario: A user activates the reaction they already hold
- **WHEN** a user showing an active upvote activates upvote again
- **THEN** `unreact` is sent and the control stops showing as active

#### Scenario: The displayed total updates on vote
- **WHEN** a user upvotes a beer showing a score of 4 that they had not voted on
- **THEN** the control immediately shows 5

#### Scenario: The score is not yet known
- **WHEN** the computed total is not a number
- **THEN** 0 is displayed

### Requirement: Voting Requires A Verified Identity
The system SHALL verify the stored identity before sending a vote and SHALL not send one when that check fails.

#### Scenario: A vote is attempted with a broken identity
- **WHEN** `protectRoute` fails at the moment of voting
- **THEN** no `react` request is sent and the user is redirected to the login page

### Requirement: Votes Invalidate The Response Cache
The system SHALL flush the entire response cache after every successful reaction write.

#### Scenario: A vote is recorded
- **WHEN** `react` completes an insert or update
- **THEN** `myCache.flushAll()` runs before the response is returned
