import { z } from "zod";

import { defineSection } from "../types";
import { act, action, text } from "./shared";

export const statsSection = defineSection({
  key: "stats",
  label: "Stats",
  description: "A heading and text beside 2 to 4 numbers that count up when scrolled into view.",
  icon: "chart-line",
  schema: z.object({
    eyebrow: text(80),
    heading: text(160),
    text: text(300),
    link: action,
    stats: z
      .array(z.object({ value: text(12), label: text(50) }))
      .min(2, "Add at least 2 stats.")
      .max(4, "Use at most 4 stats.")
      .default([]),
  }),
  fields: [
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    { type: "textarea", name: "text", label: "Text", rows: 2, maxLength: 300 },
    { type: "action", name: "link", label: "Text link" },
    {
      type: "list",
      name: "stats",
      label: "Stats",
      itemLabel: "Stat",
      itemTitleField: "value",
      min: 2,
      max: 4,
      newItem: { value: "10+", label: "New stat" },
      fields: [
        { type: "text", name: "value", label: "Value", maxLength: 12, help: "e.g. 25+, 98%, 250+" },
        { type: "text", name: "label", label: "Label", maxLength: 50 },
      ],
    },
  ],
  defaults: {
    eyebrow: "The difference is in the details",
    heading: "Progress you can feel.",
    text: "Good work is measured by the relationships we build and the results we help create.",
    link: act("Work with us", "/contact"),
    stats: [
      { value: "25+", label: "Years of experience" },
      { value: "250+", label: "Projects delivered" },
      { value: "98%", label: "Client satisfaction" },
      { value: "12", label: "Industry specialties" },
    ],
  },
  backgrounds: ["navy", "white", "light"],
  defaultBackground: "navy",
});
