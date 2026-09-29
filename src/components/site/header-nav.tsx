"use client";

import { ChevronDown, Menu, X } from "lucide-react";
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
import type { NavItem } from "@/core/navigation/types";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0] || "/";
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}

const newTabProps = (item: NavItem) =>
  item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};

/** Desktop links with the active page highlighted; one level of dropdown items. */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-8">
        {items.map((item) => {
          const active =
            isActive(pathname, item.href) || item.children.some((c) => isActive(pathname, c.href));
          const linkClass = cn(
            "relative py-2 text-[11px] font-bold tracking-[0.14em] text-navy-foreground uppercase transition-colors hover:text-accent",
            active &&
              "text-accent after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-accent",
          );
          if (item.children.length === 0) {
            return (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={linkClass}
                  {...newTabProps(item)}
                >
                  {item.label}
                </Link>
              </li>
            );
          }
          const expanded = open === item.label;
          return (
            <li
              key={item.href + item.label}
              className="group relative flex items-center gap-1"
              onMouseEnter={() => setOpen(item.label)}
              onMouseLeave={() => setOpen(null)}
            >
              <Link href={item.href} className={linkClass} {...newTabProps(item)}>
                {item.label}
              </Link>
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={`${item.label} menu`}
                onClick={() => setOpen(expanded ? null : item.label)}
                className="text-navy-foreground hover:text-accent"
              >
                <ChevronDown
                  aria-hidden
                  className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                />
              </button>
              <ul
                className={cn(
                  "absolute top-full left-0 z-30 min-w-52 border-t-2 border-accent bg-background py-2 text-foreground shadow-lg",
                  expanded ? "block" : "hidden group-focus-within:block",
                )}
              >
                {item.children.map((child) => (
                  <li key={child.href + child.label}>
                    <Link
                      href={child.href}
                      className="block px-4 py-2 text-sm hover:bg-muted hover:text-accent"
                      aria-current={isActive(pathname, child.href) ? "page" : undefined}
                      {...newTabProps(child)}
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Hamburger + full-height sheet with the links and CTA (below lg). */
export function MobileMenu({
  items,
  cta,
  logo,
  account,
}: {
  items: NavItem[];
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
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block py-4 text-sm font-bold tracking-[0.14em] uppercase transition-colors hover:text-accent",
                      active && "text-accent",
                    )}
                    {...newTabProps(item)}
                  >
                    {item.label}
                  </Link>
                  {item.children.length > 0 && (
                    <ul className="-mt-2 space-y-1 pb-3 pl-4">
                      {item.children.map((child) => (
                        <li key={child.href + child.label}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "block py-1.5 text-sm text-navy-foreground/80 hover:text-accent",
                              isActive(pathname, child.href) && "text-accent",
                            )}
                            {...newTabProps(child)}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
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
