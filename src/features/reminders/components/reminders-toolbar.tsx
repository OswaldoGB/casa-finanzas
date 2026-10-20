"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadExport } from "@/features/exports/components/export-buttons";
import type { ReminderCategory } from "../types";
import { CategoryDialog } from "./category-dialog";

/** Menú ⋯: vistas secundarias, descargas y categorías, fuera del camino diario. */
export function RemindersMenu({
  categories,
  canEdit,
}: {
  categories: ReminderCategory[];
  canEdit: boolean;
}) {
  const [manage, setManage] = useState(false);
  const download = [
    ["reminders", "csv", "Recordatorios (CSV)"],
    ["reminders", "xlsx", "Recordatorios (Excel)"],
    ["reminder_events", "csv", "Historial (CSV)"],
    ["reminder_events", "xlsx", "Historial (Excel)"],
  ] as const;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="text-muted-foreground hover:bg-muted grid size-11 place-items-center rounded-xl border"
            aria-label="Más opciones de recordatorios"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ver</DropdownMenuLabel>
          {[
            ["completed", "Historial de realizados"],
            ["paused", "Pausados"],
            ["archived", "Archivados"],
          ].map(([view, label]) => (
            <DropdownMenuItem key={view} asChild>
              <Link href={`/reminders?view=${view}`}>{label}</Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Descargar</DropdownMenuLabel>
          {download.map(([target, format, label]) => (
            <DropdownMenuItem key={label} onSelect={() => downloadExport(target, format)}>
              {label}
            </DropdownMenuItem>
          ))}
          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setManage(true)}>
                Administrar categorías
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Categorías</DialogTitle>
            <DialogDescription>Toca una para editarla.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <CategoryDialog key={c.id} category={c} />
            ))}
            <CategoryDialog />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Búsqueda instantánea (título o referencia) + chips de categoría. */
export function RemindersFilters({
  categories,
  q,
  category,
}: {
  categories: ReminderCategory[];
  q: string;
  category: string;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const [term, setTerm] = useState(q);
  const hrefWith = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    return `${pathname}?${next}`;
  };
  useEffect(() => {
    if (term.trim() === q) return;
    const t = setTimeout(() => router.replace(hrefWith("q", term.trim()), { scroll: false }), 300);
    return () => clearTimeout(t);
    // hrefWith depende de params, que cambia con cada replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, q]);
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm ${active ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground"}`;
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Buscar recordatorios</span>
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          maxLength={120}
          placeholder="Buscar por título o referencia…"
          className="border-input bg-background h-11 w-full rounded-xl border pr-3 pl-9 text-sm"
        />
      </label>
      {categories.length > 0 && (
        <nav aria-label="Filtrar por categoría" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link href={hrefWith("category", "")} className={chip(!category)} aria-current={!category ? "true" : undefined}>
            Todas
          </Link>
          {categories
            .filter((c) => !c.is_archived)
            .map((c) => (
              <Link
                key={c.id}
                href={hrefWith("category", c.id)}
                className={chip(category === c.id)}
                aria-current={category === c.id ? "true" : undefined}
              >
                {c.name}
              </Link>
            ))}
        </nav>
      )}
    </div>
  );
}
