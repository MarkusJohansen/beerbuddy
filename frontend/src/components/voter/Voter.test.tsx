import { describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import Voter from "./Voter";
import { axe } from "jest-axe";

// Voter talks to the API through the typed client, not fetch, so that is what a
// unit test replaces.
vi.mock("../../api/client", () => ({ setReaction: vi.fn(async () => {}) }));
vi.mock("../../utils/protectRoute", () => ({
  default: vi.fn(async () => false),
}));

Object.defineProperty(global.window, "location", {
  writable: true,
  value: { ...global.window.location, replace: vi.fn() },
});

describe("Voter", () => {
  it("is accessible", async () => {
    const { container } = render(
      <Voter votes={10} reaction={"unreact"} beerId={753} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("should render", () => {
    const { container } = render(
      <Voter votes={10} reaction={"unreact"} beerId={753} />
    );
    expect(container).toMatchSnapshot();
  });

  it("should log upvote", async () => {
    const { getAllByRole } = render(
      <Voter votes={10} reaction={"unreact"} beerId={753} />
    );
    await act(async () => {
      getAllByRole("button")[0].click();
    });
  });

  it("should log downvote", async () => {
    const { getAllByRole } = render(
      <Voter votes={10} reaction={"unreact"} beerId={753} />
    );
    await act(async () => {
      getAllByRole("button")[1].click();
    });
  });

  it("should display correct amount of upvotes", () => {
    render(<Voter votes={10} reaction={"unreact"} beerId={753} />);
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});
