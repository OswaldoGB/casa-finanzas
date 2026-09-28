import Link from "next/link";
import { getShopping } from "@/features/shopping/queries";
import {
  ShoppingForm,
  BuyForm,
} from "@/features/shopping/components/shopping-forms";
import { ActionForm } from "@/features/projects/components/action-form";
import { deleteShopping } from "@/features/shopping/actions";
import { priorityLabels, shoppingStatus } from "@/features/shopping/schemas";
import { formatUSD } from "@/lib/format";

export const metadata = { title: "Compras próximas" };
export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; buy?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const options = await getShopping();
  const { items, canEdit } = options;
  const edit = items.find(
    (item) => item.id === filters.edit && item.status !== "bought",
  );
  const buy = items.find(
    (item) => item.id === filters.buy && item.status === "pending",
  );
  const visible = items.filter(
    (item) => item.status === (filters.status ?? "pending"),
  );
  const pending = items.filter((item) => item.status === "pending");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Compras próximas</h1>
        <p className="text-muted-foreground text-sm">
          Prioriza deseos y compras grandes del hogar.
        </p>
      </header>
      <div className="bg-card rounded-2xl border p-5">
        <p className="text-muted-foreground text-xs">
          Estimado de compras pendientes
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {formatUSD(
            pending.reduce((sum, item) => sum + (item.estimated_price ?? 0), 0),
          )}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {pending.filter((item) => item.estimated_price == null).length} sin
          precio. Los estimados todavía no afectan tus saldos.
        </p>
      </div>
      <nav aria-label="Estado de compras" className="flex gap-3 text-sm">
        {Object.entries(shoppingStatus).map(([status, label]) => (
          <Link
            className={`rounded-lg border px-3 py-2 ${status === (filters.status ?? "pending") ? "bg-muted font-medium" : ""}`}
            key={status}
            href={`/shopping?status=${status}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          {visible.length === 0 && (
            <p className="text-muted-foreground rounded-2xl border p-6 text-sm">
              No hay compras en este estado.
            </p>
          )}
          {visible.map((item) => (
            <article
              key={item.id}
              className="bg-card space-y-3 rounded-2xl border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-muted-foreground text-xs">
                    Prioridad{" "}
                    {
                      priorityLabels[
                        item.priority as keyof typeof priorityLabels
                      ]
                    }{" "}
                    · {item.target_date ?? "Sin fecha objetivo"}
                  </p>
                </div>
                <span className="font-semibold">
                  {item.estimated_price == null
                    ? "Sin precio"
                    : formatUSD(item.estimated_price)}
                </span>
              </div>
              {item.notes && (
                <p className="text-muted-foreground text-sm">{item.notes}</p>
              )}
              {item.url && /^https?:\/\//i.test(item.url) && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline"
                >
                  Ver producto ↗
                </a>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {canEdit && item.status !== "bought" && (
                  <Link
                    className="underline"
                    href={`/shopping?edit=${item.id}&status=${item.status}`}
                  >
                    Editar / cambiar prioridad
                  </Link>
                )}
                {canEdit &&
                  item.status === "pending" &&
                  (options.canBuy ? (
                    <Link
                      className="bg-primary text-primary-foreground rounded-lg px-3 py-2"
                      href={`/shopping?buy=${item.id}`}
                    >
                      Ya lo compré
                    </Link>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Registrar gasto requiere editar Movimientos.
                    </span>
                  ))}
                {item.transaction_id && options.canBuy && (
                  <Link
                    className="underline"
                    href={`/transactions/${item.transaction_id}`}
                  >
                    Ver gasto / recibo
                  </Link>
                )}
                {item.inventory_item_id && options.canInventory && (
                  <Link
                    className="underline"
                    href={`/inventory/${item.inventory_item_id}`}
                  >
                    Ver inventario
                  </Link>
                )}
                {canEdit && (
                  <ActionForm
                    action={deleteShopping}
                    label="Eliminar"
                    className="space-y-1"
                    confirm="¿Eliminar esta compra de la lista? Su gasto, si existe, se conserva."
                  >
                    <input name="id" type="hidden" value={item.id} />
                  </ActionForm>
                )}
              </div>
            </article>
          ))}
        </section>
        {canEdit && (
          <aside className="bg-card rounded-2xl border p-5">
            <h2 className="mb-4 font-semibold">
              {buy && options.canBuy
                ? `Registrar: ${buy.name}`
                : edit
                  ? "Editar compra"
                  : "Nueva compra"}
            </h2>
            {buy && options.canBuy ? (
              <BuyForm item={buy} options={options} />
            ) : (
              <ShoppingForm key={edit?.id ?? "new"} item={edit} />
            )}
            {(edit || buy) && (
              <Link className="mt-3 block text-sm underline" href="/shopping">
                Cancelar / nueva compra
              </Link>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
