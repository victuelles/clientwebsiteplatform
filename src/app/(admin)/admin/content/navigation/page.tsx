import type { Metadata } from "next";
import Link from "next/link";

import { requireAccess } from "@/core/access/guard";
import type { Link as LinkValue } from "@/core/links/types";
import { MENU_KEYS, type MenuItemInput, type MenuKey } from "@/core/navigation/types";
import { createClient } from "@/core/supabase/server";

import { AdminPageHeader } from "../../_shell/page-header";
import { MenuEditors, type EditableMenu } from "./_components/menu-editors";

export const metadata: Metadata = { title: "Navigation" };

export default async function NavigationPage() {
  const { context } = await requireAccess({ scope: "content", action: "view" });
  const supabase = await createClient();
  const [{ data: menus }, { data: items }, { data: pages }] = await Promise.all([
    supabase.from("menus").select("id, key, title"),
    supabase
      .from("menu_items")
      .select("id, menu_id, parent_id, label, link, sort_order, open_in_new_tab")
      .order("sort_order"),
    supabase.from("pages").select("id, title, slug, is_home, status").order("title"),
  ]);

  const editable: EditableMenu[] = MENU_KEYS.map((key: MenuKey) => {
    const menu = (menus ?? []).find((m) => m.key === key);
    const rows = (items ?? []).filter((i) => i.menu_id === menu?.id);
    const toInput = (row: (typeof rows)[number]): MenuItemInput => ({
      label: row.label,
      link: row.link as LinkValue,
      openInNewTab: row.open_in_new_tab,
      children: rows
        .filter((c) => c.parent_id === row.id)
        .map((c) => ({
          label: c.label,
          link: c.link as LinkValue,
          openInNewTab: c.open_in_new_tab,
        })),
    });
    return { key, title: menu?.title ?? "", items: rows.filter((r) => !r.parent_id).map(toInput) };
  });

  return (
    <>
      <AdminPageHeader
        title="Navigation"
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Navigation" }]}
        description={
          <>
            The header menu and the two footer link columns. Items that point to an unpublished page
            or a turned-off module are hidden on the site.{" "}
            <Link href="/admin/content" className="underline underline-offset-4">
              Back to pages
            </Link>
          </>
        }
      />
      <MenuEditors
        menus={editable}
        pages={(pages ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          isHome: p.is_home,
          published: p.status === "published",
        }))}
        modules={context.modules}
      />
    </>
  );
}
