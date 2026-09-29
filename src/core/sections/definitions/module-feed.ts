import { z } from "zod";

import { defineSection } from "../types";
import { action, text } from "./shared";

export const moduleFeedSection = defineSection({
  key: "module_feed",
  label: "Module feed",
  description: "The latest items from a module, such as blog posts, as cards.",
  icon: "file-text",
  schema: z.object({
    eyebrow: text(80),
    heading: text(160),
    viewAll: action,
    source: z
      .string()
      .trim()
      .regex(/^[a-z_]+$/)
      .default("blog"),
    count: z.enum(["3", "6"]).default("3"),
  }),
  fields: [
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    { type: "action", name: "viewAll", label: "“View all” link" },
    {
      type: "select",
      name: "source",
      label: "Source",
      options: [],
      dynamicOptions: "feed-sources",
    },
    {
      type: "select",
      name: "count",
      label: "Items",
      options: [
        { value: "3", label: "3" },
        { value: "6", label: "6" },
      ],
    },
  ],
  defaults: {
    eyebrow: "Fresh perspectives",
    heading: "Ideas worth sharing.",
    viewAll: { label: "All insights", link: { kind: "module", moduleKey: "blog", path: "/blog" } },
    source: "blog",
    count: "3",
  },
  backgrounds: ["light", "white"],
  defaultBackground: "light",
  requirement: {
    kind: "feed-provider",
    message:
      "Shows items once a module that provides them (like the blog) is turned on and has content.",
  },
});
