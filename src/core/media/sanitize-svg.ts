import "server-only";

import DOMPurify from "isomorphic-dompurify";

/** Removes scripts, event handlers, and external references from an SVG document. */
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject", "use"],
    FORBID_ATTR: ["href", "xlink:href"],
  });
}
