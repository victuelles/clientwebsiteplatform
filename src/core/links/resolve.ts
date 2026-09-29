import type { Link } from "./types";

export type LinkPage = { slug: string; isHome: boolean; published: boolean };

export type LinkContext = {
  /** Every page by id (published or not). */
  pages: Readonly<Record<string, LinkPage>>;
  /** Module enabled flags by module key. */
  modules: Readonly<Record<string, boolean>>;
};

export type ResolvedLink = {
  href: string;
  /** Opens in a new tab with rel="noopener noreferrer". */
  external: boolean;
};

function pagePath(page: LinkPage) {
  return page.isHome ? "/" : `/${page.slug}`;
}

/**
 * Turns a stored Link into an href, or null when it should be hidden: a missing or unpublished
 * page, or a module that is turned off.
 */
export function resolveLink(
  link: Link | null | undefined,
  context: LinkContext,
): ResolvedLink | null {
  if (!link) return null;
  switch (link.kind) {
    case "page": {
      const page = context.pages[link.pageId];
      return page?.published ? { href: pagePath(page), external: false } : null;
    }
    case "url":
      return { href: link.href, external: /^https?:\/\//i.test(link.href) };
    case "anchor": {
      if (!link.pageId) return { href: `#${link.anchorId}`, external: false };
      const page = context.pages[link.pageId];
      if (!page?.published) return null;
      const path = pagePath(page);
      return { href: `${path === "/" ? "/" : path}#${link.anchorId}`, external: false };
    }
    case "email":
      return { href: `mailto:${link.address}`, external: false };
    case "phone":
      return { href: `tel:${link.number.replace(/[^\d+]/g, "")}`, external: false };
    case "module":
      return context.modules[link.moduleKey] ? { href: link.path, external: false } : null;
  }
}

/** Props for an <a>/<Link> from a resolved link. */
export function linkAttributes(resolved: ResolvedLink, openInNewTab = false) {
  return resolved.external || openInNewTab
    ? { href: resolved.href, target: "_blank", rel: "noopener noreferrer" }
    : { href: resolved.href };
}
