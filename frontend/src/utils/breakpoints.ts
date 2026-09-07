/**
 * The two viewport thresholds the interface branches on.
 *
 * These were literals repeated across seven components; the spec named the
 * seventh copy as the point to extract a constant, and that point was reached.
 *
 * The same two values are declared as `--breakpoint-mobile` and
 * `--breakpoint-tablet` in `src/styles/tokens.css`, which is where Tailwind's
 * `mobile:` and `tablet:` variants come from. A `@media` condition cannot read
 * a custom property, so that duplication is real and is kept deliberately
 * visible in both files rather than hidden behind a build step.
 */

/** At or below this width the compact variants render. */
export const MOBILE = 768;

/** Below this width the sidebar gives way to the filter dialog. */
export const TABLET = 1000;
