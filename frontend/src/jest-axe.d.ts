// jest-axe ships no type declarations of its own, and @types/jest-axe depends on
// @types/jest, which would pull Jest's globals into a Vitest project and shadow
// Vitest's. These are the only two exports the suite uses; the matcher's own
// assertion type is declared in vitest.d.ts.
declare module "jest-axe" {
  export function axe(html: Element | string): Promise<unknown>;
  export const toHaveNoViolations: Record<
    "toHaveNoViolations",
    (results: unknown) => { pass: boolean; message: () => string }
  >;
}
