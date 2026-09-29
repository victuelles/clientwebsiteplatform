import { z } from "zod";

import { defineSection } from "../types";
import { act, action, media, text } from "./shared";

export const introImageSection = defineSection({
  key: "intro_image",
  label: "Intro with image",
  description: "A centered heading, text, and link above a wide photo.",
  icon: "camera",
  schema: z.object({
    eyebrow: text(80),
    heading: text(160),
    text: text(300),
    link: action,
    image: media,
  }),
  fields: [
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    { type: "textarea", name: "text", label: "Text", rows: 2, maxLength: 300 },
    { type: "action", name: "link", label: "Text link" },
    { type: "media", name: "image", label: "Wide photo" },
  ],
  defaults: {
    eyebrow: "Meet the people",
    heading: "Experience with a human touch.",
    text: "A team that listens closely, thinks boldly, and cares about the outcome.",
    link: act("Meet the team", "/about"),
    image: null,
  },
  backgrounds: ["white", "light"],
  defaultBackground: "white",
});
