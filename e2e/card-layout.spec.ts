import { expect, test } from "@playwright/test";
import { offerCards, search } from "./support";

test("a card states its place, price and audience as facts", async ({ page }) => {
  await search(page);
  const card = offerCards(page).first();

  // Properties, not values: the offers shown depend on today's date.
  await expect(card).toContainText("South East");
  await expect(card).toContainText(/Free|£\d[\d.,]* a head/);
  await expect(card).toContainText(/Anyone|Solo|Couples|Families/);
  // The old run-on "Partner, Region" line is gone: the region is its own fact.
  await expect(card.getByText(/^.+, South East$/)).toHaveCount(0);
});

test("on a narrow screen the saving sits under the title, and nothing scrolls sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await search(page);
  const card = offerCards(page).first();

  const title = await card.getByRole("heading", { level: 3 }).boundingBox();
  const saving = await card.getByText("saved per use").boundingBox();
  expect(title).not.toBeNull();
  expect(saving).not.toBeNull();
  expect(saving!.y).toBeGreaterThanOrEqual(title!.y + title!.height);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
