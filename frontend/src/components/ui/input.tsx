import type * as React from "react";
import { cn } from "cn";

/**
 * shadcn/ui's input, rewritten against this project's tokens.
 *
 * Upstream draws a boxed, rounded, shadowed field. This one is a rule with text
 * sitting on it: the design separates regions with hairlines rather than fills,
 * and a box around an input is a fill in all but name.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-xl w-full min-w-0 rounded-none border-0 border-b border-rule-strong",
        "bg-transparent px-0 py-sm font-sans text-base text-ink transition-colors",
        "placeholder:text-ink-mute outline-none",
        "focus-visible:border-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-invalid:border-accent aria-invalid:border-b-2",
        className
      )}
      {...props}
    />
  );
}

export { Input };
