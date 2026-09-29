"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { FormTextField } from "@/components/shared/form-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  magicLinkSchema,
  signInSchema,
  type MagicLinkValues,
  type SignInValues,
} from "@/core/auth/schemas";

import { sendMagicLink, signInWithPassword } from "../actions";
import { SubmitButton } from "../_components/submit-button";

export function SignInForm({ next }: { next: string | null }) {
  const [mode, setMode] = useState<"password" | "magic-link">("password");

  return (
    <div className="space-y-6">
      {mode === "password" ? <PasswordForm next={next} /> : <MagicLinkForm />}
      <Button
        type="button"
        variant="link"
        className="h-auto w-full p-0 text-muted-foreground"
        onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
      >
        {mode === "password"
          ? "Email me a sign-in link instead"
          : "Sign in with a password instead"}
      </Button>
    </div>
  );
}

function PasswordForm({ next }: { next: string | null }) {
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInValues) {
    const result = await signInWithPassword(values, next);
    if (result && !result.ok) form.setError("root", { message: result.error });
  }

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
        <div className="space-y-2">
          <FormTextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
          />
          <Link
            href="/forgot-password"
            className="block text-right text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </FieldGroup>
      <SubmitButton pending={form.formState.isSubmitting}>Sign in</SubmitButton>
    </form>
  );
}

function MagicLinkForm() {
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: MagicLinkValues) {
    const result = await sendMagicLink(values);
    if (result.ok) setSent(result.message ?? null);
    else form.setError("root", { message: result.error });
  }

  const rootError = form.formState.errors.root?.message;

  if (sent) return <FormMessage kind="success">{sent}</FormMessage>;

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
      <SubmitButton pending={form.formState.isSubmitting}>Email me a sign-in link</SubmitButton>
    </form>
  );
}
