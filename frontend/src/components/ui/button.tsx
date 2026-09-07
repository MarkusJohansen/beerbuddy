import type * as React from "react";
import { cn } from "cn";

/**
 * shadcn/ui's button, rewritten against this project's tokens.
 *
 * The upstream source is kept recognisable but not intact: its rounded corners,
 * shadows and `primary`/`secondary`/`destructive` palette do not exist here, and
 * neither does `class-variance-authority` — four variants do not need a variant
 * engine. Anything added by a later `shadcn add` arrives in upstream's idiom and
 * needs the same pass.
 *
 * The accent appears on `primary` only. A button being important is not a reason
 * for it to be accent-coloured; if every button is the accent, none of them is.
 */

const VARIANTS = {
  /** The one action a screen is actually for. At most one per view. */
  primary: "bg-accent text-ground hover:bg-ink",
  /** Everything else. A control identified by its border, hence `rule-strong`. */
  outline: "border border-rule-strong text-ink hover:border-ink",
  /** Chrome — icon buttons, dismissals. */
  ghost: "text-ink-mute hover:text-ink",
  /** Inline in prose. */
  link: "text-accent underline underline-offset-4 hover:no-underline",
} as const;

const SIZES = {
  sm: "h-lg px-sm text-xs",
  default: "h-xl px-md text-base",
  lg: "h-2xl px-lg text-base",
  icon: "size-xl",
} as const;

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

/**
 * A button.
 * @param variant - Which of the four registers this button belongs to.
 * @param size - Control height from the spacing scale.
 */
function Button({
  className,
  variant = "outline",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-sm rounded-none",
        "font-sans whitespace-nowrap transition-colors outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}

export { Button };
