import { z } from "zod";

import { defineModule } from "@/core/modules/types";

// Blog (built in Phase 6). See CLAUDE.md, "How to build a module".
export const blogModule = defineModule({
  key: "blog",
  label: "Blog",
  description: "News, articles, and insights with categories, authors, and a homepage feed.",
  icon: "file-text",
  phase: 6,
  actions: ["view", "create", "edit", "delete", "publish"],
  publicRoutes: ["/blog"],
  adminNav: [{ label: "Blog", href: "/admin/m/blog", icon: "file-text", action: "view" }],
  accountNav: [],
  sectionTypes: [],
  feeds: [{ key: "blog", label: "Blog posts" }],
  requiresModules: [],
  worksWithModules: [],
  requiredIntegrations: [],
  optionalIntegrations: [],
  settings: {
    schema: z.object({
      postsPerPage: z.number().int().min(3).max(24).default(9),
      showAuthor: z.boolean().default(true),
    }),
    fields: [
      {
        type: "number",
        name: "postsPerPage",
        label: "Posts per page",
        help: "How many posts the blog index shows per page.",
        min: 3,
        max: 24,
      },
      { type: "toggle", name: "showAuthor", label: "Show the author on posts" },
    ],
  },
});
