"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, LayoutDashboard, ListChecks, Menu, Plus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function Tab({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
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

export function BottomNav() {
  const { setOpenMobile } = useSidebar();
  return (
    <nav
      aria-label="Navegación principal"
      className="bg-background/85 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <Tab href="/dashboard" label="Inicio" icon={LayoutDashboard} />
      <Tab href="/transactions" label="Movimientos" icon={ArrowLeftRight} />
      <div className="grid place-items-center">
        {/* ponytail: el registro rápido llega en la Fase 2 */}
        <button
          type="button"
          aria-label="Registrar movimiento"
          onClick={() => toast("El registro rápido llega en la Fase 2")}
          className="bg-primary text-primary-foreground shadow-primary/25 focus-visible:ring-ring -mt-5 grid size-14 place-items-center rounded-full shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95"
        >
          <Plus className="size-6" />
        </button>
      </div>
      <Tab href="/lists" label="Listas" icon={ListChecks} />
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
