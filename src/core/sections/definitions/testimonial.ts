import { z } from "zod";

import { defineSection } from "../types";
import { media, text } from "./shared";

export const testimonialSection = defineSection({
  key: "testimonial",
  label: "Testimonial",
  description: "A photo beside a heading and a client quote with their name and title.",
  icon: "message-circle",
  schema: z.object({
    image: media,
    eyebrow: text(80),
    heading: text(160),
    quote: text(600),
    authorName: text(80),
    authorTitle: text(120),
  }),
  fields: [
    { type: "media", name: "image", label: "Photo" },
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    {
      type: "textarea",
      name: "quote",
      label: "Quote",
      rows: 4,
      maxLength: 600,
      help: "Without quotation marks; they are added for you.",
    },
    { type: "text", name: "authorName", label: "Author name", maxLength: 80 },
    { type: "text", name: "authorTitle", label: "Author title", maxLength: 120 },
  ],
  defaults: {
    image: null,
    eyebrow: "Client stories",
    heading: "The best work starts with trust.",
    quote:
      "They took the time to understand where we wanted to go, then helped us make it happen. It felt like having an extension of our own team.",
    authorName: "Alex Morgan",
    authorTitle: "Founder, Sample Company",
  },
  backgrounds: ["white", "light"],
  defaultBackground: "white",
});
