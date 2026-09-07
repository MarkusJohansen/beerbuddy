## Context

A four-screen React SPA — catalogue, beer, login, fallback — on Vite, currently Ant Design 5
plus one MUI `Slider` plus 15 CSS Modules. The stack under it was rebuilt in
`modernize-stack`; the surface is unchanged since 2023.

| | Now |
| --- | --- |
| Theme tokens | 4 (`colorPrimary`, `borderRadius: 5`, `colorPrimaryBg`, `colorError`) |
| Colour literals in components | 59, across 15 files, incl. `#ffcb48` vs `#ffcc48` |
| Spacing / type / elevation scale | none — each file picks its own |
| Main column | `padding: 3rem 10rem`, no `max-width` |
| Card | `background: #333`, hover `#444`, active `#555`, `border-radius: 1rem` |
| Motion | `transition: all 0.5s ease-in-out`, and `transition: 200ms` |
| Focus ring | `#99a74b` on cards, `4px dashed #ffcc48` on collapse headers |
| Typeface | `Inter` named in `index.css`, never loaded — silently falls back |

The design target is not invented here. It is
`~/second-brain/03-areas/personal/My 2026 UX design thoughts.md`, section **My design
language**, and this document treats that note as the brief.

## Goals / Non-Goals

**Goals:**

- Execute the maintainer's stated design language on this app: Swiss skeleton, one accent
  carrying meaning only, type as the identity, subtract until it breaks.
- Get the corner radius, the rules, the palette and the type under our own control, which is
  the whole reason for the library swap.
- Make the token rules enforced rather than exhorted. "Component styles do not hard-code the
  palette" has been in the spec since the baseline and is violated 59 times, because nothing
  checked it.
- Come out of a component-library replacement with the same dependency count, not a bigger
  one.

**Non-Goals:**

- No dark mode. The brief says pick the register that enacts the claim and commit to it; a
  second theme is a second set of contrast decisions for a four-screen coursework app.
- No layout or information-architecture change. Same screens, same content, same places.
- No fix for any documented defect in README § Known problems, in particular not the
  1,019 kB chunk — though removing Ant Design will move that number, and the README must be
  updated with whatever it actually becomes.
- No font CDN, no CSS-in-JS runtime, no stylelint, no `react-hook-form`.

## Decisions

### 1. Ditch Ant Design, and why the earlier argument for keeping it does not survive the brief

The previous version of this change kept Ant Design and redesigned at its token layer. That
was the right call for the design goal I assumed and the wrong one for the goal that is
actually written down. The brief's skeleton is *sharp corners, hairline rules instead of
fills, no gradients or shadows or ornament, one accent* — every one of those is a place Ant
Design's defaults sit on the opposite side, not in its tokens but in its component internals,
so closing the gap means overriding `.ant-*` class names, which the current spec already
calls a last resort. A library whose last resort is the main tool is the wrong library.

shadcn/ui is not a dependency in the usual sense: the CLI copies component source into the
repository. That is exactly the control the brief needs — corner radius, rule weight, type and
palette become code we own.

The honest cost: Ant Design is the bulk of the 1,019 kB chunk, so this is also a large
bundle change, in a direction that has not been measured yet. Task 6.2 measures it.

### 2. The ladder before Radix — one Radix package, not ten

A default `shadcn add` for the thirteen Ant Design components in use pulls roughly ten
`@radix-ui/*` packages and lands the repo at ~53 direct dependencies, above the 55 that
`docs/sustainability.md` congratulates itself on having left. Applying the brief's own
subtractive rule to the component list first:

| Ant Design component | Replacement | Radix package |
| --- | --- | --- |
| `Collapse` (filter groups) | `<details>` / `<summary>` | — |
| `Modal` (filter dialog) | `<dialog>` + `showModal()` | — |
| `Select` + `Dropdown` (sort) | styled native `<select>` | — |
| `Checkbox` (style filters) | `<input type="checkbox">` | — |
| `Divider` | `<hr>` | — |
| Form `Item` label | `<label>` | — |
| `Button`, `Card`, `Input` | vendored shadcn source | — |
| `Spin` | CSS spinner | — |
| `FloatButton` (to top) | `<button>` | — |
| `App` `message` | `aria-live="polite"` region | — |
| `Tooltip` | visible helper text | — |
| MUI `Slider` (ABV/IBU) | shadcn `slider` | `@radix-ui/react-slider` |

Two of these are more than dependency arithmetic. **Native `<select>` deletes a responsive
branch** — it gets the platform picker on mobile, so the separate Dropdown variant and the
`width <= 768` branch that chose it both disappear. **Native `<dialog>` supplies the focus
trap, inert background, Escape handling and `::backdrop`** that are the hard parts of a modal
and the usual reason not to hand-roll one.

