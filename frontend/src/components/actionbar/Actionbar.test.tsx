import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Actionbar from "./Actionbar";
import { act } from "react-dom/test-utils";
import { axe } from "jest-axe";

describe("Actionbar", () => {
  const fetchMore = vi.fn();

  it("is accessible", async () => {
    const { container } = render(<Actionbar fetchMore={fetchMore} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders correctly", () => {
    const { container } = render(<Actionbar fetchMore={fetchMore} />);
    expect(container).toMatchSnapshot();
  });

  it("renders with correct dropdown", () => {
    const { getByRole } = render(<Actionbar fetchMore={fetchMore} />);
    expect(getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByText("Ascending")).not.toBeInTheDocument();
    expect(screen.queryByText("Descending")).not.toBeInTheDocument();
  });

  it("renders option after clicking dropdown", async () => {
    render(<Actionbar fetchMore={fetchMore} />);

    const dropdown = screen.getByRole("combobox");

    act(() => {
      fireEvent.mouseDown(dropdown);
    });

    await waitFor(() => {
      expect(screen.getByText("Least popular")).toBeInTheDocument();
      expect(screen.getByText("A-Z")).toBeInTheDocument();
      expect(screen.getByText("Z-A")).toBeInTheDocument();
    });
  });

  it("renders with correct searchbar", () => {
    const { getByRole } = render(<Actionbar fetchMore={fetchMore} />);
    // antd's Input.Search renders <input type="search">, whose role is searchbox.
    expect(getByRole("searchbox")).toBeInTheDocument();
  });
});
