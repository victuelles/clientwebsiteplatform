"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { actionClassName } from "@/components/shared/action-link";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavLink } from "@/core/navigation/defaults";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0] || "/";
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}

/** Desktop links with the active page highlighted. */
export function HeaderNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-8">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-2 text-[11px] font-bold tracking-[0.14em] text-navy-foreground uppercase transition-colors hover:text-accent",
                  active &&
                    "text-accent after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-accent",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Hamburger + full-height sheet with the links and CTA (below lg). */
export function MobileMenu({
  links,
  cta,
  logo,
  account,
}: {
  links: NavLink[];
  cta: { label: string; href: string } | null;
  logo: React.ReactNode;
  account: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="-mr-2 inline-flex size-10 items-center justify-center text-navy-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu aria-hidden className="size-6" />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-dvh flex-col gap-0 border-none bg-navy p-0 text-navy-foreground data-[side=right]:w-full data-[side=right]:sm:max-w-sm"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <div className="flex h-[66px] shrink-0 items-center justify-between px-4.5">
          {logo}
          <SheetClose
            className="-mr-2 inline-flex size-10 items-center justify-center"
            aria-label="Close menu"
          >
            <X aria-hidden className="size-6" />
          </SheetClose>
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-4.5 pt-4">
          <ul className="divide-y divide-navy-foreground/10 border-y border-navy-foreground/10">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block py-4 text-sm font-bold tracking-[0.14em] uppercase transition-colors hover:text-accent",
                      active && "text-accent",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="py-6 text-sm text-navy-foreground/70" onClick={() => setOpen(false)}>
            {account}
          </div>
        </nav>
        {cta && (
          <div className="shrink-0 px-4.5 pb-8">
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className={actionClassName("accent", "w-full")}
            >
              {cta.label}
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
