import { expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";

// Accessibility assertions run inside the unit suite: an axe failure is a test
// failure, not a warning.
//
// This used to come from vitest-axe, which was last published in October 2022 and
// predates Vitest 1.0. jest-axe is current and its matcher works with Vitest's
// expect.extend, so the assertions themselves are unchanged and one dependency is
// gone. Its matcher type is declared in vitest.d.ts.
expect.extend(toHaveNoViolations);

// jsdom does not implement matchMedia, which antd's responsive components call.
// https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
