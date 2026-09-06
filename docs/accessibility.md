# Accessibility measures for the application

This document describes the accessibility measures that were taken to make the application more accessible. Into two different categories: UX-Design and Screen reader support. We have also included a section discussing different technologies we have used to measure the accessibility of our application. Each category is described in a separate section, and the different measures are described in detail in each section.

## Table of contents

- [UX-Design](#ux-design)
  - [Color scheme](#color-scheme)
  - [Font](#font)
  - [Reduced information density](#reduced-information-density)
  - [Focus indicators](#focus-indicators)
  - [Section headings](#section-headings)
  - [Tooltips](#tooltips)
  - [User feedback on actions](#user-feedback-on-actions)
  - [Labelling of interactive elements](#labelling-of-interactive-elements)
  - [Component sources](#component-sources)
  - [The range sliders](#the-range-sliders)
  - [Responsive design](#responsive-design)
- [Screen reader support](#screen-reader-support)
  - [Keyboard navigation](#keyboard-navigation)
  - [HTML semantics](#html-semantics)
  - [ARIA attributes](#aria-attributes)
  - [Skip to content](#skip-to-content)
  - [Screen readers and infinite scroll](#screen-readers-and-infinite-scroll)
- [Technologies used to measure accessibility](#technologies-used-to-measure-accessibility)
  - [Firefox Accessibility](#firefox-accessibility)
  - [WAVE](#wave)
  - [aXe](#axe)
  - [Lighthouse](#lighthouse)
  - [Screen readers](#screen-readers)

---

## UX-Design

The design of the application was made with accessibility in mind, to make it as easy as possible for people with disabilities to use the application. Design choices that reinforce this, will also lead to a better user experience for everyone. The design choices that were made to make the application more accessible are listed below, and are explained in more detail in the following sections:

### Color scheme

The palette is a warm-paper ground with warm near-black ink and exactly one accent.
Every pair below is asserted by `frontend/src/styles/tokens.test.ts`, which fails the
build if a value drifts under its floor — the figures here are read out of that test
rather than measured by hand.

| Pair | Ratio | Floor | Used for |
| --- | --- | --- | --- |
| `ink` `#141413` on `ground` `#FAF9F5` | 17.50:1 | 4.5 | body prose |
| `ink-dim` `#57534E` on `ground` | 7.24:1 | 4.5 | secondary prose |
| `ink-mute` `#6B6459` on `ground` | 5.55:1 | 4.5 | labels, metadata |
| `accent` `#B25900` on `ground` | 4.61:1 | 4.5 | links, active states, focus ring |
| `ground` on `accent` | 4.61:1 | 4.5 | text reversed out of an accent fill |
| `rule-strong` `#8A8072` on `ground` | 3.68:1 | 3.0 | the border of a control with no fill |
| `rule` `#E5E1D8` on `ground` | 1.24:1 | — | hairline separators |

`rule` is deliberately below every floor and the test asserts that it stays there. A
hairline between list entries is decoration, not a control boundary, and WCAG requires
no contrast for it; `rule-strong` exists for the case that does. Asserting the weak one
is weak stops it being "fixed" into a visible grey line later.

**The accent was derived, not chosen.** The previous theme's `#FFCC48` measures 1.43:1
on this ground — saturated yellow cannot pass AA on cream at any usable lightness, and
neither can the two accents in the maintainer's design notes (terracotta `#D97757` at
2.96:1, rust `#C15F3C` at 4.01:1). The test walks that amber down in lightness at its
own hue until it clears 4.5:1, and `#B25900` is where it lands: a burnt amber, still
recognisably descended from the original.

Colour is never the only carrier. There is one accent by design, so error states are
distinguished by weight, position and an icon rather than by a second hue — which is
also what a red-green colour-blind reader needs.

### Font

The font used in the application is `Inter` by Rasmus Andersson. This font was chosen because it is a very readable font, and it is also very accessible. The font is available in many different weights, which makes it possible to use different weights to emphasize different parts of the application. The design heavily relies on the font weight and size to make the application more accessible and easier to use.

### Reduced information density

The application is designed to have a low information density. This means that there is not a lot of information on the screen at the same time. This makes it easier to focus on the information that is on the screen, and it makes it easier to navigate the application. The application is designed to have a lot of whitespace, which makes it easier to read the information on the screen.

### Focus indicators

The application has focus indicators for all interactive elements. This makes it easier to navigate the application using the keyboard, and it makes it easier to see what element is currently focused. The focus indicators are also used to show which element is currently selected in a list, and to show which element is currently being dragged.

### Section headings

The application uses section headings to divide the content of the application into different sections. This makes it easier to navigate the application, and it makes it easier to find the information that you are looking for. The section headings are also used to make the application more accessible for screen readers.

### Tooltips

For the filters in the application, we use tooltips to explain what the different filters do. This makes it easier to understand what the filters do, and it makes it easier to use the filters. The tooltips are also used to make the application more accessible for screen readers.

### User feedback on actions

The application gives the user feedback when they perform an action through ant-design's message components. This component is a popup message that clearly indicates wether the action was a success or an error. This makes it easier to understand what happened when you perform an action.

### Labelling of interactive elements

Interactive elements in the application are clearly labelled. This makes it easier to understand what the different elements do, and it makes it easier to use the application. Select buttons and textfield are examples of labeled components.

### Component sources

Most interactive elements are native: `<details>` for the collapsible filter groups,
`<dialog>` for the filter modal, `<select>` for sorting, `<input type="checkbox">` for
the style filters, `<label>` and `<hr>`. They are accessible by default, which is a
larger part of why the axe assertions pass than any library was.

The remaining components are shadcn/ui source vendored into
`frontend/src/components/ui/` and edited there — so an accessibility fix is a change
to code in this repository rather than a wait for an upstream release.

Two jsdom gaps are stubbed in `frontend/src/vitest-setup.ts`: it implements neither
`HTMLDialogElement.showModal()` nor `ResizeObserver`, and without those every test
that renders the filter panel throws before it reaches an axe assertion. The focus
trap and inert background that `<dialog>` provides are the browser's and are not
exercised by the unit suite.

### The range sliders

The ABV and IBU filters are two-thumb ranges, and `<input type="range">` has one
thumb. That is the whole reason a component package is present at all.

Originally this was MUI's `Slider`, adopted because Ant Design's failed the audit
under Firefox Accessibility, WAVE and aXe. Ant Design is gone, so the comparison it
existed to lose is gone with it, and the control is now Radix's through shadcn/ui —
which drops MUI and both emotion packages.

**The obligation transferred rather than lapsed.** `components/ui/slider.test.tsx`
asserts that each thumb is individually focusable and moves without the other, that
each announces its value and its bounds, that arrow keys, Home and End work, and that
the rendered control passes axe. Radix binds Home and End to the range's own ends
rather than to the focused thumb; that is documented in the test.

If you want `radix-ui` gone, the fallback is a labelled pair of native
`<input type="range">` controls for min and max — genuinely accessible, and worse to
use. Demonstrate it against those assertions before removing the dependency.

### Responsive design

The application is designed to be responsive, and to work on different screen sizes.

---

## Screen reader support

Screen readers are used by people with visual impairments to navigate the web. This is our measures to make the application more accessible for screen readers:

### Keyboard navigation

The application can be navigated using the keyboard. This makes it possible to use the application without a mouse, which is important for people with visual impairments. The application can be navigated using the `Tab` key, and the `Enter` key is used to select an element. The `Esc` key is used to exit the infinite scroll, and to close modals and popups.

### HTML semantics

HTML are important for accessibility because it provides semantic information about the content of the application. This makes it easier for screen readers to understand the content of the application, and it makes it easier to navigate the application using the keyboard. The application uses semantic HTML, and HTML5 tags like `<main>`, `<header>`, `<nav>`, `<section>`

### ARIA attributes

ARIA attributes like `aria-label` are used to make the application more accessible for screen readers. These attributes are used to provide additional information about the content of the application, and to make it easier to navigate the application using the keyboard. The application uses ARIA attributes for all interactive elements, and for all elements that are not self-explanatory.

### Skip to content

The application has a "skip to content" link that makes it possible to skip the navigation and go directly to the content of the application. This makes it easier to navigate the application using the keyboard.

We have only implemented it on the home page, as we felt the Beer-page was not complex enough to warrant it.

### Screen readers and infinite scroll

The application uses infinite scroll to load more data when the user scrolls to the bottom of the page. To exit the infinite scroll with keyboard navigation, the user can press the `Esc` key. This will exit the infinite scroll, and the user can continue to navigate the application using the keyboard.

### Information about results

The application provides information about the number of results that are currently displayed, what has been searched for, and how the results are sorted. This makes it easier to understand what is currently displayed, and it makes it easier to navigate the application using the keyboard.

---

## Technologies used to measure accessibility

We have used different technologies to measure the accessibility of our application. These technologies are described below:

### Firefox Accessibility

Firefox Accessibility is a tool that is built into Firefox. It is used to measure the accessibility of the application, and it is used to find accessibility issues. We have used this technology a lot in the development of the website. Link to the tool: https://developer.mozilla.org/en-US/docs/Tools/Accessibility_inspector

We have used Firefox accessibility in two ways. The first way using it to find any issues with the HTML semantics, contrast issues, keyboard navigation and so on. The second way is to see how the screen reader reads the application, by finding sections and roles tied to HTML elements. This is useful to see if the screen reader reads the application in a way that makes sense, and has been used to find issues with the HTML semantics and ARIA attributes.

![Document structure](../images/document-structure.png)

### WAVE

WAVE is an extension that is used to detect accessibility issues in the application. It is used to find issues with the HTML semantics, contrast issues, keyboard navigation and so on. We have used this thoroughly to find issues with the application. Link to the extension: https://wave.webaim.org/extension/

Using WAVE we have discovered that the main page has no errors, warnings, or contrast issues. The beer page has one warning on desktop, as it finds the "go back"-button redundant. We have chosen to keep this button, as it communicates to the user that they can go back to the previous page. The log in page also has an alert, which we have chosen to ignore.

<p align="middle">
  <img src="../images/WAVE-app.png" width="200" style="margin-right: 10px" />
  <img src="../images/WAVE-beer.png" width="200" style="margin-right: 10px" /> 
  <img src="../images/WAVE-login.png" width="200" />
</p>

### aXe

jest-axe is a tool that is used to find accessibility issues in the application. It usually looks for the most common accessibility issues, which makes it useful for an extra layer of accessibility testing. We do not rely solely on this tool, but it is useful to find issues that we might have missed. Link to the tool: https://github.com/NickColley/jest-axe

Its assertions run inside the unit suite, so **an accessibility failure is a test
failure**, not a warning. `make test-frontend` runs them; all of them pass. When one
fails, read the violation — the suite is otherwise render-plus-snapshot, and the axe
assertions are the part of it that checks behaviour rather than markup.

The matcher is registered through `expect.extend` in `src/vitest-setup.ts`, with its
Vitest type declared in `src/vitest.d.ts`. It previously came from `vitest-axe`, a
wrapper last published in October 2022 that predates Vitest 1.0; moving to `jest-axe`
directly left the assertions unchanged and removed a dependency.

### Lighthouse

Google Lighthouse is an automated tool used to improve the quality of web pages. It is used to measure the performance, accessibility, best practices and SEO of the application. It is used to find issues with the HTML semantics, contrast issues, keyboard navigation and so on. Link to the tool: https://developers.google.com/web/tools/lighthouse

Using Lighthouse, we found that the main page gets a score of 96 for accessibility, while the beer page and the log in page gets a score of 100 for accessibility. The reason we did not receive a score of 100 for the main page is because the BeerCard-components aria-label is not the same as the text in the card. We found that this was not an issue, as the aria-label only displays the name of the beer, which we find is the most important aspect of the beer card.

<p align="middle">
  <img src="../images/lighthouse-app.png" width="200" style="margin-right: 10px" />
  <img src="../images/lighthouse-beer.png" width="200" style="margin-right: 10px" /> 
  <img src="../images/lighthouse-login.png" width="200" />
</p>

### Screen readers

We have used screen readers to test the accessibility of the application. We have used the screen readers NVDA and VoiceOver. We have used the screen readers to test the keyboard navigation, and to test the HTML semantics and ARIA attributes.

Using screen readers we have currently found two issues, one of which had to do with the alcohol and IBU slider having poor aria labels. We have fixed this issue by adding aria labels to the sliders with more informative feedback. Another issue was that an image was used as a button, and it was hard to realise through the screen reader that the user could interact with the image. This was addressed by adding a button around the image, with an aria label that describes the button.

Other than that everything seems to work fine. There are some areas where the screen reader repeats itself, likely due to AntDesign's components, but we have not noted it as a major issue as the important information is still read out loud.
