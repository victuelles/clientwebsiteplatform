import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { RenderSections } from "@/components/sections/render-sections";
import { mediaPublicUrl } from "@/core/media/types";
import { getLinkContext, getPublishedPage, loadSectionMedia } from "@/core/pages/loaders";
import { getSiteSettings } from "@/core/settings/get-settings";

// Every published page: "/" is the homepage, "/<slug>" any other page. Explicit routes (sign-in,
// account, and module routes in later phases) take precedence over this catch-all.

type Params = { slug?: string[] };

async function pageFor(params: Params) {
  const slug = params.slug;
  if (!slug || slug.length === 0) return getPublishedPage(null);
  if (slug.length > 1) return null;
  return getPublishedPage(decodeURIComponent(slug[0]!));
}

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const page = await pageFor(await props.params);
  if (!page) return {};
  const settings = await getSiteSettings();
  const media = page.ogImageMediaId
    ? await loadSectionMedia([], [page.ogImageMediaId], page.id)
    : {};
  const image = page.ogImageMediaId ? media[page.ogImageMediaId] : undefined;
  const title = page.isHome
    ? page.seoTitle
      ? { absolute: page.seoTitle }
      : null
    : (page.seoTitle ?? page.title);
  return {
    // The homepage keeps the site's default title unless it has its own; other pages go through
    // the title template. (An explicit `title: undefined` would drop the default.)
    ...(title ? { title } : {}),
    description: page.seoDescription ?? settings.seoDescription ?? undefined,
    alternates: { canonical: page.isHome ? "/" : `/${page.slug}` },
    ...(image
      ? {
          openGraph: {
            images: [
              { url: mediaPublicUrl(image.storage_path), alt: image.alt_text ?? page.title },
            ],
          },
        }
      : {}),
  };
}

export default async function PublicPage(props: { params: Promise<Params> }) {
  const params = await props.params;
  const page = await pageFor(params);
  if (!page) notFound();
  // The homepage lives at "/" only.
  if (page.isHome && params.slug?.length) permanentRedirect("/");

  const [settings, links, media] = await Promise.all([
    getSiteSettings(),
    getLinkContext(),
    loadSectionMedia(page.sections, [], page.id),
  ]);

  return (
    <main id="main" className="flex-1">
      <RenderSections
        sections={page.sections}
        context={{ pageId: page.id, media, links, site: settings, preview: false }}
      />
    </main>
  );
}
