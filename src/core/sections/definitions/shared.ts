import { z } from "zod";

import { ICON_KEYS } from "@/core/icons/registry";
import { linkSchema, type Link } from "@/core/links/types";

import { mediaValueSchema } from "../common";

// Schema pieces shared by section definitions.

export const text = (max: number, fallback = "") =>
  z.string().trim().max(max, `Use at most ${max} characters.`).default(fallback);
export const iconKey = z.enum(ICON_KEYS);
export const media = mediaValueSchema.default(null);
export const link = linkSchema.nullable().default(null);
export const action = z
  .object({
    label: z.string().trim().max(60, "Use at most 60 characters.").default(""),
    link: linkSchema.nullable().default(null),
  })
  .default({ label: "", link: null });

export const urlLink = (href: string): Link => ({ kind: "url", href });
export const act = (label: string, href: string) => ({ label, link: urlLink(href) });
