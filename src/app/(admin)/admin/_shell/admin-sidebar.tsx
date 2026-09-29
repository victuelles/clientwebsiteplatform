"use client";

import {
  ChevronsUpDown,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Puzzle,
  ScrollText,
  Settings,
  Shapes,
  SquareArrowOutUpRight,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/core/auth/actions";

import type { NavGroup, NavIcon } from "./nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  content: FileText,
  media: ImageIcon,
  module: Shapes,
  modules: Puzzle,
  staff: Users,
  settings: Settings,
  audit: ScrollText,
};

export type SidebarUser = { name: string; email: string; roleLabel: string };

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() ||
    "?"
  );
}

export function AdminSidebar({
  siteName,
  nav,
  user,
}: {
  siteName: string;
  nav: NavGroup[];
  user: SidebarUser;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={siteName}
              render={<Link href="/admin" onClick={closeOnMobile} />}
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center bg-sidebar-primary font-bold text-sidebar-primary-foreground"
              >
                {siteName.trim()[0]?.toUpperCase() ?? "A"}
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-semibold">{siteName}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">Admin</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Admin">
          {nav.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="tracking-widest text-sidebar-foreground/50 uppercase">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = ICONS[item.icon];
                    const active = isActive(pathname, item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={item.title}
                          className="data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                          render={
                            <Link
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              onClick={closeOnMobile}
                            />
                          }
                        >
                          <Icon aria-hidden />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-popup-open:bg-sidebar-accent"
                    aria-label="Account menu"
                  />
                }
              >
                <Avatar className="size-8 rounded-none">
                  <AvatarFallback className="rounded-none bg-sidebar-accent text-xs text-sidebar-accent-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col gap-1 leading-tight">
                  <span className="truncate text-sm font-medium" data-testid="admin-user-name">
                    {user.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className="h-4 w-fit rounded-sm px-1.5 text-[10px] tracking-wide uppercase"
                    data-testid="admin-user-role"
                  >
                    {user.roleLabel}
                  </Badge>
                </span>
                <ChevronsUpDown aria-hidden className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "top" : "right"}
                align="end"
                className="min-w-56"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <span className="block truncate font-medium text-foreground">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/account" />}>
                  <UserRound aria-hidden />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/" />}>
                  <SquareArrowOutUpRight aria-hidden />
                  View site
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
