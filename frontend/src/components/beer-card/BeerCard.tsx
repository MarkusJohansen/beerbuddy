import Voter from "../voter/Voter";

type ReactionType = "unreact" | "upvote" | "downvote";

/**
 * The interface for the BeerCard component.
 * @param name - The name of the beer.
 * @param brewery - The brewery of the beer.
 * @param beer_id - The ID of the beer.
 * @param votes - The number of votes the beer has.
 * @param reaction - The reaction of the user to the beer.
 */
interface BeerCardInterface {
  name: string;
  brewery: string;
  beer_id: number;
  votes: number;
  reaction: ReactionType;
}

/**
 * One entry in the catalogue: a link to the beer page carrying its vote control.
 *
 * An entry is a row bounded by a hairline rather than a filled card — the whole
 * list reads as a set of records that way, which is what a catalogue is.
 * @param props : BeerCardInterface - The interface for the BeerCard component.
 * @returns  - The beer card component.
 */
const BeerCard = (props: BeerCardInterface) => {
  return (
    <a
      href={`./beer/${props.beer_id}`}
      aria-label={props.name}
      className="group flex items-center justify-between gap-md border-b border-rule py-md transition-colors hover:border-rule-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex flex-col gap-xs">
        <h2 className="m-0 font-display text-lg leading-tight text-ink transition-colors group-hover:text-accent">
          {props.name}
        </h2>
        <p className="m-0 text-xs text-ink-mute">{props.brewery}</p>
      </div>
      <Voter
        votes={props.votes}
        reaction={props.reaction}
        beerId={props.beer_id}
      />
    </a>
  );
};
export default BeerCard;
