"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { z } from "zod";

import { env, getIntegrationStatus } from "@/core/env";
import { getSiteSettings } from "@/core/settings/get-settings";
import { createClient } from "@/core/supabase/server";

import { isRateLimited } from "./rate-limit";
import { contactSubmissionSchema, HONEYPOT_FIELD, type ContactFormState } from "./schema";

// PUBLIC action (anyone can send a message), so it is not a protectedAction. It is protected by
// a honeypot, a per-IP rate limit, Zod validation, and submit_contact_form (which only accepts
// published pages with a contact form section and re-validates every field).

const FIELDS = ["name", "email", "phone", "company", "message"] as const;

export async function submitContactForm(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values = Object.fromEntries(
    FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  );

  // Bots fill every field. Pretend it worked so they don't adapt.
  if (String(formData.get(HONEYPOT_FIELD) ?? "") !== "") {
    return { status: "success" };
  }

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(`contact:${ip}`)) {
    return {
      status: "error",
      message: "You've sent several messages in a short time. Please try again in a few minutes.",
      values,
    };
  }

  const parsed = contactSubmissionSchema.safeParse({ ...values, pageId: formData.get("pageId") });
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<
      string,
      string[] | undefined
    >;
    const errors = Object.fromEntries(
      FIELDS.flatMap((field) => (fieldErrors[field]?.[0] ? [[field, fieldErrors[field]![0]]] : [])),
    );
    return { status: "error", message: "Please fix the highlighted fields.", errors, values };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_contact_form", {
    page_id: input.pageId,
    name: input.name,
    email: input.email,
    message: input.message,
    phone: input.phone || undefined,
    company: input.company || undefined,
    source_url: requestHeaders.get("referer")?.slice(0, 500) ?? undefined,
  });
  if (error) {
    const message =
      error.code === "22023" ? error.message : "Your message couldn't be sent. Please try again.";
    if (error.code !== "22023") console.error(`Contact form failed: ${error.message}`);
    return { status: "error", message, values };
  }

  await notifyByEmail(input).catch((e: unknown) =>
    console.error("Contact notification email failed", e),
  );
  return { status: "success" };
}

async function notifyByEmail(input: z.output<typeof contactSubmissionSchema>) {
  const settings = await getSiteSettings();
  if (!getIntegrationStatus().resend || !settings.contactEmail) return;
  const resend = new Resend(env.RESEND_API_KEY);
  const lines = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone && `Phone: ${input.phone}`,
    input.company && `Company: ${input.company}`,
    "",
    input.message,
  ].filter((line) => line !== "" && line !== undefined);
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: settings.contactEmail,
    replyTo: input.email,
    subject: `New message from ${input.name} via ${settings.siteName}`,
    text: lines.join("\n"),
  });
  if (error) throw new Error(error.message);
}
