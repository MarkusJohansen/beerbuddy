import { expect, test } from "@playwright/test";

/**
 * The API this suite talks to for setup and teardown. Points at the disposable
 * stack `make test-e2e` starts, never at a deployed instance.
 */
const API = process.env.E2E_API_URL ?? "http://localhost:3100/api";

/** Removes a user, and by cascade their votes and comments. */
const deleteUser = async (userId: string) => {
  const res = await fetch(`${API}/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  // 404 just means the previous run already cleaned up.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Could not delete user ${userId}: ${res.status}`);
  }
};

/** Reads one beer as a given user, to assert on its vote and comment counts. */
const fetchBeer = async (id: string, userId: string) => {
  const res = await fetch(`${API}/beers/${id}`, {
    headers: { "X-User-Id": userId },
  });
  if (!res.ok) throw new Error(`Could not fetch beer ${id}: ${res.status}`);
  return res.json();
};

test.describe("Login functionality", () => {
  test("login", async ({ page }) => {
    //Delete user if it exists from previous test runs
    test.setTimeout(120000);
    await page.goto("/");
    await page.getByLabel("Username").click();
    await page.getByLabel("Username").fill("E2EUserLogin");
    await page.getByRole("button", { name: "Submit" }).click();
    const storageState = page.context().storageState();
    const userId = (await storageState).origins[0].localStorage.filter(
      (item) => item.name === "userIdBeerBuddy"
    );
    await deleteUser(userId[0].value);
    await page.evaluate(() => window.localStorage.clear());

    await page.goto("/");

    //Shal automatically jump to login page as it is not logged in yet
    await page.getByLabel("Username").click();
    await page.getByLabel("Username").fill("E2EUserLogin");
    await page.getByRole("button", { name: "Submit" }).click();

    //User is already in database, so welcome back message should be displayed
    await expect(
      page.getByText("Created new user E2EUserLogin!")
    ).toBeVisible();

    //Redirects to the home page
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Welcome, E2EUserLogin" })
    ).toBeVisible();

    //When trying to go back to , so welcome back message should be displayed
    await page.goto("/login");
    await expect(page.getByText("Welcome back E2EUserLogin!")).toBeVisible();

    //E2EUserLogin is already logged in, so it should be redirected to the home page
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Welcome, E2EUserLogin" })
    ).toBeVisible();

    const storageState2 = page.context().storageState();
    const userId2 = (await storageState2).origins[0].localStorage.filter(
      (item) => item.name === "userIdBeerBuddy"
    );
    await deleteUser(userId2[0].value);
    await page.evaluate(() => window.localStorage.clear());

    //User is deleted, so it should be redirected to the login page
    await page.goto("/");
    await expect(page.getByText("Log in")).toBeVisible();
  });
});

