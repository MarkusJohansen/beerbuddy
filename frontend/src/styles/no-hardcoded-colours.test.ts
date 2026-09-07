import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * "Component styles do not hard-code the palette" has been in the spec since the
 * baseline and was violated 59 times across 15 files, because nothing checked
 * it. This is the check.
 *
 * Vitest's cwd is the package root.
 */

const TOKENS = "src/styles/tokens.css";

/** Colour keywords worth catching; the full CSS list is 148 and not the point. */
const NAMED =
  /\b(white|black|red|green|blue|yellow|orange|purple|pink|grey|gray|brown|gold|silver|beige|ivory|cream|tan|olive|navy|teal|cyan|magenta|maroon|salmon|coral|khaki|crimson)\b/;

const LITERAL = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\brgba?\s*\(/,
  /\bhsla?\s*\(/,
  /\boklch\s*\(/,
  NAMED,
];

/**
 * Deliberate exceptions. Each entry is a file and the reason it is allowed to
 * hold a literal — an empty list is the intended steady state, and an addition
 * is a visible decision rather than a drift.
 */
const ALLOWED: ReadonlyArray<[string, string]> = [];

const sources = (readdirSync("src", { recursive: true }) as string[])
  .filter((f) => /\.(css|tsx|ts)$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => `src/${f}`)
  .filter((f) => f !== TOKENS)
  .filter((f) => !ALLOWED.some(([allowed]) => allowed === f));

/** Strip what a colour literal is allowed to hide inside: comments and urls. */
const strip = (text: string) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/url\([^)]*\)/g, "");

describe("no hard-coded colours outside the token stylesheet", () => {
  it.each(sources)("%s declares no colour of its own", (file) => {
    const offenders = strip(readFileSync(file, "utf8"))
      .split("\n")
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => LITERAL.some((pattern) => pattern.test(line)))
      .map(([n, line]) => `${file}:${n}  ${line.trim()}`);

    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("scans something", () => {
    expect(sources.length).toBeGreaterThan(0);
  });
});
