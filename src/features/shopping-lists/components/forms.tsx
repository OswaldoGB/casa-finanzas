"use client";

import { MoneyInput } from "@/components/ui/money-input";

import { useActionState, useEffect, useRef } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  archiveList,
  closeList,
  deleteItem,
  duplicateList,
  saveItem,
  saveList,
} from "../actions";
import type { ShoppingItem, ShoppingList } from "../queries";
import type { FormState } from "@/features/auth/schemas";

export const fieldClass =
  "border-input bg-background h-11 w-full rounded-lg border px-3 text-sm";
export const buttonClass =
  "bg-primary text-primary-foreground focus-visible:ring-ring min-h-11 rounded-lg px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50";
export function Feedback({ state }: { state: FormState }) {
  return (
    <>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.fieldErrors && (
        <p role="alert" className="text-destructive text-sm">
          {Object.values(state.fieldErrors).flat().filter(Boolean).join(". ")}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-income text-sm">
          {state.ok}
        </p>
      )}
    </>
  );
}
export function ListForm({ list }: { list?: ShoppingList }) {
  const [state, action, pending] = useActionState(saveList, undefined);
  return (
    <form action={action} className="grid gap-4">
      {list && <input type="hidden" name="id" value={list.id} />}
      <label className="grid gap-1.5 text-sm font-medium">
        Nombre
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={list?.name}
          placeholder="Súper semanal"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Tienda (opcional)
        <input
          name="store"
          maxLength={100}
          defaultValue={list?.store ?? ""}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Tope de compra (USD, opcional)
        <MoneyInput
          name="budget"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          defaultValue={list?.budget ?? ""}
          className={fieldClass}
        />
      </label>
      <Feedback state={state} />
      <button className={buttonClass} disabled={pending}>
        {pending ? "Guardando…" : list ? "Guardar cambios" : "Crear lista"}
      </button>
    </form>
  );
}
export function ItemForm({
  listId,
  item,
  suggestions,
  position = 0,
}: {
  listId: string;
  item?: ShoppingItem;
  suggestions: { name: string; price: number | null }[];
  position?: number;
}) {
  const [state, action, pending] = useActionState(saveItem, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const datalistId = `suggestions-${item?.id ?? listId}`;
  return (
    <form ref={formRef} action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="list_id" value={listId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="grid gap-1.5 text-sm font-medium">
        Artículo
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={item?.name}
          list={datalistId}
          placeholder="Ej. Leche"
          className={fieldClass}
          onChange={(event) => {
            if (item) return;
            const match = suggestions.find(
              (suggestion) =>
                suggestion.name.toLocaleLowerCase("es") ===
                event.target.value.trim().toLocaleLowerCase("es"),
            );
            const price =
              formRef.current?.elements.namedItem("estimated_price");
            if (match?.price != null && price instanceof HTMLInputElement)
              price.value = String(match.price);
          }}
        />
        <datalist id={datalistId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion.name} value={suggestion.name}>
              {suggestion.price == null
                ? ""
                : `Último precio: $${suggestion.price.toFixed(2)}`}
            </option>
          ))}
        </datalist>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Cantidad
          <input
            name="quantity"
            required
            type="number"
            inputMode="decimal"
            min="0.001"
            max="9999999.999"
            step="0.001"
            defaultValue={item?.quantity ?? 1}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Unidad
          <input
            name="unit"
            maxLength={30}
            defaultValue={item?.unit ?? ""}
            placeholder="kg, paquete…"
            className={fieldClass}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Precio estimado
          <MoneyInput
            name="estimated_price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            defaultValue={item?.estimated_price ?? ""}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Precio real
          <MoneyInput
            name="real_price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            defaultValue={item?.real_price ?? ""}
            className={fieldClass}
          />
        </label>
      </div>
      <p className="text-muted-foreground text-xs">
        Precio por unidad, con impuesto incluido.
      </p>
      <label className="grid gap-1.5 text-sm font-medium">
        Notas
        <input
          name="notes"
          maxLength={1000}
          defaultValue={item?.notes ?? ""}
          className={fieldClass}
        />
      </label>
      {item ? (
        <label className="grid gap-1.5 text-sm font-medium">
          Orden
          <input
            name="sort_order"
            type="number"
            min="0"
            max="1000000"
            step="1"
            defaultValue={item.sort_order}
            className={fieldClass}
          />
        </label>
      ) : (
        <input type="hidden" name="sort_order" value={position} />
      )}
      <Feedback state={state} />
      <button disabled={pending} className={buttonClass}>
        {pending
          ? "Guardando…"
          : item
            ? "Guardar artículo"
            : "Agregar artículo"}
      </button>
    </form>
  );
}
export function ListOperation({
  list,
  kind,
}: {
  list: ShoppingList;
  kind: "duplicate" | "archive";
}) {
  const [state, action, pending] = useActionState(
    kind === "duplicate" ? duplicateList : archiveList,
    undefined,
  );
  return (
    <form id={`${kind}-list-${list.id}`} action={action} className="space-y-2">
      <input type="hidden" name="id" value={list.id} />
      {kind === "archive" ? (
        <ConfirmDialog
          title="¿Archivar esta lista?"
          description="La lista se conservará para consulta y podrá revisarse más adelante."
          confirmLabel="Archivar lista"
          trigger={
            <button
              type="button"
              disabled={pending}
              className="focus-visible:ring-ring min-h-10 rounded-lg border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              {pending ? "Procesando…" : "Archivar"}
            </button>
          }
          actionProps={{
            type: "submit",
            form: `archive-list-${list.id}`,
            disabled: pending,
          }}
        />
      ) : (
        <button
          disabled={pending}
          className="focus-visible:ring-ring min-h-10 rounded-lg border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          {pending ? "Procesando…" : "Duplicar lista"}
        </button>
      )}
      <Feedback state={state} />
    </form>
  );
}
export function DeleteItemForm({ item }: { item: ShoppingItem }) {
  const [state, action, pending] = useActionState(deleteItem, undefined);
  return (
    <form
      id={`delete-list-item-${item.id}`}
      action={action}
      className="mt-3 space-y-2"
    >
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="list_id" value={item.list_id} />
      <ConfirmDialog
        title={`¿Eliminar ${item.name} de la lista?`}
        description="El artículo se quitará de esta lista de compra."
        confirmLabel="Eliminar artículo"
        trigger={
          <button
            type="button"
            disabled={pending}
            className="text-destructive rounded py-2 text-sm underline underline-offset-4"
          >
            Eliminar artículo
          </button>
        }
        actionProps={{
          type: "submit",
          form: `delete-list-item-${item.id}`,
          disabled: pending,
        }}
      />
      <Feedback state={state} />
    </form>
  );
}
export function CloseListForm({
  id,
  options,
  disabled,
}: {
  id: string;
  options: {
    accounts: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    methods: { id: string; name: string }[];
  };
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(closeList, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("transaction-quick-defaults") ?? "{}",
      ) as Record<string, string>;
      for (const name of ["account_id", "category_id", "payment_method_id"]) {
        const select = formRef.current?.elements.namedItem(name);
        if (
          select instanceof HTMLSelectElement &&
          [...select.options].some((option) => option.value === saved[name])
        )
          select.value = saved[name];
      }
    } catch {}
  }, []);
  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => {
        try {
          const data = new FormData(event.currentTarget);
          localStorage.setItem(
            "transaction-quick-defaults",
            JSON.stringify(
              Object.fromEntries(
                ["account_id", "category_id", "payment_method_id"].map(
                  (name) => [name, String(data.get(name) ?? "")],
                ),
              ),
            ),
          );
        } catch {}
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="id" value={id} />
      {[
        ["account_id", "Cuenta", options.accounts],
        ["category_id", "Categoría", options.categories],
        ["payment_method_id", "Método de pago (opcional)", options.methods],
      ].map(([name, label, choices]) => (
        <label key={String(name)} className="grid gap-1.5 text-sm font-medium">
          {String(label)}
          <select
            name={String(name)}
            required={name !== "payment_method_id"}
            defaultValue=""
            className={fieldClass}
          >
            <option value="">Seleccionar</option>
            {(choices as { id: string; name: string }[]).map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="carry_unchecked"
          className="accent-primary mt-1 size-4"
        />
        <span>Pasar artículos fuera del carrito a una nueva lista</span>
      </label>
      <p className="text-muted-foreground text-xs">
        Se registra un gasto por el total real del carrito y la compra queda
        cerrada. Puedes adjuntar el recibo desde el movimiento.
      </p>
      <Feedback state={state} />
      <button disabled={disabled || pending} className={buttonClass}>
        {pending ? "Registrando…" : "Cerrar compra y registrar gasto"}
      </button>
    </form>
  );
}
