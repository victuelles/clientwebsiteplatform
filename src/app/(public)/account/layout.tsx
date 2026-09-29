import { requireUser } from "@/core/access/guard";
import { accountNavItems } from "@/core/modules/registry";

import { AccountNav } from "./_components/account-nav";

// The signed-in user's area: Profile first, then one item per enabled module's accountNav.
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  // Module state from the access context: read fresh on every request.
  const { modules: enabled } = await requireUser();
  const items = [
    { label: "Profile", href: "/account" },
    ...accountNavItems()
      .filter((item) => enabled[item.moduleKey])
      .map(({ label, href }) => ({ label, href })),
  ];

  if (items.length === 1) {
    return (
      <main className="flex flex-1 justify-center bg-muted px-4 py-12 sm:py-20">
        <div className="w-full max-w-xl space-y-8">{children}</div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center bg-muted px-4 py-12 sm:py-20">
      <div className="grid w-full max-w-4xl items-start gap-8 md:grid-cols-[12rem_minmax(0,1fr)]">
        <AccountNav items={items} />
        <div className="min-w-0 space-y-8">{children}</div>
      </div>
    </main>
  );
}
