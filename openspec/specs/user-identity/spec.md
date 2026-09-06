## Purpose

Who the current user is. BeerBuddy has accounts but no authentication: a user claims a
username, the client mints a UUID, and that pair is kept in `localStorage`. This capability
covers claiming an identity, keeping it across reloads, checking it on protected pages, and
discarding it.

**This is not a security boundary.** There is no password, no token and no session. Anyone
who types an existing username is told the id belongs to them by `login`, and any client
can send any `userId` to any mutating resolver. Treat identity here as a convenience for
attributing votes and comments, not as access control.

## Requirements

### Requirement: Claim An Identity By Username
The system SHALL sign a user in, or create their account, from a username alone via a single `loginOrSignUp` operation.

The client generates a v4 UUID and sends it with the username. If the username already
exists the stored id is returned with `isNewUser: "no"` and the supplied UUID is discarded;
otherwise a row is inserted with the supplied UUID and `isNewUser: "yes"` is returned. No
password is requested or stored.

#### Scenario: A returning user signs in
- **WHEN** a username that already exists is submitted
- **THEN** that user's existing id is returned with `isNewUser` "no"
- **AND** the interface confirms "Welcome back <username>!"

#### Scenario: A new user signs up
- **WHEN** a username that does not exist is submitted
- **THEN** a user row is inserted with the client-supplied UUID
- **AND** the interface confirms "Created new user <username>!"

#### Scenario: The username field is empty
- **WHEN** the login form is submitted with no username
- **THEN** the form reports "Please input your username!" and no request is sent

### Requirement: Identity Persists In Local Storage
The system SHALL store the username under `userNameBeerBuddy` and the user id under `userIdBeerBuddy` in `localStorage`, and treat their presence as being signed in.

There is no expiry and no server-side session. On loading the login page with a stored
username, the client re-runs `loginOrSignUp` and redirects to the catalogue after two
seconds.

#### Scenario: A signed-in user reloads
- **WHEN** both keys are present and consistent
- **THEN** the user stays on the catalogue without being asked to sign in again

#### Scenario: A signed-in user opens the login page
- **WHEN** `userNameBeerBuddy` is set
- **THEN** the identity is re-confirmed against the backend and the user is redirected to the catalogue

### Requirement: Protected Pages Verify Identity On Mount
The system SHALL verify the stored identity against the backend when the catalogue and beer detail pages mount, and before any write, redirecting to the login page when it does not hold.

`protectRoute` clears both `localStorage` keys and redirects when either key is missing,
when `login(username)` returns no rows, or when the returned id differs from the stored id.
Voting and commenting call it first and abort if it fails.

#### Scenario: Local storage is missing a key
- **WHEN** either `userNameBeerBuddy` or `userIdBeerBuddy` is absent
- **THEN** both keys are cleared and the browser is sent to the login page

#### Scenario: The stored username no longer exists server-side
- **WHEN** `login` returns an empty result for the stored username
- **THEN** both keys are cleared and the browser is sent to the login page

#### Scenario: The stored id disagrees with the server
- **WHEN** `login` returns an id different from the stored one
- **THEN** both keys are cleared and the browser is sent to the login page

#### Scenario: A write is attempted with a broken identity
- **WHEN** the user votes or comments and `protectRoute` fails
- **THEN** the write is not sent

### Requirement: Sign Out
The system SHALL sign a user out by discarding the stored user id and reloading the application.

The logout control removes `userIdBeerBuddy` and reloads; the next `protectRoute` then
finds the key missing, clears the username too, and redirects to login.

#### Scenario: User signs out
- **WHEN** the user activates the logout control
- **THEN** the stored user id is removed and the application reloads to the login page

### Requirement: Account Rename And Deletion Exist Only In The API
The system SHALL expose `updateUser` and `deleteUser` operations that are reachable over GraphQL but are not wired to any user interface.

`updateUser` rejects a username already in use and a non-existent user id; `deleteUser`
rejects a non-existent user id. Both flush the response cache. No component in the frontend
calls either.

#### Scenario: A rename is requested over the API
- **WHEN** `updateUser` is called with an unused username and an existing user id
- **THEN** the username is changed and the response cache is flushed

#### Scenario: A rename collides
- **WHEN** `updateUser` is called with a username that already exists
- **THEN** the operation fails with "Username already exists"

#### Scenario: A deletion is requested over the API
- **WHEN** `deleteUser` is called with an existing user id
- **THEN** the user row is deleted and the response cache is flushed

### Requirement: Unauthenticated Landing Route
The system SHALL serve the login form at `/login` and route unknown paths to a not-found page offering a way back to the catalogue.

The redirect target is the absolute path `/login` while the production deployment is served
under `/project2`; the router's `basename` is `/`. These three do not agree, and which is
wrong depends on how the bundle is built and served — see README § Known problems.

#### Scenario: An unknown path is opened
- **WHEN** the user navigates to a route that does not exist
- **THEN** a not-found page is shown with a link back to the catalogue
