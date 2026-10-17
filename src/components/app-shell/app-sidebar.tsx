"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/features/notifications/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLockup } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV, SETTINGS_ITEM, type NavItem } from "./nav";
import { canAccess, type PermissionMap } from "@/features/permissions/modules";

export type SessionUser = {
  fullName: string;
  role: "admin" | "member";
  permissions: PermissionMap;
};

function Item({ item, active }: { item: NavItem; active: boolean }) {
  const { setOpenMobile } = useSidebar();
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link href={item.href} onClick={() => setOpenMobile(false)}>
          <Icon aria-hidden />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const initials = user.fullName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <BrandLockup className="px-1 py-1.5 group-data-[collapsible=icon]:[&>span]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => {
          const items = group.items.filter(
            (item) =>
              item.module !== "settings" &&
              canAccess(user.role, user.permissions, item.module, "view"),
          );
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {items.map((item) => (
                  <Item
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
        {user.role === "admin" && (
          <SidebarGroup className="mt-auto">
            <SidebarMenu>
              <Item
                item={SETTINGS_ITEM}
                active={isActive(SETTINGS_ITEM.href)}
              />
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {user.role === "admin" ? "Administrador" : "Miembro"}
            </p>
          </div>
          <ThemeToggle />
          <SignOutButton/>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
