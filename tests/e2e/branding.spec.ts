import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { SEEDED, signIn } from "./helpers";

// These tests change site-wide settings, so they run alone in the "branding" project (after
// everything else) and put every setting back when they finish.

test.describe.configure({ mode: "serial" });

const png = readFileSync("src/core/media/__fixtures__/sample.png");

async function openSettingsTab(page: Page, tab: string) {
  await page.goto("/admin/settings");
  await page.getByRole("tab", { name: tab }).click();
  return page.getByRole("tabpanel", { name: tab });
}

async function save(page: Page, panel: ReturnType<Page["getByRole"]>) {
  await panel.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Settings saved. The live site is updated.").last()).toBeVisible();
  await expect(panel.getByRole("button", { name: "Save changes" })).toBeDisabled();
}

test.beforeEach(async ({ page }) => {
  await signIn(page, SEEDED.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);
});

test("changing the accent color and site name updates the public site without a redeploy", async ({
  page,
  browser,
}) => {
  let panel = await openSettingsTab(page, "General");
  await panel.getByLabel("Site name", { exact: true }).fill("Acme E2E");
  await save(page, panel);

  panel = await openSettingsTab(page, "Branding");
  await panel.getByLabel("Accent", { exact: true }).fill("#1d4ed8");
  await save(page, panel);

  const visitor = await browser.newPage();
  await visitor.goto("/");
  await expect(visitor).toHaveTitle(/^Acme E2E/);
  await expect(visitor.getByTestId("site-header").getByText("Acme E2E")).toBeVisible();
  const cta = visitor.getByTestId("site-header").getByRole("link", { name: "Let's talk" });
  await expect(cta).toHaveCSS("background-color", "rgb(29, 78, 216)");
  await visitor.close();

  // Put everything back.
  panel = await openSettingsTab(page, "Branding");
  await panel.getByRole("button", { name: "Reset colors and fonts to defaults" }).click();
  await save(page, panel);
  panel = await openSettingsTab(page, "General");
  await panel.getByLabel("Site name", { exact: true }).fill("North / Co");
  await save(page, panel);

  await page.goto("/");
  await expect(page.getByTestId("site-header").getByRole("link", { name: "Let's talk" })).toHaveCSS(
    "background-color",
    "rgb(237, 87, 61)",
  );
});

test("an uploaded logo appears in the header, and deleting it is blocked while in use", async ({
  page,
}) => {
  const filename = `logo-${Date.now()}.png`;

  // Upload and add alt text.
  await page.goto("/admin/media");
  await page
    .getByLabel("Choose files to upload")
    .setInputFiles({ name: filename, mimeType: "image/png", buffer: png });
  await expect(page.getByTestId("upload-item").filter({ hasText: filename })).toContainText(
    "Uploaded",
  );
  await page.reload();
  await page.getByRole("button", { name: filename }).click();
  await page.getByLabel("Alt text").fill("Acme logo");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("File details saved.")).toBeVisible();

  // Pick it as the logo (the header uses it because there is no dark-background logo).
  const panel = await openSettingsTab(page, "Branding");
  await panel.getByRole("button", { name: "Choose logo", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: filename }).click();
  await page.getByRole("button", { name: "Use selected logo", exact: true }).click();
  await expect(panel.getByTestId("media-picker-logoMediaId")).toContainText(filename);
  await save(page, panel);

  await page.goto("/");
  await expect(
    page.getByTestId("site-header").getByRole("img", { name: "Acme logo" }),
  ).toBeVisible();

  // Deleting it is blocked, with the place it is used.
  await page.goto("/admin/media");
  await page.getByRole("button", { name: filename }).click();
  await expect(page.getByTestId("asset-usage")).toContainText("Site settings · Logo");
  await page.getByRole("button", { name: "Delete file" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(
    page.getByText("This file is used in: Site settings · Logo. Remove it there first."),
  ).toBeVisible();

  // Clean up: remove the logo, then the file can be deleted.
  const branding = await openSettingsTab(page, "Branding");
  await branding.getByRole("button", { name: "Remove logo", exact: true }).click();
  await save(page, branding);
  await page.goto("/admin/media");
  await page.getByRole("button", { name: filename }).click();
  await page.getByRole("button", { name: "Delete file" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(`${filename} was deleted.`)).toBeVisible();
});

test("robots.txt blocks indexing by default and allows it after the toggle", async ({
  page,
  request,
}) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");

  let panel = await openSettingsTab(page, "SEO");
  await panel.getByRole("switch", { name: "Allow search engines to index this site" }).click();
  await page.getByRole("button", { name: "Allow indexing" }).click();
  await save(page, panel);

  const allowed = await (await request.get("/robots.txt")).text();
  expect(allowed).toContain("Allow: /");
  expect(allowed).toContain("Disallow: /admin");
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  // Turn it back off.
  panel = await openSettingsTab(page, "SEO");
  await panel.getByRole("switch", { name: "Allow search engines to index this site" }).click();
  await page.getByRole("button", { name: "Hide from search engines" }).click();
  await save(page, panel);
  expect(await (await request.get("/robots.txt")).text()).toMatch(/Disallow: \/\s*$/);
});
