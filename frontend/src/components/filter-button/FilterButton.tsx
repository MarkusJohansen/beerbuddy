import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import Dialog from "../ui/dialog";
import Filters from "../filters/Filters";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { TABLET } from "../../utils/breakpoints";

/**
 * The filter button component.
 * This is a more compact way of accessing the filters on mobile devices.
 * Contains a dialog with the filters.
 * @param fetchMore - function that is called when the apply filters button is clicked
 * @returns - The filter button component.
 */
const FilterButton = ({
  fetchMore,
}: {
  fetchMore: (reset?: boolean, noFilters?: boolean) => Promise<void>;
}) => {
  const [showFilter, setShowFilter] = useState(false);
  const { width } = useWindowDimensions();

  // Widening past the sidebar's breakpoint makes the dialog redundant.
  useEffect(() => {
    if (width >= TABLET) setShowFilter(false);
  }, [width]);

  return (
    <div className="tablet:hidden">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setShowFilter(true)}
        aria-label="Filters"
        aria-expanded={showFilter}
      >
        <SlidersHorizontal aria-hidden className="size-md" />
      </Button>
      <Dialog
        open={showFilter}
        onClose={() => setShowFilter(false)}
        label="Filters"
      >
        <Filters fetchMore={fetchMore} apply={() => setShowFilter(false)} />
      </Dialog>
    </div>
  );
};
export default FilterButton;
