import { useId, useState } from "react";
import { useParams } from "react-router-dom";
import { SendHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Spinner from "../ui/spinner";
import { useToast } from "../ui/use-toast";
import protectRoute from "../../utils/protectRoute";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MOBILE } from "../../utils/breakpoints";
import { addComment } from "../../api/client";

interface CommentBarInterface {
  onSuccess: () => void;
}

/**
 * Posts a comment to the backend.
 * @param beerId - The ID of the beer to post a comment for.
 * @param comment - The comment to post.
 * @returns - The response from the backend.
 */
const postComment = async (beerId: string, comment: string) => {
  if (await protectRoute()) return "Error";

  try {
    await addComment(Number(beerId), comment);
    return "OK";
  } catch (error) {
    console.error("Could not post comment:", error);
    return "Error";
  }
};

/**
 * The comment bar component. Contains the input field and submit button for posting a comment.
 * @param onSuccess - The function to call when a comment has been successfully posted.
 * @returns - The comment bar component.
 */
const CommentBar = ({ onSuccess }: CommentBarInterface) => {
  const { id } = useParams<{ id: string }>();
  const [commentText, setCommentText] = useState("");
  const toast = useToast();
  const { width } = useWindowDimensions();
  const inputId = useId();

  if (id === undefined)
    return (
      <div className="flex justify-center py-md">
        <Spinner label="Loading comment box" />
      </div>
    );

  /**
   * Checks if the comment is valid.
   * A valid comment is a comment that is between 1 and 200 characters long
   * A valid comment does not start with a whitespace.
   * A valid comment cant only contain special characters.
   * @param comment
   * @returns false if the comment is invalid, true if the comment is valid.
   */
  const validComment = (comment: string) => {
    const commentRegex = /^(?! )[^\n].{0,199}$/;
    const onlySpecialCharsRegex = /^[^a-zA-Z0-9]+$/;

    if (!(commentRegex.test(comment) && !onlySpecialCharsRegex.test(comment))) {
      toast.error("Your comment is invalid.");
      return false;
    }
    return true;
  };

  /**
   * Handles the posting of a comment.
   * if a comment is invalid, a message will be posted to user and the function returns.
   * if the response is "Error", a message is posted to the user.
   * If the response is successful, the comment text is cleared and onSuccess is called.
   */
  const handleComment = async () => {
    if (!validComment(commentText)) {
      return;
    }
    const response = await postComment(id, commentText);
    if (response === "Error") {
      toast.error("There was a problem posting your comment.");
      return;
    }
    toast.success("Comment posted.");
    setCommentText("");
    onSuccess();
  };

  return (
    <section
      aria-label="Post a comment"
      className="flex items-end gap-md border-t border-rule pt-md"
    >
      <div className="flex flex-1 flex-col gap-xs">
        <label
          htmlFor={inputId}
          className="text-xs tracking-[0.1em] text-ink-mute uppercase"
        >
          Comment
        </label>
        <Input
          id={inputId}
          placeholder="Best beer ever!"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            /* When you press Enter with focus on input, you post */
            if (e.key === "Enter") {
              handleComment();
            }
          }}
        />
      </div>
      {/* The icon variant used to have no click handler at all, so a comment
          could not be posted by tapping below 768 px. */}
      <Button
        variant="primary"
        size={width > MOBILE ? "default" : "icon"}
        onClick={handleComment}
        aria-label={width > MOBILE ? undefined : "Post comment"}
      >
        {width > MOBILE ? (
          "Comment"
        ) : (
          <SendHorizontal aria-hidden className="size-md" />
        )}
      </Button>
    </section>
  );
};
export default CommentBar;
