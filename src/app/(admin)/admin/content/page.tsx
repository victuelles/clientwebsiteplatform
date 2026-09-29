import type { Metadata } from "next";

import { requireAccess } from "@/core/access/guard";
import { draftSnapshot, hasUnpublishedChanges } from "@/core/pages/draft-diff";
import type { SectionRecord } from "@/core/sections/types";
import { createClient } from "@/core/supabase/server";

import { AdminPageHeader } from "../_shell/page-header";
import { PagesTable, type PageRow } from "./_components/pages-table";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  await requireAccess({ scope: "content", action: "view" });
  const supabase = await createClient();
  const [{ data: pages, error }, { data: sections }] = await Promise.all([
    supabase
      .from("pages")
      .select("id, title, slug, is_home, status, published_sections, updated_at, updated_by")
      .order("is_home", { ascending: false })
      .order("title"),
    supabase
      .from("page_sections")
      .select("id, page_id, type, props, background, padding, anchor_id, is_hidden, sort_order")
      .order("sort_order"),
  ]);
  if (error) throw new Error(`Could not load pages: ${error.message}`);

  const editorIds = [
    ...new Set((pages ?? []).map((p) => p.updated_by).filter((id): id is string => Boolean(id))),
  ];
  const { data: names } = editorIds.length
    ? await supabase.rpc("profile_names", { ids: editorIds })
    : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.id, n.name]));

  const rows: PageRow[] = (pages ?? []).map((page) => {
    const draft = draftSnapshot((sections ?? []).filter((s) => s.page_id === page.id));
    return {
      id: page.id,
      title: page.title,
      path: page.is_home ? "/" : `/${page.slug}`,
      isHome: page.is_home,
      published: page.status === "published",
      unpublishedChanges:
        page.status === "published" &&
        hasUnpublishedChanges(draft, (page.published_sections ?? []) as SectionRecord[]),
      updatedAt: page.updated_at,
      updatedBy: page.updated_by ? (nameOf.get(page.updated_by) ?? "Someone") : null,
    };
  });

  return (
    <>
      <AdminPageHeader
        title="Content"
        breadcrumbs={[{ label: "Content" }]}
        description="Pages and their sections. Changes stay in a draft until you publish."
      />
      <PagesTable rows={rows} />
    </>
  );
}
