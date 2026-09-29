import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireAccess } from "@/core/access/guard";
import { MEDIA_ASSET_COLUMNS, type MediaAsset } from "@/core/media/types";
import { mediaIdsIn } from "@/core/sections/media-ids";
import { feedSourceOptions } from "@/core/sections/feeds";
import type { SectionRecord } from "@/core/sections/types";
import { createClient } from "@/core/supabase/server";

import { PageEditor } from "./_editor/page-editor";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditPagePage(props: PageProps<"/admin/content/pages/[id]">) {
  const { context } = await requireAccess({ scope: "content", action: "view" });
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [pageResult, sectionsResult, revisionsResult, pagesResult] = await Promise.all([
    supabase
      .from("pages")
      .select(
        "id, title, slug, is_home, status, published_sections, seo_title, seo_description, og_image_media_id",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("page_sections")
      .select("id, type, props, background, padding, anchor_id, is_hidden")
      .eq("page_id", id)
      .order("sort_order"),
    supabase
      .from("page_revisions")
      .select("id, published_at, published_by, sections")
      .eq("page_id", id)
      .order("published_at", { ascending: false }),
    supabase.from("pages").select("id, title, slug, is_home, status").order("title"),
  ]);
  const page = pageResult.data;
  if (!page) notFound();

  const sections = sectionsResult.data ?? [];
  const mediaIds = new Set<string>();
  for (const section of sections) mediaIdsIn(section.props, mediaIds);
  if (page.og_image_media_id) mediaIds.add(page.og_image_media_id);
  const { data: media } = mediaIds.size
    ? await supabase
        .from("media_assets")
        .select(MEDIA_ASSET_COLUMNS)
        .in("id", [...mediaIds])
    : { data: [] as MediaAsset[] };
  const mediaMap = Object.fromEntries((media ?? []).map((asset) => [asset.id, asset]));

  const publisherIds = [
    ...new Set(
      (revisionsResult.data ?? [])
        .map((r) => r.published_by)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const { data: names } = publisherIds.length
    ? await supabase.rpc("profile_names", { ids: publisherIds })
    : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.id, n.name]));

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <PageEditor
        key={page.id}
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          isHome: page.is_home,
          published: page.status === "published",
          seoTitle: page.seo_title,
          seoDescription: page.seo_description,
          ogImageMediaId: page.og_image_media_id,
        }}
        initialSections={sections.map((s) => ({
          id: s.id,
          type: s.type,
          props: (s.props ?? {}) as Record<string, unknown>,
          background: s.background,
          padding: s.padding,
          anchorId: s.anchor_id,
          isHidden: s.is_hidden,
        }))}
        published={(page.published_sections ?? []) as SectionRecord[]}
        revisions={(revisionsResult.data ?? []).map((r) => ({
          id: r.id,
          publishedAt: r.published_at,
          publishedBy: r.published_by ? (nameOf.get(r.published_by) ?? "Someone") : null,
          sectionCount: Array.isArray(r.sections) ? r.sections.length : 0,
        }))}
        pages={(pagesResult.data ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          isHome: p.is_home,
          published: p.status === "published",
        }))}
        media={mediaMap}
        modules={context.modules}
        feedSources={feedSourceOptions()}
        ogImage={page.og_image_media_id ? (mediaMap[page.og_image_media_id] ?? null) : null}
      />
    </div>
  );
}
