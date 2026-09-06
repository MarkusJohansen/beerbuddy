## MODIFIED Requirements

### Requirement: Theming Through Ant Design Tokens
The system SHALL take its colour, type, spacing, radius and motion values from the token
stylesheet described in the `design-system` capability, exposed to components through
Tailwind's `@theme` and applied as utility classes.

There are no per-component CSS Modules and no component library theme to configure. shadcn/ui
component source is vendored into `frontend/src/components/ui/` and edited directly, so a
visual decision is a change to code in this repository rather than an override fighting a
library's internals. `ant-design-overrides.css` is deleted along with Ant Design.

Where a native HTML element does the job — `<details>`, `<dialog>`, `<select>`,
`<input type="checkbox">`, `<label>`, `<hr>` — it is used in preference to a vendored
component, because it is accessible by default and unornamented by default, and the second of
those is what this design wants.

#### Scenario: A new component is added
- **THEN** it takes its colours, spacing, radius and motion from the token layer through
  Tailwind utilities, and defines no colour of its own

#### Scenario: A vendored component does not match the design
- **WHEN** its appearance needs changing
- **THEN** its source in `components/ui/` is edited directly

#### Scenario: A control has a native equivalent
- **WHEN** a new interactive control is needed
- **THEN** the native element is used unless it cannot express the required interaction

### Requirement: Which Components Render Is Decided In JavaScript
The system SHALL decide *which* components render at a given viewport width in JavaScript,
from `useWindowDimensions()`, comparing against breakpoint constants imported from one module
rather than numeric literals written per component.

The 768 px and 1000 px thresholds were previously duplicated as literals across components,
and the baseline spec named the seventh copy as the point to extract a constant; that point
was reached. Tailwind's own responsive variants carry the sizing and visibility work that CSS
media queries did before, from the same two values declared once in the theme.

The sort control no longer branches: a styled native `<select>` renders at every width and
receives the platform picker on mobile, which removes both the Dropdown variant and the
branch that chose it.

#### Scenario: The window is resized
- **WHEN** the viewport width crosses a breakpoint
- **THEN** the affected components re-render into the other variant without a reload

#### Scenario: A narrow viewport is used
- **WHEN** width is at or below 768 px
- **THEN** beer attributes render as a compact list and the comment submit button renders as
  an icon

#### Scenario: A medium viewport is used
- **WHEN** width is below 1000 px
- **THEN** the welcome header is replaced by the logo alone and the beer page uses its
  stacked header

#### Scenario: A breakpoint value needs to move
- **WHEN** a threshold is changed in the breakpoints module
- **THEN** every JavaScript branch and every Tailwind variant that depends on it changes with
  it

### Requirement: Sidebar And Filter Modal Swap At 1000 Pixels In CSS
The system SHALL hide the filter sidebar and reveal the filter button below 1000 px, through
Tailwind responsive variants bound to the shared breakpoint, and SHALL present the same
filters in a native `<dialog>` opened with `showModal()`.

`<dialog>` supplies the focus trap, the inert background, the Escape handler and the
`::backdrop` that a vendored modal would otherwise carry a dependency to provide. Its Escape
handling must not conflict with the application's own Escape binding, which returns focus to
the skip link.

#### Scenario: A viewport below 1000 px is used
- **THEN** the sidebar is hidden and the filter button is shown, opening the same filters in
  a modal dialog

#### Scenario: The window is widened past 1000 px with the filter dialog open
- **THEN** the dialog is closed and the sidebar becomes visible again

#### Scenario: Escape is pressed with the filter dialog open
- **THEN** the dialog closes, focus returns to the button that opened it, and the
  application's skip-link behaviour is not triggered

## REMOVED Requirements

### Requirement: Material UI Is Carried For The Range Sliders
**Reason**: MUI was carried solely because Ant Design's `Slider` failed the accessibility
audits. Ant Design is gone, so the comparison it existed to lose is gone with it. Keeping MUI
would mean keeping a second component library and both emotion packages for one control.

**Migration**: The ABV and IBU ranges move to `@radix-ui/react-slider` through shadcn/ui's
vendored `slider`. The accessibility obligation transfers intact — see the added requirement
below. `@mui/material`, `@emotion/react` and `@emotion/styled` are removed from
`frontend/package.json`, and `docs/accessibility.md` and CLAUDE.md rule 5 are rewritten to
describe the replacement rather than the removed library.

## ADDED Requirements

### Requirement: The Range Sliders Remain Keyboard And Screen Reader Operable
The system SHALL provide two-thumb ABV and IBU range controls in which each thumb is
individually focusable, operable by arrow keys, Home and End, and announces its current value
and its bounds to assistive technology.

This is the obligation MUI's `Slider` discharged. It is restated rather than assumed because
it is the sole reason a Radix dependency is added at all, and because CLAUDE.md permits
removing MUI only on a demonstrated replacement.

#### Scenario: A range filter is operated by keyboard
- **WHEN** the user tabs to the ABV control
- **THEN** each thumb is reachable in turn and moves by arrow key without the other moving

#### Scenario: A screen reader reads a thumb
- **THEN** it announces the thumb's role, its current value, and the minimum and maximum of
  its range

#### Scenario: The replacement is verified
- **WHEN** the unit suite runs
- **THEN** an axe assertion covers the rendered sliders and passes

### Requirement: Motion Is Purposeful And Optional
The system SHALL animate only compositable properties — `transform`, `opacity`,
`background-color`, `border-color` — naming each rather than transitioning `all`, and SHALL
suppress non-essential motion when the user has asked for reduced motion.

Motion here is minimal by design: this aesthetic has no shadows to lift and no ornament to
animate, so motion exists only to make a state change legible.

#### Scenario: A control is hovered or pressed
- **THEN** it responds within the motion scale's short duration, and the transition names the
  properties it animates

#### Scenario: The user has set a reduced-motion preference
- **WHEN** `prefers-reduced-motion: reduce` matches
- **THEN** transitions and entrance animations are reduced to no perceptible movement, while
  state remains distinguishable through colour, rule and weight alone

#### Scenario: A page of beers is appended by infinite scroll
- **THEN** the new entries appear without displacing the reader's scroll position
