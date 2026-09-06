import { fetchSession } from "../api/client";

/**
 * Guards a route that needs a signed-in user.
 *
 * Sends the browser to /login when localStorage has no user, or when the id it
 * holds does not belong to a user with the stored username. The previous version
 * looked a user up by username and compared the returned id to the stored one,
 * which never checked the id the browser actually sends on requests.
 *
 * @returns true when the caller was redirected and should stop.
 */
const protectRoute = async (): Promise<boolean> => {
  const username = localStorage.getItem("userNameBeerBuddy");
  const userId = localStorage.getItem("userIdBeerBuddy");

  if (!username || !userId) {
    resetLocalStorage();
    window.location.replace("/login");
    return true;
  }

  const user = await fetchSession().catch(() => null);

  if (!user || user.username !== username) {
    resetLocalStorage();
    window.location.replace("/login");
    return true;
  }

  return false;
};

/** Clears the stored identity. */
const resetLocalStorage = () => {
  localStorage.removeItem("userNameBeerBuddy");
  localStorage.removeItem("userIdBeerBuddy");
};

export default protectRoute;
