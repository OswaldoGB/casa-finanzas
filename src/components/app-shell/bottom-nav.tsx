"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Menu,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { canAccess, type PermissionMap } from "@/features/permissions/modules";
import { getMobileCreateAction } from "./mobile-create";

function Tab({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-col items-center gap-0.5 px-1 py-2 text-[11px]",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

export function BottomNav({
  role,
  permissions,
}: {
  role: "admin" | "member";
  permissions: PermissionMap;
}) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const hasDashboard = canAccess(role, permissions, "dashboard", "view");
  const hasTransactions = canAccess(role, permissions, "transactions", "view");
  const hasLists = canAccess(role, permissions, "shopping_lists", "view");
  const create = getMobileCreateAction(pathname);
  const canCreate =
    canAccess(role, permissions, create.module, "edit") &&
    (create.module !== "loans" ||
      canAccess(role, permissions, "transactions", "edit"));
  return (
    <nav
      aria-label="Navegación principal"
      className="bg-background/85 fixed inset-x-0 bottom-0 z-40 grid min-w-0 grid-cols-5 overflow-hidden border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      {hasDashboard ? (
        <Tab href="/dashboard" label="Inicio" icon={LayoutDashboard} />
      ) : (
        <Tab href="/access-pending" label="Esperando" icon={LockKeyhole} />
      )}
      {hasTransactions ? (
        <Tab href="/transactions" label="Movimientos" icon={ArrowLeftRight} />
      ) : (
        <span />
      )}
      <div className="grid min-w-0 place-items-center">
        {canCreate && (
          <Link
            href={create.href}
            aria-label={create.label}
            title={create.label}
            className="bg-primary text-primary-foreground shadow-primary/25 hover:shadow-primary/35 focus-visible:ring-ring -mt-5 grid size-14 place-items-center rounded-full shadow-lg transition duration-200 ease-out outline-none hover:-translate-y-0.5 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95"
          >
            <Plus className="size-6" />
          </Link>
        )}
      </div>
      {hasLists ? (
        <Tab href="/lists" label="Listas" icon={ListChecks} />
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="text-muted-foreground flex min-w-0 flex-col items-center gap-0.5 px-1 py-2 text-[11px]"
      >
        <Menu className="size-5" aria-hidden />
        <span className="max-w-full truncate">Más</span>
      </button>
    </nav>
  );
}
