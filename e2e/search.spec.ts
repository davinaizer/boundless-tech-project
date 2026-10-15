import { expect, test } from "@playwright/test";
import { offerCards, search } from "./support";

test("a query becomes editable filters, offers with savings, and the fee panel", async ({
  page,
}) => {
  await search(page);

  // The canned model reading, shown as removable chips.
  for (const chip of [
    "Category Days out",
    "Where South East",
    "Who Family",
    "Price up to £30 each",
  ]) {
    await expect(page.getByRole("button", { name: `Remove filter ${chip}` })).toBeVisible();
  }

  // Counts depend on today's date (offers expire), so only properties are asserted.
  await expect(page.getByRole("heading", { name: /\d+ offers? match/ })).toBeVisible();
  await expect(offerCards(page).first()).toContainText(/£\d/);
  await expect(
    page.getByText("Mock model line: this offer fits your search.").first(),
  ).toBeVisible();

  const feePanel = page.getByRole("complementary", { name: "Does the fee pay off?" });
  await expect(feePanel).toContainText("Standard costs £45 a year.");
  // Every counted offer is a Standard offer, so Plus would only repeat it.
  await expect(feePanel).not.toContainText("Plus costs");
  // This query has exactly three matches, so nothing is left out of the basis.
  await expect(feePanel).toContainText("based on your 3 matches");
  await expect(feePanel).toContainText("Uses a year are our assumption");
  await expect(feePanel).toContainText("Not a promise of real savings");
});

test("with more than three matches the fee panel counts the best three and says so", async ({
  page,
}) => {
  await search(page);
  for (const chip of ["Price up to £30 each", "Where South East", "Who Family"]) {
    await page.getByRole("button", { name: `Remove filter ${chip}` }).click();
  }
  await expect(page.getByText("Updating results…")).toHaveCount(0);

  const feePanel = page.getByRole("complementary", { name: "Does the fee pay off?" });
  await expect(feePanel).toContainText("based on your top 3 matches");
  await expect(feePanel).toContainText(/\d+ other matches aren't counted/);
  await expect(feePanel).toContainText("These 3 offers could save you about");
  // Cards past the third keep their per-use saving.
  await expect(offerCards(page).nth(3)).toContainText(/£\d/);
});
