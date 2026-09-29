import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "../_components/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Account help"
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to choose a new one."
      footer={
        <Link
          href="/sign-in"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
