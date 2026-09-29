import type { Metadata } from "next";

import { requireUser } from "@/core/access/guard";

import { AuthCard } from "../_components/auth-card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached from the password reset email, which signs the user in first (/auth/confirm).
export default async function ResetPasswordPage() {
  await requireUser();

  return (
    <AuthCard
      eyebrow="Account help"
      title="Choose a new password"
      description="Pick a strong password you don't use anywhere else."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
