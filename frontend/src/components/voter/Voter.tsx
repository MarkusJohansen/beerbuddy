import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import protectRoute from "../../utils/protectRoute";
import { setReaction } from "../../api/client";
import type { ReactionType } from "../../types/types";

interface VoterInterface {
  votes: number;
  reaction: ReactionType;
  beerId: number;
  onSuccess?: () => void;
}

/** Each reaction's contribution to the score, so a change can be applied locally. */
const VALUES: Record<ReactionType, number> = {
  upvote: 2,
  unreact: 1,
  downvote: 0,
};

/**
 * UI component to perform the vote action.
 *
 * The score is the expressive element of the catalogue — a ranked list is a list
 * of numbers — so it is set large in tabular figures and the chevrons stay
 * quiet. The accent marks the user's own vote and nothing else here.
 * @param votes - number of votes
 * @param reaction - the reaction to vote with
 * @param beerId - id of the beer to vote on
 * @returns - the voter component
 */
const Voter = (props: VoterInterface) => {
  const [action, setAction] = useState(props.reaction);

  const handleVote =
    (reaction: ReactionType) =>
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      if (await protectRoute()) return "Error";
      const newReaction = action === reaction ? "unreact" : reaction;
      setAction(newReaction);
      setReaction(props.beerId, newReaction).catch((error) =>
        console.error("Could not record vote:", error)
      );
      if (props.onSuccess) props.onSuccess();
    };

  const total =
    parseInt(`${props.votes}`) + VALUES[action] - VALUES[props.reaction];

  return (
    <div className="flex shrink-0 items-center gap-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleVote("upvote")}
        aria-label="Upvote this beer"
        aria-pressed={action === "upvote"}
        className={action === "upvote" ? "text-accent" : undefined}
      >
        <ChevronUp aria-hidden className="size-md" />
      </Button>
      <span
        aria-label="Total score"
        className="tnum min-w-xl text-center font-display text-lg text-ink"
      >
        {!isNaN(total) ? total : 0}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleVote("downvote")}
        aria-label="Downvote this beer"
        aria-pressed={action === "downvote"}
        className={action === "downvote" ? "text-accent" : undefined}
      >
        <ChevronDown aria-hidden className="size-md" />
      </Button>
    </div>
  );
};
export default Voter;
