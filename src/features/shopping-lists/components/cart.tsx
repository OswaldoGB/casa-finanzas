"use client";

import { MoneyInput } from "@/components/ui/money-input";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatUSD } from "@/lib/format";
import type { ShoppingItem, ShoppingList } from "../queries";
import { updateCart } from "../actions";
import { shoppingTotals } from "../schemas";
import { CloseListForm, DeleteItemForm, ItemForm, fieldClass } from "./forms";

export function ShoppingCart({
  list,
  items,
  canEdit,
  canClose,
  options,
  suggestions,
}: {
  list: ShoppingList;
  items: ShoppingItem[];
  canEdit: boolean;
  canClose: boolean;
  options: {
    accounts: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    methods: { id: string; name: string }[];
  } | null;
  suggestions: { name: string; price: number | null }[];
}) {
  const router = useRouter();
  const [optimistic, optimisticUpdate] = useOptimistic(
    items,
    (
      current,
      update: { id: string; checked?: boolean; real_price?: number | null },
    ) =>
      current.map((item) =>
        item.id === update.id ? { ...item, ...update } : item,
      ),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Conectando…");
  const editable = canEdit && list.status === "open";
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`shopping-list-${list.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_list_items",
          filter: `list_id=eq.${list.id}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_lists",
          filter: `id=eq.${list.id}`,
        },
        () => router.refresh(),
      )
      .subscribe((status) =>
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
        router.refresh();
      } catch {
        setError(
          "No se guardó el cambio. Revisa tu conexión e intenta otra vez.",
        );
        router.refresh();
      }
    });
  }
  const totals = shoppingTotals(optimistic);
  const budgetPercent =
    list.budget && list.budget > 0 ? (totals.projected / list.budget) * 100 : 0;
  const missing = totals.missingCart + totals.missingRemaining;
  const checkedCount = optimistic.filter((item) => item.checked).length;
  return (
    <div className="space-y-5 pb-44 sm:pb-36">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs" role="status">
          {pending ? "Guardando cambios…" : connection}
        </p>
        <button
          onClick={() => router.refresh()}
          className="text-primary rounded px-2 py-1 text-xs underline underline-offset-4"
        >
          Actualizar
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="text-destructive rounded-xl border p-3 text-sm"
        >
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-label="Artículos de la lista" className="space-y-3">
          {optimistic.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed p-8 text-center">
              <h2 className="font-medium">Tu lista está vacía</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Agrega artículos con o sin precio y completa el precio real al
                comprar.
              </p>
            </div>
          ) : (
            optimistic.map((item) => (
              <article
                key={item.id}
                className={`bg-card rounded-2xl border p-4 ${item.checked ? "border-primary/40" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    aria-label={`En carrito: ${item.name}`}
                    type="checkbox"
                    checked={item.checked}
                    disabled={!editable}
                    onChange={(event) =>
                      update(item.id, { checked: event.target.checked })
                    }
                    className="accent-primary mt-1 size-5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-medium">{item.name}</h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.quantity} {item.unit ?? "unidades"}
                      {item.estimated_price != null &&
                        ` · Estimado ${formatUSD(item.estimated_price)} c/u`}
                    </p>
                    {item.notes && (
                      <p className="text-muted-foreground mt-2 text-xs break-words">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-sm tabular-nums">
                    {item.real_price != null
                      ? formatUSD(item.real_price * item.quantity)
                      : item.checked
                        ? "Sin precio"
                        : ""}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label
                    htmlFor={`price-${item.id}`}
                    className="text-muted-foreground shrink-0 text-xs"
                  >
                    Precio real c/u
                  </label>
                  <MoneyInput
                    key={`${item.id}-${item.real_price ?? "empty"}`}
                    id={`price-${item.id}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="999999999999.99"
                    step="0.01"
                    defaultValue={item.real_price ?? ""}
                    disabled={!editable}
                    placeholder="0.00"
                    className={`${fieldClass} max-w-36 tabular-nums`}
                    wrapperClassName="max-w-36"
                    onBlur={(event) => {
                      const text = event.target.value;
                      const value = text === "" ? null : Number(text);
                      if (value !== item.real_price)
                        update(item.id, { real_price: value });
                    }}
                  />
                </div>
                {editable && (
                  <details className="mt-3 border-t pt-3">
                    <summary className="focus-visible:ring-ring cursor-pointer rounded text-sm focus-visible:ring-2">
                      Editar cantidad, precio y notas
                    </summary>
                    <div className="mt-4">
                      <ItemForm
                        listId={list.id}
                        item={item}
                        suggestions={suggestions}
                      />
                      <DeleteItemForm item={item} />
                    </div>
                  </details>
                )}
              </article>
            ))
          )}
        </section>
        {editable && (
          <aside className="space-y-5">
            <section className="bg-card rounded-2xl border p-5">
              <h2 className="mb-4 font-medium">Agregar artículo</h2>
              <ItemForm
                listId={list.id}
                suggestions={suggestions}
                position={
                  Math.max(0, ...items.map((item) => item.sort_order)) + 1
                }
              />
            </section>
            {canClose && options ? (
              <section className="bg-card rounded-2xl border p-5">
                <h2 className="mb-4 font-medium">Cerrar compra</h2>
                {totals.missingCart > 0 && (
                  <p className="text-destructive mb-4 text-sm">
                    Completa {totals.missingCart} precios reales del carrito
                    para cerrar.
                  </p>
                )}
                <CloseListForm
                  id={list.id}
                  options={options}
                  disabled={
                    totals.missingCart > 0 ||
                    checkedCount === 0 ||
                    totals.cart <= 0 ||
                    pending
                  }
                />
              </section>
            ) : (
              <p className="text-muted-foreground text-sm">
                Para cerrar la compra necesitas permiso para crear movimientos.
              </p>
            )}
          </aside>
        )}
      </div>
      <section
        aria-label="Totales de compra"
        className="bg-background/95 fixed inset-x-0 bottom-16 z-20 border-t px-4 py-3 shadow-sm backdrop-blur md:bottom-0 md:left-64"
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted-foreground text-[11px]">En carrito</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatUSD(totals.cart)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">
                Estimado restante
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatUSD(totals.estimated)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">
                Total proyectado
              </p>
              <p
                className={`mt-1 text-lg font-semibold tabular-nums ${budgetPercent >= 100 ? "text-destructive" : ""}`}
              >
                {formatUSD(totals.projected)}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
            <p
              className={
                missing
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }
            >
              {missing
                ? `${missing} sin precio · total incompleto`
                : "Impuestos incluidos"}
            </p>
            {list.budget != null && (
              <p className="text-muted-foreground tabular-nums">
                Tope {formatUSD(list.budget)}
                {budgetPercent >= 100
                  ? " · Tope alcanzado"
                  : budgetPercent >= 90
                    ? " · Cerca del tope"
                    : ""}
              </p>
            )}
          </div>
          {list.budget != null && list.budget > 0 && (
            <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
              <div
                className={`h-full ${budgetPercent >= 100 ? "bg-destructive" : budgetPercent >= 90 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, budgetPercent)}%` }}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
