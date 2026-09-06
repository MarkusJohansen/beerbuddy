import "vitest";

declare module "vitest" {
  // jest-axe ships Jest matcher types, not Vitest ones, so the matcher registered
  // in vitest-setup.ts is declared here instead.
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): unknown;
  }
}
