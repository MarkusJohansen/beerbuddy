import Logo from "../logo/Logo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface LoginFormDesktopProps {
  onFinishFailed: (errorInfo: unknown) => void;
  saveUser: (string: { username: string }) => void;
}

/**
 * Desktop version of the login form component.
 * Contains a sales pitch and the login form.
 *
 * The Ant Design `Form` is a native `<form>` now: `required` on the input is the
 * whole validation rule that existed, and the browser's own message is the one a
 * screen reader already knows how to announce.
 * @param onFinishFailed - function that is called when the form is submitted and fails validation
 * @param saveUser - function that is called when the form is submitted and passes validation
 * @returns the desktop login form component
 */
const LoginFormDesktop = ({
  onFinishFailed,
  saveUser,
}: LoginFormDesktopProps) => {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-3xl bg-ground px-2xl py-xl text-ink">
      <header className="border-b border-rule pb-md">
        <Logo />
      </header>
      <div className="grid grid-cols-2 items-center gap-3xl">
        <section className="flex flex-col gap-md">
          <h2 className="m-0 font-display text-2xl leading-tight tracking-[-0.02em] text-ink">
            Taste, rate, repeat — the craft beer journey
          </h2>
          <p className="m-0 max-w-[46ch] text-base text-ink-dim">
            Join the BeerBuddy community to unlock exclusive features and be
            part of a global craft beer conversation.
          </p>
        </section>
        <section aria-label="Login form" className="border border-rule p-lg">
          <h1 className="m-0 mb-lg font-display text-lg text-ink">Log in</h1>
          <form
            className="flex flex-col gap-lg"
            autoComplete="off"
            onInvalid={onFinishFailed}
            onSubmit={(event) => {
              event.preventDefault();
              const username = String(
                new FormData(event.currentTarget).get("username") ?? ""
              );
              saveUser({ username });
            }}
          >
            <div className="flex flex-col gap-xs">
              <label
                htmlFor="username-desktop"
                className="text-xs tracking-[0.1em] text-ink-mute uppercase"
              >
                Username
              </label>
              <Input id="username-desktop" name="username" required />
            </div>
            <Button variant="primary" type="submit" className="self-start">
              Submit
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default LoginFormDesktop;
