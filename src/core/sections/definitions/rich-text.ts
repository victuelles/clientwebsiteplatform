import { z } from "zod";

import { richTextFromParagraphs, richTextSchema } from "../rich-text";
import { defineSection } from "../types";

export const richTextSection = defineSection({
  key: "rich_text",
  label: "Rich text",
  description: "An eyebrow, a heading, and formatted text. For longer written content.",
  icon: "file-text",
  schema: z.object({
    eyebrow: z.string().trim().max(80).default(""),
    heading: z.string().trim().max(160).default(""),
    body: richTextSchema,
    width: z.enum(["narrow", "wide"]).default("narrow"),
  }),
  fields: [
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    { type: "richtext", name: "body", label: "Text" },
    {
      type: "select",
      name: "width",
      label: "Content width",
      options: [
        { value: "narrow", label: "Narrow (easier to read)" },
        { value: "wide", label: "Wide" },
      ],
    },
  ],
  defaults: {
    eyebrow: "About us",
    heading: "Built around the people we serve.",
    body: richTextFromParagraphs(
      "Every organization has its own story. We listen first, connect the dots, and bring the expertise that helps you move forward with confidence.",
      "Tell your story here: who you are, what you believe, and how you help.",
    ),
    width: "narrow",
  },
  backgrounds: ["white", "light", "navy"],
  defaultBackground: "white",
});
