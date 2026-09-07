export interface BeerAttributeProps {
  icon: string;
  altText: string;
  attribute: string;
  value: string | number | undefined;
}

/**
 * A component for displaying a beer attribute.
 * This is used to display more detailed information about a beer.
 *
 * The amber icons that used to sit beside each label are gone: they were tinted
 * assets from the old palette, and a label already says what the number is.
 * The props are kept so callers do not all have to change at once.
 * @param attribute - The attribute heading.
 * @param value - The value of the attribute.
 * @returns - The beer attribute component.
 */
const BeerAttribute = ({ attribute, value }: BeerAttributeProps) => {
  return (
    <div aria-label={attribute} className="flex flex-col gap-xs">
      <h3 className="m-0 text-xs font-normal tracking-[0.1em] text-ink-mute uppercase">
        {attribute}
      </h3>
      <p className="tnum m-0 font-display text-lg text-ink">{value}</p>
    </div>
  );
};
export default BeerAttribute;
