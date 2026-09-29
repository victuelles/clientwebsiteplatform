import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormMessage } from "@/components/shared/form-message";
import { SIGN_IN_ERRORS } from "@/core/auth/messages";
import { safeNextPath } from "@/core/auth/redirects";
import { homePathForRole } from "@/core/auth/roles";
import { getCurrentProfile } from "@/core/auth/session";

import { AuthCard } from "../_components/auth-card";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const searchParams = await props.searchParams;
  const next = safeNextPath(searchParams.next);
  const errorKey = typeof searchParams.error === "string" ? searchParams.error : undefined;
  const errorMessage = errorKey ? SIGN_IN_ERRORS[errorKey] : undefined;

  const profile = await getCurrentProfile();
  if (profile) redirect(next ?? homePathForRole(profile.role));

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in"
      description="Sign in with your password, or get a one-time link by email."
      footer={
        <p>
          New here?{" "}
          <Link
            href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      {errorMessage && (
        <FormMessage kind="error" className="mb-6">
          {errorMessage}
        </FormMessage>
      )}
      <SignInForm next={next} />
    </AuthCard>
  );
}
