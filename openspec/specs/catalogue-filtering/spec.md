## Purpose

Narrowing and ordering the catalogue: free-text search, ABV and IBU ranges, beer styles,
and the four sort modes. Also covers where that filter state lives, when it is persisted,
and which controls take effect immediately versus on an explicit apply.

## Requirements

### Requirement: Free-Text Search On Beer Name
The system SHALL filter the catalogue to beers whose name contains the search term, case-insensitively.

The client lowercases the term before sending it; the server compares with
`LOWER(beers.name) LIKE '%<term>%'`. An empty term matches every beer. There is no
brewery-name or style search.

#### Scenario: User searches for a partial name
- **WHEN** the user submits `ipa` in the search field
- **THEN** the catalogue shows only beers whose name contains `ipa` in any case
- **AND** the results header shows the term that was searched for

#### Scenario: Search term is cleared
- **WHEN** the user submits an empty search
- **THEN** the name filter is not applied and all beers matching the other filters are shown

### Requirement: ABV Range Filter
The system SHALL filter beers to an alcohol-by-volume range expressed in whole percent from 0 to 13.

The UI works in percent; the dataset stores ABV as a fraction, so the server divides both
bounds by 100 before comparing. Defaults are 0 and 13, which spans the dataset (its
maximum ABV is 0.128).

#### Scenario: User narrows the ABV range
- **WHEN** the ABV slider is set to 5–8 and filters are applied
- **THEN** only beers with `abv` between 0.05 and 0.08 inclusive are returned

#### Scenario: No ABV bound is supplied
- **WHEN** `minAbv` or `maxAbv` is omitted from the query
- **THEN** the server substitutes 0 and 13 respectively

### Requirement: IBU Range Filter
The system SHALL filter beers to an international-bitterness-units range from 0 to 138.

138 is the maximum IBU present in the dataset. 1,005 of the 2,410 beers have no IBU
recorded and are stored as 0 rather than null, so raising the lower bound above 0 silently
excludes them along with the genuinely unbitter ones. The beer detail page relies on the
same convention, hiding the IBU attribute when it is 0.

#### Scenario: User narrows the IBU range
- **WHEN** the IBU slider is set to 40–90 and filters are applied
- **THEN** only beers with `ibu` between 40 and 90 inclusive are returned

#### Scenario: User raises the lower IBU bound off zero
- **WHEN** the minimum IBU is set to any value above 0
- **THEN** the 1,005 beers with no recorded IBU drop out of the results

### Requirement: Beer Style Filter With Catch-All
The system SHALL filter beers to a selected set of styles, where selecting "Other" expands to every style not individually listed.

The UI offers 15 named styles plus "Other". "Other" expands server-side to a hard-coded
list of 85 further style strings, one of which is the empty string. 15 + 85 is exactly the
100 distinct styles in `beers.csv`, so the two literals together make every style
reachable. Nothing enforces that arithmetic — the two lists live in
`frontend/src/components/filters/Filters.tsx` and `backend/resolvers.ts` and must be kept
in sync by hand.

#### Scenario: User selects named styles
- **WHEN** the user checks "American IPA" and "Witbier" and applies filters
- **THEN** only beers of those two styles are returned

#### Scenario: User selects Other
- **WHEN** the user checks "Other" and applies filters
- **THEN** the query also matches the 85 styles not named in the UI

#### Scenario: No style is selected
- **WHEN** the styles list is empty
- **THEN** no style predicate is added to the query and all styles are returned

### Requirement: Four Sort Modes
The system SHALL order the catalogue by one of: most popular, least popular, A–Z, or Z–A, defaulting to most popular.

`top` maps to `vote_sum DESC`, `low` to `vote_sum ASC`, `atoz` to `beer_name ASC`, `ztoa`
to `beer_name DESC`. Any unrecognised or absent value falls back to `vote_sum DESC`. The
total-ordering tiebreak in `beer-catalogue` is appended to whichever is chosen.

#### Scenario: User picks a sort mode
- **WHEN** the user selects "Least popular"
- **THEN** beers are returned in ascending net-vote order
- **AND** the results header reports the active sort in words

### Requirement: Filter State Lives In Context And Persists To Local Storage
The system SHALL hold filter state in a single React context and persist it to `localStorage` when filters are applied or reset.

`FilterContext` holds `searchString`, `IBU`, `ABV`, `styles` and `sorting`, each
initialised from `localStorage` with the defaults `""`, `[0, 138]`, `[0, 13]`, `[]` and
`"top"`. There is no Redux, no query cache and no normalised store.

#### Scenario: User returns to the application
- **WHEN** a user who previously applied filters reloads the page
- **THEN** the persisted search term, ranges, styles and sort are restored into the controls

#### Scenario: Filters are applied
- **WHEN** the user activates "Apply Filters"
- **THEN** the current filter state is written to `localStorage`
- **AND** the catalogue is refetched from offset 0

### Requirement: Search And Sort Apply Immediately, Ranges And Styles On Apply
The system SHALL refetch the catalogue as soon as the search term or sort mode changes, while range and style changes take effect only when filters are applied.

The beer list watches `searchString` and `sorting` and refetches on change; the sliders and
style checkboxes only mutate context until the apply button is pressed.

#### Scenario: User changes the sort mode
- **WHEN** the user selects a different sort
- **THEN** the catalogue refetches without any further action

#### Scenario: User drags the ABV slider
- **WHEN** the user moves the ABV slider but does not apply
- **THEN** the displayed catalogue is unchanged

### Requirement: Reset Filters
The system SHALL restore every filter to its default and refetch the catalogue when the user resets filters.

Reset writes the defaults to `localStorage` directly rather than relying on the current
context values, and issues the query with `sort: "top"`, full ranges, no styles and an
empty search.

#### Scenario: User resets active filters
- **WHEN** the user activates "Reset Filters"
- **THEN** search, ABV, IBU, styles and sort return to their defaults
- **AND** the unfiltered catalogue is refetched from offset 0
