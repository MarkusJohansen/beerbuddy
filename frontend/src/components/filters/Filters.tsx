import { useContext, useId, useRef, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import Checkbox from "../ui/checkbox";
import { Slider } from "../ui/slider";
import { FilterContext } from "../../context/FilterContext";
import { STYLE_OPTIONS } from "../../utils/beerStyles";

/** The catalogue's full ranges, and what "reset" returns to. */
const ABV_RANGE = [0, 13];
const IBU_RANGE = [0, 138];

/**
 * One collapsible filter group, on a native `<details>`.
 *
 * The explanation that used to be a hover tooltip is a visible line here. A
 * tooltip hides information behind a gesture a touch user does not have, and
 * information worth showing on hover is information worth showing.
 */
const Group = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) => (
  <details className="group border-b border-rule py-md" open>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-sm text-base text-ink marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      {label}
      <span
        aria-hidden
        className="text-ink-mute transition-transform group-open:rotate-90"
      >
        &rsaquo;
      </span>
    </summary>
    <p className="mt-xs mb-md text-xs text-ink-mute">{hint}</p>
    {children}
  </details>
);

/** A range slider with its current bounds shown, replacing MUI's value bubble. */
const Range = ({
  label,
  value,
  onChange,
  max,
  suffix = "",
}: {
  label: string;
  value: number[];
  onChange: (next: number[]) => void;
  max: number;
  suffix?: string;
}) => (
  <div className="flex flex-col gap-sm">
    <Slider
      aria-label={`${label} range`}
      value={value}
      onValueChange={onChange}
      max={max}
      step={1}
    />
    <p className="tnum m-0 text-xs text-ink-mute">
      {value[0]}
      {suffix} – {value[1]}
      {suffix}
    </p>
  </div>
);

interface FiltersProps {
  fetchMore: (reset?: boolean, noFilters?: boolean) => Promise<void>;
  apply?: () => void;
}

/**
 * Filters component that contains all filters.
 * @param fetchMore - function that is called when the apply filters button is clicked
 * @param apply - function that is called to hide the filters when the apply filters button is clicked
 * @returns a Filters component
 */
const Filters = ({ fetchMore, apply }: FiltersProps) => {
  const {
    IBU,
    setIBU,
    ABV,
    setABV,
    setStyles,
    styles,
    searchString,
    setSearchString,
  } = useContext(FilterContext);
  const fetchMoreRef = useRef(fetchMore);
  fetchMoreRef.current = fetchMore;
  const headingID = useId();

  /**
   * Function for resetting filters and fetching more beers.
   */
  const resetFilters = (e: React.MouseEvent) => {
    /* Only reset filters and fetch beers if there are active filters */
    if (
      styles.length > 0 ||
      ABV[0] !== ABV_RANGE[0] ||
      ABV[1] !== ABV_RANGE[1] ||
      IBU[0] !== IBU_RANGE[0] ||
      IBU[1] !== IBU_RANGE[1] ||
      searchString !== ""
    ) {
      e.preventDefault();
      setABV(ABV_RANGE);
      setIBU(IBU_RANGE);
      setStyles([]);
      setSearchString("");
      fetchMoreRef.current(true, true);
    }
  };

  const toggleStyle = (style: string, checked: boolean) =>
    setStyles(checked ? [...styles, style] : styles.filter((s) => s !== style));

  return (
    <section aria-labelledby={headingID} className="flex flex-col gap-md">
      <h2
        id={headingID}
        className="m-0 text-xs tracking-[0.1em] text-ink-mute uppercase"
      >
        Filters
      </h2>

      <Group label="Beer styles" hint="Filter on certain styles of beer.">
        <div className="flex flex-col gap-sm">
          {STYLE_OPTIONS.map((style) => (
            <Checkbox
              key={style}
              name="styles"
              label={style}
              value={style}
              checked={styles.includes(style)}
              onChange={(event) => toggleStyle(style, event.target.checked)}
            />
          ))}
        </div>
      </Group>

      <Group label="IBU" hint="Filter on the bitterness of the beer.">
        <Range label="IBU" value={IBU} onChange={setIBU} max={IBU_RANGE[1]} />
      </Group>

      <Group label="ABV" hint="Filter on the alcohol percentage of the beer.">
        <Range
          label="ABV"
          value={ABV}
          onChange={setABV}
          max={ABV_RANGE[1]}
          suffix="%"
        />
      </Group>

      <div className="flex flex-wrap gap-sm">
        <Button
          variant="primary"
          onClick={(e) => {
            e.preventDefault();
            if (apply) apply();
            fetchMore(true);
          }}
        >
          Apply Filters
        </Button>
        <Button variant="ghost" onClick={resetFilters}>
          <RotateCcw aria-hidden className="size-md" />
          Reset
        </Button>
      </div>
    </section>
  );
};
export default Filters;
