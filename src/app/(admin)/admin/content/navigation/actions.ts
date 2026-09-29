"use server";

import { revalidatePath, updateTag } from "next/cache";

import { protectedAction, toActionError } from "@/core/access/protected-action";
import { menuSchema } from "@/core/navigation/types";
import { MENUS_TAG } from "@/core/pages/tags";

/** Replaces a whole menu atomically (save_menu); the public header/footer update on next load. */
export const saveMenu = protectedAction({
  scope: "content",
  action: "edit",
  schema: menuSchema,
  handler: async ({ input, supabase }) => {
    const items = input.items.map((item) => ({
      label: item.label,
      link: item.link,
      open_in_new_tab: item.openInNewTab,
      children:
        input.key === "header"
          ? item.children.map((c) => ({
              label: c.label,
              link: c.link,
              open_in_new_tab: c.openInNewTab,
            }))
          : [],
    }));
    const { data, error } = await supabase.rpc("save_menu", {
      menu_key: input.key,
      title: input.title,
      items: items as never,
    });
    if (error) throw toActionError(error);
    updateTag(MENUS_TAG);
    revalidatePath("/admin/content/navigation");
    return { count: data ?? 0 };
  },
});
