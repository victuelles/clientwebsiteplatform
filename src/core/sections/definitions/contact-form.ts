import { z } from "zod";

import { defineSection } from "../types";
import { text } from "./shared";

export const contactFormSection = defineSection({
  key: "contact_form",
  label: "Contact form",
  description:
    "A message form with optional phone and company fields, and your contact details beside it.",
  icon: "mail",
  schema: z.object({
    eyebrow: text(80),
    heading: text(160),
    text: text(300),
    showPhone: z.boolean().default(true),
    showCompany: z.boolean().default(false),
    submitLabel: text(40, "Send message"),
    successMessage: text(300),
    showDetails: z.boolean().default(true),
    detailsEyebrow: text(80),
    detailsHeading: text(160),
    detailsText: text(400),
  }),
  fields: [
    { type: "text", name: "eyebrow", label: "Eyebrow", maxLength: 80 },
    { type: "text", name: "heading", label: "Heading", maxLength: 160 },
    { type: "textarea", name: "text", label: "Intro", rows: 2, maxLength: 300 },
    { type: "toggle", name: "showPhone", label: "Ask for a phone number" },
    { type: "toggle", name: "showCompany", label: "Ask for a company name" },
    { type: "text", name: "submitLabel", label: "Button text", maxLength: 40 },
    { type: "textarea", name: "successMessage", label: "Success message", rows: 2, maxLength: 300 },
    {
      type: "toggle",
      name: "showDetails",
      label: "Show the contact details panel",
      help: "Uses the email, phone, and location from Settings.",
    },
    { type: "text", name: "detailsEyebrow", label: "Panel eyebrow", maxLength: 80 },
    { type: "text", name: "detailsHeading", label: "Panel heading", maxLength: 160 },
    { type: "textarea", name: "detailsText", label: "Panel text", rows: 3, maxLength: 400 },
  ],
  defaults: {
    eyebrow: "Let’s connect",
    heading: "Tell us what you have in mind.",
    text: "Share a little about your goals. We’ll help you find the right next step.",
    showPhone: true,
    showCompany: false,
    submitLabel: "Send message",
    successMessage: "Thanks for reaching out. We’ll get back to you within one business day.",
    showDetails: true,
    detailsEyebrow: "Here to help",
    detailsHeading: "Real people. Thoughtful answers.",
    detailsText:
      "We’re here to listen, understand your challenges, and point you in the right direction.",
  },
  backgrounds: ["white", "light"],
  defaultBackground: "white",
});
