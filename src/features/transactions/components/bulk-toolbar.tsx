"use client";

import { useActionState } from "react";
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
      className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        if (
          data.get("mode") === "delete" &&
          !window.confirm(
            `¿Borrar ${data.getAll("ids").length} movimientos seleccionados y sus comprobantes?`,
          )
        )
          event.preventDefault();
      }}
    >
      <label className="grid gap-1 text-xs">
        Acción sobre seleccionados
        <select
          name="mode"
          className="bg-background h-10 rounded-lg border px-2 text-sm"
        >
          <option value="recategorize">Cambiar categoría</option>
          <option value="delete">Borrar movimientos</option>
        </select>
      </label>
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
        disabled={pending}
        className="bg-secondary text-secondary-foreground h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Aplicando…" : "Aplicar"}
      </button>
      <p className="text-muted-foreground basis-full text-xs">
        Marca hasta 100 movimientos. Para cambiar categoría, selecciona solo
        ingresos o solo gastos.
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
