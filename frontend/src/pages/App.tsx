import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, LogOut } from "lucide-react";
import Sidebar from "../components/sidebar/Sidebar";
import Actionbar from "../components/actionbar/Actionbar";
import UserIntro from "../components/user-intro/UserIntro";
import BeerList from "../components/beer-list/BeerList";
import Filters from "../components/filters/Filters";
import { Button } from "../components/ui/button";
import useFetchMoreBeers from "../utils/useFetchMoreBeers";
import protectRoute from "../utils/protectRoute";

/** How far the catalogue must scroll before the return-to-top control appears. */
const TO_TOP_AFTER_PX = 100;

/**
 * The catalogue: the filter sidebar beside a scrolling list of beers.
 * @returns The catalogue page.
 */
const App = () => {
  useEffect(() => {
    protectRoute();
  }, []);
  const { beers, totalCount, fetchMore } = useFetchMoreBeers();

  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [showTopButton, setShowTopButton] = useState(false);

  // Escape returns focus to the skip link. This used to register a fresh window
  // listener on every render and remove none of them; the dialog relies on the
  // listener being well behaved, so it is an effect with a teardown now.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skipLinkRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const onScroll = () => setShowTopButton(main.scrollTop > TO_TOP_AFTER_PX);
    main.addEventListener("scroll", onScroll);
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(
    () => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
    []
  );

  return (
    <div className="flex h-screen w-full bg-ground text-ink">
      <a
        href="#infiniteScrollTarget"
        ref={skipLinkRef}
        className="absolute top-0 left-1/2 z-50 -translate-x-1/2 -translate-y-full bg-accent px-md py-sm text-ground focus:translate-y-0"
      >
        Skip to main content
      </a>

      <Sidebar>
        <Filters fetchMore={fetchMore} />
      </Sidebar>

      <main
        id="infiniteScrollTarget"
        ref={mainRef}
        className="flex-1 overflow-y-auto px-md py-xl tablet:px-2xl"
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-xl">
          <UserIntro />
          <Actionbar fetchMore={fetchMore} />
          <BeerList
            beers={beers}
            totalCount={totalCount}
            fetchMore={fetchMore}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            localStorage.removeItem("userIdBeerBuddy");
            window.location.reload();
          }}
          aria-label="Log out"
          className="fixed top-md right-md"
        >
          <LogOut aria-hidden className="size-md" />
        </Button>

        {showTopButton && (
          <Button
            variant="outline"
            size="icon"
            onClick={scrollToTop}
            aria-label="Back to top"
            className="fixed right-lg bottom-lg bg-ground"
          >
            <ArrowUp aria-hidden className="size-md" />
          </Button>
        )}
      </main>
    </div>
  );
};

export default App;
