"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import { useActionState } from "react";

import { actionClassName } from "@/components/shared/action-link";
import { submitContactForm } from "@/core/contact/actions";
import { HONEYPOT_FIELD, type ContactFormState } from "@/core/contact/schema";
import { cn } from "@/lib/utils";

const INITIAL: ContactFormState = { status: "idle" };

const input =
  "mt-2 block w-full border border-border bg-background px-4 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-accent focus:ring-3 focus:ring-accent/15 aria-invalid:border-destructive";

/** The contact form. Works without JavaScript (server action with progressive enhancement). */
export function ContactFormFields({
  pageId,
  showPhone,
  showCompany,
  submitLabel,
  successMessage,
  sectionId,
}: {
  pageId: string;
  showPhone: boolean;
  showCompany: boolean;
  submitLabel: string;
  successMessage: string;
  sectionId: string;
}) {
  const [state, formAction, pending] = useActionState(submitContactForm, INITIAL);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 border-l-2 border-success bg-success/5 p-5"
      >
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
        <p className="text-[15px]">{successMessage}</p>
      </div>
    );
  }

  const field = (
    name: "name" | "email" | "phone" | "company",
    label: string,
    type: string,
    autoComplete: string,
    placeholder: string,
  ) => {
    const id = `${sectionId}-${name}`;
    const error = state.errors?.[name];
    return (
      <div>
        <label htmlFor={id} className="text-[13px] font-medium">
          {label}
          {(name === "name" || name === "email") && (
            <span aria-hidden className="text-accent">
              {" "}
              *
            </span>
          )}
        </label>
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          defaultValue={state.values?.[name] ?? ""}
          required={name === "name" || name === "email"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(input, "h-[46px]")}
        />
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };

  const messageId = `${sectionId}-message`;
  return (
    <form
      action={formAction}
      noValidate
      className="space-y-5"
      aria-describedby={state.message ? `${sectionId}-form-error` : undefined}
    >
      {state.status === "error" && state.message && (
        <p
          id={`${sectionId}-form-error`}
          role="alert"
          className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </p>
      )}
      <input type="hidden" name="pageId" value={pageId} />
      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${sectionId}-${HONEYPOT_FIELD}`}>Leave this empty</label>
        <input
          id={`${sectionId}-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("name", "Name", "text", "name", "Your name")}
        {field("email", "Email address", "email", "email", "you@company.com")}
        {showPhone && field("phone", "Phone number", "tel", "tel", "+1 (555) 000-0000")}
        {showCompany && field("company", "Company", "text", "organization", "Company name")}
      </div>
      <div>
        <label htmlFor={messageId} className="text-[13px] font-medium">
          Your message
          <span aria-hidden className="text-accent">
            {" "}
            *
          </span>
        </label>
        <textarea
          id={messageId}
          name="message"
          rows={5}
          required
          placeholder="Tell us about your project…"
          defaultValue={state.values?.message ?? ""}
          aria-invalid={Boolean(state.errors?.message)}
          aria-describedby={state.errors?.message ? `${messageId}-error` : undefined}
          className={cn(input, "py-3")}
        />
        {state.errors?.message && (
          <p id={`${messageId}-error`} className="mt-1.5 text-xs text-destructive">
            {state.errors.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className={actionClassName("accent", "h-12 px-6 disabled:opacity-60")}
      >
        {pending ? "Sending…" : submitLabel}
        <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.25} />
      </button>
    </form>
  );
}
