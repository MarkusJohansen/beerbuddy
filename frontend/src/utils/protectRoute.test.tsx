import { describe, it, expect, vi, beforeEach } from "vitest";

import protectRoute from "./protectRoute";
import { fetchSession } from "../api/client";

vi.mock("../api/client", () => ({ fetchSession: vi.fn() }));

const mockedFetchSession = vi.mocked(fetchSession);
const mockReplace = vi.fn();
const store: Record<string, string | null> = {};

// jsdom 30 defines localStorage as a readonly accessor, so it is stubbed rather
// than assigned.
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: vi.fn((key: string) => {
    store[key] = null;
  }),
  clear: vi.fn(),
});

Object.defineProperty(global.window, "location", {
  writable: true,
  value: { ...global.window.location, replace: mockReplace },
});

describe("protectRoute", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    store.userNameBeerBuddy = "test";
    store.userIdBeerBuddy = "user-1";
  });

  it("stays put when the stored id belongs to the stored username", async () => {
    mockedFetchSession.mockResolvedValue({ id: "user-1", username: "test" });

    expect(await protectRoute()).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects when the id belongs to nobody", async () => {
    mockedFetchSession.mockResolvedValue(null);

    expect(await protectRoute()).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("redirects when the id belongs to a different username", async () => {
    mockedFetchSession.mockResolvedValue({
      id: "user-1",
      username: "somebody-else",
    });

    expect(await protectRoute()).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("redirects when localStorage is empty, without calling the API", async () => {
    store.userNameBeerBuddy = null;
    store.userIdBeerBuddy = null;

    expect(await protectRoute()).toBe(true);
    expect(mockedFetchSession).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("redirects when the API call fails", async () => {
    mockedFetchSession.mockRejectedValue(new Error("network"));

    expect(await protectRoute()).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
