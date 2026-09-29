import type { Metadata } from "next";

import { Eyebrow } from "@/components/shared/eyebrow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/core/auth/guards";
import { ROLE_LABELS } from "@/core/auth/roles";

import { AccountForm } from "./account-form";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const profile = await requireUser("/account");

  return (
    <main className="flex flex-1 justify-center bg-muted px-4 py-12 sm:py-20">
      <div className="w-full max-w-xl space-y-8">
        <div className="space-y-3">
          <Eyebrow>Your account</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {profile.full_name ? `Hello, ${profile.full_name}` : "Your account"}
          </h1>
        </div>

        <Card className="shadow-sm ring-border [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium break-all" data-testid="account-email">
                  {profile.email}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium">{ROLE_LABELS[profile.role]}</dd>
              </div>
            </dl>
            <AccountForm fullName={profile.full_name ?? ""} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
