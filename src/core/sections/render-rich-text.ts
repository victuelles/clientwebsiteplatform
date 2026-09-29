import "server-only";

import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "isomorphic-dompurify";

import { RICH_TEXT_STARTER_KIT_OPTIONS, type RichTextDoc } from "./rich-text";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "a", "ul", "ol", "li"];

/** Renders stored rich text to sanitized HTML (only paragraphs, bold, italic, links, lists). */
export function renderRichText(doc: RichTextDoc | null | undefined): string {
  if (!doc || doc.type !== "doc") return "";
  let html = "";
  try {
    html = generateHTML(doc as never, [StarterKit.configure(RICH_TEXT_STARTER_KIT_OPTIONS)]);
  } catch (error) {
    console.error("Could not render rich text", error);
    return "";
  }
  return sanitizeRichTextHtml(html);
}

export function sanitizeRichTextHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
  });
  // External links open in a new tab, safely.
  return clean.replace(
    /<a href="(https?:[^"]*)"[^>]*>/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">',
  );
}
