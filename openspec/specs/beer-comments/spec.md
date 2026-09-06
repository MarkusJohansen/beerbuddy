## Purpose

Comments on a beer: posting, reading a page at a time, and deleting one's own. Comments
are plain text attributed to a username, ordered newest first.

## Requirements

### Requirement: Read Comments Newest First
The system SHALL return a page of a beer's comments ordered by creation time descending, each carrying its text, timestamp, id, author id and author username.

`comments(id, size, start)` joins `comments` to `users`; `start` defaults to 0 when
omitted.

#### Scenario: The first page of comments is requested
- **WHEN** a client posts `comments(id: <beerId>, size: 5, start: 0)`
- **THEN** the five most recent comments on that beer are returned, newest first

#### Scenario: A beer with no comments is requested
- **THEN** an empty list is returned

### Requirement: Comment Pagination On The Detail Page
The system SHALL load comments five at a time and stop once the beer's `comment_count` has been reached.

#### Scenario: The user scrolls the comment list
- **WHEN** the comment list is scrolled to its end and fewer comments are held than `comment_count`
- **THEN** the next five are fetched at the current offset and appended

#### Scenario: All comments are loaded
- **WHEN** the number held reaches `comment_count`
- **THEN** no further requests are made

### Requirement: Post A Comment
The system SHALL let a signed-in user post a comment on a beer, confirming success and clearing the input.

The comment is submitted by activating the post control or pressing Enter in the input.
Identity is verified first; a failed check aborts the post.

#### Scenario: A valid comment is posted
- **WHEN** the user submits a valid comment
- **THEN** the comment is inserted, a success message is shown, the input is cleared and the comment list refreshes

#### Scenario: Posting fails
- **WHEN** the request fails or identity verification fails
- **THEN** an error message is shown and the input is not cleared

### Requirement: Comment Validation
The system SHALL reject a comment that is empty, longer than 200 characters, starts with a space, contains a newline, or consists only of non-alphanumeric characters.

Validation is client-side only; the backend inserts whatever it is given.

#### Scenario: A comment starting with a space is submitted
- **THEN** the comment is rejected with "Your comment is invalid." and nothing is sent

#### Scenario: A comment of only punctuation is submitted
- **WHEN** the text contains no letters or digits
- **THEN** the comment is rejected and nothing is sent

#### Scenario: A comment over the length limit is submitted
- **WHEN** the text exceeds 200 characters
- **THEN** the comment is rejected and nothing is sent

### Requirement: Delete Own Comment
The system SHALL let a user delete their own comment and SHALL NOT offer or honour deletion of anyone else's.

The delete control renders only when the comment's author id matches the stored user id,
and `deleteComment` matches on both comment id and user id, failing with "Comment does not
exist" otherwise.

#### Scenario: A user deletes their own comment
- **WHEN** the author activates the delete control on their comment
- **THEN** the comment is removed and the comment list refreshes

#### Scenario: A user views someone else's comment
- **WHEN** the comment's author id differs from the stored user id
- **THEN** no delete control is rendered

#### Scenario: A deletion is attempted for another user's comment over the API
- **WHEN** `deleteComment` is called with a comment id that does not belong to the given user id
- **THEN** the operation fails with "Comment does not exist" and nothing is deleted

### Requirement: Relative Timestamps
The system SHALL display each comment's age relative to now, in the largest whole unit that applies, down to "< 1 minute ago".

#### Scenario: A comment posted moments ago is displayed
- **THEN** it reads "< 1 minute ago"

#### Scenario: A comment posted three days ago is displayed
- **THEN** it reads "3 days ago"

### Requirement: Comment Writes Invalidate The Response Cache
The system SHALL flush the entire response cache after a comment is inserted or deleted.

The flush happens before the write's own response is returned, and the caching middleware
then stores that response — so an identical repeat of a comment request within the cache
TTL is answered from the cache and never reaches the database. Posting the same text on the
same beer twice reports success and inserts once. See README § Known problems.

#### Scenario: A comment is posted
- **WHEN** `comment` completes its insert
- **THEN** `myCache.flushAll()` runs before the response is returned

#### Scenario: The identical comment request is repeated
- **WHEN** the same user posts byte-identical text on the same beer within 24 hours
- **THEN** the cached success response is replayed and no second row is inserted
