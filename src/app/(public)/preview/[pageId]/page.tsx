import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PreviewBridge } from "@/components/sections/preview-bridge";
import { RenderSections } from "@/components/sections/render-sections";
import { requireAccess } from "@/core/access/guard";
import { draftSnapshot } from "@/core/pages/draft-diff";
import { getDraftLinkContext, loadSectionMedia } from "@/core/pages/loaders";
import type { SectionRecord } from "@/core/sections/types";
import { getSiteSettings } from "@/core/settings/get-settings";
import { createClient } from "@/core/supabase/server";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

// The draft (or a revision) of any page, rendered with the real public components.
export default async function PreviewPage(props: {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  await requireAccess({ scope: "content", action: "view" });
  const { pageId } = await props.params;
  const { revision } = await props.searchParams;
  if (!z.uuid().safeParse(pageId).success) notFound();

  const supabase = await createClient();
  const { data: page } = await supabase
    .from("pages")
    .select("id, title")
    .eq("id", pageId)
    .maybeSingle();
  if (!page) notFound();

  let sections: SectionRecord[];
  let label = `Draft of “${page.title}”`;
  if (revision && z.uuid().safeParse(revision).success) {
    const { data } = await supabase
      .from("page_revisions")
      .select("sections, published_at")
      .eq("id", revision)
      .eq("page_id", pageId)
      .maybeSingle();
    if (!data) notFound();
    sections = (data.sections ?? []) as SectionRecord[];
    label = `“${page.title}” as published ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(data.published_at))} UTC`;
  } else {
    const { data } = await supabase
      .from("page_sections")
      .select("id, type, props, background, padding, anchor_id, is_hidden")
      .eq("page_id", pageId)
      .order("sort_order");
    sections = draftSnapshot(data ?? []);
  }

  const [settings, links, media] = await Promise.all([
    getSiteSettings(),
    getDraftLinkContext(),
    loadSectionMedia(sections),
  ]);

  return (
    <main id="main" className="flex-1">
      {sections.length === 0 && (
        <div className="mx-auto max-w-md px-6 py-24 text-center text-muted-foreground">
          This page has no sections yet. Add one in the editor.
        </div>
      )}
      <RenderSections
        sections={sections}
        context={{ pageId, media, links, site: settings, preview: true }}
      />
      <PreviewBridge editorHref={`/admin/content/pages/${pageId}`} label={label} />
    </main>
  );
}
