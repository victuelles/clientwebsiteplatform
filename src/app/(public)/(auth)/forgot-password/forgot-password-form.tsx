"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { FormTextField } from "@/components/shared/form-text-field";
import { FieldGroup } from "@/components/ui/field";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/core/auth/schemas";

import { requestPasswordReset } from "../actions";
import { SubmitButton } from "../_components/submit-button";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    const result = await requestPasswordReset(values);
    if (result.ok) setSent(result.message ?? null);
    else form.setError("root", { message: result.error });
  }

  if (sent) return <FormMessage kind="success">{sent}</FormMessage>;

  const rootError = form.formState.errors.root?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {rootError && <FormMessage kind="error">{rootError}</FormMessage>}
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting}>Send reset link</SubmitButton>
    </form>
  );
}