The `Tooltip` removal is a design decision, not a saving: the brief's rule is that a thing
must earn its place, and information worth showing on hover is information worth showing.

**Alternative considered: two separate `<input type="range">` controls for each of ABV and
IBU** instead of a two-thumb slider. Genuinely native, genuinely accessible, and it would
take the Radix count to zero. Rejected because a min/max pair reads worse for a range filter
than a single track, and because the brief's subtraction rule stops at "until it breaks" —
this one breaks the control's legibility. It is the fallback if Radix's slider fails the axe
assertions.

**Alternative considered: `sonner` for toasts**, which is shadcn's default. Rejected — an
`aria-live="polite"` region is about twenty lines and is the accessible primitive that a
toast library wraps.

Net: runtime −5 / +5, dev +2, repo **41 → 43**.

### 3. The register: warm-paper editorial on a Swiss skeleton

The brief picks the register from what the product *is*. BeerBuddy is a catalogue — 2,410
entries, ranked, with a measure of consensus attached to each. That is a reference work, an
almanac. The brief's decision table sends a data tool to Swiss and a reading product to the
warm-paper editorial register; a ranked catalogue you read sits between them, and the beer
subject settles it — malt and amber are already the warm end of the spectrum.

So: **Swiss skeleton, warm-paper surface.** Ivory ground, warm near-black ink, hairline rules,
sharp corners, the 12-column grid, a measure of 65–75ch. No photography exists in the dataset,
so there is no hero material to carry the colour — the ground and one accent do all of it.

**The app stops being dark.** This is the largest visible change in the redesign and the one
worth vetoing early if it is wrong.

### 4. Palette

Taken from the brief's own values where it names them, rather than invented nearby:

```
ground        #FAF9F5   the brief's book cream
ink           #141413   the brief's warm near-black
ink-dim       #57534E   secondary text
ink-mute      #6B6459   labels, metadata
rule          #E5E1D8   hairlines (warmed from the brief's #e3e3e3)
accent        TBD       a deepened amber, descended from #FFCC48
```

The accent is deliberately left unresolved here. `#FFCC48` on `#FAF9F5` is nowhere near
4.5:1, and the brief's own terracotta `#D97757` and rust `#C15F3C` do not reach it either at
body size. The value is *derived* in task 2.1 by walking the amber down in lightness until the
contrast test passes, rather than picked by eye and asserted afterwards. Expect somewhere
around a burnt amber; the test decides, and the resulting figure goes in
`docs/accessibility.md`.

`#99a74b`, the olive currently serving as the card focus ring, goes. It belongs to no ramp
and fails at `0.1rem` against `#333`.

There is no separate danger colour. The brief permits exactly one accent; error states are
carried by the accent plus weight and an icon, which is also better for the colour-blind than
a red that only differs by hue.

### 5. Type

The brief's rule 3 is that type carries the identity, so this is the one place to spend.

- **Display and beer names: Fraunces.** Variable, free, with soft and wonk axes — a
  characterful serif that reads as craft rather than corporate, which is the subject.
- **Interface, data and labels: Inter.** Neutral grotesque, tabular figures via
  `font-feature-settings: "tnum"`, which matters because votes, ABV and IBU are read as
  columns.

Self-hosted as subset `woff2` in `public/fonts/`. No npm dependency and no font-CDN request on
the critical path, at the cost of committing the subsets — the brief's own note that a
distinctive typeface is worth self-hosting.

*Alternative: Lora*, which the brief names as the free Tiempos stand-in. Safer, duller, and
the fallback if Fraunces' subset weight is unacceptable — measured in task 3.3.

Scale, from the brief verbatim: `13 / 17 / 23 / 30 / 40 / 64 px`, ratio ~1.333. Display at
weight 700, leading ~1.05, tracking `-0.02em`. Small uppercase labels tracked out `0.1em`.
Spacing: `4 / 8 / 16 / 24 / 32 / 48 / 64` and nothing else. Radius: `0`.

### 6. The restraint clause

The brief opens with a warning that deserves to be quoted rather than paraphrased: a prompt
listing a style's ingredients produces the amateur version of it, because the ingredients get
executed at maximum. Concretely, for this app:

- **One focal point per view.** On the catalogue that is the beer name; on the beer page, the
  name and its vote count. Not the sort control, not the filter sidebar, not the buttons.
- **The accent appears a handful of times per screen, not on every interactive element.**
  Buttons are ink-on-ground with a rule. The accent marks the active filter, the user's own
  vote, and links.
