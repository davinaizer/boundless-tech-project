import { expect, type Page } from "@playwright/test";

// The query the mock provider answers with canned filters (src/lib/ai/canned.ts).
// Kept as a literal because that module is server-only and cannot be imported here.
export const QUERY = "A cheap family day out near Brighton, under £30 a head";

// Offer cards are the list items that carry a per-use saving.
export const offerCards = (page: Page) =>
  page.getByRole("listitem").filter({ hasText: "saved per use" });

export async function search(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "What would you like to do?" }).fill(QUERY);
  await page.getByRole("button", { name: "Find offers" }).click();
  await expect(page.getByText("Read by AI.")).toBeVisible();
  await expect(offerCards(page).first()).toBeVisible();
}
