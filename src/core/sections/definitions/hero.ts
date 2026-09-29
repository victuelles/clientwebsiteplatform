import { z } from "zod";

import { defineSection } from "../types";
import { act, action, media, text } from "./shared";

export const heroSection = defineSection({
  key: "hero",
  label: "Hero",
  description:
    "Big headline with an accent line, intro text, two calls to action, and a background photo.",
  icon: "sparkles",
  schema: z.object({
    eyebrow: text(80),
    headline: text(120),
    accentLine: text(80),
    text: text(400),
    primary: action,
    secondary: action,
    image: media,
    sideText: text(60),
    showScrollIndicator: z.boolean().default(true),
  }),
  fields: [
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    {
      type: "textarea",
      name: "headline",
      label: "Headline",
      rows: 2,
      maxLength: 120,
      help: "Press Enter for a line break.",
    },
    {
      type: "text",
      name: "accentLine",
      label: "Accent line",
      maxLength: 80,
      help: "Shown on its own line in the accent color.",
    },
    { type: "textarea", name: "text", label: "Intro text", maxLength: 400 },
    { type: "action", name: "primary", label: "Primary button" },
    { type: "action", name: "secondary", label: "Secondary text link" },
    {
      type: "media",
      name: "image",
      label: "Background photo",
      help: "Wide photo; it fades to white behind the text.",
    },
    {
      type: "text",
      name: "sideText",
      label: "Vertical side text",
      maxLength: 60,
      help: "Small vertical text on the right edge. Leave empty to hide.",
    },
    { type: "toggle", name: "showScrollIndicator", label: "Show scroll indicator" },
  ],
  defaults: {
    eyebrow: "A different kind of partner",
    headline: "Good ideas\ndeserve",
    accentLine: "great execution.",
    text: "Clear thinking, practical solutions, and the right people beside you. Let’s make your next chapter your strongest yet.",
    primary: act("Explore our services", "/services"),
    secondary: act("Get to know us", "/about"),
    image: null,
    sideText: "Strategy · People · Progress",
    showScrollIndicator: true,
  },
  backgrounds: ["white", "light"],
  defaultBackground: "white",
});
