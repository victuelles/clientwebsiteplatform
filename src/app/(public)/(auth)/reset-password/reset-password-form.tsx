"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { FormTextField } from "@/components/shared/form-text-field";
import { FieldGroup } from "@/components/ui/field";
import { resetPasswordSchema, type ResetPasswordValues } from "@/core/auth/schemas";

import { updatePassword } from "../actions";
import { SubmitButton } from "../_components/submit-button";

export function ResetPasswordForm() {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    const result = await updatePassword(values);
    if (result && !result.ok) form.setError("root", { message: result.error });
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {rootError && <FormMessage kind="error">{rootError}</FormMessage>}
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          description="At least 10 characters, with uppercase, lowercase, and a number."
        />
        <FormTextField
          control={form.control}
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting}>Update password</SubmitButton>
    </form>
  );
}
