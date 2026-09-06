## Purpose

Cross-cutting presentation: how the interface adapts to viewport width, the accessibility
guarantees that are enforced by tests, and the theming approach. These constraints apply to
every screen, so they are specified once here rather than repeated per capability.

## Requirements

### Requirement: Which Components Render Is Decided In JavaScript
The system SHALL decide *which* components render at a given viewport width in JavaScript, from `useWindowDimensions()`, branching at 768 px and 1000 px.

This is the convention new components follow: structural branching in JS rather than
rendering both variants and hiding one. The two thresholds are magic numbers duplicated
across components — a seventh copy is the point at which to extract a constant.

CSS media queries are *also* present, in 11 stylesheets, and carry the complementary job of
sizing and visibility (see the next requirement). The two mechanisms are not consistently
separated; describing this codebase as "responsive in JavaScript" is true of the component
tree and not of the stylesheets.

#### Scenario: The window is resized
- **WHEN** the viewport width crosses a breakpoint
- **THEN** the affected components re-render into the other variant without a reload

#### Scenario: A narrow viewport is used
- **WHEN** width is at or below 768 px
- **THEN** sorting renders as a dropdown button instead of a select, beer attributes render as a compact list, and the comment submit button renders as an icon

#### Scenario: A medium viewport is used
- **WHEN** width is below 1000 px
- **THEN** the welcome header is replaced by the logo alone and the beer page uses its stacked header

### Requirement: Sidebar And Filter Modal Swap At 1000 Pixels In CSS
The system SHALL hide the filter sidebar and reveal the filter button below 1000 px, through CSS media queries rather than the JavaScript branching above.

Both the sidebar and the filter button are always mounted; `Sidebar.module.css` and
`FilterButton.module.css` decide which is visible. The filter button additionally closes its
modal in JavaScript whenever the width rises back above 1000 px. Stylesheets across the
frontend also use 768, 950, 1240 and 1380 px for sizing.

#### Scenario: A viewport below 1000 px is used
- **THEN** the sidebar is hidden and the filter button is shown, opening the same filters in a modal

#### Scenario: The window is widened past 1000 px with the filter modal open
- **THEN** the modal is closed and the sidebar becomes visible again

### Requirement: Keyboard And Screen Reader Navigation
The system SHALL provide a skip link to the main content, return focus to it on Escape, and label interactive controls and landmark sections for assistive technology.

#### Scenario: A keyboard user lands on the catalogue
- **WHEN** the user tabs into the page
- **THEN** a "Skip to main content" link is the first stop and jumps to the beer list

#### Scenario: The user presses Escape
- **THEN** focus returns to the skip link

#### Scenario: A screen reader enumerates the page
- **THEN** the sidebar, search-and-sort bar, beer list, beer attributes and comment list each announce a label

### Requirement: Accessibility Failures Are Test Failures
The system SHALL assert accessibility inside the unit suite, so a violation fails the build.

Component tests run `axe` from `jest-axe` over the rendered container and assert against
the `vitest-axe` matchers registered in `frontend/src/vitest-setup.ts`.

The suite is render-plus-snapshot: good at catching markup change, weak at catching wrong
behaviour. A failing snapshot or axe assertion is read and understood, not refreshed with
`-u`.

#### Scenario: A change introduces an accessibility violation
- **WHEN** `npm run test:vitest` runs
- **THEN** the axe assertion fails and the change does not pass CI

### Requirement: Material UI Is Carried For The Range Sliders
The system SHALL use Material UI's `Slider` for the ABV and IBU range controls, alongside Ant Design for everything else.

Ant Design's `Slider` failed the accessibility audits. MUI is a second component library
carried for exactly one component; it reads as obvious bloat and is a deliberate
accessibility decision — see `docs/accessibility.md`.

#### Scenario: A range filter is operated by keyboard
- **THEN** each thumb is reachable and announces its value through the MUI slider's ARIA labels

### Requirement: Theming Through Ant Design Tokens
The system SHALL define colour and radius centrally as Ant Design `ConfigProvider` tokens under the dark algorithm, with per-component CSS Modules for layout.

Component styles do not hard-code the palette. `ant-design-overrides.css` reaches library
internals the tokens cannot, and is a last resort.

#### Scenario: A new component is added
- **THEN** it takes its colours from the theme tokens and its layout from its own CSS Module

### Requirement: Return To Top On Long Lists
The system SHALL offer a scroll-to-top control once the catalogue has been scrolled past 100 pixels.

#### Scenario: The user scrolls down the catalogue
- **WHEN** the main scroll container's offset exceeds 100 px
- **THEN** a floating "To top" button appears and returns the list to the top smoothly when activated
