import { z } from "zod";

import { defineSection } from "../types";
import { iconKey, text } from "./shared";

export const valueStripSection = defineSection({
  key: "value_strip",
  label: "Value strip",
  description: "A band of 2 to 4 short values, each with an icon, title, and line of text.",
  icon: "flag",
  schema: z.object({
    items: z
      .array(z.object({ icon: iconKey, title: text(50), text: text(100) }))
      .min(2, "Add at least 2 items.")
      .max(4, "Use at most 4 items.")
      .default([]),
  }),
  fields: [
    {
      type: "list",
      name: "items",
      label: "Items",
      itemLabel: "Item",
      itemTitleField: "title",
      min: 2,
      max: 4,
      newItem: { icon: "star", title: "New value", text: "" },
      fields: [
        { type: "icon", name: "icon", label: "Icon" },
        { type: "text", name: "title", label: "Title", maxLength: 50 },
        { type: "text", name: "text", label: "Text", maxLength: 100 },
      ],
    },
  ],
  defaults: {
    items: [
      {
        icon: "lightbulb",
        title: "Fresh perspective",
        text: "New thinking grounded in what works.",
      },
      { icon: "target", title: "Purposeful plans", text: "A clear path from idea to action." },
      { icon: "handshake", title: "True partnership", text: "Real people invested in your goals." },
      { icon: "trending-up", title: "Lasting progress", text: "Solutions built to keep moving." },
    ],
  },
  backgrounds: ["navy", "white", "light"],
  defaultBackground: "navy",
});
