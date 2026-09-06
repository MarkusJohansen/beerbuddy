import { cn } from "cn";

/**
 * A loading indicator.
 *
 * Ant Design's `Spin` for a rotating hairline arc — there is no library needed
 * for one `@keyframes`, and this one inherits the accent rather than bringing
 * its own colour.
 */
interface SpinnerProps {
  /** What is loading, for assistive technology. */
  label: string;
  /** `default` inline, `large` for a whole-page wait. */
  size?: "default" | "large";
  className?: string;
}

/**
 * An indeterminate loading indicator.
 * @param props - See {@link SpinnerProps}.
 */
const Spinner = ({ label, size = "default", className }: SpinnerProps) => (
  <span
    role="status"
    aria-live="polite"
    className={cn("inline-flex", className)}
  >
    <span
      aria-hidden
      className={cn(
        "animate-spin rounded-full border-2 border-rule border-t-accent",
        size === "large" ? "size-xl" : "size-md"
      )}
    />
    <span className="sr-only">{label}</span>
  </span>
);

export default Spinner;
