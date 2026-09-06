## 1. Foundation

- [x] 1.1 Add `tailwindcss` and `@tailwindcss/vite` as dev dependencies and wire the plugin
      into `vite.config.ts`.
- [x] 1.2 Write `frontend/src/styles/tokens.css`: the palette, the 13/17/23/30/40/64 type
      scale, the 4/8/16/24/32/48/64 spacing scale, radius `0`, and motion durations, declared
      inside Tailwind v4's `@theme`. This is the only file permitted to hold a colour literal.
- [x] 1.3 Add `frontend/src/utils/breakpoints.ts` exporting `MOBILE = 768` and
      `TABLET = 1000`, and declare the same two values as Tailwind screens in `@theme` so the
      JavaScript branches and the responsive variants share one source.
- [x] 1.4 Subset Fraunces and Inter to Latin, place the `woff2` files in
      `frontend/public/fonts/`, and declare `@font-face` with `font-display: swap` and
      `"tnum"` enabled on the Inter data styles. Remove the unloaded `Inter` from the old
      font stack.

## 2. Enforcement, before anything is styled

- [x] 2.1 Add `frontend/src/styles/tokens.test.ts`: a relative-luminance contrast function
      asserting AA for every declared pair. **Derive the accent here** — walk the amber down
      from `#FFCC48` until it clears 4.5:1 on `#FAF9F5`, and record the value it lands on.
- [x] 2.2 Add `frontend/src/styles/no-hardcoded-colours.test.ts`: assert no hex, `rgb()`,
      `hsl()` or named colour appears outside `tokens.css`, allowing `transparent`,
      `currentColor`, `inherit`, `var(…)` and a commented allowlist. Land it skipped; unskip
      in 5.6.
- [x] 2.3 Record the resulting contrast table in `docs/accessibility.md`.

## 3. Components, written but not yet wired

- [x] 3.1 Initialise shadcn/ui against the token layer and vendor only `button`, `card`,
      `input` and `slider` into `frontend/src/components/ui/`. Set radius to `0`, strip the
      shadow utilities from the vendored source, and replace shadcn's default palette
      references with the tokens.
- [x] 3.2 Write the native replacements: `<details>` filter groups, a `<dialog>` filter
      modal, a styled native `<select>` sort control, styled `<input type="checkbox">`, an
      `<hr>` divider, a CSS spinner, and an `aria-live="polite"` region replacing Ant
      Design's `message`.
- [x] 3.3 Measure the Fraunces subset against the Lora fallback and decide, recording the
      number rather than the preference.
- [x] 3.4 Verify the `<dialog>` `cancel` event does not trigger the application's own Escape
      binding, with a test.

## 4. Screen conversion

- [x] 4.1 Catalogue (`App`, `BeerList`, `BeerCard`, `Voter`, `Actionbar`): hairline-separated
      entries, Fraunces beer names, tabular vote numerals as the expressive device, no
      shadows, no radius.
- [x] 4.2 Filters (`Sidebar`, `Filters`, `FilterButton`): `<details>` groups, native
      checkboxes, the `<dialog>` below 1000 px, accent on active filters only.
- [x] 4.3 Beer page (`Beer`, `BeerAttribute`, `MobileBeerAttribute`, `CommentBar`,
      `CommentItem`), including replacing the tooltips with visible helper text.
- [x] 4.4 Move the ABV and IBU ranges to the vendored Radix slider, **remove MUI and both
      emotion packages**, and demonstrate the replacement: an axe assertion over the rendered
      sliders plus a keyboard test that each thumb moves independently. This is what CLAUDE.md
      rule 5 requires; if it fails, fall back to paired `<input type="range">` controls per
      design.md § 2.
- [x] 4.5 Login (`LogIn`, `LoginFormDesktop`, `LoginFormMobile`) and `FallbackPage`.
- [x] 4.6 Replace the literal 768 and 1000 in component JavaScript with the breakpoints
      module, and delete the mobile sort-Dropdown branch made redundant by native `<select>`.

## 5. Removal

- [x] 5.1 Remove `antd` and `@ant-design/icons` from `package.json`; replace the icons in use
      with `lucide-react`.
- [x] 5.2 Delete all 15 `*.module.css` files and `ant-design-overrides.css`.
- [x] 5.3 Delete every obsolete snapshot, regenerate, and land the regeneration as one commit
      of its own.
- [x] 5.4 Replace every `transition: all` with a property-named transition from the motion
      scale.
- [x] 5.5 Add the `prefers-reduced-motion: reduce` block and check the app is still legible
      with it forced on.
- [x] 5.6 Unskip `no-hardcoded-colours.test.ts` and make it pass.

## 6. Verification

- [ ] 6.1 **NOT DONE — needs a human at a browser.** The mechanical half was run: the
      accent appears in nine components, and every use outside a focus ring is a link, a
      hover state, the user's own vote, the skip link or the one primary button, so the
      single-accent rule holds. The visual half — stripping the accent and reading the
      hierarchy, then walking all four screens at 375/768/1000/1440 px with the keyboard
      to confirm the focus ring is visible on every surface — has not been done. The app
      runs at http://localhost:5173.
- [x] 6.2 Measure the production bundle before and after; the README states 1,019 kB and will
      be wrong.
- [x] 6.3 `make check` — lint, format, typecheck and both suites green.

## 7. Documentation

- [x] 7.1 Rewrite `docs/sustainability.md`: the count moves 41 → 43, and the argument has to
      account for a component-library swap that held runtime dependencies flat.
- [x] 7.2 Rewrite CLAUDE.md rule 5 (MUI is gone; the obligation transferred to Radix) and
      rule 6 (two dev dependencies added, with the reasoning). Update the "one directory per
      component" convention, which no longer has a `.module.css` member.
- [x] 7.3 Update `ARCHITECTURE.md`: the theming section, and a § 13 decision entry recording
      that Ant Design was replaced, with the alternative — keeping it and theming through
      tokens — and why the design brief ruled it out.
- [x] 7.4 Update `README.md` (bundle size, stack description) and `frontend/README.md`.
- [x] 7.5 Answer or carry forward the three Open Questions in design.md.
