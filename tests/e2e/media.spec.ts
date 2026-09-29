import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { createStaff, localUserClient, signIn } from "./helpers";

const png = readFileSync("src/core/media/__fixtures__/sample.png");

test("staff with only media view see the library but cannot upload", async ({ page }) => {
  const email = await createStaff("media-viewer", [{ scope: "media", action: "view" }]);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/media");
  await expect(page.getByRole("heading", { name: "Media", level: 1 })).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
  await expect(page.getByTestId("upload-zone")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New folder" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Choose files" })).toHaveCount(0);

  // A direct upload to Supabase Storage with their own session is refused by RLS.
  const client = await localUserClient(email);
  const { error } = await client.storage
    .from("media")
    .upload(`library/2026/01/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
  expect(error).not.toBeNull();

  // And so is inserting a media row directly.
  const insert = await client.from("media_assets").insert({
    storage_path: `library/2026/01/${crypto.randomUUID()}.png`,
    filename: "x.png",
    mime_type: "image/png",
    size_bytes: 1,
  });
  expect(insert.error).not.toBeNull();
});

test("staff without media access cannot open /admin/media", async ({ page }) => {
  const email = await createStaff("content-only", [{ scope: "content", action: "view" }]);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Media" }),
  ).toHaveCount(0);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/not-authorized$/);
});
