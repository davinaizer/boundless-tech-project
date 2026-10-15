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
  await expect(feePanel).toContainText("Standard");
  await expect(feePanel).toContainText("Plus");
  await expect(feePanel).toContainText("Not a promise of real savings");
});
