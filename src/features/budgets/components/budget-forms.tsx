"use client";

import { useActionState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { copyPreviousBudgets, deleteBudget, saveBudget } from "../actions";
import type { BudgetSummary } from "../schemas";
import type { FormState } from "@/features/auth/schemas";

function Feedback({ state }: { state: FormState }) {
  return (
    <>
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
    </>
  );
}

const fieldClass =
  "border-input bg-background h-11 w-full rounded-lg border px-3 text-sm";
const buttonClass =
  "bg-primary text-primary-foreground focus-visible:ring-ring h-11 rounded-lg px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50";

export function BudgetForm({
  month,
  categories,
  budget,
}: {
  month: string;
  categories: { id: string; name: string; parent_id: string | null }[];
  budget?: BudgetSummary;
}) {
  const [state, action, pending] = useActionState(saveBudget, undefined);
  const prefix = budget?.id ?? "new-budget";
  const error = (name: string) => state?.fieldErrors?.[name]?.[0];
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="month" value={month} />
      {budget && (
        <>
          <input type="hidden" name="id" value={budget.id} />
          <input type="hidden" name="category_id" value={budget.category_id} />
        </>
      )}
      {!budget && (
        <div className="space-y-1.5">
          <label htmlFor={`${prefix}-category`} className="text-sm font-medium">
            Categoría
          </label>
          <select
            id={`${prefix}-category`}
            name="category_id"
            className={fieldClass}
            defaultValue=""
            required
            aria-invalid={Boolean(error("category_id"))}
          >
            <option value="" disabled>
              Elige una categoría
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parent_id ? "↳ " : ""}
                {category.name}
              </option>
            ))}
          </select>
          {error("category_id") && (
            <p className="text-destructive text-xs">{error("category_id")}</p>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor={`${prefix}-amount`} className="text-sm font-medium">
          Presupuesto base (USD)
        </label>
        <input
          id={`${prefix}-amount`}
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          max="999999999999.99"
          required
          defaultValue={budget?.amount ?? ""}
          className={`${fieldClass} tabular-nums`}
          aria-invalid={Boolean(error("amount"))}
        />
        {error("amount") && (
          <p className="text-destructive text-xs">{error("amount")}</p>
        )}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          name="carry_over"
          type="checkbox"
          defaultChecked={budget?.carry_over ?? false}
          className="accent-primary mt-1 size-4"
        />
        <span>
          Arrastrar el sobrante del mes anterior
          <span className="text-muted-foreground mt-1 block text-xs">
            Solo se suma lo que quedó sin gastar; un exceso no se arrastra.
          </span>
        </span>
      </label>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending || (!budget && !categories.length)}
        className={buttonClass}
      >
        {pending
          ? "Guardando…"
          : budget
            ? "Guardar cambios"
            : "Crear presupuesto"}
      </button>
    </form>
  );
}

export function CopyBudgetForm({ month }: { month: string }) {
  const [state, action, pending] = useActionState(
    copyPreviousBudgets,
    undefined,
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="month" value={month} />
      <button
        disabled={pending}
        className="bg-background focus-visible:ring-ring h-10 rounded-lg border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
      >
        {pending ? "Copiando…" : "Copiar mes anterior"}
      </button>
      <div className="max-w-xs">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function DeleteBudgetForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(deleteBudget, undefined);
  return (
    <form id={`delete-budget-${id}`} action={action} className="mt-4 space-y-2">
      <input type="hidden" name="id" value={id} />
      <ConfirmDialog
        title={`¿Eliminar el presupuesto de ${name}?`}
        description="Los movimientos se conservan."
        confirmLabel="Eliminar presupuesto"
        trigger={
          <button
            type="button"
            disabled={pending}
            className="text-destructive focus-visible:ring-ring rounded px-1 py-2 text-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            {pending ? "Eliminando…" : "Eliminar presupuesto"}
          </button>
        }
        actionProps={{
          type: "submit",
          form: `delete-budget-${id}`,
          disabled: pending,
        }}
      />
      <Feedback state={state} />
    </form>
  );
}
