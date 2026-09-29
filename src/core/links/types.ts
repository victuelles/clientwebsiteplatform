import { z } from "zod";

// A Link value, used everywhere a link is needed (buttons, cards, menus). Page links store the
// page ID so renaming a slug never breaks them.

const slugPart = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const linkSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("page"), pageId: z.uuid() }),
  z.object({
    kind: z.literal("url"),
    href: z
      .string()
      .trim()
      .max(2000)
      .refine(
        (v) => /^https?:\/\/\S+$/i.test(v) || /^\/(?!\/)\S*$/.test(v),
        "Use a full https:// link or a path like /pricing.",
      ),
  }),
  z.object({
    kind: z.literal("anchor"),
    anchorId: z
      .string()
      .trim()
      .regex(slugPart, "Use the section's anchor ID (lowercase, hyphens)."),
    pageId: z.uuid().optional(),
  }),
  z.object({ kind: z.literal("email"), address: z.email("Enter a valid email address.") }),
  z.object({
    kind: z.literal("phone"),
    number: z
      .string()
      .trim()
      .refine((v) => /^\+?[\d\s().-]{5,30}$/.test(v), "Enter a valid phone number."),
  }),
  z.object({
    kind: z.literal("module"),
    moduleKey: z.string().regex(/^[a-z_]+$/),
    path: z.string().regex(/^\/(?!\/)\S*$/, "Use a path like /blog."),
  }),
]);

export type Link = z.infer<typeof linkSchema>;
export type LinkKind = Link["kind"];

export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  page: "Page",
  url: "Web address",
  anchor: "Section on a page",
  email: "Email",
  phone: "Phone",
  module: "Module page",
};

/** A labelled link used by buttons and CTAs. */
export const linkWithLabelSchema = z.object({
  label: z.string().trim().max(60),
  link: linkSchema.nullable(),
});
export type LinkWithLabel = z.infer<typeof linkWithLabelSchema>;
