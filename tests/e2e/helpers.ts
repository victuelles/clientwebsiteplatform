import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Password123!";

export const SEEDED = {
  superAdmin: "superadmin@example.test",
  staff: "staff@example.test",
  user: "user@example.test",
} as const;

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

type MailpitSearch = { messages?: { ID: string }[] };
type MailpitMessage = { HTML: string };

/** Waits for the newest email to `to` in the local Mailpit inbox and returns its link path. */
export async function emailLinkPath(to: string): Promise<string> {
  const mailpit = process.env.MAILPIT_URL;
  if (!mailpit) throw new Error("MAILPIT_URL is not set (see playwright.config.ts).");

  let path: string | undefined;
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${to}"`);
        const search = (await (
          await fetch(`${mailpit}/api/v1/search?query=${query}`)
        ).json()) as MailpitSearch;
        const id = search.messages?.[0]?.ID;
        if (!id) return false;
        const message = (await (
          await fetch(`${mailpit}/api/v1/message/${id}`)
        ).json()) as MailpitMessage;
        const href = message.HTML.match(/href="([^"]+)"/)?.[1];
        if (!href) return false;
        const url = new URL(href.replaceAll("&amp;", "&"));
        path = `${url.pathname}${url.search}`;
        return true;
      },
      { timeout: 15_000, message: `no email arrived for ${to}` },
    )
    .toBe(true);

  return path!;
}
