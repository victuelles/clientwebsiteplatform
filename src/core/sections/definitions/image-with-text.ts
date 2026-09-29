import { z } from "zod";

import { richTextFromParagraphs, richTextSchema } from "../rich-text";
import { defineSection } from "../types";
import { act, action, iconKey, media, text } from "./shared";

export const imageWithTextSection = defineSection({
  key: "image_with_text",
  label: "Image with text",
  description:
    "A photo with an outline frame and stat badge beside a heading, text, features, and a button.",
  icon: "layers",
  schema: z.object({
    image: media,
    showFrame: z.boolean().default(true),
    statValue: text(12),
    statLabel: text(40),
    eyebrow: text(80),
    heading: text(160),
    body: richTextSchema,
    features: z
      .array(z.object({ icon: iconKey, title: text(60), text: text(160) }))
      .max(4, "Use at most 4 features.")
      .default([]),
    button: action,
    imagePosition: z.enum(["left", "right"]).default("left"),
  }),
  fields: [
    { type: "media", name: "image", label: "Photo" },
    { type: "toggle", name: "showFrame", label: "Show the outline frame" },
    {
      type: "text",
      name: "statValue",
      label: "Badge value",
      maxLength: 12,
      help: "e.g. 25+. Leave empty to hide the badge.",
    },
    { type: "text", name: "statLabel", label: "Badge label", maxLength: 40 },
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    { type: "richtext", name: "body", label: "Text" },
    {
      type: "list",
      name: "features",
      label: "Features",
      itemLabel: "Feature",
      itemTitleField: "title",
      max: 4,
      newItem: { icon: "circle-check", title: "New feature", text: "" },
      fields: [
        { type: "icon", name: "icon", label: "Icon" },
        { type: "text", name: "title", label: "Title", maxLength: 60 },
        { type: "textarea", name: "text", label: "Text", rows: 2, maxLength: 160 },
      ],
    },
    { type: "action", name: "button", label: "Button" },
    {
      type: "select",
      name: "imagePosition",
      label: "Image position",
      options: [
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ],
    },
  ],
  defaults: {
    image: null,
    showFrame: true,
    statValue: "25+",
    statLabel: "Years of experience",
    eyebrow: "Who we are",
    heading: "Built around your ambitions.",
    body: richTextFromParagraphs(
      "Every organization has its own story. We listen first, connect the dots, and bring the expertise that helps you move forward with confidence.",
    ),
    features: [
      {
        icon: "target",
        title: "Focused on what matters",
        text: "Clear priorities and considered action.",
      },
      {
        icon: "handshake",
        title: "People before process",
        text: "Relationships that make the work better.",
      },
    ],
    button: act("More about us", "/about"),
    imagePosition: "left",
  },
  backgrounds: ["white", "light"],
  defaultBackground: "white",
});
