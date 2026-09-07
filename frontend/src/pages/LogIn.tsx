import { useCallback, useEffect, useState } from "react";
import { v4 } from "uuid";

import useWindowDimensions from "../utils/useWindowDimensions";
import LoginFormMobile from "../components/login-forms/LoginFormMobile";
import LoginFormDesktop from "../components/login-forms/LoginFormDesktop";
import { createSession } from "../api/client";
import { useToast } from "../components/ui/use-toast";
import { MOBILE } from "../utils/breakpoints";

/**
 * Callback for when the form fails to validate.
 * @param errorInfo - the error info from the form
 */
const onFinishFailed = (errorInfo: unknown) => {
  console.error("Failed:", errorInfo);
};

/**
 * LogInPage component that displays the login form.
 * @returns a LogInPage component
 */
const LogInPage = () => {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const username = localStorage.getItem("userNameBeerBuddy");
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);

  /**
   * Resolves a username to a user, storing the id it comes back with.
   *
   * The API creates the user when the username is new and returns the existing one
   * otherwise, so signing in and signing up are the same call.
   */
  const signIn = useCallback(
    async (name: string) => {
      try {
        const session = await createSession(name, v4());
        localStorage.setItem("userIdBeerBuddy", session.id);
        setIsNewUser(session.isNewUser);

        setTimeout(() => window.location.replace("/"), 2000);
      } catch (error) {
        console.error("Could not sign in:", error);
        toast.error("Could not sign you in. Please try again.");
      }
    },
    [toast]
  );

  // Was previously called straight from the render body, which fired a network
  // write during render — and twice per mount under React 19's StrictMode.
  useEffect(() => {
    if (username && !localStorage.getItem("userIdBeerBuddy")) signIn(username);
  }, [username, signIn]);

  useEffect(() => {
    if (isNewUser === null) return;
    toast.success(
      isNewUser ? `Created new user ${username}!` : `Welcome back ${username}!`
    );
  }, [isNewUser, toast, username]);

  const saveUser = ({ username: name }: { username: string }) => {
    localStorage.setItem("userNameBeerBuddy", name);
    if (!localStorage.getItem("userIdBeerBuddy")) signIn(name);
  };

  if (width < MOBILE) {
    return (
      <LoginFormMobile onFinishFailed={onFinishFailed} saveUser={saveUser} />
    );
  }
  return (
    <LoginFormDesktop onFinishFailed={onFinishFailed} saveUser={saveUser} />
  );
};

export default LogInPage;
