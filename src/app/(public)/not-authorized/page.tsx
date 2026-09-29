import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow } from "@/components/shared/eyebrow";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not authorized" };

export default function NotAuthorizedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted px-4 py-20 text-center">
      <Eyebrow>Access denied</Eyebrow>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        You don&apos;t have access to this page
      </h1>
      <p className="max-w-md text-muted-foreground">
        Your account doesn&apos;t have permission to view it. If you think this is a mistake,
        contact the site owner.
      </p>
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          nativeButton={false}
          render={<Link href="/" />}
          size="lg"
          className="h-11 px-6 text-xs font-semibold tracking-widest uppercase"
        >
          Go home
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/account" />}
          size="lg"
          variant="dark"
          className="h-11 px-6 text-xs font-semibold tracking-widest uppercase"
        >
          Your account
        </Button>
      </div>
    </main>
  );
}
