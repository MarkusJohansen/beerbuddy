import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe } from "jest-axe";
import Dialog from "./dialog";

describe("Dialog", () => {
  it("is accessible", async () => {
    const { container } = render(
      <Dialog open onClose={() => {}} label="Filters">
        <p>Panel</p>
      </Dialog>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows its contents only while open", () => {
    const { rerender } = render(
      <Dialog open={false} onClose={() => {}} label="Filters">
        <p>Panel</p>
      </Dialog>
    );
    expect(screen.queryByText("Panel")).not.toBeInTheDocument();

    rerender(
      <Dialog open onClose={() => {}} label="Filters">
        <p>Panel</p>
      </Dialog>
    );
    expect(screen.getByText("Panel")).toBeInTheDocument();
  });

  /**
   * The application binds Escape on `window` to return focus to the skip link.
   * A dialog closing must not also do that, or dismissing the filters throws the
   * reader back to the top of the page.
   */
  it("does not let Escape reach the window handler", () => {
    const onWindowEscape = vi.fn();
    window.addEventListener("keydown", onWindowEscape);

    render(
      <Dialog open onClose={() => {}} label="Filters">
        <p>Panel</p>
      </Dialog>
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onWindowEscape).not.toHaveBeenCalled();

    // A key that is not Escape still propagates normally.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "a" });
    expect(onWindowEscape).toHaveBeenCalledTimes(1);

    window.removeEventListener("keydown", onWindowEscape);
  });

  it("closes on a backdrop click but not on a click inside", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} label="Filters">
        <p>Panel</p>
      </Dialog>
    );

    fireEvent.click(screen.getByText("Panel"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
