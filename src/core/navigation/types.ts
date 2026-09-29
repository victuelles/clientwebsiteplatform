import { z } from "zod";

import { linkSchema } from "@/core/links/types";

export const MENU_KEYS = ["header", "footer_1", "footer_2"] as const;
export type MenuKey = (typeof MENU_KEYS)[number];

const itemBase = {
  label: z.string().trim().min(1, "Enter a label.").max(80, "Use at most 80 characters."),
  link: linkSchema,
  openInNewTab: z.boolean().default(false),
};

export const menuItemSchema = z.object({
  ...itemBase,
  children: z.array(z.object(itemBase)).max(12, "Use at most 12 dropdown items.").default([]),
});

export const menuSchema = z.object({
  key: z.enum(MENU_KEYS),
  title: z.string().trim().max(60).default(""),
  items: z.array(menuItemSchema).max(30, "Use at most 30 items."),
});

export type MenuItemInput = z.input<typeof menuItemSchema>;

/** A menu item ready to render (link resolved; hidden items removed). */
export type NavItem = { label: string; href: string; newTab: boolean; children: NavItem[] };
export type FooterColumn = { title: string; items: NavItem[] };
