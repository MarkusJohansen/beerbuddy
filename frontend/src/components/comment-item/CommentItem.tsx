import { Trash2 } from "lucide-react";
import { deleteComment } from "../../api/client";

interface CommentItemInterface {
  id: number;
  userId: string;
  username: string;
  commentText: string;
  timestamp: string;
  onDelete: () => void;
}

/**
 * Function for converting a timestamp to a human readable format.
 * @param timestamp - The timestamp to convert.
 * @returns - A human readable timestamp.
 */
const convertTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;

  if (interval > 1) {
    const flooredInterval = Math.floor(interval);
    return flooredInterval + ` year${flooredInterval === 1 ? "" : "s"} ago`;
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    const flooredInterval = Math.floor(interval);
    return flooredInterval + ` month${flooredInterval === 1 ? "" : "s"} ago`;
  }
  interval = seconds / 86400;
  if (interval > 1) {
    const flooredInterval = Math.floor(interval);
    return flooredInterval + ` day${flooredInterval === 1 ? "" : "s"} ago`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    const flooredInterval = Math.floor(interval);
    return flooredInterval + ` hour${flooredInterval === 1 ? "" : "s"} ago`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    const flooredInterval = Math.floor(interval);
    return flooredInterval + ` minute${flooredInterval === 1 ? "" : "s"} ago`;
  }
  return "< 1 minute ago";
};

/**
 * The comment item component. Displays a comment.
 * @param username - The username of the user who posted the comment.
 * @param commentText - The text of the comment.
 * @param timestamp - The timestamp of the comment.
 * @returns - The comment item component.
 */
const CommentItem = ({
  username,
  commentText,
  timestamp,
  id,
  userId,
  onDelete,
}: CommentItemInterface) => {
  return (
    <div className="flex items-start justify-between gap-md border-b border-rule py-md">
      <div className="flex flex-col gap-xs">
        <div className="flex items-baseline gap-sm">
          <p className="m-0 text-base text-ink">{username}</p>
          <p className="m-0 text-xs text-ink-mute">
            {convertTimestamp(timestamp)}
          </p>
        </div>
        <p className="m-0 text-base text-ink-dim">{commentText}</p>
      </div>
      {userId === localStorage.getItem("userIdBeerBuddy") && (
        <button
          className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-ink-mute transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={() => {
            // Ownership is enforced by the API, which answers 403 for someone
            // else's comment. This button is only rendered for your own.
            deleteComment(id)
              .catch((error) => console.error(error))
              .finally(() => onDelete());
          }}
          aria-label="Delete comment"
        >
          <Trash2 aria-hidden className="size-md" />
        </button>
      )}
    </div>
  );
};

export default CommentItem;
