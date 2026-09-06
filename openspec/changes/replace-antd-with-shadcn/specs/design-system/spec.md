## ADDED Requirements

### Requirement: One Source Of Design Values
The system SHALL define every colour, type size, spacing step, radius and motion duration
once, as CSS custom properties in a single token stylesheet consumed by Tailwind's `@theme`,
and component styles SHALL reference those properties rather than restating values.

Before this change the palette existed in five places — the Ant Design `ConfigProvider`
tokens, `index.css`, `ant-design-overrides.css`, 15 CSS Modules and one inline style — which
is how `#ffcb48` came to sit beside `#ffcc48` undetected for two years.

#### Scenario: A colour needs to change
- **WHEN** a palette value is edited in the token stylesheet
- **THEN** every component renders the new value, with no other file edited

#### Scenario: A component style is written
- **WHEN** a component needs a colour, a spacing step, a radius or a duration
- **THEN** it uses a Tailwind utility bound to a token, and no literal hex, `rgb()`, `hsl()`
  or named colour appears in the component

#### Scenario: The rule is checked
- **WHEN** the frontend sources are scanned for colour literals
- **THEN** the only file permitted to contain them is the token stylesheet

### Requirement: Exactly One Accent, Carrying Meaning Only
The system SHALL use a single accent colour, applied only where it carries meaning — a link,
an active filter, the user's own vote, a key numeral — and never as decoration or as a
second competing hue.

The rest of the interface is the ground and the ink. A control being important is not a
reason for it to be accent-coloured; if every button is the accent, none of them is.

#### Scenario: The accent is removed
- **WHEN** every accent-coloured rule is stripped from the stylesheet
- **THEN** the hierarchy of every screen still reads from type size, weight, position and
  whitespace alone

#### Scenario: A second colour is proposed
- **WHEN** a new hue is wanted to distinguish a state
- **THEN** the state is distinguished by weight, rule, position or the existing accent, and
  the hue is not added

### Requirement: Scales Rather Than Ad Hoc Values
The system SHALL express spacing, type and radius as fixed scales — spacing at
4/8/16/24/32/48/64 px, type on a ~1.333 ratio at 13/17/23/30/40/64 px, radius at zero — and
component styles SHALL pick a step rather than an arbitrary value.

Sharp corners are the default and not a step on a radius scale. Rounding is not available to
a component that wants to look friendlier.

#### Scenario: A component needs vertical rhythm
- **WHEN** a style sets margin, padding or gap
- **THEN** the value is a step from the spacing scale

#### Scenario: A value genuinely falls outside every scale
- **WHEN** a layout needs a measurement no step provides
- **THEN** it is written as an arbitrary value with a comment naming why, rather than a new
  step being added to the scale

### Requirement: Surfaces Are Separated By Rules, Not By Fills Or Shadows
The system SHALL separate regions with hairline rules and whitespace, and SHALL NOT use drop
shadows, gradients, glows, or alternating background fills for that purpose.

A card is a region of the page bounded by a rule, not a floating object. Tables and lists get
rules, not zebra striping.

#### Scenario: A list of beers is rendered
- **THEN** entries are separated by hairline rules and spacing, with no shadow, gradient or
  alternating fill

#### Scenario: A modal is opened
- **THEN** it is distinguished from the page by its backdrop and its rules, not by elevation

### Requirement: Type Carries The Identity
The system SHALL pair one serif for beer names and display text with one grotesque for
interface text and data, self-hosted as subset `woff2` files from `public/`, and SHALL render
numerals in the data columns with tabular figures.

Self-hosting rather than linking a font CDN keeps the critical path free of a third-party
request and the app working offline, at the cost of the subset files being committed. Tabular
figures matter because votes, ABV and IBU are read as columns.

#### Scenario: The page loads with no network beyond the origin
- **THEN** both typefaces render, and no request is made to a font CDN

#### Scenario: Vote counts of differing digit lengths are listed
- **THEN** the digits align vertically

### Requirement: Contrast Is Chosen, Not Discovered
The system SHALL meet WCAG 2.1 AA for every foreground/background pair the token layer
defines: at least 4.5:1 for body text, and 3:1 for large text and for the non-text boundaries
of interactive controls.

A warm ivory ground is less forgiving than the dark one it replaces — the existing `#FFCC48`
amber does not pass on it at body size, so the accent is deepened until it does rather than
the rule being relaxed. The axe assertions catch violations on rendered output; this
requirement is upstream of them.

#### Scenario: A palette pair is added or changed
- **WHEN** a foreground token is intended to sit on a background token
- **THEN** its contrast ratio is computed and asserted before the pair is used

#### Scenario: A pair falls below the floor
- **THEN** the token is adjusted until it passes, rather than the assertion being scoped
  around it

### Requirement: Focus Is Visible Against Every Surface
The system SHALL render a focus indicator meeting the 3:1 non-text contrast floor against
every background a focused element can appear on, at every viewport width.

#### Scenario: A keyboard user tabs through the catalogue
- **THEN** each focused control shows an indicator distinguishable from both its own
  background and the surrounding surface

#### Scenario: An element is focused inside the filter dialog
- **THEN** the indicator remains visible against the dialog's surface and its backdrop
