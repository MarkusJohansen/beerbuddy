import { useContext, useState } from "react";

import { fetchBeers, type Sort } from "../api/client";
import { FilterContext } from "../context/FilterContext";
import { expandStyles } from "./beerStyles";
import type { BeerListItem } from "../types/types";

const PAGE_SIZE = 10;

/** Filter values used when the user clears every filter. */
const NO_FILTERS = {
  search: "",
  sort: "top" as Sort,
  minAbv: 0,
  maxAbv: 13,
  minIbu: 0,
  maxIbu: 138,
  styles: [] as string[],
};

/**
 * Custom hook for fetching pages of beers.
 * @returns the beers loaded so far, the catalogue total, and a fetcher for more
 */
const useFetchMoreBeers = () => {
  const { searchString, IBU, ABV, styles, sorting, allStyles } =
    useContext(FilterContext);
  const [beers, setBeers] = useState<BeerListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMore = async (reset?: boolean, noFilters?: boolean) => {
    if (reset) {
      localStorage.setItem("searchString", searchString);
      localStorage.setItem("IBU", JSON.stringify(IBU));
      localStorage.setItem("ABV", JSON.stringify(ABV));
      localStorage.setItem("styles", JSON.stringify(styles));
      localStorage.setItem("sorting", sorting);
    }
    if (noFilters) {
      localStorage.setItem("searchString", "");
      localStorage.setItem("IBU", "[0, 138]");
      localStorage.setItem("ABV", "[0, 13]");
      localStorage.setItem("styles", "[]");
      localStorage.setItem("sorting", "top");
    }

    const filters = noFilters
      ? NO_FILTERS
      : {
          search: searchString,
          sort: sorting as Sort,
          minAbv: ABV[0],
          maxAbv: ABV[1],
          minIbu: IBU[0],
          maxIbu: IBU[1],
          // "Other" means every style not named in the panel. The backend used to
          // hold that list; it is now derived from what the catalogue contains.
          styles: expandStyles(styles, allStyles),
        };

    const page = await fetchBeers({
      size: PAGE_SIZE,
      start: reset ? 0 : beers.length,
      ...filters,
    });

    setBeers(reset ? page.beers : [...beers, ...page.beers]);
    setTotalCount(page.totalCount);

    if (reset) document.getElementById("infiniteScrollTarget")?.scrollTo(0, 0);
  };

  return { beers, totalCount, fetchMore };
};

export default useFetchMoreBeers;
