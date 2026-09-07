import emoji from "/beerEmoji.svg";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { TABLET } from "../../utils/breakpoints";
import Logo from "../logo/Logo";

/**
 * UserIntro component that greets a logged in user with their username.
 * @returns a UserIntro component
 */
const UserIntro = () => {
  const { width } = useWindowDimensions();

  if (width < TABLET) {
    return (
      <>
        <header className="flex items-center">
          <Logo />
        </header>
        <hr className="m-0 border-0 border-t border-rule" />
      </>
    );
  }

  const name = localStorage.getItem("userNameBeerBuddy") ?? "";

  return (
    <>
      <header
        aria-label="User intro"
        className="flex items-center justify-between gap-md"
      >
        <h1 className="m-0 font-display text-2xl leading-none tracking-[-0.02em] text-ink">
          Welcome{name && <span className="text-ink-dim">, {name}</span>}
        </h1>
        <img className="size-xl" src={emoji} alt="Beer clinking Emoji" />
      </header>
      <hr className="m-0 border-0 border-t border-rule" />
    </>
  );
};
export default UserIntro;
