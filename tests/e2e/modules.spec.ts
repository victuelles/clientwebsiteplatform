import { expect, test, type Page } from "@playwright/test";

import { createStaff, localUserClient, SEEDED, signIn } from "./helpers";

// Turns modules on and off, which changes the whole site, so it runs in the last project, in
// order. The e2e server never has integration keys (playwright.config.ts), like CI. The module
// state tests that need a module whose integration is missing turn it on through the database
// function as the super admin (set_module_enabled checks dependencies, not env keys); the blog
// runs last and toggles through the UI, which expires the public cache.
test.describe.configure({ mode: "serial" });

const HOME_PAGE_ID = "a0000000-0000-4000-8000-000000000001";

async function setModule(key: string, enabled: boolean) {
  const client = await localUserClient(SEEDED.superAdmin);
  const { error } = await client.rpc("set_module_enabled", { module_key: key, enabled });
  if (error) throw error;
}

const card = (page: Page, key: string) => page.getByTestId(`module-card-${key}`);
const adminNav = (page: Page) => page.getByRole("navigation", { name: "Admin" });
const mainNav = (page: Page) =>
  page.getByTestId("site-header").getByRole("navigation", { name: "Main" });

async function sectionTypesOffered(page: Page) {
  await page.goto(`/admin/content/pages/${HOME_PAGE_ID}`);
  await page.getByRole("button", { name: "Add section" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a section" });
  await expect(dialog.getByRole("button", { name: "Add Hero" })).toBeVisible();
  const labels = await dialog.getByRole("button", { name: /^Add / }).allTextContents();
  await page.keyboard.press("Escape");
  return labels.join("|");
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "modules", "Runs once, in the modules project.");
});

