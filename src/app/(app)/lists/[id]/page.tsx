import Link from "next/link";
import { notFound } from "next/navigation";
import { getShoppingList } from "@/features/shopping-lists/queries";
import {
  ListForm,
  ListOperation,
} from "@/features/shopping-lists/components/forms";
import { ShoppingCart } from "@/features/shopping-lists/components/cart";
export const metadata = { title: "Lista de compra" };
export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getShoppingList(id);
  if (!data) notFound();
  const { list, canEdit, canViewTransaction } = data;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href="/lists"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Listas de compra
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {list.store ? `${list.store} · ` : ""}
            {list.status === "open"
              ? "Compra abierta"
              : list.status === "completed"
                ? "Compra terminada"
                : "Archivada"}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <ListOperation list={list} kind="duplicate" />
            {list.status !== "archived" && (
              <ListOperation list={list} kind="archive" />
            )}
          </div>
        )}
      </header>
      {list.transaction_id && canViewTransaction && (
        <Link
          href={`/transactions/${list.transaction_id}`}
          className="text-primary inline-block text-sm underline underline-offset-4"
        >
          Ver gasto y adjuntar recibo
        </Link>
      )}
      {canEdit && list.status === "open" && (
        <details className="bg-card rounded-2xl border p-4">
          <summary className="cursor-pointer rounded text-sm font-medium">
            Editar nombre, tienda y tope
          </summary>
          <div className="mt-4 max-w-lg">
            <ListForm list={list} />
          </div>
        </details>
      )}
      <ShoppingCart {...data} />
    </div>
  );
}
