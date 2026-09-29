import { expect, test } from "@playwright/test";

import { emailLinkPath, PASSWORD, SEEDED, signIn } from "./helpers";

test("sign up, confirm by email, sign in, and land on /account", async ({ page }, testInfo) => {
  const email = `e2e-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = "E2eStrongPass1";

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Person");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");

  // The confirmation email links to /auth/confirm with a token_hash (see supabase/templates).
  const link = await emailLinkPath(email);
  expect(link).toMatch(/^\/auth\/confirm\?token_hash=/);
  await page.goto(link);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId("account-email")).toHaveText(email);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Hello, E2E Person" })).toBeVisible();
});

test("the seeded super admin lands on /admin", async ({ page }) => {
  await signIn(page, SEEDED.superAdmin, PASSWORD);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByTestId("admin-identity")).toContainText("Super admin");
});

test("a regular user visiting /admin is sent to /not-authorized", async ({ page }) => {
  await signIn(page, SEEDED.user, PASSWORD);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/not-authorized$/);
});

test("signed-out visitors are sent from /admin to sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin$/);
});

test("wrong credentials show a generic error", async ({ page }) => {
  await signIn(page, "nobody@example.test", "WrongPass123");
  await expect(page.getByText("We couldn't sign you in")).toBeVisible();
});
