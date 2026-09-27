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
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { canAccess, type PermissionMap } from "@/features/permissions/modules";

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
        "flex flex-col items-center gap-0.5 py-2 text-[11px]",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
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
  const hasDashboard = canAccess(role, permissions, "dashboard", "view");
  const hasTransactions = canAccess(role, permissions, "transactions", "view");
  const hasLists = canAccess(role, permissions, "shopping_lists", "view");
  const canRegister = canAccess(role, permissions, "transactions", "edit");
  return (
    <nav
      aria-label="Navegación principal"
      className="bg-background/85 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      {hasDashboard ? (
        <Tab href="/dashboard" label="Inicio" icon={LayoutDashboard} />
      ) : (
        <Tab href="/access-pending" label="Esperando" icon={LockKeyhole} />
      )}
      {hasTransactions ? (
        <span className="text-muted-foreground/50 flex flex-col items-center gap-0.5 py-2 text-[11px]">
          <ArrowLeftRight className="size-5" aria-hidden />
          Movimientos
        </span>
      ) : (
        <span />
      )}
      <div className="grid place-items-center">
        {/* ponytail: el registro rápido llega en la Fase 2 */}
        {canRegister && (
          <button
            type="button"
            aria-label="Registrar movimiento"
            onClick={() => toast("El registro rápido llega en la Fase 2")}
            className="bg-primary text-primary-foreground shadow-primary/25 focus-visible:ring-ring -mt-5 grid size-14 place-items-center rounded-full shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95"
          >
            <Plus className="size-6" />
          </button>
        )}
      </div>
      {hasLists ? (
        <span className="text-muted-foreground/50 flex flex-col items-center gap-0.5 py-2 text-[11px]">
          <ListChecks className="size-5" aria-hidden />
          Listas
        </span>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="text-muted-foreground flex flex-col items-center gap-0.5 py-2 text-[11px]"
      >
        <Menu className="size-5" aria-hidden />
        Más
      </button>
    </nav>
  );
}
