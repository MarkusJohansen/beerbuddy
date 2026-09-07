## Why

The interface has not been touched since the 2023 coursework: flat `#333` cards on `#1f1f1f`,
circular amber buttons outlined in `2px solid black`, `transition: all 0.5s ease-in-out`,
`padding: 3rem 10rem` with no measure, and 59 hard-coded colour literals across 15 CSS
Modules — including `#ffcb48` sitting one digit from the theme's `#ffcc48`. `index.css`
names `Inter` and never loads it, so the current typography is not a choice anyone made.
The stack under the surface was rebuilt in `modernize-stack`; the surface was not.

The target look is the one written down in the maintainer's design notes
(`~/second-brain/03-areas/personal/My 2026 UX design thoughts.md`): Swiss discipline as the
skeleton — 12-column grid, a fixed spacing scale, sharp corners, hairline rules, whitespace
as material, no gradients or shadows — with exactly one accent that only ever carries
meaning, and typography rather than layout carrying the identity.

**Ant Design cannot get there.** Its visual language is rounded, shadowed and
greyscale-opinionated; those are its token defaults and also its component internals, so the
gap has to be closed by fighting the library rather than configuring it. shadcn/ui inverts
that: the component source is vendored into the repository, so the corner radius, the rules,
the type and the palette are ours to set rather than ours to override.

## What Changes

- **Remove Ant Design, `@ant-design/icons`, MUI and both emotion packages.** **BREAKING** for
  anyone with a local branch touching the frontend — every component's markup changes.
- **Adopt Tailwind CSS v4 and vendor shadcn/ui component source** into
  `frontend/src/components/ui/`, styled from a token layer rather than shadcn's defaults.
- **Apply the ladder before reaching for Radix.** Six of the components shadcn would pull a
  Radix package for have native equivalents that are accessible by default and unornamented
  by default, which is what this aesthetic wants: `<details>/<summary>` for the filter
  accordion, `<dialog>` for the filter modal, a styled native `<select>` for sorting,
  `<input type="checkbox">`, `<label>` and `<hr>`. `@radix-ui/react-slider` is kept as the
  one exception — the two-thumb ABV/IBU range has no native equivalent, and it is the reason
  MUI is in the tree today.
- **Delete a responsive branch.** Native `<select>` gets the OS picker on mobile for free, so
  the separate mobile Dropdown variant of the sort control goes away.
- **Flip the register to warm paper.** Ivory ground, warm near-black ink, one deepened amber
  accent, a serif/grotesque pairing self-hosted from `public/`. The app stops being dark.
- **Establish and enforce the token layer**: one palette, the design notes' 1.333 type scale
  and 4/8/16/24/32/48/64 spacing scale, with two tests making the "no literals" and
  "AA contrast" rules checkable rather than honour-system.
- **NOT changing**: no backend change, no API change, no change to what any screen shows or
  to filtering, sorting, voting or commenting behaviour. No documented defect in
  README § Known problems is fixed here.

## Capabilities

### New Capabilities

- `design-system`: the token layer and the discipline around it — the palette, type,
  spacing and radius scales, the single-accent rule, the contrast floor, and the rule that
  component styles consume tokens rather than restating values.

### Modified Capabilities

- `responsive-accessible-ui`: the theming requirement moves from Ant Design `ConfigProvider`
  tokens to the Tailwind/shadcn token layer; the MUI requirement is **removed** and replaced
  by a Radix slider requirement with the same accessibility obligation; the responsive
  requirement loses the mobile sort-dropdown branch and gains breakpoints imported from one
  module; and a new requirement makes motion name its properties and respect
  `prefers-reduced-motion`.

## Impact

- **Dependencies.** Runtime: −5 (`antd`, `@ant-design/icons`, `@mui/material`,
  `@emotion/react`, `@emotion/styled`), +5 (`@radix-ui/react-slider`,
  `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`) — net zero, frontend
  stays at 11. Dev: +2 (`tailwindcss`, `@tailwindcss/vite`). **Repo total 41 → 43.**
  `docs/sustainability.md` states 41 and must be rewritten with the new figures and the
  reasoning, not quietly left stale.
- **Hard rules engaged.** Rule 5 (do not remove MUI) is deliberately broken; it permits
  removal on demonstrating a replacement that passes the axe assertions, which task 4.4
  does. Rule 6 (do not add dependencies) is engaged for the two dev additions and argued
  above. Both need CLAUDE.md updated once this lands.
- **Code.** Every file under `frontend/src/components/` and `frontend/src/pages/`; all 15
  CSS Modules are deleted in favour of Tailwind utilities plus one token stylesheet;
  `main.tsx`, `index.css`, `vite.config.ts`, `package.json`.
- **Tests.** All 85 frontend tests keep running; snapshots are regenerated deliberately and
  reviewed as a diff. The axe assertions are the load-bearing check here — native controls
  and Radix should make them easier to pass than Ant Design did, but that is a claim the
  suite has to confirm, not an assumption.
- **Docs.** `docs/sustainability.md`, `docs/accessibility.md`, `CLAUDE.md` rules 5 and 6,
  `ARCHITECTURE.md` (theming, decision log), `README.md`, `frontend/README.md`.
