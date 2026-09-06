/**
 * The styles the filter panel names individually, and how "Other" expands.
 *
 * Previously this was two hardcoded lists in two packages — 15 names here and 85
 * in the backend's `otherStyles` — which together had to cover exactly the 100
 * distinct styles in the catalogue, with nothing enforcing it. Editing one made a
 * style unreachable in the interface.
 *
 * Now only the 15 displayed names are listed. "Other" is the complement, computed
 * against the styles the API reports, so a style added to the data is always
 * reachable.
 */

/** Styles offered as their own checkbox. */
export const NAMED_STYLES = [
  "American IPA",
  "American Pale Ale (APA)",
  "American Amber / Red Ale",
  "American Blonde Ale",
  "American Double / Imperial IPA",
  "American Pale Wheat Ale",
  "American Brown Ale",
  "American Porter",
  "Saison / Farmhouse Ale",
  "Witbier",
  "Fruit / Vegetable Beer",
  "Kölsch",
  "Hefeweizen",
  "American Pale Lager",
  "American Stout",
] as const;

/**
 * The catch-all option.
 *
 * Also happens to be a real style name in the dataset, so selecting it matches
 * both the literal style and everything not named above — as it did before.
 */
export const OTHER_OPTION = "Other";

/** What the filter panel renders. */
export const STYLE_OPTIONS: string[] = [...NAMED_STYLES, OTHER_OPTION];

/**
 * Turns the user's selection into the styles the API should filter on.
 * @param selected - what is ticked in the panel
 * @param allStyles - every style present in the catalogue, from GET /api/styles
 */
export const expandStyles = (
  selected: string[],
  allStyles: string[]
): string[] => {
  if (!selected.includes(OTHER_OPTION)) return selected;

  const named: readonly string[] = NAMED_STYLES;
  const complement = allStyles.filter((style) => !named.includes(style));

  return [...new Set([...selected, ...complement])];
};
