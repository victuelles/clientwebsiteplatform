import "server-only";

import { cache } from "react";

import type { LinkContext, LinkPage } from "@/core/links/resolve";
import { getEnabledModules } from "@/core/modules/registry.server";
import { MEDIA_ASSET_COLUMNS, type MediaAsset } from "@/core/media/types";
import { mediaIdsIn } from "@/core/sections/media-ids";
import type { SectionRecord } from "@/core/sections/types";
import { createCachedPublicClient } from "@/core/supabase/public";
import { createClient } from "@/core/supabase/server";

import { MEDIA_TAG, PAGES_TAG, pageTag } from "./tags";

export type PublishedPage = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  sections: SectionRecord[];
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageMediaId: string | null;
  updatedAt: string;
};

const PAGE_COLUMNS =
  "id, title, slug, is_home, status, published_sections, seo_title, seo_description, og_image_media_id, updated_at";

function toPublishedPage(row: {
  id: string;
  title: string;
  slug: string;
  is_home: boolean;
  published_sections: unknown;
  seo_title: string | null;
  seo_description: string | null;
  og_image_media_id: string | null;
  updated_at: string;
}): PublishedPage {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    isHome: row.is_home,
    sections: Array.isArray(row.published_sections)
      ? (row.published_sections as SectionRecord[])
      : [],
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogImageMediaId: row.og_image_media_id,
    updatedAt: row.updated_at,
  };
}

/** A published page by slug, or the homepage when slug is null. Cached (tag "pages"). */
export const getPublishedPage = cache(
  async (slug: string | null): Promise<PublishedPage | null> => {
    const supabase = createCachedPublicClient([PAGES_TAG]);
    let query = supabase.from("pages").select(PAGE_COLUMNS).eq("status", "published");
    query = slug === null ? query.eq("is_home", true) : query.eq("slug", slug.toLowerCase());
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error(`Could not load page "${slug ?? "home"}": ${error.message}`);
      return null;
    }
    return data ? toPublishedPage(data) : null;
  },
);

/** Every page's slug and status (for resolving page links). Cached (tag "pages"). */
export const getLinkContext = cache(async (): Promise<LinkContext> => {
  const supabase = createCachedPublicClient([PAGES_TAG]);
  // Module state comes from the registry's cached read (tag "modules").
  const [pages, modules] = await Promise.all([
    supabase.from("pages").select("id, slug, is_home, status"),
    getEnabledModules(),
  ]);
  return {
    pages: Object.fromEntries(
      (pages.data ?? []).map((p) => [
        p.id,
        { slug: p.slug, isHome: p.is_home, published: p.status === "published" } satisfies LinkPage,
      ]),
    ),
    modules,
  };
});

/** Link context for signed-in editors: includes unpublished pages as linkable (for previews). */
export async function getDraftLinkContext(): Promise<LinkContext> {
  const supabase = await createClient();
  const [pages, modules] = await Promise.all([
    supabase.from("pages").select("id, slug, is_home, status"),
    supabase.from("modules").select("key, enabled"),
  ]);
  return {
    pages: Object.fromEntries(
      (pages.data ?? []).map((p) => [p.id, { slug: p.slug, isHome: p.is_home, published: true }]),
    ),
    modules: Object.fromEntries((modules.data ?? []).map((m) => [m.key, m.enabled])),
  };
}

/** The media assets referenced by a set of sections (one query). */
export async function loadSectionMedia(
  sections: { props: unknown }[],
  extraIds: (string | null | undefined)[] = [],
  pageId?: string,
): Promise<Record<string, MediaAsset>> {
  const ids = new Set<string>();
  for (const section of sections) mediaIdsIn(section.props, ids);
  for (const id of extraIds) if (id) ids.add(id);
  if (ids.size === 0) return {};
  const supabase = createCachedPublicClient(pageId ? [MEDIA_TAG, pageTag(pageId)] : [MEDIA_TAG]);
  const { data } = await supabase
    .from("media_assets")
    .select(MEDIA_ASSET_COLUMNS)
    .in("id", [...ids]);
  return Object.fromEntries((data ?? []).map((asset) => [asset.id, asset]));
}
