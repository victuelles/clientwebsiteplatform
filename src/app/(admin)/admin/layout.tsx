import Link from "next/link";

import { signOut } from "@/core/auth/actions";
import { requireStaffOrAdmin } from "@/core/auth/guards";

// Placeholder admin layout. Phase 2 replaces it with the admin shell and requireAccess().
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireStaffOrAdmin("/admin");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-navy text-navy-foreground">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <Link href="/admin" className="font-semibold">
            Admin
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <span className="hidden truncate sm:inline">{profile.full_name ?? profile.email}</span>
            <Link href="/" className="hover:text-accent">
              View site
            </Link>
            <form action={signOut}>
              <button type="submit" className="hover:text-accent">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
