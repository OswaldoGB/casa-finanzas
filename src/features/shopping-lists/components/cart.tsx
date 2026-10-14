"use client";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MoneyInput } from "@/components/ui/money-input";
import { formatUSD } from "@/lib/format";
import { updateCart } from "../actions";
import { shoppingItemStatus, shoppingPurchaseTotals } from "../purchase-totals";
import type { getShoppingList } from "../queries";
import { ItemForm, DeleteItemForm, fieldClass } from "./forms";
import { GroupForm, ListAction } from "./group-form";
import { PurchaseDialog } from "./purchase-dialog";
import { PurchaseHistory } from "./purchase-history";
type Props = Omit<
  NonNullable<Awaited<ReturnType<typeof getShoppingList>>>,
  "projects" | "canAssignProject"
>;
const labels: Record<string, string> = {
  pending: "Pendiente",
  cart: "En carrito",
  purchased: "Comprado",
  available: "Ya lo tenemos",
  discarded: "No comprar",
  legacy_unbought: "No comprado · lista anterior",
};
export function ShoppingCart({
  list,
  items,
  groups,
  purchases,
  purchaseTransactions,
  today,
  canEdit,
  canClose,
  canViewTransaction,
  options,
  suggestions,
}: Props) {
  const router = useRouter();
  const [optimistic, optimisticUpdate] = useOptimistic(
    items,
    (
      current,
      update: { id: string; checked?: boolean; real_price?: number | null },
    ) => current.map((i) => (i.id === update.id ? { ...i, ...update } : i)),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Conectando…");
  const editable = canEdit && list.status === "open";
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`shopping-list-${list.id}`);
    for (const table of [
      "shopping_list_items",
      "shopping_list_groups",
      "shopping_list_purchases",
      "shopping_lists",
    ])
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `${table === "shopping_lists" ? "id" : "list_id"}=eq.${list.id}`,
        },
        () => router.refresh(),
      );
    channel.subscribe((status) =>
      setConnection(
        status === "SUBSCRIBED"
          ? "Compartida en tiempo real"
          : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
            ? "Sin conexión en vivo; actualiza para ver cambios"
            : "Conectando…",
      ),
    );
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [list.id, router]);
  function update(
    id: string,
    values: { checked?: boolean; real_price?: number | null },
  ) {
    setError("");
    startTransition(async () => {
      optimisticUpdate({ id, ...values });
      try {
        const result = await updateCart(id, list.id, values);
        if (result?.error) setError(result.error);
      } catch {
        setError("No se guardó el cambio. Revisa tu conexión.");
      }
      router.refresh();
    });
  }
  const totals = shoppingPurchaseTotals(
    optimistic,
    purchases,
    purchaseTransactions,
  );
  const sections = [
    ...groups.filter(
      (g) => !g.is_archived || optimistic.some((i) => i.group_id === g.id),
    ),
    { id: null, name: "Por decidir", is_archived: false },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs" role="status">
          {pending ? "Guardando cambios…" : connection}
        </p>
        <button
          className="text-primary text-xs underline"
          onClick={() => router.refresh()}
        >
          Actualizar
        </button>
      </div>
      {error && (
        <p role="alert" className="text-destructive rounded-lg border p-3">
          {error}
        </p>
      )}
      <section className="bg-card grid grid-cols-2 gap-4 rounded-2xl border p-5 sm:grid-cols-4">
        {[
          ["Pagado", totals.paid],
          ["En carrito", totals.cart],
          ["Pendiente estimado", totals.pending],
          ["Proyección", totals.projected],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatUSD(Number(value))}
            </p>
          </div>
        ))}
      </section>
      {totals.missingCart + totals.missingPending > 0 && (
        <p className="text-muted-foreground text-sm">
          Faltan {totals.missingCart + totals.missingPending} precios; la
          proyección aún está incompleta.
        </p>
      )}
      {list.budget && (
        <p
          className={
            totals.projected > list.budget
              ? "text-destructive text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          Tope: {formatUSD(list.budget)} · Margen:{" "}
          {formatUSD(list.budget - totals.projected)}
        </p>
      )}
      {totals.discrepancies.length > 0 && (
        <p className="text-sm text-amber-500">
          Hay movimientos corregidos cuyo monto difiere del desglose. El total
          pagado usa el movimiento.
        </p>
      )}
      {canEdit && list.status === "completed" && (
        <ListAction
          kind="reopen"
          listId={list.id}
          label="Reabrir y agregar artículos"
        />
      )}
      {editable && (
        <div className="bg-card rounded-2xl border p-4">
          <GroupForm listId={list.id} />
        </div>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <section aria-label="Artículos por lugar" className="min-w-0 space-y-4">
          {sections.map((group) => {
            const groupItems = optimistic.filter(
                (i) => i.group_id === group.id,
              ),
              cart = groupItems.filter((i) => shoppingItemStatus(i) === "cart"),
              bought = groupItems.filter(
                (i) => shoppingItemStatus(i) === "purchased",
              ).length,
              groupTotals = shoppingPurchaseTotals(groupItems, [], []);
            return (
              <details
                key={group.id ?? "unassigned"}
                open
                className="bg-card rounded-2xl border p-4"
              >
                <summary className="cursor-pointer font-semibold">
                  {group.name}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    · {bought} de {groupItems.length} comprados · Carrito{" "}
                    {formatUSD(groupTotals.cart)}
                  </span>
                </summary>
                <div className="mt-4 space-y-3">
                  {!groupItems.length && (
                    <p className="text-muted-foreground text-sm">
                      Agrega artículos o asígnalos a este lugar.
                    </p>
                  )}
                  {groupItems.map((item) => {
                    const status = shoppingItemStatus(item),
                      canChange = editable && status !== "purchased";
                    return (
                      <article key={item.id} className="rounded-xl border p-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            aria-label={`En carrito: ${item.name}`}
                            checked={
                              status === "cart" || status === "purchased"
                            }
                            disabled={
                              !canChange || item.resolution !== "pending"
                            }
                            onChange={(e) =>
                              update(item.id, { checked: e.target.checked })
                            }
                            className="accent-primary mt-1 size-5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium break-words">
                              {item.name}
                            </h3>
                            <p className="text-muted-foreground text-xs">
                              {item.quantity} {item.unit || "unidades"} ·{" "}
                              {labels[status]}
                            </p>
                            {item.estimated_price != null && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                Estimado: {formatUSD(item.estimated_price)} c/u
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-muted-foreground mt-1 text-xs break-words">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        {canChange && item.resolution === "pending" && (
                          <label className="mt-3 flex items-center gap-3 text-xs">
                            Precio real c/u
                            <MoneyInput
                              key={`${item.id}-${item.real_price}`}
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={item.real_price ?? ""}
                              wrapperClassName="max-w-36"
                              className={`${fieldClass} tabular-nums`}
                              onBlur={(e) => {
                                const value =
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value);
                                if (value !== item.real_price)
                                  update(item.id, { real_price: value });
                              }}
                            />
                          </label>
                        )}
                        {canChange && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.resolution === "pending" ? (
                              <>
                                <ListAction
                                  kind="resolve"
                                  id={item.id}
                                  listId={list.id}
                                  resolution="available"
                                  label="Ya lo tenemos"
                                />
                                <ListAction
                                  kind="resolve"
                                  id={item.id}
                                  listId={list.id}
                                  resolution="discarded"
                                  label="No comprar"
                                />
                              </>
                            ) : (
                              <ListAction
                                kind="resolve"
                                id={item.id}
                                listId={list.id}
                                resolution="pending"
                                label="Volver a pendientes"
                              />
                            )}
                          </div>
                        )}
                        {canChange && (
                          <details className="mt-3 border-t pt-2">
                            <summary className="cursor-pointer text-sm">
                              Editar artículo y lugar
                            </summary>
                            <div className="mt-3">
                              <ItemForm
                                listId={list.id}
                                item={item}
                                groups={groups}
                                suggestions={suggestions}
                              />
                              <DeleteItemForm item={item} />
                            </div>
                          </details>
                        )}
                      </article>
                    );
                  })}
                  {editable && canClose && options && cart.length > 0 && (
                    <PurchaseDialog
                      disabled={pending}
                      listId={list.id}
                      groupId={group.id}
                      name={group.name}
                      items={cart}
                      today={today}
                      options={options}
                    />
                  )}
                  {editable && group.id && !group.is_archived && (
                    <div>
                      <details className="mb-3">
                        <summary className="cursor-pointer text-xs">
                          Cambiar nombre del lugar
                        </summary>
                        <GroupForm
                          listId={list.id}
                          group={{ id: group.id, name: group.name }}
                        />
                      </details>
                      <ListAction
                        kind="archive"
                        id={group.id}
                        listId={list.id}
                        label="Archivar lugar · mover pendientes"
                      />
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </section>
        <aside className="min-w-0 space-y-4">
          {editable && (
            <section className="bg-card rounded-2xl border p-5">
              <h2 className="mb-4 font-semibold">Agregar artículo</h2>
              <ItemForm
                listId={list.id}
                groups={groups}
                suggestions={suggestions}
                position={Math.max(0, ...items.map((i) => i.sort_order)) + 1}
              />
            </section>
          )}
          {!canClose && editable && (
            <p className="text-muted-foreground text-sm">
              Para registrar una compra necesitas permiso de Movimientos.
            </p>
          )}
          <PurchaseHistory
            purchases={purchases}
            transactions={purchaseTransactions}
            canViewTransaction={canViewTransaction}
          />
        </aside>
      </div>
    </div>
  );
}
