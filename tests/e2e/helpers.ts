import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Password123!";

export const SEEDED = {
  superAdmin: "superadmin@example.test",
  staff: "staff@example.test",
  user: "user@example.test",
} as const;

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
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

/** Service-role client for LOCAL test setup only (never used by the app). */
export function localAdminClient() {
  return createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client signed in as a user, to try direct API calls the way a browser could. */
export async function localUserClient(email: string, password = PASSWORD) {
  const client = createClient(
    process.env.E2E_SUPABASE_URL!,
    process.env.E2E_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

/** Creates a confirmed staff member with exactly these permissions. Returns the email. */
export async function createStaff(
  label: string,
  permissions: { scope: string; action: "view" | "create" | "edit" | "delete" | "publish" }[],
) {
  const admin = localAdminClient();
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: label },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const id = data.user.id;
  const role = await admin.from("profiles").update({ role: "staff" }).eq("id", id);
  if (role.error) throw role.error;
  if (permissions.length) {
    const grants = await admin
      .from("staff_permissions")
      .insert(permissions.map((p) => ({ user_id: id, ...p })));
    if (grants.error) throw grants.error;
  }
  return email;
}

type SeedSection = { type: string; props: Record<string, unknown>; is_hidden?: boolean };

/** Creates a published page with these sections (as the system). Returns its id and slug. */
export async function createPublishedPage(label: string, sections: SeedSection[]) {
  const admin = localAdminClient();
  const slug = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: page, error } = await admin
    .from("pages")
    .insert({ title: label, slug })
    .select("id")
    .single();
  if (error) throw error;
  await replaceDraft(page.id, sections);
  await systemPublish(page.id);
  return { id: page.id as string, slug };
}

/** Replaces a page's draft sections directly (as the system). */
export async function replaceDraft(pageId: string, sections: SeedSection[]) {
  const admin = localAdminClient();
  const removed = await admin.from("page_sections").delete().eq("page_id", pageId);
  if (removed.error) throw removed.error;
  const inserted = await admin
    .from("page_sections")
    .insert(sections.map((s, sort_order) => ({ page_id: pageId, sort_order, ...s })));
  if (inserted.error) throw inserted.error;
}

export async function systemPublish(pageId: string) {
  const { error } = await localAdminClient().rpc("system_publish_page", { page: pageId });
  if (error) throw error;
}
