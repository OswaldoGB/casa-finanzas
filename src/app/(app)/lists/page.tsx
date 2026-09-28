import { ExportButtons } from "@/features/exports/components/export-buttons";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { getShoppingLists } from "@/features/shopping-lists/queries";
import { formatUSD } from "@/lib/format";

export const metadata = { title: "Listas de compra" };
const labels: Record<string, string> = {
  open: "Abierta",
  completed: "Compra terminada",
  archived: "Archivada",
};
export default async function ListsPage() {
  const { lists, canEdit } = await getShoppingLists();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Listas de compra
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Compra en equipo y conoce el total antes de llegar a caja.
          </p>
        </div>
        {canEdit && (
          <Link
            href="/lists/new"
            className="bg-primary text-primary-foreground inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium"
          >
            Nueva lista
          </Link>
        )}
      </header>
      <ExportButtons target="lists" />
      {lists.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed p-12 text-center">
          <ShoppingBasket
            className="text-muted-foreground mx-auto mb-4 size-10"
            aria-hidden
          />
          <h2 className="font-medium">La próxima compra empieza aquí</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Crea una lista para el súper o cualquier tienda.
          </p>
          {canEdit && (
            <Link
              href="/lists/new"
              className="text-primary mt-4 inline-block text-sm underline underline-offset-4"
            >
              Crear la primera lista
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => (
            <li key={list.id}>
              <Link
                href={`/lists/${list.id}`}
                className="bg-card hover:bg-accent/40 focus-visible:ring-ring block rounded-2xl border p-5 focus-visible:ring-2"
              >
                <div className="flex justify-between gap-3">
                  <h2 className="font-medium">{list.name}</h2>
                  <span className="text-muted-foreground text-xs">
                    {labels[list.status]}
                  </span>
                </div>
                {list.store && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {list.store}
                  </p>
                )}
                {list.budget != null && (
                  <p className="mt-4 text-sm tabular-nums">
                    Tope {formatUSD(list.budget)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
