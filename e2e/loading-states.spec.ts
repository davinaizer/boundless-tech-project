import { expect, test, type Page } from "@playwright/test";
import { offerCards, QUERY, search } from "./support";

const queryBox = (page: Page) => page.getByRole("textbox", { name: "What would you like to do?" });

test("the clear button shows only with text, empties the field and keeps focus in it", async ({
  page,
}) => {
  await page.goto("/");
  const clear = page.getByRole("button", { name: "Clear text" });
  await expect(clear).toHaveCount(0);

  await queryBox(page).fill(QUERY);
  await expect(clear).toBeVisible();
  await clear.click();

  await expect(queryBox(page)).toHaveValue("");
  await expect(queryBox(page)).toBeFocused();
  await expect(clear).toHaveCount(0);
});

test("clearing the text leaves the chips and the results in place", async ({ page }) => {
  await search(page);
  await page.getByRole("button", { name: "Clear text" }).click();

  await expect(queryBox(page)).toHaveValue("");
  await expect(page.getByRole("button", { name: "Remove filter Who Family" })).toBeVisible();
  await expect(offerCards(page).first()).toBeVisible();
});

test("the button and each card show a spinner until their request answers", async ({ page }) => {
  // Held open by the test, so the pending states are observed rather than raced.
  let releaseInterpret!: () => void;
  let releaseExplain!: () => void;
  const interpretHeld = new Promise<void>((resolve) => (releaseInterpret = resolve));
  const explainHeld = new Promise<void>((resolve) => (releaseExplain = resolve));
  await page.route("**/api/interpret", async (route) => {
    await interpretHeld;
    await route.continue();
  });
  await page.route("**/api/explain", async (route) => {
    await explainHeld;
    await route.continue();
  });

  await page.goto("/");
  await queryBox(page).fill(QUERY);
  const find = page.getByRole("button", { name: "Find offers" });
  await find.click();

  await expect(find).toBeDisabled();
  await expect(find.locator("svg")).toBeVisible();

  releaseInterpret();
  const pending = page.getByText("Working out why it fits…");
  await expect(pending.first()).toBeVisible();
  await expect(offerCards(page).first().locator("svg").first()).toBeVisible();
  await expect(find).toBeEnabled();
  await expect(find.locator("svg")).toHaveCount(0);

  releaseExplain();
  await expect(pending).toHaveCount(0);
  await expect(
    page.getByText("Mock model line: this offer fits your search.").first(),
  ).toBeVisible();
});

test("enabled buttons show a pointer cursor, and an aria-disabled one does not", async ({
  page,
}) => {
  await page.goto("/");
  await queryBox(page).fill(QUERY);
  await page.getByRole("button", { name: "Find offers" }).click();
  await expect(offerCards(page).first()).toBeVisible();

  const cursorOf = (name: string) =>
    page
      .getByRole("button", { name, exact: true })
      .evaluate((element) => getComputedStyle(element).cursor);
  expect(await cursorOf("Add a filter")).toBe("pointer");
  expect(await cursorOf("Remove filter Who Family")).toBe("pointer");
  expect(await cursorOf("Clear text")).toBe("pointer");

  await page.getByRole("button", { name: "Add a filter" }).click();
  expect(await cursorOf("Add")).toBe("pointer");

  // Chips are aria-disabled while results refresh; the same state is set by hand.
  await page
    .getByRole("button", { name: "Add a filter", exact: true })
    .evaluate((element) => element.setAttribute("aria-disabled", "true"));
  expect(await cursorOf("Add a filter")).not.toBe("pointer");
});
