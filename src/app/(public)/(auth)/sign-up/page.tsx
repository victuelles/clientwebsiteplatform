import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { homePathForRole } from "@/core/auth/roles";
import { getCurrentProfile } from "@/core/auth/session";

import { AuthCard } from "../_components/auth-card";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(homePathForRole(profile.role));

  return (
    <AuthCard
      eyebrow="Get started"
      title="Create an account"
      description="We'll email you a link to confirm your address."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
