import InfiniteScroll from "react-infinite-scroll-component";
import BeerCard from "../beer-card/BeerCard";
import styles from "./BeerList.module.css";
import { useEffect, useRef } from "react";
import { useContext } from "react";
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
    <>
      <section
        className={styles.resultsInfoContainer}
        aria-label="Search and sorting information"
      >
        <div className={styles.resultsHeader}>
          <h2 className={styles.resultsInfo}>{totalCount} results</h2>
        </div>
        <p className={styles.resultsInfo}>Searched for: "{searchString}"</p>
        <p className={styles.resultsInfo}>
          Sorted by: {translateSorting(sorting)}
        </p>
      </section>
      <section aria-label="Beer list">
        <InfiniteScroll
          dataLength={beers.length}
          next={fetchMoreRef.current}
          hasMore={beers.length < totalCount}
          loader={
            <p style={{ textAlign: "center" }}>
              <b>Loading...</b>
            </p>
          }
          endMessage={
            <p style={{ textAlign: "center" }}>
              <b>Yay! You have seen it all</b>
            </p>
          }
          scrollThreshold={0.99}
          scrollableTarget="infiniteScrollTarget"
        >
          <ul className={styles.list}>
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
    </>
  );
};
export default BeerList;