- **The expressive device is scale, and specifically numerals.** A catalogue ranked by votes
  has large numbers in it; the brief's Swiss section names oversized display type and large
  numerals as the sole expressive move, and that is the one this app gets.
- **In doubt, make it bigger and delete a neighbour.** Generous padding and fewer elements,
  not a filled canvas.

The acceptance test is the brief's: strip every accent-coloured rule and the hierarchy must
still read from type, grid and spacing alone. Task 6.1 runs it literally.

### 7. Enforcement by two tests, not by a linter

Both rules that were previously honour-system get a test, using the existing Vitest setup and
adding no dependency:

- `tokens.test.ts` — a ~20-line relative-luminance function asserting AA for each declared
  pair. This is also what *derives* the accent.
- `no-hardcoded-colours.test.ts` — asserts no hex, `rgb()`, `hsl()` or named colour appears
  outside the token stylesheet, allowing `transparent`, `currentColor`, `inherit`, `var(…)`
  and an explicit commented allowlist.

*Alternative: stylelint.* The right tool, and a new dependency plus config for what fifteen
lines of test does. Rejected under rule 6, which this change is already spending twice.

### 8. Tailwind v4, configured in CSS

Tailwind v4 takes its theme from `@theme` in CSS rather than a `tailwind.config.js`, which
means the token stylesheet and the Tailwind configuration are the same file — one source, no
sync problem. `@tailwindcss/vite` replaces the PostCSS pipeline. The CSS Modules all go; there
is no per-component stylesheet left, so the "one directory per component" convention in
CLAUDE.md loses its `.module.css` member and must be updated to say so.

## Risks / Trade-offs

- **This breaks two of CLAUDE.md's nine hard rules on purpose.** → Rule 5 permits removing MUI
  on a demonstrated replacement, which task 4.4 provides; rule 6 is argued in Decision 2 and
  the cost is +2 dev dependencies. Both rules, and `docs/sustainability.md`, are rewritten as
  part of this change rather than left contradicting the code.
- **Every snapshot changes, so the suite proves nothing during the transition.** → Snapshots
  are deleted and regenerated once, deliberately, in a commit of their own. During sections
  4 and 5 the axe assertions are the only test doing real work; that is the reason they are
  the acceptance gate rather than the snapshots.
- **`<dialog>`'s Escape handling collides with the app's own Escape binding**, which returns
  focus to the skip link. → An explicit scenario in the spec, and a test. The dialog's
  `cancel` event must stop propagation.
- **Native `<select>` is the hardest native control to style**, and the styled result may not
  reach the design. → `appearance: none` plus a background chevron gets there for a closed
  select; the open popup is the OS's and cannot be styled, which is a deliberate acceptance,
  not an oversight. If it looks wrong, the fallback is `@radix-ui/react-select` at +1
  dependency and the return of the mobile branch.
- **Fraunces' subset may be heavier than the design is worth.** → Measured in 3.3 against the
  Lora fallback, with a stated budget rather than a judgement call after the fact.
- **Removing Ant Design changes the bundle by an unknown amount in an unmeasured direction.**
  → Measured before and after in 6.2. The README states 1,019 kB and will be wrong.
- **This is a very large diff with no behavioural test coverage behind it.** → Nothing here
  changes behaviour, but the snapshot suite is weak exactly where a rewrite is risky. The
  four screens are walked by hand at four widths, with the keyboard, in 6.1.

## Migration Plan

Presentational only; there is no state to migrate and no deployment concern. Sequencing is for
reviewability:

1. Tailwind, the token stylesheet, the fonts and both tests land, with Ant Design still
   present and nothing visibly changed.
2. `components/ui/` is vendored and the native replacements are written, still unused.
3. Components convert screen by screen — catalogue, beer, login, fallback — each with its own
   snapshot regeneration.
4. Ant Design, MUI and emotion are removed from `package.json`; `ant-design-overrides.css`
   and the 15 CSS Modules are deleted.
5. Documentation, including the two hard rules this change invalidates.

Rollback is `git revert` of the range.

## Open Questions

- **The app stops being dark.** The brief points at warm paper for this register and the
  decision follows it, but it is the change most likely to be a surprise. Worth confirming
  before section 3 rather than after.
- **Fraunces or Lora.** Recommendation is Fraunces; the subset budget in 3.3 may overrule it.
- **The five styleless beers reachable only through "Other"** stay a documented defect, but a
  redesigned sidebar makes the "Other" bucket more prominent than it is today. Not blocking;
  the README may need to describe the defect differently afterwards.
