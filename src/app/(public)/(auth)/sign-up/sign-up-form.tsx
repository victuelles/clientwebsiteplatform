"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { FormTextField } from "@/components/shared/form-text-field";
import { FieldGroup } from "@/components/ui/field";
import { signUpSchema, type SignUpValues } from "@/core/auth/schemas";

import { signUp } from "../actions";
import { SubmitButton } from "../_components/submit-button";

export function SignUpForm() {
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpValues) {
    const result = await signUp(values);
    if (!result) return;
    if (result.ok) setSent(result.message ?? null);
    else form.setError("root", { message: result.error });
  }

  if (sent) return <FormMessage kind="success">{sent}</FormMessage>;

  const rootError = form.formState.errors.root?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {rootError && <FormMessage kind="error">{rootError}</FormMessage>}
      <FieldGroup>
        <FormTextField control={form.control} name="fullName" label="Name" autoComplete="name" />
        <FormTextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        <FormTextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          description="At least 10 characters, with uppercase, lowercase, and a number."
        />
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting}>Create account</SubmitButton>
    </form>
  );
}
