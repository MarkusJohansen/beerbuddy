import type * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";

/**
 * A styled native `<select>`.
 *
 * This replaces both an Ant Design `Select` and the separate `Dropdown` that
 * used to render below 768 px, because the native element gets the platform's
 * own picker on a touch device — which is the thing the mobile variant existed
 * to approximate. The popup is therefore the operating system's and cannot be
 * styled; that is the deliberate trade for deleting a responsive branch and a
 * component.
 */
interface SelectProps extends React.ComponentProps<"select"> {
  /** Accessible name. Required — a bare select announces nothing useful. */
  label: string;
}

/**
 * A single-choice control.
 * @param props - See {@link SelectProps}; the rest go to the `<select>`.
 */
const Select = ({ label, className, children, ...props }: SelectProps) => (
  <div className="relative inline-flex items-center">
    <select
      aria-label={label}
      className={cn(
        "h-xl w-full cursor-pointer appearance-none rounded-none border-0",
        "border-b border-rule-strong bg-transparent py-sm pr-lg pl-0",
        "font-sans text-base text-ink transition-colors outline-none",
        "focus-visible:border-accent",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-0 size-md text-ink-mute"
    />
  </div>
);

export default Select;
