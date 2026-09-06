import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Read off disk rather than imported: Vitest stubs CSS imports by default, so
// both `./tokens.css` and `./tokens.css?raw` arrive empty. Vitest's cwd is the
// package root.
const css = readFileSync("src/styles/tokens.css", "utf8");

/**
 * The palette is checked here rather than only in the rendered output, because
 * axe can only tell you a pair failed once something has been built on it. A
 * token that cannot pass is caught before a component is written against it.
 *
 * This is also where the accent came from: `#FFCC48` on a `#FAF9F5` ground is
 * 1.43:1, so the amber was walked down in lightness until it cleared 4.5:1.
 */

/** Every `--color-*` declared in the token stylesheet, by name without the prefix. */
const palette = Object.fromEntries(
  [...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\s*;/g)].map((m) => [
    m[1],
    m[2],
  ])
);

/** WCAG 2.1 relative luminance of an `#rrggbb` colour. */
const luminance = (hex: string): number => {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

/** WCAG 2.1 contrast ratio between two `#rrggbb` colours, 1–21. */
const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** Pairs the design actually puts on screen, and the floor each one must clear. */
const pairs: ReadonlyArray<[string, string, number, string]> = [
  ["ink", "ground", 4.5, "body prose"],
  ["ink-dim", "ground", 4.5, "secondary prose"],
  ["ink-mute", "ground", 4.5, "labels and metadata"],
  ["accent", "ground", 4.5, "links, at body size"],
  ["ground", "accent", 4.5, "text reversed out of an accent fill"],
  ["rule-strong", "ground", 3.0, "the border of a control with no fill"],
  ["accent", "ground", 3.0, "the focus ring"],
];

describe("palette contrast", () => {
  it.each(pairs)("%s on %s clears %s:1 (%s)", (fg, bg, floor) => {
    expect(palette[fg], `--color-${fg} is not declared`).toBeDefined();
    expect(palette[bg], `--color-${bg} is not declared`).toBeDefined();
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(floor);
  });

  it("declares no colour the design does not use", () => {
    const declared = Object.keys(palette).sort();
    expect(declared).toEqual([
      "accent",
      "ground",
      "ink",
      "ink-dim",
      "ink-mute",
      "rule",
      "rule-strong",
    ]);
  });

  /**
   * `rule` is deliberately below every floor: a hairline between list items is
   * decoration, not a control boundary, and WCAG does not require contrast for
   * it. `rule-strong` exists for the case that does. Asserting the weak one is
   * weak keeps someone from "fixing" it into a visible grey line later.
   */
  it("keeps the decorative hairline decorative", () => {
    expect(contrast(palette["rule"], palette["ground"])).toBeLessThan(3);
  });
});
