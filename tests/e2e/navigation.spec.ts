import { expect, test } from "@playwright/test";

import { SEEDED, signIn } from "./helpers";

// Changes the site-wide header menu, so it runs in the last project (after the visual baselines)
// and removes its menu item again at the end.

test("create a page, add it to the header menu, and see it on desktop and mobile", async ({
  page,
}) => {
  const title = `Team ${Date.now()}`;
  await signIn(page, SEEDED.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);

  // Create and publish the page.
  await page.goto("/admin/content");
  await page.getByRole("button", { name: "New page" }).click();
  await page.getByLabel("Title").fill(title);
  await expect(page.getByRole("button", { name: "Create page" })).toBeEnabled();
  await page.getByRole("button", { name: "Create page" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/pages\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByRole("button", { name: "Add Rich text" }).click();
  await expect(page.getByText("Section added.")).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published. The live page is updated.")).toBeVisible();

  // Add it to the header menu.
  await page.goto("/admin/content/navigation");
  const header = page.getByTestId("menu-header");
  const items = header.getByTestId("menu-item");
  const count = await items.count();
  await header.getByRole("button", { name: "Add item" }).click();
  const item = items.nth(count);
  await item.getByLabel(`Label for item ${count + 1}`).fill(title);
  await item.getByRole("combobox", { name: "Link type" }).click();
  await page.getByRole("option", { name: "Page", exact: true }).click();
  await item.getByRole("combobox", { name: "Page" }).click();
  await page.getByRole("option", { name: new RegExp(`^${title}`) }).click();
  await expect(item.getByTestId("menu-warning")).toHaveCount(0);
  await header.getByRole("button", { name: "Save header menu" }).click();
  await expect(page.getByText("Header menu saved.")).toBeVisible();

  try {
    // Desktop header.
    await page.goto("/");
    const nav = page.getByTestId("site-header").getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: title }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/team-\d+$/);

    // Mobile menu at 390px.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(
      page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: title }),
    ).toBeVisible();
  } finally {
    // Put the header menu back.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin/content/navigation");
    await page
      .getByTestId("menu-header")
      .getByRole("button", { name: `Remove ${title}` })
      .click();
    await page.getByTestId("menu-header").getByRole("button", { name: "Save header menu" }).click();
    await expect(page.getByText("Header menu saved.")).toBeVisible();
  }
});
