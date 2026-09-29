import type { Metadata } from "next";

import { requireUser } from "@/core/access/guard";

import { AuthCard } from "../../_components/auth-card";
import { ResetPasswordForm } from "../../reset-password/reset-password-form";

export const metadata: Metadata = { title: "Set your password" };

// Reached from a staff invitation email: /auth/confirm verifies the invite (signing the user in)
// and redirects here.
export default async function SetPasswordPage() {
  const { profile } = await requireUser();

  return (
    <AuthCard
      eyebrow="Welcome aboard"
      title="Set your password"
      description={`You're signing in as ${profile.email}. Choose a password to finish setting up your account.`}
    >
      <ResetPasswordForm submitLabel="Set password and continue" />
    </AuthCard>
  );
}
