import Logo from "../logo/Logo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface LoginFormMobileProps {
  onFinishFailed: (errorInfo: unknown) => void;
  saveUser: (string: { username: string }) => void;
}

/**
 * Mobile version of the login form component.
 * @param onFinishFailed - function that is called when the form is submitted and fails validation
 * @param saveUser - function that is called when the form is submitted and passes validation
 * @returns - the mobile login form component
 */
const LoginFormMobile = ({
  onFinishFailed,
  saveUser,
}: LoginFormMobileProps) => {
  return (
    <main className="flex min-h-screen flex-col gap-xl bg-ground px-md py-xl text-ink">
      <header className="border-b border-rule pb-md">
        <Logo />
      </header>

      <section aria-label="Login form" className="flex flex-col gap-lg">
        <h1 className="m-0 font-display text-xl text-ink">Log in</h1>
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
              htmlFor="username-mobile"
              className="text-xs tracking-[0.1em] text-ink-mute uppercase"
            >
              Username
            </label>
            <Input id="username-mobile" name="username" required />
          </div>
          <Button variant="primary" type="submit">
            Submit
          </Button>
        </form>
      </section>
    </main>
  );
};

export default LoginFormMobile;
