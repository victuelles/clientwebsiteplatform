import { z } from "zod";

export const contactSubmissionSchema = z.object({
  pageId: z.uuid(),
  name: z.string().trim().min(1, "Enter your name.").max(100, "Use at most 100 characters."),
  email: z.email("Enter a valid email address.").trim().max(254),
  phone: z.string().trim().max(40, "Use at most 40 characters.").optional().default(""),
  company: z.string().trim().max(120, "Use at most 120 characters.").optional().default(""),
  message: z.string().trim().min(1, "Enter a message.").max(5000, "Use at most 5000 characters."),
});

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "phone" | "company" | "message", string>>;
  values?: Partial<Record<"name" | "email" | "phone" | "company" | "message", string>>;
};

/** Name of the hidden honeypot field. Real visitors never fill it in. */
export const HONEYPOT_FIELD = "website";
