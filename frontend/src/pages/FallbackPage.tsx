/**
 * Shown for any route that does not exist.
 * @returns the not-found page.
 */
const FallbackPage = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-md text-ink">
      <div className="flex max-w-[40ch] flex-col items-start gap-md">
        <img src="/teku.svg" alt="BeerBuddy logo" className="size-xl" />
        <h1 className="m-0 font-display text-2xl leading-tight tracking-[-0.02em]">
          The page you were looking for was not found.
        </h1>
        <a
          href="/"
          className="text-base text-accent underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Return to the catalogue
        </a>
      </div>
    </main>
  );
};

export default FallbackPage;
