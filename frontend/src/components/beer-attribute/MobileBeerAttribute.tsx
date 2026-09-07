import type { BeerAttributeProps } from "./BeerAttribute";

interface MobileBeerAttributeProps {
  attributeProps: BeerAttributeProps[];
}

/**
 * The compact form of the beer attributes, rendered at or below 768 px.
 *
 * Same content as {@link BeerAttribute}, laid out as rows rather than columns so
 * the labels and values stay readable on a narrow viewport.
 * @param attributeProps - one entry per attribute.
 */
const MobileBeerAttribute = ({ attributeProps }: MobileBeerAttributeProps) => {
  return (
    <dl className="m-0 flex w-full flex-col">
      {attributeProps
        .filter((prop) => prop.value !== null && prop.value !== undefined)
        .map((prop) => (
          <div
            key={prop.attribute}
            className="flex items-baseline justify-between gap-md border-b border-rule py-sm"
          >
            <dt className="text-xs tracking-[0.1em] text-ink-mute uppercase">
              {prop.attribute}
            </dt>
            <dd className="tnum m-0 font-display text-base text-ink">
              {prop.value}
            </dd>
          </div>
        ))}
    </dl>
  );
};
export default MobileBeerAttribute;
