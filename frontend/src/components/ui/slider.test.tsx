import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe } from "jest-axe";
import { Slider } from "./slider";

/**
 * The ABV and IBU ranges moved from MUI to Radix. CLAUDE.md permits removing MUI
 * only on a demonstrated replacement, so this is the demonstration: each thumb
 * is individually focusable, moves on its own, announces its bounds, and the
 * rendered control passes axe.
 */
const Range = () => {
  const [value, setValue] = useState([0, 13]);
  return (
    <Slider
      aria-label="ABV range"
      value={value}
      onValueChange={setValue}
      max={13}
      step={1}
    />
  );
};

describe("Slider", () => {
  it("is accessible", async () => {
    const { container } = render(<Range />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders one focusable thumb per value", () => {
    render(<Range />);
    const thumbs = screen.getAllByRole("slider");
    expect(thumbs).toHaveLength(2);
    thumbs.forEach((thumb) => expect(thumb).toHaveAttribute("tabindex", "0"));
  });

  it("announces each thumb's value and bounds", () => {
    render(<Range />);
    const [low, high] = screen.getAllByRole("slider");
    expect(low).toHaveAttribute("aria-valuenow", "0");
    expect(low).toHaveAttribute("aria-valuemin", "0");
    expect(high).toHaveAttribute("aria-valuenow", "13");
    expect(high).toHaveAttribute("aria-valuemax", "13");
  });

  it("moves one thumb by keyboard without moving the other", () => {
    render(<Range />);
    const [low, high] = screen.getAllByRole("slider");

    low.focus();
    fireEvent.keyDown(low, { key: "ArrowRight" });

    expect(screen.getAllByRole("slider")[0]).toHaveAttribute(
      "aria-valuenow",
      "1"
    );
    expect(high).toHaveAttribute("aria-valuenow", "13");
  });

  /**
   * Radix binds Home and End to the range's own ends — Home moves the first
   * thumb to the minimum and End the last thumb to the maximum — rather than to
   * whichever thumb has focus. That is the behaviour, so that is what is
   * asserted; a reader who expects the focused thumb to jump will be surprised.
   */
  it("supports Home and End", () => {
    render(<Range />);
    const low = screen.getAllByRole("slider")[0];

    low.focus();
    fireEvent.keyDown(low, { key: "ArrowRight" });
    fireEvent.keyDown(low, { key: "ArrowRight" });
    expect(screen.getAllByRole("slider")[0]).toHaveAttribute(
      "aria-valuenow",
      "2"
    );

    fireEvent.keyDown(low, { key: "Home" });
    expect(screen.getAllByRole("slider")[0]).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
  });
});
