import "server-only";

import { defineModuleServer } from "@/core/modules/types";

// Server parts of the blog module. Phase 6 replaces the placeholder feed with real posts and
// adds getDataSummary (post and draft counts).
export const blogServer = defineModuleServer({
  key: "blog",
  feedProviders: [
    {
      key: "blog",
      moduleKey: "blog",
      label: "Blog posts",
      getItems: async () => [],
    },
  ],
});
