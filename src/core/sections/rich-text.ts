import type { StarterKitOptions } from "@tiptap/starter-kit";
import { z } from "zod";

// Rich text is stored as Tiptap JSON and limited to paragraphs, bold, italic, links, and lists.

export type RichTextDoc = { type: "doc"; content?: unknown[] };

export const richTextSchema = z
  .object({ type: z.literal("doc"), content: z.array(z.any()).optional() })
  .loose() as z.ZodType<RichTextDoc>;

/** A document with one paragraph per string. */
export function richTextFromParagraphs(...paragraphs: string[]): RichTextDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

/** StarterKit options shared by the editor and the server renderer. */
export const RICH_TEXT_STARTER_KIT_OPTIONS: Partial<StarterKitOptions> = {
  heading: false,
  codeBlock: false,
  code: false,
  blockquote: false,
  horizontalRule: false,
  strike: false,
  underline: false,
  link: { openOnClick: false, autolink: true, protocols: ["mailto", "tel"] },
};
