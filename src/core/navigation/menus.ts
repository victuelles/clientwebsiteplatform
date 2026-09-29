import "server-only";

import { cache } from "react";

import { linkAttributes, resolveLink } from "@/core/links/resolve";
import type { Link } from "@/core/links/types";
import { getLinkContext } from "@/core/pages/loaders";
import { MENUS_TAG, PAGES_TAG } from "@/core/pages/tags";
import { createCachedPublicClient } from "@/core/supabase/public";

import type { FooterColumn, MenuKey, NavItem } from "./types";

type Row = {
  id: string;
  parent_id: string | null;
  label: string;
  link: unknown;
  sort_order: number;
  open_in_new_tab: boolean;
  menu_id: string;
};

/**
 * The public menus, cached (tag "menus"). Items whose link resolves to nothing (an unpublished
 * page, a disabled module) are hidden.
 */
export const getMenus = cache(async (): Promise<{ header: NavItem[]; footer: FooterColumn[] }> => {
  const supabase = createCachedPublicClient([MENUS_TAG, PAGES_TAG]);
  const [{ data: menus }, { data: items }, links] = await Promise.all([
    supabase.from("menus").select("id, key, title"),
    supabase
      .from("menu_items")
      .select("id, menu_id, parent_id, label, link, sort_order, open_in_new_tab")
      .order("sort_order"),
    getLinkContext(),
  ]);

  const toNav = (row: Row, children: Row[]): NavItem | null => {
    const resolved = resolveLink(row.link as Link, links);
    if (!resolved) return null;
    const attrs = linkAttributes(resolved, row.open_in_new_tab);
    return {
      label: row.label,
      href: attrs.href,
      newTab: "target" in attrs,
      children: children.map((child) => toNav(child, [])).filter((c): c is NavItem => c !== null),
    };
  };

  const build = (key: MenuKey): NavItem[] => {
    const menu = (menus ?? []).find((m) => m.key === key);
    if (!menu) return [];
    const rows = (items ?? []).filter((i) => i.menu_id === menu.id) as Row[];
    return rows
      .filter((r) => !r.parent_id)
      .map((r) =>
        toNav(
          r,
          rows.filter((c) => c.parent_id === r.id),
        ),
      )
      .filter((n): n is NavItem => n !== null);
  };

  const title = (key: MenuKey) => (menus ?? []).find((m) => m.key === key)?.title ?? "";
  return {
    header: build("header"),
    footer: (["footer_1", "footer_2"] as const)
      .map((key) => ({ title: title(key), items: build(key) }))
      .filter((c) => c.items.length > 0),
  };
});
