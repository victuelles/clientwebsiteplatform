import { expect, test, type Page } from "@playwright/test";

import { defaultPropsFor } from "@/core/sections/registry";

import {
  createPublishedPage,
  createStaff,
  localAdminClient,
  localUserClient,
  replaceDraft,
  SEEDED,
  signIn,
  systemPublish,
} from "./helpers";

// The page editor, draft/publish, revisions, reserved slugs, and the contact form.
// Every test works on its own page, so the seeded homepage (and its visual baselines) never change.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Runs once, on desktop.");
});

const hero = (headline: string) => ({
  type: "hero",
  props: { ...defaultPropsFor("hero"), headline, accentLine: "" },
});
const byType = (page: Page, label: string) =>
  page
    .getByRole("list", { name: "Page sections" })
    .getByRole("button", { name: new RegExp(`^${label}`) });

async function waitForSaved(page: Page) {
  await expect(page.getByTestId("save-status")).toHaveText("Saved", { timeout: 10_000 });
}

async function publish(page: Page) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published. The live page is updated.")).toBeVisible();
}

test.describe.serial("draft and publish", () => {
  let pageId = "";
  let slug = "";
  let publishAction: { url: string; id: string; body: string } | null = null;

  test("an edited headline goes live only after publishing", async ({ page, browser }) => {
    ({ id: pageId, slug } = await createPublishedPage("draft-e2e", [hero("Original headline")]));

    await signIn(page, SEEDED.superAdmin);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/content/pages/${pageId}`);
    await byType(page, "Hero").click();
    await page.getByLabel("Headline", { exact: true }).fill("Edited headline");
    await waitForSaved(page);

    // A signed-out visitor still sees the published version.
    const visitor = await browser.newPage();
    await visitor.goto(`/${slug}`);
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Original headline");

    const request = page.waitForRequest(
      (r) =>
        r.method() === "POST" && !!r.headers()["next-action"] && !!r.postData()?.includes(pageId),
    );
    await publish(page);
    const sent = await request;
    publishAction = {
      url: sent.url(),
      id: sent.headers()["next-action"]!,
      body: sent.postData() ?? "",
    };

    await visitor.reload();
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Edited headline");
    await visitor.close();
  });

  test("staff with edit but not publish can edit the draft but not publish it", async ({
    page,
    baseURL,
  }) => {
    const email = await createStaff("editor", [
      { scope: "content", action: "view" },
      { scope: "content", action: "edit" },
    ]);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/content/pages/${pageId}`);
    await byType(page, "Hero").click();
    await page.getByLabel("Headline", { exact: true }).fill("Staff draft");
    await waitForSaved(page);
    await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);

    // Replaying the super admin's publish action as this staff member is rejected.
    expect(publishAction).not.toBeNull();
    const response = await page.request.post(publishAction!.url, {
      headers: {
        "Next-Action": publishAction!.id,
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "text/x-component",
        Origin: baseURL!,
      },
      data: publishAction!.body,
    });
    expect(await response.text()).toContain("You don't have permission to do that.");

    // So is calling the database function directly.
    const client = await localUserClient(email);
    const { error } = await client.rpc("publish_page", { page: pageId });
    expect(error?.code).toBe("42501");

    await page.goto(`/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edited headline");
  });
});

test("add a card, reorder sections with the keyboard, hide a section, and publish", async ({
  page,
}) => {
  const cards = defaultPropsFor("card_grid");
  const { id, slug } = await createPublishedPage("sections-e2e", [
    hero("Hero to hide"),
    { type: "card_grid", props: { ...cards, heading: "Our cards" } },
    { type: "cta_banner", props: { ...defaultPropsFor("cta_banner"), heading: "Banner heading" } },
  ]);

  await signIn(page, SEEDED.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/content/pages/${id}`);

  // Add a card.
  await byType(page, "Card grid").click();
  await page.getByRole("button", { name: "Add card" }).click();
  const panel = page.getByTestId("section-panel");
  await panel.getByLabel("Title", { exact: true }).last().fill("Brand new card");
  await waitForSaved(page);

  // Move the CTA banner above the card grid with the keyboard.
  const handle = page.getByRole("button", { name: /^Reorder Call to action banner section/ });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: /^Reorder Call to action banner section \(position 2/ }),
  ).toBeVisible();

  // Hide the hero.
  await page.getByRole("button", { name: "Actions for Hero section 1" }).click();
  await page.getByRole("menuitem", { name: "Hide" }).click();
  await waitForSaved(page);

  await publish(page);
  await page.goto(`/${slug}`);
  await expect(page.getByText("Hero to hide")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Brand new card" })).toBeVisible();
  const banner = await page.getByRole("heading", { name: "Banner heading" }).boundingBox();
  const grid = await page.getByRole("heading", { name: "Our cards" }).boundingBox();
  expect(banner!.y).toBeLessThan(grid!.y);
  // With the hero hidden, the banner is the first section and carries the h1.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Banner heading");
});

test("restore an older version and publish it", async ({ page }) => {
  const { id, slug } = await createPublishedPage("history-e2e", [hero("Version one")]);
  await replaceDraft(id, [hero("Version two")]);
  await systemPublish(id);

  await signIn(page, SEEDED.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/content/pages/${id}`);
  await page.getByRole("button", { name: "History" }).click();
  const revisions = page.getByTestId("revision");
  await expect(revisions).toHaveCount(2);
  await revisions.nth(1).getByRole("button", { name: "Restore to draft" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Restore" }).click();

  await byType(page, "Hero").click();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue("Version one");
  await publish(page);
  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Version one");
});

test("a reserved slug is rejected", async ({ page }) => {
  await signIn(page, SEEDED.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/content");
  await page.getByRole("button", { name: "New page" }).click();
  await page.getByLabel("Title").fill("Admin");
  await expect(page.getByText("“/admin” is reserved by the site. Choose another.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create page" })).toBeDisabled();

  await page.getByLabel("URL").fill("blog");
  await expect(page.getByText("“/blog” is reserved by the site. Choose another.")).toBeVisible();
});

test.describe("contact form", () => {
  const submissionsFor = async (email: string) => {
    const { count } = await localAdminClient()
      .from("contact_submissions")
      .select("id", { count: "exact", head: true })
      .eq("email", email);
    return count ?? 0;
  };

  async function fill(page: Page, email: string) {
    await page.goto("/contact");
    await page.getByLabel("Name").fill("Casey Contact");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Message").fill("I would like to talk about a project.");
  }

  test("shows field errors, then succeeds", async ({ page }) => {
    const email = `contact-${Date.now()}@example.test`;
    await fill(page, "casey@invalid");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("Casey Contact");

    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks for reaching out.");
    expect(await submissionsFor(email)).toBe(1);
  });

  test("a bot filling the honeypot sees success but nothing is stored", async ({ page }) => {
    const email = `bot-${Date.now()}@example.test`;
    await fill(page, email);
    await page.locator('input[name="website"]').fill("https://spam.example", { force: true });
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks for reaching out.");
    expect(await submissionsFor(email)).toBe(0);
  });
});
