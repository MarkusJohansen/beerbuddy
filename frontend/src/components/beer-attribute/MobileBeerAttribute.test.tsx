import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MobileBeerAttribute from "./MobileBeerAttribute";
import { axe } from "jest-axe";
import type { BeerAttributeProps } from "./BeerAttribute";

const attributeProps: BeerAttributeProps[] = [
  {
    attribute: "Testdata 1",
    altText: "alternative text",
    icon: "",
    value: 1,
  },
  {
    attribute: "Testdata 2",
    altText: "alternative text",
    icon: "",
    value: 2,
  },
  {
    attribute: "Testdata 3",
    altText: "alternative text",
    icon: "",
    value: 3,
  },
];

const Template = () => <MobileBeerAttribute attributeProps={attributeProps} />;

describe("MobileBeerAttribute", () => {
  it("is accessible", async () => {
    const { container } = render(<Template />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders correctly", () => {
    const { container } = render(<Template />);
    expect(container).toMatchSnapshot();
  });

  it("renders with correct values", () => {
    const { getByText, getAllByRole } = render(<Template />);
    expect(getByText("Testdata 1")).toBeInTheDocument();
    expect(getByText("Testdata 2")).toBeInTheDocument();
    expect(getByText("Testdata 3")).toBeInTheDocument();
    // The amber icons that used to sit beside each label were assets from the
    // old palette; the label and value carry the attribute on their own now.
    expect(getAllByRole("term")).toHaveLength(3);
  });
});
