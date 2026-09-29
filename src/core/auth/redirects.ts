const PLACEHOLDER_ORIGIN = "http://internal.invalid";

/**
 * Returns `next` only if it is a same-site path such as "/account?tab=1", otherwise null.
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com"), backslash tricks ("/\evil.com"),
 * and control characters, so user-supplied redirect targets can never leave the site.
 */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;

  let url: URL;
  try {
    url = new URL(next, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Builds "/sign-in" with an optional validated `next` parameter. */
export function signInPath(next?: string | null, error?: string): string {
  const params = new URLSearchParams();
  const safe = safeNextPath(next);
  if (safe) params.set("next", safe);
  if (error) params.set("error", error);
  const query = params.toString();
  return query ? `/sign-in?${query}` : "/sign-in";
}
