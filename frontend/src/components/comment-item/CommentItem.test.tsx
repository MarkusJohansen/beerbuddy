import { describe, it, expect, vi } from "vitest";
import { act, render } from "@testing-library/react";
import CommentItem from "./CommentItem";
import { axe } from "jest-axe";

vi.mock("../../api/client", () => ({ deleteComment: vi.fn(async () => {}) }));

const mockDeleteComment = vi.fn();

// jsdom 30 defines localStorage as a readonly accessor, so it is stubbed.
vi.stubGlobal("localStorage", {
  getItem: vi.fn(() => "unique-id-123"),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

const Template = () => {
  /* Create a timestamp that is 5 days old */
  const date = new Date();
  date.setDate(date.getDate() - 5);
  return (
    <CommentItem
      username={"Martin Hansa-Borg"}
      commentText={
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla cursus sem diam, eget consectetur quam interdum eu. Aliquam ornare lectus vel sapien blandit eleifend. Aenean ac vestibulum metus. Nam auctor sed dui dapibus pharetra."
      }
      timestamp={String(date)}
      id={0}
      onDelete={mockDeleteComment}
      userId={"unique-id-123"}
    />
  );
};

describe("CommentItem", () => {
  it("is accessible", async () => {
    const { container } = render(<Template />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("matches snapshot", () => {
    const { container } = render(<Template />);
    expect(container).toMatchSnapshot();
  });

  it("renders a comment", () => {
    const { getByText } = render(<Template />);
    expect(getByText("Martin Hansa-Borg")).toBeInTheDocument();
    expect(getByText("5 days ago")).toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", async () => {
    const { getByRole } = render(<Template />);
    // deleteComment resolves before onDelete runs, so the click has to be awaited.
    await act(async () => {
      getByRole("button").click();
    });
    expect(mockDeleteComment).toHaveBeenCalled();
  });

  it("renders a comment from under a minute ago", () => {
    const date = new Date();
    const { container } = render(
      <CommentItem
        username={"Test"}
        commentText={"Lorem ipsum"}
        timestamp={String(date)}
        id={0}
        onDelete={mockDeleteComment}
        userId={""}
      />
    );
    expect(container).toHaveTextContent("< 1 minute ago");
  });

  it("renders a 10 minutes old comment", () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - 10);
    const { container } = render(
      <CommentItem
        username={"Test"}
        commentText={"Lorem ipsum"}
        timestamp={String(date)}
        id={0}
        onDelete={mockDeleteComment}
        userId={""}
      />
    );
    expect(container).toHaveTextContent("10 minutes ago");
  });

  it("renders a 10 hours old comment", () => {
    const date = new Date();
    date.setHours(date.getHours() - 10);
    const { container } = render(
      <CommentItem
        username={"Test"}
        commentText={"Lorem ipsum"}
        timestamp={String(date)}
        id={0}
        onDelete={mockDeleteComment}
        userId=""
      />
    );
    expect(container).toHaveTextContent("10 hours ago");
  });

  it("renders a comment under a year ago", () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 10);
    const { container } = render(
      <CommentItem
        username={"Test"}
        commentText={"Lorem ipsum"}
        timestamp={String(date)}
        id={0}
        onDelete={mockDeleteComment}
        userId=""
      />
    );
    expect(container).toHaveTextContent("10 months ago");
  });

  it("renders a comment from 10 years ago", () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 10);
    const { container } = render(
      <CommentItem
        username={"Test"}
        commentText={"Lorem ipsum"}
        timestamp={String(date)}
        id={0}
        onDelete={mockDeleteComment}
        userId=""
      />
    );
    expect(container).toHaveTextContent("10 years ago");
  });

  it("can not delete a comment if the user is not logged in", () => {
    const { queryByRole } = render(
      <CommentItem
        username={"Test"}
        commentText={"Lorem ipsum"}
        timestamp={String(new Date())}
        id={0}
        onDelete={mockDeleteComment}
        userId=""
      />
    );
    expect(queryByRole("button")).not.toBeInTheDocument();
  });
});
