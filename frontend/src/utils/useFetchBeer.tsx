import { useEffect, useState } from "react";

import { fetchBeer } from "../api/client";
import type { Beer } from "../types/types";

/**
 * Custom hook for fetching a single beer.
 * @param id - the id of the beer to fetch
 * @param newVote - flips when a vote is cast, to refetch
 * @param newComment - flips when a comment is posted, to refetch
 * @returns the beer, plus loading and error state
 */
const useFetchBeer = ({
  id,
  newVote,
  newComment,
}: {
  id: number;
  newVote?: boolean;
  newComment?: boolean;
}) => {
  const [beer, setBeer] = useState<Beer>();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    fetchBeer(id)
      .then((data) => {
        if (cancelled) return;
        setBeer(data);
        setIsError(false);
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // A slower earlier request must not overwrite a newer beer's data.
    return () => {
      cancelled = true;
    };
  }, [id, newVote, newComment]);

  return { beer, isLoading, isError };
};

export default useFetchBeer;
