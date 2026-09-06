import type { CSSProperties } from "react";

/**
 * Logo component that contains the BeerBuddy logo
 * and a heading.
 * @param style - CSS properties for custom styling
 * @returns a Logo component
 */
const Logo = (props: { style?: CSSProperties | undefined }) => {
  return (
    <a
      style={props.style}
      href="/"
      className="flex items-center gap-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <img src="/teku.svg" className="size-lg" alt="BeerBuddy logo" />
      <h1 className="m-0 font-display text-lg tracking-[-0.02em] text-ink">
        BeerBuddy
      </h1>
    </a>
  );
};
export default Logo;