test.describe("BeerBuddy functionality", () => {
  let E2EUserCounter = 0;
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    // Login Logic
    await page.goto("/");
    await page.getByLabel("Username").click();
    await page.getByLabel("Username").fill("E2EUser" + E2EUserCounter);
    await page.getByRole("button", { name: "Submit" }).click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Welcome, E2EUser" + E2EUserCounter,
      })
    ).toBeVisible();
    E2EUserCounter++;
  });

  test.afterEach(async ({ page }) => {
    // User Deletion Logic
    const storageState = page.context().storageState();
    const userId = (await storageState).origins[0].localStorage.filter(
      (item) => item.name === "userIdBeerBuddy"
    );
    await deleteUser(userId[0].value);
    await page.evaluate(() => window.localStorage.clear());
  });

  test("beer-page", async ({ page }) => {
    //Click on the first beer in the list
    await page.locator("ul>li").nth(0).click();

    //find out what beer is clicked
    const beerId = page.url().split("/beer/")[1];

    //fetch beer data from the database
    const beerData = await fetchBeer(beerId, "");
    const beerName = beerData.name;
    const beerStyle = beerData.style;

    //See if the beer page is correct
    await expect(page.getByText(beerName)).toBeVisible();
    await expect(page.getByPlaceholder("Best beer ever!")).toBeVisible();
    await expect(page.getByText(beerStyle)).toBeVisible();
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    //Check if back to menu button works
    await expect(page.getByText("Welcome, E2EUser")).toBeVisible();
  });

  test("vote", async ({ page }) => {
    //Open the first beer in the list
    await page.locator("ul>li").nth(0).click();

    //find out what beer is clicked
    const beerId = page.url().split("/beer/")[1];

    //fetch beer data from the database
    const beerData = await fetchBeer(beerId, "");
    const beerName = beerData.name;
    const beerVotesStart = parseInt(beerData.vote_count);
    const beerRatingStart = parseInt(beerData.rating);

    //See if the beer page is correct

    expect(page.getByLabel("Total score")).toHaveText(`${beerRatingStart}`);

    await expect(
      page.getByText(`Based on ${beerVotesStart} reviews`)
    ).toBeVisible();
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    //Upvote the beer and see if the rating is correct
    await page.getByLabel(beerName).getByLabel("Upvote this beer").click();
    await page.getByLabel(beerName).click();
    expect(page.getByLabel("Total score")).toHaveText(`${beerRatingStart + 1}`);
    await expect(
      page.getByText(`Based on ${beerVotesStart + 1} reviews`)
    ).toBeVisible();
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    //Downvote the beer and see if the rating is correct
    await page.getByLabel(beerName).getByLabel("Downvote this beer").click();
    await page.getByLabel(beerName).click();
    expect(page.getByLabel("Total score")).toHaveText(`${beerRatingStart - 1}`);
    await expect(
      page.getByText(`Based on ${beerVotesStart + 1} reviews`)
    ).toBeVisible();
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    //Remove the vote and see if the rating is correct
    await page.getByLabel(beerName).getByLabel("Downvote this beer").click();
    await page.getByLabel(beerName).click();
    expect(page.getByLabel("Total score")).toHaveText(`${beerRatingStart}`);
    await expect(
      page.getByText(`Based on ${beerVotesStart} reviews`)
    ).toBeVisible();
  });

  test("comment", async ({ page }) => {
    //Open the first beer in the list
    await page.locator("ul>li").nth(0).click();

    //find out what beer is clicked
    const beerId = page.url().split("/beer/")[1];

    //fetch beer data from the database

    const beerData = await fetchBeer(beerId, "");
    const beerComments =
      beerData.comment_count != null ? beerData.comment_count : 0;

    //Upvote the beer and see if the rating is correct
    await page.getByPlaceholder("Best beer ever!").click();
    await page
      .getByPlaceholder("Best beer ever!")
      .fill("This is a test comment");
    await page.getByRole("button", { name: "Comment", exact: true }).click();
    await expect(page.getByText("Comment posted.")).toBeVisible();
    await expect(page.getByText(/This is a test comment$/)).toBeVisible();

    const beerData2 = await fetchBeer(beerId, "");
    const beerComments2 =
      beerData2.comment_count != null ? beerData2.comment_count : 0;

    expect(beerComments2 - beerComments).toBe(1);

    await page.getByLabel("Delete comment").click();

    const beerData3 = await fetchBeer(beerId, "");
    const beerComments3 =
      beerData3.comment_count != null ? beerData3.comment_count : 0;

    expect(beerComments3 - beerComments).toBe(0);
  });

  test("search", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search search" }).click();
    await page.getByRole("textbox", { name: "Search search" }).fill("NoResult");
    await page.getByRole("textbox", { name: "Search search" }).press("Enter");

    await expect(page.getByText("Yay! You have seen it all")).toBeVisible();

    await page.getByRole("textbox", { name: "Search search" }).fill("IPA");
    await page.getByRole("button", { name: "search" }).click();
    await expect(page.getByText("Loading...")).toBeVisible();

    //Open the first beer in the list
    await page.locator("ul>li").nth(0).click();

    //find out what beer is clicked
    const beerId = page.url().split("/beer/")[1];

    //fetch beer data from the database
    const beerData = await fetchBeer(beerId, "");
    const beerName = beerData.name;

    //See if the beers returned are correct (contains IPA)
    expect(beerName).toContain("IPA");
  });

  test("sorting", async ({ page }) => {
    await page.locator("ul>li").nth(0).click();
    const beerId = page.url().split("/beer/")[1];
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    await page.locator("ul>li").nth(1).click();
    const beerId2 = page.url().split("/beer/")[1];
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    const beerData = await fetchBeer(beerId, "");
    const beerRating = beerData.rating != null ? parseInt(beerData.rating) : 0;

    const beerData2 = await fetchBeer(beerId2, "");
    const beerRating2 =
      beerData2.rating != null ? parseInt(beerData2.rating) : 0;

    expect(beerRating).toBeGreaterThanOrEqual(beerRating2);

    await page.getByText("Most popular", { exact: true }).click();
    await page.getByText("Least popular", { exact: true }).click();

    await page.locator("ul>li").nth(0).click();
    const beerId3 = page.url().split("/beer/")[1];
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    await page.locator("ul>li").nth(1).click();
    const beerId4 = page.url().split("/beer/")[1];
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    const beerData3 = await fetchBeer(beerId3, "");
    const beerRating3 =
      beerData3.rating != null ? parseInt(beerData3.rating) : 0;

    const beerData4 = await fetchBeer(beerId4, "");
    const beerRating4 =
      beerData4.rating != null ? parseInt(beerData4.rating) : 0;

    expect(beerRating3).toBeLessThanOrEqual(beerRating4);
    expect(beerRating3).toBeLessThanOrEqual(beerRating);

    await page.getByText("Least popular", { exact: true }).click();
    await page.getByText("A-Z", { exact: true }).click();

    await page.locator("ul>li").nth(0).click();
    const beerId5 = page.url().split("/beer/")[1];
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    await page.locator("ul>li").nth(1).click();
    const beerId6 = page.url().split("/beer/")[1];
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    const beerData5 = await fetchBeer(beerId5, "");
    const beerName5 = beerData5.name;

    const beerData6 = await fetchBeer(beerId6, "");
    const beerName6 = beerData6.name;

    expect(beerName5.localeCompare(beerName6)).toBeLessThanOrEqual(0);

    await page.getByText("A-Z", { exact: true }).click();
    await page.getByText("Z-A", { exact: true }).click();

    await page.locator("ul>li").nth(0).click();
    const beerId7 = page.url().split("/beer/")[1];
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    await page.locator("ul>li").nth(1).click();
    const beerId8 = page.url().split("/beer/")[1];
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    const beerData7 = await fetchBeer(beerId7, "");
    const beerName7 = beerData7.name;

    const beerData8 = await fetchBeer(beerId8, "");
    const beerName8 = beerData8.name;

    expect(beerName7.localeCompare(beerName8)).toBeGreaterThanOrEqual(0);

    expect(beerName7.localeCompare(beerName5)).toBeGreaterThanOrEqual(0);
  });

  test("styleFiltering", async ({ page }) => {
    await page.getByRole("button", { name: "Beer styles" }).click();
    await page.getByText("American IPA").click();
    await page.getByRole("button", { name: "Apply Filters" }).click();

    await page.locator("ul>li").nth(0).click();
    const beerId = page.url().split("/beer/")[1];

    //fetch beer data from the database
    const beerData = await fetchBeer(beerId, "");
    const beerStyle = beerData.style;

    expect(beerStyle).toBe("American IPA");

    //See if the beers have the correct style
    await expect(page.getByText("American IPA")).toBeVisible();

    //Deselect the style
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();
    await page.getByRole("button", { name: "Beer styles" }).click();
    await page.getByText("American IPA").click();

    //Select another style
    await page.getByText("Witbier").click();
    await page.getByRole("button", { name: "Apply Filters" }).click();

    await page.locator("ul>li").nth(0).click();
    const beerId2 = page.url().split("/beer/")[1];

    //fetch beer data from the database
    const beerData2 = await fetchBeer(beerId2, "");
    const beerStyle2 = beerData2.style;

    expect(beerStyle2).toBe("Witbier");

    //See if the beers have the correct style
    await expect(page.getByText("Witbier")).toBeVisible();
    await page.getByRole("link", { name: "BeerBuddy logo BeerBuddy" }).click();

    //Select two styles at the same time
    await page.getByRole("button", { name: "Beer styles" }).click();
    await page.getByText("American Blonde Ale").click();
    await page.getByRole("button", { name: "Apply Filters" }).click();

    await page.locator("ul>li").nth(0).click();
    const beerId3 = page.url().split("/beer/")[1];

    //fetch beer data from the database
    const beerData3 = await fetchBeer(beerId3, "");
    const beerStyle3 = beerData3.style;

    expect(beerStyle3 == "American Blonde Ale" || beerStyle3 == "Witbier").toBe(
      true
    );
  });
});
