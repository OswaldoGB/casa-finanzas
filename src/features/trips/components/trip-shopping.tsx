"use client";
import Link from "next/link";
import { ShoppingCart } from "@/features/shopping-lists/components/cart";
import { prepareTripList, assignListProject } from "../actions";
import { FormSelect } from "@/components/ui/form-select";
import type { TripSnapshot } from "../schemas";
import { ActionForm } from "./action-dialog";
export function TripShopping({
  snapshot,
  availableLists = [],
}: {
  snapshot: TripSnapshot;
  availableLists?: { id: string; name: string }[];
}) {
  if (!snapshot.canViewLists)
    return (
      <p className="bg-card rounded-2xl border p-5 text-sm">
        Necesitas permiso de Listas de compra para ver los productos y compras.
        Sus totales siguen incluidos en el presupuesto del viaje.
      </p>
    );
  return (
    <section className="space-y-5">
      {snapshot.canEdit &&
        snapshot.canEditLists &&
        snapshot.lists.length === 0 && (
          <div className="bg-card rounded-2xl border p-5">
            <h2 className="mb-3 font-semibold">
              Prepara las compras del viaje
            </h2>
            <ActionForm
              action={prepareTripList}
              submitLabel="Crear lista del viaje"
            >
              <input
                type="hidden"
                name="project_id"
                value={snapshot.project.id}
              />
              <p className="text-muted-foreground text-sm">
                Se podrá organizar por tiendas y relacionar productos con el
                menú.
              </p>
            </ActionForm>
          </div>
        )}
      {snapshot.canEdit &&
        snapshot.canEditLists &&
        availableLists.length > 0 && (
          <details className="bg-card rounded-2xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Vincular una lista que ya existe
            </summary>
            <div className="mt-4">
              <ActionForm
                action={assignListProject}
                submitLabel="Vincular lista"
              >
                <input
                  type="hidden"
                  name="project_id"
                  value={snapshot.project.id}
                />
                <FormSelect
                  name="list_id"
                  placeholder="Seleccionar lista"
                  options={availableLists.map((l) => ({
                    value: l.id,
                    label: l.name,
                  }))}
                />
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="confirm_financial_change"
                    className="accent-primary mt-1"
                  />
                  Si tiene compras, también vincular sus movimientos al viaje.
                  No se crearán otros gastos.
                </label>
              </ActionForm>
            </div>
          </details>
        )}
      {snapshot.lists.map((list) => (
        <section key={list.id} className="space-y-3">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold break-words">
              {list.name}
              {list.status === "archived" && (
                <span className="text-muted-foreground ml-2 text-xs">
                  Archivada
                </span>
              )}
            </h2>
            <Link
              href={`/lists/${list.id}`}
              className="text-primary text-sm underline"
            >
              Abrir lista
            </Link>
          </header>
          <ShoppingCart
            list={list}
            items={snapshot.items.filter((i) => i.list_id === list.id)}
            groups={snapshot.groups.filter((g) => g.list_id === list.id)}
            purchases={snapshot.purchases.filter((p) => p.list_id === list.id)}
            purchaseTransactions={snapshot.transactions}
            today={snapshot.today}
            canEdit={snapshot.canEdit && snapshot.canEditLists}
            canClose={
              snapshot.canEdit &&
              snapshot.canEditLists &&
              snapshot.canEditTransactions
            }
            canViewTransaction={snapshot.canViewTransactions}
            options={snapshot.canEditTransactions ? snapshot.options : null}
            suggestions={snapshot.items
              .filter((i) => i.purchase_id && i.real_price != null)
              .map((i) => ({ name: i.name, price: i.real_price }))}
          />
        </section>
      ))}
    </section>
  );
}
