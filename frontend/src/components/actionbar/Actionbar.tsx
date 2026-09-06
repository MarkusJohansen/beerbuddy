import { useContext } from "react";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import Select from "../ui/select";
import FilterButton from "../filter-button/FilterButton";
import { FilterContext } from "../../context/FilterContext";

/** The sort orders the catalogue query understands. */
const SORTINGS = [
  { value: "top", label: "Most popular" },
  { value: "low", label: "Least popular" },
  { value: "atoz", label: "A-Z" },
  { value: "ztoa", label: "Z-A" },
];

/**
 * The actionbar component. Contains the sorting and search functionality.
 *
 * Sorting is a native `<select>` at every width. It used to be an Ant Design
 * `Select` above 768 px and a `Dropdown` below it; the native element gets the
 * platform's own picker on a touch device, which is what the mobile variant was
 * approximating, so the branch and the component are both gone.
 * @param fetchMore - function that is called when the apply filters button is clicked
 * @returns - The actionbar component.
 */
const Actionbar = ({
  fetchMore,
}: {
  fetchMore: (reset?: boolean, noFilters?: boolean) => Promise<void>;
}) => {
  const { setSearchString, setSorting, sorting } = useContext(FilterContext);

  return (
    <section
      aria-label="Search for and sort beers"
      className="flex flex-wrap items-end gap-lg"
    >
      <form
        role="search"
        className="flex min-w-[12rem] flex-1 flex-col gap-xs"
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("search");
          setSearchString(String(value ?? "").toLowerCase());
        }}
      >
        <label
          htmlFor="beer-search"
          className="text-xs tracking-[0.1em] text-ink-mute uppercase"
        >
          Search
        </label>
        <div className="flex items-center gap-sm">
          <Input id="beer-search" name="search" type="search" />
          <button
            type="submit"
            aria-label="Search"
            className="cursor-pointer border-0 bg-transparent p-0 text-ink-mute transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Search aria-hidden className="size-md" />
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-xs">
        <span
          id="sort-label"
          className="text-xs tracking-[0.1em] text-ink-mute uppercase"
        >
          Sort by
        </span>
        <Select
          label="Sort by"
          value={sorting}
          onChange={(event) => setSorting(event.target.value)}
        >
          {SORTINGS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <FilterButton fetchMore={fetchMore} />
    </section>
  );
};
export default Actionbar;