test("all nine modules appear with their requirements", async ({ page }) => {
  await signIn(page, SEEDED.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/modules");
  await expect(page.getByTestId(/^module-card-/)).toHaveCount(9);
  for (const key of ["blog", "photo_gallery", "crm", "inventory", "directory"]) {
    await expect(card(page, key).getByRole("switch")).toBeEnabled();
  }
  // Integrations are missing in the test environment.
  await expect(card(page, "video_gallery").getByRole("switch")).toBeDisabled();
  await expect(card(page, "video_gallery").getByTestId("module-blocked")).toContainText(
    "configure Mux",
  );
});

test("email marketing needs CRM, and CRM can't be turned off under it", async ({ page }) => {
  await signIn(page, SEEDED.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/modules");

  const email = card(page, "email_marketing");
  await expect(email.getByRole("switch", { name: "Turn on Email marketing" })).toBeDisabled();
  await expect(email.getByTestId("module-blocked")).toContainText(
    "To turn on Email marketing, turn on CRM first and configure Resend.",
  );

  // Turn CRM on through the UI.
  await card(page, "crm").getByRole("switch", { name: "Turn on CRM" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("It has no public pages");
  await page.getByRole("alertdialog").getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByText("CRM is now on.")).toBeVisible();

  try {
    // The database refuses email marketing before CRM; now it accepts it.
    await setModule("email_marketing", true);
    await page.reload();
    const crm = card(page, "crm");
    await expect(crm.getByRole("switch", { name: "Turn off CRM" })).toBeDisabled();
    await expect(crm.getByTestId("module-blocked")).toHaveText(
      "CRM can't be turned off while Email marketing is on. Turn it off first.",
    );
    const client = await localUserClient(SEEDED.superAdmin);
    const { error } = await client.rpc("set_module_enabled", {
      module_key: "crm",
      enabled: false,
    });
    expect(error?.message).toBe(
      "CRM can't be turned off while Email marketing is on. Turn off Email marketing first.",
    );
  } finally {
    await setModule("email_marketing", false);
    await setModule("crm", false);
  }
});

test("without Stripe keys the shop can't be turned on; when on, users see My orders", async ({
  page,
  browser,
}) => {
  await signIn(page, SEEDED.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/modules");
  const shop = card(page, "shop");
  await expect(shop.getByRole("switch", { name: "Turn on Shop" })).toBeDisabled();
  await expect(shop.getByRole("link", { name: "Open Integrations" })).toHaveAttribute(
    "href",
    "/admin/settings?tab=integrations",
  );
  await shop.getByRole("link", { name: "Open Integrations" }).click();
  await expect(page.getByRole("tab", { name: "Integrations" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const context = await browser.newContext();
  const user = await context.newPage();
  await signIn(user, SEEDED.user);
  await expect(user).toHaveURL(/\/account$/);
  await expect(user.getByRole("navigation", { name: "Account" })).toHaveCount(0);

  // As if Stripe were configured: the account area reads module state on every request.
  await setModule("shop", true);
  try {
    await user.reload();
    const accountNav = user.getByRole("navigation", { name: "Account" });
    await accountNav.getByRole("link", { name: "My orders" }).click();
    await expect(user).toHaveURL(/\/account\/orders$/);
    await expect(user.getByRole("heading", { name: "My orders", level: 1 })).toBeVisible();
  } finally {
    await setModule("shop", false);
  }
  await user.goto("/account");
  await expect(user.getByRole("link", { name: "My orders" })).toHaveCount(0);
  const response = await user.goto("/account/orders");
  expect(response?.status()).toBe(404);
  await context.close();
});

test.describe("the blog", () => {
  let staffEmail = "";

  test.beforeAll(async () => {
    staffEmail = await createStaff("blogger", [{ scope: "blog", action: "view" }]);
  });

  test("turning it on shows its pages, nav, header link, and section type", async ({
    page,
    browser,
  }) => {
    await signIn(page, SEEDED.superAdmin);
    await expect(page).toHaveURL(/\/admin$/);
    expect(await sectionTypesOffered(page)).not.toContain("Module feed");

    await page.goto("/admin/modules");
    await card(page, "blog").getByRole("switch", { name: "Turn on Blog" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Public page /blog");
    await expect(dialog).toContainText("Admin menu item “Blog”");
    await dialog.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByText("Blog is now on.")).toBeVisible();
    await expect(card(page, "blog").getByTestId("module-status")).toHaveText("On");

    await expect(adminNav(page).getByRole("link", { name: "Blog" })).toBeVisible();
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Coming soon", level: 1 })).toBeVisible();
    await expect(mainNav(page).getByRole("link", { name: "Insights" })).toHaveAttribute(
      "href",
      "/blog",
    );
    expect(await sectionTypesOffered(page)).toContain("Module feed");

    // Staff with blog:view see it too.
    const context = await browser.newContext();
    const staff = await context.newPage();
    await signIn(staff, staffEmail);
    await expect(staff).toHaveURL(/\/admin$/);
    await adminNav(staff).getByRole("link", { name: "Blog" }).click();
    await expect(staff.getByRole("heading", { name: "Blog", level: 1 })).toBeVisible();
    await context.close();
  });

  test("turning it off hides everything but the super admin's read-only view", async ({
    page,
    browser,
  }) => {
    await signIn(page, SEEDED.superAdmin);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/modules");
    await card(page, "blog").getByRole("switch", { name: "Turn off Blog" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Header menu: Insights");
    await expect(dialog).toContainText("Home page: Module feed section");
    const confirm = dialog.getByRole("button", { name: "Turn off" });
    await expect(confirm).toBeDisabled();
    await dialog.getByRole("checkbox").click();
    await confirm.click();
    await expect(page.getByText("Blog is now off.")).toBeVisible();

    await expect(adminNav(page).getByRole("link", { name: "Blog" })).toHaveCount(0);
    const response = await page.goto("/blog");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.goto("/");
    await expect(mainNav(page).getByRole("link", { name: "Insights" })).toHaveCount(0);
    expect(await sectionTypesOffered(page)).not.toContain("Module feed");

    // The super admin still opens its admin page, with the turned-off notice.
    await page.goto("/admin/m/blog");
    await expect(page.getByTestId("module-disabled-notice")).toContainText(
      "This module is turned off",
    );

    // Staff with blog permissions lose access.
    const context = await browser.newContext();
    const staff = await context.newPage();
    await signIn(staff, staffEmail);
    await expect(staff).toHaveURL(/\/admin$/);
    await expect(adminNav(staff).getByRole("link", { name: "Blog" })).toHaveCount(0);
    const staffResponse = await staff.goto("/admin/m/blog");
    expect(staffResponse?.status()).toBe(404);
    await context.close();
  });
});
