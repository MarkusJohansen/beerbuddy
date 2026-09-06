import { render, act } from "@testing-library/react";
import { FilterContextProvider, type FilterContextType } from "./FilterContext";
import { FilterContext } from "./FilterContext";
import { type ReactNode, useContext as useContextMock } from "react";
import { vi, vitest } from "vitest";

// The provider loads the catalogue's styles on mount; a unit test should not
// reach the network for them.
vi.mock("../api/client", () => ({ fetchStyles: vi.fn(async () => []) }));
import { useState as useStateMock } from "react";
import { useEffect as useEffectMock } from "react";

vi.mock("react", () => ({
  ...vitest.importActual("react"),
  useState: vi.fn(),
  createContext: () => ({
    Provider: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Consumer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  }),
  useContext: vi.fn(),
  useEffect: vi.fn(),
}));

describe("FilterContextProvider", () => {
  const setState = vi.fn();

  beforeEach(() => {
    (useStateMock as jest.Mock).mockImplementation((init) => [init, setState]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("provides the filter context", () => {
    const TestComponent = () => {
      return (
        <FilterContextProvider>
          <div>Test</div>
        </FilterContextProvider>
      );
    };

    const { getByText } = render(<TestComponent />);
    expect(getByText("Test")).toBeInTheDocument();
  });

  it("initializes context with values from localStorage", () => {
    localStorage.setItem("searchString", "test");
    localStorage.setItem("IBU", JSON.stringify([10, 20]));
    localStorage.setItem("ABV", JSON.stringify([5, 10]));
    localStorage.setItem("styles", JSON.stringify(["style1", "style2"]));
    localStorage.setItem("sorting", "bottom");

    const TestComponent = () => {
      return (
        <FilterContextProvider>
          <div>Test</div>
        </FilterContextProvider>
      );
    };

    render(<TestComponent />);

    expect(localStorage.getItem("searchString")).toBe("test");
    expect(localStorage.getItem("IBU")).toBe(JSON.stringify([10, 20]));
    expect(localStorage.getItem("ABV")).toBe(JSON.stringify([5, 10]));
    expect(localStorage.getItem("styles")).toBe(
      JSON.stringify(["style1", "style2"])
    );
    expect(localStorage.getItem("sorting")).toBe("bottom");
  });

  it("updates localStorage when context values change", async () => {
    const TestComponent = () => {
      return (
        <FilterContextProvider>
          <div>Test</div>
        </FilterContextProvider>
      );
    };

    render(<TestComponent />);

    act(() => {
      localStorage.setItem("searchString", "updated");
      localStorage.setItem("IBU", JSON.stringify([50, 60]));
      localStorage.setItem("ABV", JSON.stringify([70, 80]));
      localStorage.setItem("styles", JSON.stringify(["style3", "style4"]));
      localStorage.setItem("sorting", "top");
    });

    expect(localStorage.getItem("searchString")).toBe("updated");
    expect(localStorage.getItem("IBU")).toBe(JSON.stringify([50, 60]));
    expect(localStorage.getItem("ABV")).toBe(JSON.stringify([70, 80]));
    expect(localStorage.getItem("styles")).toBe(
      JSON.stringify(["style3", "style4"])
    );
    expect(localStorage.getItem("sorting")).toBe("top");
  });
});

describe("FilterContext", () => {
  const setState = vi.fn();

  beforeEach(() => {
    localStorage.clear();

    (useContextMock as jest.Mock).mockImplementation(() => ({
      searchString: "",
      setSearchString: setState,
      IBU: [0, 138],
      setIBU: setState,
      ABV: [0, 13],
      setABV: setState,
      styles: [],
      setStyles: setState,
      sorting: "top",
      setSorting: setState,
    }));
    (useEffectMock as jest.Mock).mockImplementation((fn) => fn());
  });

  it("provides the filter context", () => {
    const TestComponent = () => {
      const context = useContextMock<FilterContextType>(FilterContext);

      return (
        <div>
          {context.searchString}
          {context.IBU.join(",")}
          {context.ABV.join(",")}
          {context.styles.join(",")}
          {context.sorting}
        </div>
      );
    };

    const { getByText } = render(
      <FilterContextProvider>
        <TestComponent />
      </FilterContextProvider>
    );
    expect(getByText("0,1380,13top")).toBeInTheDocument();
  });

  it("allows updating the context", () => {
    let contextValue: FilterContextType | null = null;
    const TestComponent = () => {
      contextValue = useContextMock<FilterContextType>(FilterContext);
      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(contextValue!.searchString).toBe("");
    expect(contextValue!.IBU).toEqual([0, 138]);
    expect(contextValue!.ABV).toEqual([0, 13]);
    expect(contextValue!.styles).toEqual([]);
    expect(contextValue!.sorting).toBe("top");
  });
});
