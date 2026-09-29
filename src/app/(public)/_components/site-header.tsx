import Link from "next/link";

import { siteConfig } from "@/core/site";

import { AuthIndicator } from "./auth-indicator";

// Placeholder header. The real header is built in Phase 3/4.
export function SiteHeader() {
  return (
    <header className="bg-navy text-navy-foreground">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="truncate font-bold tracking-tight">
          {siteConfig.name}
        </Link>
        <AuthIndicator />
      </div>
    </header>
  );
}
