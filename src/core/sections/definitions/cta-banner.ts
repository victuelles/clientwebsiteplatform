import { z } from "zod";

import { defineSection } from "../types";
import { act, action, text } from "./shared";

export const ctaBannerSection = defineSection({
  key: "cta_banner",
  label: "Call to action banner",
  description: "A bold band with a short heading and one button.",
  icon: "megaphone",
  schema: z.object({ eyebrow: text(80), heading: text(160), button: action }),
  fields: [
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    { type: "action", name: "button", label: "Button" },
  ],
  defaults: {
    eyebrow: "Let’s build something better",
    heading: "Ready to make your next move?",
    button: act("Start a conversation", "/contact"),
  },
  backgrounds: ["accent", "navy", "light"],
  defaultBackground: "accent",
});
