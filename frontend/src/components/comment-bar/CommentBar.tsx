import { Button, Input, Spin, App } from "antd";
import styles from "./CommentBar.module.css";
import { useId, useState } from "react";
import { useParams } from "react-router-dom";
import protectRoute from "../../utils/protectRoute";
import useWindowDimensions from "../../utils/useWindowDimensions";
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
  const { message } = App.useApp();
  const { width } = useWindowDimensions();
  const inputId = useId();

  if (id === undefined)
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Spin size="default" />
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
      message.error("Your comment is invalid.");
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
      message.error("There was a problem posting your comment.");
      return;
    }
    message.success("Comment posted.");
    setCommentText("");
    onSuccess();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.divider} />
      <section className={styles.container} aria-label="Post a comment">
        <div className={styles.labelContainer}>
          <label htmlFor={inputId}>Comment</label>
          <Input
            id={inputId}
            placeholder="Best beer ever!"
            className={styles.inputField}
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
        {width > 768 ? (
          <Button
            type="primary"
            className={styles.submitButton}
            /* When clicking on post button, you post */
            onClick={handleComment}
          >
            Comment
          </Button>
        ) : (
          <Button type="primary" className={styles.submitButton}>
            <img
              width={"30px"}
              height={"30px"}
              alt="Send icon"
              src={"/paper-plane-right.svg"}
            />
          </Button>
        )}
      </section>
    </div>
  );
};
export default CommentBar;
