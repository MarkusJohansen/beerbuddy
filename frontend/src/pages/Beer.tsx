import { useEffect, useState } from "react";
import { useParams } from "react-router";
import InfiniteScroll from "react-infinite-scroll-component";
import BeerAttribute from "../components/beer-attribute/BeerAttribute";
import MobileBeerAttribute from "../components/beer-attribute/MobileBeerAttribute";
import CommentItem from "../components/comment-item/CommentItem";
import CommentBar from "../components/comment-bar/CommentBar";
import Logo from "../components/logo/Logo";
import Voter from "../components/voter/Voter";
import Spinner from "../components/ui/spinner";
import useFetchBeer from "../utils/useFetchBeer";
import protectRoute from "../utils/protectRoute";
import useWindowDimensions from "../utils/useWindowDimensions";
import { MOBILE, TABLET } from "../utils/breakpoints";
import { fetchComments } from "../api/client";
import type { Comment } from "../types/types";

/** How many comments a page of the thread holds. */
const COMMENT_PAGE_SIZE = 5;

/**
 * BeerPage component that displays detailed information about a beer and its comments.
 * @returns a BeerPage component
 */
const BeerPage = () => {
  useEffect(() => {
    protectRoute();
  }, []);
  const { id } = useParams<{ id: string }>();
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [newVote, setNewVote] = useState(false);
  const [newComment, setNewComment] = useState(false);
  const { width } = useWindowDimensions();

  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    /* If there is no ID, then we must do an early return */
    if (id === undefined) return;

    setCommentsLoading(true);
    setOffset(0);
    fetchComments(Number(id), COMMENT_PAGE_SIZE, 0)
      .then(setComments)
      .catch((error) => {
        console.error("Could not load comments:", error);
        setComments([]);
      })
      .finally(() => {
        setCommentsLoading(false);
        setNewComment(false);
      });
  }, [id, newComment]);

  const { beer, isLoading, isError } = useFetchBeer({
    id: Number(id),
    newVote,
    newComment,
  });

  if (isLoading || beer === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-ground">
        <Spinner label="Loading beer" size="large" />
      </div>
    );
  }

  if (isError || id === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-ground text-ink">
        Error fetching beer
      </div>
    );
  }

  const attributes = [
    {
      attribute: "Style",
      icon: "",
      altText: "",
      value: beer.style,
    },
    {
      attribute: "ABV",
      icon: "",
      altText: "",
      value: String((beer.abv * 100).toFixed(1)) + "%",
    },
    {
      attribute: "IBU",
      icon: "",
      altText: "",
      value: beer.ibu !== 0 ? String(beer.ibu).split(".")[0] : null,
    },
    {
      attribute: "Volume",
      icon: "",
      altText: "",
      value: beer.ounces + "oz",
    },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-ground px-md py-xl text-ink tablet:px-2xl">
      <header className="flex items-center justify-between gap-md border-b border-rule pb-md">
        <Logo />
        {width > TABLET && (
          <a
            href="/"
            className="text-base text-accent underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Back to menu
          </a>
        )}
      </header>

      <div className="flex flex-col gap-lg py-xl">
        <div className="flex flex-col gap-xs">
          <p className="m-0 text-xs tracking-[0.1em] text-ink-mute uppercase">
            {beer.brewery_name}
          </p>
          <h1 className="m-0 font-display text-2xl leading-none tracking-[-0.02em] text-ink">
            {beer.name}
          </h1>
        </div>

        <div className="flex items-center gap-md">
          <Voter
            votes={beer.rating || 0}
            reaction={beer.user_vote}
            beerId={beer.id}
            onSuccess={() => setNewVote(!newVote)}
          />
          <p className="tnum m-0 text-xs text-ink-mute">
            Based on {beer.vote_count !== null ? beer.vote_count : "0"} review
            {beer.vote_count === 1 ? "" : "s"}
          </p>
        </div>

        <section
          aria-label="Beer attributes"
          className="border-y border-rule py-md"
        >
          {width > MOBILE ? (
            <div className="flex flex-wrap gap-2xl">
              {attributes
                .filter((a) => a.value !== null)
                .map((a) => (
                  <BeerAttribute
                    key={a.attribute}
                    attribute={a.attribute}
                    icon={a.icon}
                    altText={a.altText}
                    value={a.value ?? undefined}
                  />
                ))}
            </div>
          ) : (
            <MobileBeerAttribute
              attributeProps={attributes.map((a) => ({
                ...a,
                value: a.value ?? undefined,
              }))}
            />
          )}
        </section>
      </div>

      <InfiniteScroll
        style={{ overflow: "hidden", minHeight: "33vh" }}
        dataLength={comments.length}
        next={() => {
          /* Fetch the next comments we need, and add them to the comments state */
          fetchComments(
            Number(id),
            COMMENT_PAGE_SIZE,
            offset + COMMENT_PAGE_SIZE
          )
            .then((data) => {
              setComments([...comments, ...data]);
              setOffset(offset + COMMENT_PAGE_SIZE);
            })
            .catch((error) => console.error("Could not load comments:", error));
        }}
        hasMore={comments.length < beer.comment_count}
        loader={
          <div className="flex justify-center py-md">
            <Spinner label="Loading more comments" />
          </div>
        }
        scrollThreshold={1}
      >
        <ul aria-label="List of comments" className="m-0 list-none p-0">
          {commentsLoading ? (
            <div className="flex justify-center py-xl">
              <Spinner label="Loading comments" />
            </div>
          ) : (
            comments.map((comment) => (
              <li key={`${comment.username}-${comment.created_at}}`}>
                <CommentItem
                  id={comment.id}
                  userId={comment.user_id}
                  username={comment.username}
                  commentText={comment.comment_text}
                  timestamp={comment.created_at}
                  onDelete={() => setNewComment(true)}
                />
              </li>
            ))
          )}
        </ul>
      </InfiniteScroll>

      <CommentBar onSuccess={() => setNewComment(true)} />
    </main>
  );
};
export default BeerPage;
