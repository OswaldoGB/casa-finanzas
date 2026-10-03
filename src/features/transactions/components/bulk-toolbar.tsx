"use client";

import { useActionState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { bulkTransactions } from "../actions";

export function BulkToolbar({
  categories,
}: {
  categories: {
    id: string;
    name: string;
    type: "income" | "expense";
    is_archived: boolean;
  }[];
}) {
  const [state, action, pending] = useActionState(bulkTransactions, undefined);
  return (
    <form
      id="bulk-transactions"
      action={action}
      className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
    >
      <label className="grid gap-1 text-xs">
        Nueva categoría
        <select
          name="category_id"
          className="bg-background h-10 rounded-lg border px-2 text-sm"
        >
          <option value="">Seleccionar categoría</option>
          {categories
            .filter((item) => !item.is_archived)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.type === "expense" ? "Gasto" : "Ingreso"}
              </option>
            ))}
        </select>
      </label>
      <button
        name="mode"
        value="recategorize"
        disabled={pending}
        className="bg-secondary text-secondary-foreground h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Aplicando…" : "Cambiar categoría"}
      </button>
      <ConfirmDialog
        title="¿Borrar los movimientos seleccionados?"
        description="También se borrarán sus comprobantes. Esta acción no se puede deshacer."
        confirmLabel="Borrar seleccionados"
        trigger={
          <button
            type="button"
            disabled={pending}
            className="bg-destructive text-destructive-foreground h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
          >
            Borrar seleccionados
          </button>
        }
        actionProps={{
          type: "submit",
          form: "bulk-transactions",
          name: "mode",
          value: "delete",
          disabled: pending,
        }}
      />
      <p className="text-muted-foreground text-xs sm:col-span-3">
        Marca hasta 100 movimientos. Puedes borrarlos o elegir una categoría y
        cambiarla para ingresos o gastos del mismo tipo.
      </p>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-income text-sm">
          {state.ok}
        </p>
      )}
    </form>
  );
}
