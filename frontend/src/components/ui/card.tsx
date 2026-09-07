import type * as React from "react";
import { cn } from "cn";

/**
 * shadcn/ui's card, cut down to what this design can express.
 *
 * A card here is a region of the page bounded by a hairline, not an object
 * floating above it — so upstream's shadow, radius and `bg-card` are gone, and
 * with them the footer and action slots nothing in this app used.
 */

/** A bounded region. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col gap-md border border-rule p-lg", className)}
      {...props}
    />
  );
}

/** The heading block of a card. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-xs", className)}
      {...props}
    />
  );
}

/** A card's title. Display face, because titles are what carry the identity. */
function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("font-display text-lg leading-tight text-ink", className)}
      {...props}
    />
  );
}

/** A card's body. */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex flex-col gap-md", className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardHeader, CardTitle };
