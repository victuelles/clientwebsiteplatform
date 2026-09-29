import { reservedModulePaths } from "@/core/modules/registry";

// Slugs a page can never use because the app or a module owns that path. Module paths come from
// each manifest's publicRoutes; add app paths here when a new top-level route appears.

const APP_PATHS = [
  "admin",
  "api",
  "auth",
  "preview",
  "sign-in",
  "sign-up",
  "account",
  "forgot-password",
  "reset-password",
  "not-authorized",
  "brand-icon",
  "robots.txt",
  "sitemap.xml",
];

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  ...APP_PATHS,
  ...reservedModulePaths(),
]);

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Problem with a slug, or null if it can be used (uniqueness is checked separately). */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Enter a URL slug.";
  if (slug.length > 80) return "Use at most 80 characters.";
  if (!SLUG_PATTERN.test(slug))
    return "Use lowercase letters, numbers, and single hyphens (e.g. our-team).";
  if (RESERVED_SLUGS.has(slug)) return `“/${slug}” is reserved by the site. Choose another.`;
  return null;
}

/** "Our Team & Values!" -> "our-team-values" */
export function slugify(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") || "page"
  );
}
