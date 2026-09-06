import type * as React from "react";
import { cn } from "cn";

/**
 * A styled native checkbox.
 *
 * `appearance: none` plus a border and a `::after` tick is enough to make the
 * native input match the design, so there is no reason to carry a component
 * library's version of it — the native one already announces its role and state
 * and responds to the space bar.
 */
interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type"> {
  /** The visible label. */
  label: string;
}

/**
 * A labelled checkbox.
 * @param props - See {@link CheckboxProps}; the rest go to the `<input>`.
 */
const Checkbox = ({ label, className, ...props }: CheckboxProps) => (
  <label className="flex cursor-pointer items-center gap-sm text-base text-ink">
    <input
      type="checkbox"
      className={cn(
        "size-md shrink-0 cursor-pointer appearance-none rounded-none",
        "border border-rule-strong bg-transparent transition-colors",
        "checked:border-accent checked:bg-accent",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        // The tick, drawn rather than imported: two borders rotated into a check.
        "relative after:absolute after:top-[2px] after:left-[5px] after:hidden",
        "after:h-[8px] after:w-[4px] after:rotate-45 after:border-r-2 after:border-b-2",
        "after:border-ground after:content-[''] checked:after:block",
        className
      )}
      {...props}
    />
    {label}
  </label>
);

export default Checkbox;
