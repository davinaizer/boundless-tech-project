import { expect, test } from "@playwright/test";
import { search } from "./support";

// The e2e run uses the mock provider and the in-memory adapter (playwright.config.ts).
test("the bar names the mock and the in-memory catalogue, and opens and closes", async ({
  page,
}) => {
  await page.goto("/");
  const bar = page.getByRole("region", { name: "Runtime" });
  await expect(bar.getByText("AI: mock")).toBeVisible();
  await expect(bar.getByText("Data: in-memory")).toBeVisible();

  const toggle = bar.getByRole("button", { name: /Debug/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(bar.getByText("AI provider")).toBeHidden();

  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(bar.getByText("AI provider")).toBeVisible();
  await expect(bar.getByText("Model", { exact: true })).toBeVisible();
  await expect(bar.getByText("none", { exact: true })).toBeVisible();

  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(bar.getByText("AI provider")).toBeHidden();
});

test("a search still ends in the AI note with the bar in place", async ({ page }) => {
  await search(page);
  await expect(page.getByRole("region", { name: "Runtime" })).toBeVisible();
});

for (const width of [320, 1280]) {
  test(`at ${width} px the footer is fully visible above the bar at the end of the page`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await search(page);
    await page.getByRole("region", { name: "Runtime" }).getByRole("button").click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footer = await page
      .getByText("A concept, not an official Boundless design")
      .boundingBox();
    const bar = await page.getByRole("region", { name: "Runtime" }).boundingBox();
    expect(footer).not.toBeNull();
    expect(bar).not.toBeNull();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(bar!.y + 1);
    expect(bar!.y + bar!.height).toBeLessThanOrEqual(700 + 1);
  });
}

test("/api/health names the running server's provider and adapter", async ({ request }) => {
  const response = await request.get("/api/health");
  const body = (await response.json()) as Record<string, unknown>;
  expect(body).toMatchObject({
    status: "ok",
    ai: { provider: "mock", model: "none" },
    data: { adapter: "in-memory" },
    debug: false,
  });
  expect(body).not.toHaveProperty("config");
});

// The e2e run is a production build, where the request inspector is off (ADR-017).
test("a production build has no Requests tab and serves no request record", async ({ page }) => {
  const interpret = page.waitForResponse("**/api/interpret");
  await search(page);
  const requestId = (await interpret).headers()["x-request-id"];
  expect(requestId).toBeTruthy();

  const bar = page.getByRole("region", { name: "Runtime" });
  await bar.getByRole("button", { name: /Debug/ }).click();
  await expect(bar.getByText("AI provider")).toBeVisible();
  await expect(bar.getByRole("tab")).toHaveCount(0);
  await expect(bar.getByText("Requests")).toHaveCount(0);

  const record = await page.request.get(`/api/debug/${requestId}`);
  expect(record.status()).toBe(404);
  expect(await record.text()).toBe("");
});
