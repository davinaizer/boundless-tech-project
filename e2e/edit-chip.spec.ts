import { expect, test } from "@playwright/test";
import { offerCards, search } from "./support";

test("removing a chip updates results and the URL without reading the query again", async ({
  page,
}) => {
  const calls = { interpret: 0, search: 0 };
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() !== "POST") return;
    if (path === "/api/interpret") calls.interpret++;
    if (path === "/api/search") calls.search++;
  });

  await search(page);
  await expect(page).toHaveURL(/maxPrice=30/);
  expect(calls).toEqual({ interpret: 1, search: 1 });

  const price = page.getByRole("button", { name: "Remove filter Price up to £30 each" });
  await price.click();

  await expect(price).toHaveCount(0);
  await expect(page).not.toHaveURL(/maxPrice/);
  await expect(page).toHaveURL(/region=South\+East/);
  await expect(page.getByText("Updating results…")).toHaveCount(0);
  await expect(offerCards(page).first()).toBeVisible();
  // The other chips stay, and the edit searched again without calling interpret.
  await expect(page.getByRole("button", { name: "Remove filter Where South East" })).toBeVisible();
  expect(calls).toEqual({ interpret: 1, search: 2 });
});
