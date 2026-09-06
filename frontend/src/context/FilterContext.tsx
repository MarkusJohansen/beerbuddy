import { createContext, useEffect, useState } from "react";

import { fetchStyles } from "../api/client";

/**
 * interface for the FilterContext
 * @param searchString - the string to search for
 * @param setSearchString - function to update the searchString
 * @param IBU - the IBU range to filter by
 * @param setIBU - function to update the IBU range
 * @param ABV - the ABV range to filter by
 * @param setABV - function to update the ABV range
 * @param styles - the styles to filter by
 * @param setStyles - function to update the styles
 * @param sorting - the sorting to apply
 * @param setSorting - function to update the sorting
 * @param allStyles - every style present in the catalogue, from the API
 */
export interface FilterContextType {
  searchString: string;
  setSearchString: (searchString: string) => void;
  IBU: number[];
  setIBU: (IBU: number[]) => void;
  ABV: number[];
  setABV: (ABV: number[]) => void;
  styles: string[];
  setStyles: (styles: string[]) => void;
  sorting: string;
  setSorting: (sorting: string) => void;
  /**
   * Every style present in the catalogue. Fetched once, and used to expand the
   * "Other" filter option into the styles not named individually.
   */
  allStyles: string[];
}

/**
 * Context that contains the filter settings.
 */
export const FilterContext = createContext<FilterContextType>({
  searchString: "",
  setSearchString: () => {},
  IBU: [0, 138],
  setIBU: () => {},
  ABV: [0, 13],
  setABV: () => {},
  styles: [],
  setStyles: () => {},
  sorting: "top",
  setSorting: () => {},
  allStyles: [],
});

/**
 * Provider for the FilterContext.
 * A wrapper for the children that needs access to the FilterContext.
 * @param children - the children of the provider
 */
export const FilterContextProvider: React.FC<
  React.PropsWithChildren<object>
> = ({ children }) => {
  const [searchString, setSearchString] = useState(
    localStorage.getItem("searchString") || ""
  );
  const [IBU, setIBU] = useState<number[]>(
    JSON.parse(localStorage.getItem("IBU") || "[0, 138]") as number[]
  );
  const [ABV, setABV] = useState<number[]>(
    JSON.parse(localStorage.getItem("ABV") || "[0, 13]") as number[]
  );
  const [styles, setStyles] = useState<string[]>(
    JSON.parse(localStorage.getItem("styles") || "[]") as string[]
  );
  const [sorting, setSorting] = useState<string>(
    localStorage.getItem("sorting") || "top"
  );
  const [allStyles, setAllStyles] = useState<string[]>([]);

  useEffect(() => {
    fetchStyles()
      .then(setAllStyles)
      .catch((error) => console.error("Could not load beer styles:", error));
  }, []);

  return (
    <FilterContext.Provider
      value={{
        searchString,
        setSearchString,
        IBU,
        setIBU,
        ABV,
        setABV,
        styles,
        setStyles,
        sorting,
        setSorting,
        allStyles,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};
