import { z } from "zod";

import type { IconKey } from "@/core/icons/registry";

import { defineSection } from "../types";
import { iconKey, link, text, urlLink } from "./shared";

const card = (icon: IconKey, title: string, body: string, anchor: string) => ({
  icon,
  title,
  text: body,
  link: urlLink(`/services#${anchor}`),
});

export const cardGridSection = defineSection({
  key: "card_grid",
  label: "Card grid",
  description: "A centered heading and intro above a grid of cards with icons, numbers, and links.",
  icon: "chart-bar",
  schema: z.object({
    eyebrow: text(80),
    heading: text(160),
    intro: text(300),
    columns: z.enum(["2", "3", "4"]).default("3"),
    showNumbers: z.boolean().default(true),
    cards: z
      .array(z.object({ icon: iconKey, title: text(60), text: text(200), link }))
      .min(1, "Add at least one card.")
      .max(12, "Use at most 12 cards.")
      .default([]),
  }),
  fields: [
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    { type: "textarea", name: "intro", label: "Intro", rows: 2, maxLength: 300 },
    {
      type: "select",
      name: "columns",
      label: "Columns on desktop",
      options: [
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
      ],
    },
    { type: "toggle", name: "showNumbers", label: "Number the cards (01, 02, …)" },
    {
      type: "list",
      name: "cards",
      label: "Cards",
      itemLabel: "Card",
      itemTitleField: "title",
      min: 1,
      max: 12,
      newItem: { icon: "briefcase", title: "New card", text: "", link: null },
      fields: [
        { type: "icon", name: "icon", label: "Icon" },
        { type: "text", name: "title", label: "Title", maxLength: 60 },
        { type: "textarea", name: "text", label: "Text", rows: 2, maxLength: 200 },
        { type: "link", name: "link", label: "Link", help: "The whole card becomes clickable." },
      ],
    },
  ],
  defaults: {
    eyebrow: "What we do",
    heading: "Expertise for every next step.",
    intro: "Choose the support that fits your business today. Add more as you grow.",
    columns: "3",
    showNumbers: true,
    cards: [
      card(
        "chart-growth",
        "Growth Strategy",
        "Find opportunities and build a practical plan to reach them.",
        "growth-strategy",
      ),
      card(
        "landmark",
        "Financial Guidance",
        "Turn complex decisions into confident next steps.",
        "financial-guidance",
      ),
      card(
        "megaphone",
        "Marketing & Brand",
        "Connect your story with the people who matter.",
        "marketing-brand",
      ),
      card(
        "users",
        "People & Culture",
        "Create teams and experiences that thrive.",
        "people-culture",
      ),
      card(
        "shield-check",
        "Risk & Operations",
        "Strengthen the systems behind your success.",
        "risk-operations",
      ),
      card(
        "sparkles",
        "Digital Experiences",
        "Make technology feel effortless for customers.",
        "digital-experiences",
      ),
    ],
  },
  backgrounds: ["light", "white"],
  defaultBackground: "light",
});
