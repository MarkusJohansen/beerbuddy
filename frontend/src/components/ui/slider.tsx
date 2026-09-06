import * as React from "react";
import { cn } from "cn";
import { Slider as SliderPrimitive } from "radix-ui";

/**
 * shadcn/ui's slider, rewritten against this project's tokens.
 *
 * This is the one control in the app with no native equivalent — `<input
 * type="range">` has a single thumb, and the ABV and IBU filters are ranges. It
 * is therefore the only reason `radix-ui` is a dependency at all, and it
 * replaces the MUI `Slider` that was carried for exactly the same reason.
 *
 * Upstream's rounded track and circular white thumb are gone: the track is a
 * hairline, the thumb is a square, and neither casts a shadow.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        "data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-px w-full grow bg-rule-strong"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-px bg-accent"
        />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          // Positional and interchangeable, with no id to key on.
          key={index}
          className={cn(
            "block size-sm shrink-0 cursor-grab bg-accent transition-colors",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-accent active:cursor-grabbing",
            "disabled:pointer-events-none"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
