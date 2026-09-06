import InfiniteScroll from "react-infinite-scroll-component";
import { useContext, useEffect, useRef } from "react";
import BeerCard from "../beer-card/BeerCard";
import { FilterContext } from "../../context/FilterContext";

import type { BeerListItem } from "../../types/types";

interface BeerListProps {
  beers: BeerListItem[];
  /**
   * How many beers match the current filters. Previously read off
   * beers[0].beer_count, because the catalogue query repeated the total on every
   * row; the API returns it once now.
   */
  totalCount: number;
  fetchMore: (reset?: boolean, noFilters?: boolean) => Promise<void>;
}

/**
 * Helper function for translating the sorting method to a more readable format.
 * @param sorting - The sorting method to translate.
 * @returns - The translated sorting method.
 */
const translateSorting = (sorting: string) => {
  switch (sorting) {
    case "top":
      return "Most popular";
    case "low":
      return "Least popular";
    case "atoz":
      return "A-Z";
    case "ztoa":
      return "Z-A";
    default:
      return "Most popular";
  }
};

/**
 * A component for displaying a list of beers.
 * Uses lazy loading to load more beers when the user scrolls down.
 * @param props - The interface for the BeerList component.
 * @returns  - The beer list component.
 */
const BeerList = ({ beers, totalCount, fetchMore }: BeerListProps) => {
  const { searchString, sorting } = useContext(FilterContext);

  const fetchMoreRef = useRef(fetchMore);
  fetchMoreRef.current = fetchMore;

  // Updates the beer list when the search string or sorting method changes.
  useEffect(() => {
    fetchMoreRef.current(true);
  }, [searchString, sorting]);

  return (
    <div className="flex flex-col gap-md">
      <section
        aria-label="Search and sorting information"
        className="flex flex-wrap items-baseline gap-md border-b border-rule pb-sm"
      >
        {/* The count is the page's second numeral, after the scores. */}
        <h2 className="tnum m-0 font-display text-xl text-ink">
          {totalCount}
          <span className="pl-sm text-xs tracking-[0.1em] text-ink-mute uppercase">
            results
          </span>
        </h2>
        {searchString && (
          <p className="m-0 text-xs text-ink-mute">
            Searched for &ldquo;{searchString}&rdquo;
          </p>
        )}
        <p className="m-0 text-xs text-ink-mute">
          Sorted by {translateSorting(sorting)}
        </p>
      </section>
      <section aria-label="Beer list">
        <InfiniteScroll
          dataLength={beers.length}
          next={fetchMoreRef.current}
          hasMore={beers.length < totalCount}
          loader={
            <p className="py-md text-center text-xs text-ink-mute">
              Loading...
            </p>
          }
          endMessage={
            <p className="py-md text-center text-xs text-ink-mute">
              That is all {totalCount} of them.
            </p>
          }
          scrollThreshold={0.99}
          scrollableTarget="infiniteScrollTarget"
        >
          <ul className="m-0 list-none p-0">
            {beers?.map((beer) => (
              <li key={beer.beer_id}>
                <BeerCard
                  beer_id={beer.beer_id}
                  name={beer.beer_name}
                  brewery={beer.brewery_name}
                  votes={beer.vote_sum}
                  reaction={beer.reaction}
                />
              </li>
            ))}
          </ul>
        </InfiniteScroll>
      </section>
    </div>
  );
};
export default BeerList;
