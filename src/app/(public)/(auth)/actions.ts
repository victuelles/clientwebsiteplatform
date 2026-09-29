"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { AUTH_MESSAGES } from "@/core/auth/messages";
import { homePathForRole } from "@/core/auth/roles";
import {
  forgotPasswordSchema,
  magicLinkSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ActionResult,
} from "@/core/auth/schemas";
import { getCurrentProfile } from "@/core/auth/session";
import { finishSignIn } from "@/core/auth/sign-in";
import { env } from "@/core/env";
import { createClient } from "@/core/supabase/server";

// Every action re-validates its input with the same Zod schema the form uses. Error messages
// never reveal whether an email address is registered.

function genericError(error: AuthError | null, fallback: string = AUTH_MESSAGES.unexpected) {
  if (error?.status === 429) return AUTH_MESSAGES.rateLimited;
  return fallback;
}

function authUrl(path: string) {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();
}

export async function signInWithPassword(
  input: unknown,
  next?: string | null,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: AUTH_MESSAGES.invalidCredentials };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { ok: false, error: genericError(error, AUTH_MESSAGES.invalidCredentials) };
  }

  redirect(await finishSignIn(supabase, data.user.id, next));
}

export async function sendMagicLink(input: unknown): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: authUrl("/auth/callback") },
  });

  // Unknown emails fail with an error; report success anyway so nothing leaks.
  if (error?.status === 429) return { ok: false, error: AUTH_MESSAGES.rateLimited };
  return { ok: true, message: AUTH_MESSAGES.magicLinkSent };
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? AUTH_MESSAGES.unexpected };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: authUrl("/auth/callback"),
    },
  });

  if (error) {
    // Password policy errors are safe to show; anything else stays generic.
    if (error.code === "weak_password") return { ok: false, error: error.message };
    if (error.status === 429) return { ok: false, error: AUTH_MESSAGES.rateLimited };
    // "User already registered" only happens when confirmations are off; do not leak it.
    if (error.code === "user_already_exists")
      return { ok: true, message: AUTH_MESSAGES.signUpSent };
    return { ok: false, error: AUTH_MESSAGES.unexpected };
  }

  // With email confirmations disabled the user is signed in immediately.
  if (data.session && data.user) {
    redirect(await finishSignIn(supabase, data.user.id));
  }

  return { ok: true, message: AUTH_MESSAGES.signUpSent };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: authUrl("/auth/callback?next=/reset-password"),
  });

  if (error?.status === 429) return { ok: false, error: AUTH_MESSAGES.rateLimited };
  return { ok: true, message: AUTH_MESSAGES.resetSent };
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? AUTH_MESSAGES.unexpected };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { ok: false, error: "Your reset link has expired. Please request a new one." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password" || error.code === "same_password") {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: genericError(error) };
  }

  redirect(homePathForRole(profile.role));
}
