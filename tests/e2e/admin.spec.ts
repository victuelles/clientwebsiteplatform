import { expect, test, type Page } from "@playwright/test";

import { emailLinkPath, PASSWORD, SEEDED, signIn } from "./helpers";

async function adminNavLinks(page: Page) {
  return page.getByRole("navigation", { name: "Admin" }).getByRole("link").allTextContents();
}

// The staff lifecycle shares state between steps, so it runs in order on desktop only.
test.describe.serial("staff lifecycle", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Runs once, on desktop.");
  });

  const email = `staff-e2e-${Date.now()}@example.test`;
  const staffPassword = "StaffE2ePass1";
  let staffId = "";
  let saveAction: { url: string; id: string; body: string } | null = null;

  test("the super admin invites a staff member and grants content view and edit", async ({
    page,
  }) => {
    await signIn(page, SEEDED.superAdmin);
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto("/admin/staff");
    await page.getByRole("button", { name: "Invite staff" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Edith E2E");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send invitation" }).click();

    await expect(page).toHaveURL(/\/admin\/staff\/[0-9a-f-]{36}$/);
    staffId = page.url().split("/").pop()!;
    await expect(page.getByTestId("staff-status")).toHaveText("Invited");

    await page.getByRole("checkbox", { name: "Homepage and pages: View" }).click();
    await page.getByRole("checkbox", { name: "Homepage and pages: Edit" }).click();
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    // Capture the server action request so a later test can replay it as the staff member.
    const request = page.waitForRequest(
      (r) => r.method() === "POST" && !!r.headers()["next-action"],
    );
    await page.getByRole("button", { name: "Save permissions" }).click();
    const sent = await request;
    saveAction = {
      url: sent.url(),
      id: sent.headers()["next-action"]!,
      body: sent.postData() ?? "",
    };

    await expect(page.getByText("Permissions saved.")).toBeVisible();
    await expect(page.getByText("Unsaved changes")).toBeHidden();
  });

  test("the staff member accepts, sets a password, and sees only Dashboard and Content", async ({
    page,
  }) => {
    const link = await emailLinkPath(email);
    expect(link).toMatch(/^\/auth\/confirm\?token_hash=.+&type=invite$/);

    await page.goto(link);
    await expect(page).toHaveURL(/\/auth\/set-password$/);
    await page.getByLabel("New password", { exact: true }).fill(staffPassword);
    await page.getByLabel("Confirm new password").fill(staffPassword);
    await page.getByRole("button", { name: "Set password and continue" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    // Signing in again with the new password works too.
    await page.context().clearCookies();
    await signIn(page, email, staffPassword);
    await expect(page).toHaveURL(/\/admin$/);
    expect(await adminNavLinks(page)).toEqual(["Dashboard", "Content"]);
  });

  test("the staff member is sent to /not-authorized for areas they were not granted", async ({
    page,
  }) => {
    await signIn(page, email, staffPassword);
    await expect(page).toHaveURL(/\/admin$/);
    for (const path of [
      "/admin/staff",
      "/admin/audit",
      "/admin/media",
      "/admin/settings",
      "/admin/modules",
      `/admin/staff/${staffId}`,
    ]) {
      await page.goto(path);
      await expect(page, `${path} should be denied`).toHaveURL(/\/not-authorized$/);
    }
    await page.goto("/admin/content");
    await expect(page.getByRole("heading", { name: "Content", level: 1 })).toBeVisible();
  });

  test("the staff member calling the save-permissions action directly is rejected", async ({
    page,
    baseURL,
  }) => {
    expect(saveAction).not.toBeNull();
    await signIn(page, email, staffPassword);
    await expect(page).toHaveURL(/\/admin$/);

    // Try to grant themselves every permission by replaying the super admin's action call.
    const [args] = JSON.parse(saveAction!.body) as [{ userId: string; permissions: unknown[] }];
    const everything = ["content", "media", "blog"].flatMap((scope) =>
      ["view", "create", "edit", "delete", "publish"].map((action) => ({ scope, action })),
    );
    const response = await page.request.post(saveAction!.url, {
      headers: {
        "Next-Action": saveAction!.id,
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "text/x-component",
        Origin: baseURL!,
      },
      data: JSON.stringify([{ ...args, permissions: everything }]),
    });
    expect(await response.text()).toContain("You don't have permission to do that.");

    // Nothing changed: the nav still shows only Dashboard and Content.
    await page.reload();
    expect(await adminNavLinks(page)).toEqual(["Dashboard", "Content"]);
  });

  test("deactivating the staff member signs them out on their next request", async ({
    page,
    browser,
  }) => {
    await signIn(page, email, staffPassword);
    await expect(page).toHaveURL(/\/admin$/);

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, SEEDED.superAdmin);
    await expect(admin).toHaveURL(/\/admin$/);
    await admin.goto(`/admin/staff/${staffId}`);
    await admin.getByRole("button", { name: "Deactivate" }).click();
    await expect(admin.getByText("was deactivated")).toBeVisible();
    await expect(admin.getByTestId("staff-status")).toHaveText("Inactive");

    // The audit log shows the whole story.
    await admin.goto(
      `/admin/audit?actor=${encodeURIComponent("00000000-0000-4000-8000-000000000001")}`,
    );
    for (const action of ["staff.invited", "staff.permissions_updated", "user.deactivated"]) {
      await expect(admin.getByRole("cell", { name: action }).first()).toBeVisible();
    }
    await adminContext.close();

    await page.goto("/admin/content");
    await expect(page).toHaveURL(/\/sign-in\?error=account_disabled$/);
    await expect(page.getByText("This account has been disabled")).toBeVisible();
  });
});

test("a regular user cannot reach any /admin page", async ({ page }) => {
  await signIn(page, SEEDED.user, PASSWORD);
  await expect(page).toHaveURL(/\/account$/);
  for (const path of [
    "/admin",
    "/admin/content",
    "/admin/media",
    "/admin/staff",
    "/admin/audit",
    "/admin/settings",
    "/admin/modules",
  ]) {
    await page.goto(path);
    await expect(page, `${path} should be denied`).toHaveURL(/\/not-authorized$/);
  }
});

test("signed-out visitors are redirected from /admin pages to sign-in with next", async ({
  page,
}) => {
  await page.goto("/admin/staff?x=1");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin%2Fstaff%3Fx%3D1$/);
});

test.describe("admin shell at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu opens and nav items are reachable", async ({ page }) => {
    await signIn(page, SEEDED.superAdmin);
    await expect(page).toHaveURL(/\/admin$/);

    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav).toBeHidden();
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await expect(nav).toBeVisible();

    await nav.getByRole("link", { name: "Staff" }).click();
    await expect(page).toHaveURL(/\/admin\/staff$/);
    await expect(page.getByRole("heading", { name: "Staff", level: 1 })).toBeVisible();
    await expect(nav).toBeHidden();

    // The account menu is reachable from the mobile sheet.
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  });
});
