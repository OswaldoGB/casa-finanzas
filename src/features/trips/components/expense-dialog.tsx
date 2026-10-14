"use client";
import { useState } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import { formatUSD } from "@/lib/format";
import { recordTripExpense, linkCostTransaction } from "../actions";
import { tripCostBreakdown } from "../totals";
import type { TripSnapshot } from "../schemas";
import { ActionDialog } from "./action-dialog";
type Props = {
  snapshot: TripSnapshot;
  line: TripSnapshot["costLines"][number];
};
export function ExpenseDialog({ snapshot, line }: Props) {
  return (
    <ActionDialog
      title={`Registrar pago · ${line.name}`}
      description="El pago crea un único movimiento y queda vinculado a este concepto del viaje."
      action={recordTripExpense}
      trigger={
        <button
          type="button"
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm"
        >
          Registrar pago
        </button>
      }
    >
      <ExpenseFields snapshot={snapshot} line={line} />
    </ActionDialog>
  );
}
function ExpenseFields({ snapshot, line }: Props) {
  const [key] = useState(() => crypto.randomUUID());
  const totals = tripCostBreakdown(
    line,
    snapshot.costTransactions,
    snapshot.transactions,
  );
  return (
    <>
      <input type="hidden" name="line_id" value={line.id} />
      <input type="hidden" name="request_key" value={key} />
      <label className="grid gap-1 text-sm">
        Monto del pago (USD)
        <MoneyInput
          name="amount"
          min="0.01"
          step="0.01"
          defaultValue={totals.pending || ""}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Cuenta o tarjeta
        <FormSelect
          name="account_id"
          placeholder="Seleccionar cuenta"
          options={snapshot.options.accounts.map((a) => ({
            value: a.id,
            label: a.name,
          }))}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Categoría de gasto
        <FormSelect
          name="category_id"
          defaultValue={line.category_id ?? ""}
          placeholder="Seleccionar categoría"
          options={snapshot.options.categories.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Método de pago
        <FormSelect
          name="payment_method_id"
          placeholder="Sin especificar"
          options={snapshot.options.methods.map((m) => ({
            value: m.id,
            label: m.name,
          }))}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Fecha
        <input
          type="date"
          name="date"
          defaultValue={snapshot.today}
          className={fieldClass}
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="is_settled"
          defaultChecked
          className="accent-primary mt-1"
        />
        Este pago completa el concepto.
      </label>
      <p className="text-muted-foreground text-xs">
        Si es un anticipo, desmarca la opción. El restante será una estimación
        hasta registrar los siguientes pagos.
      </p>
    </>
  );
}
export function ExistingExpenseDialog({ snapshot, line }: Props) {
  const used = new Set([
    ...snapshot.costTransactions.map((c) => c.transaction_id),
    ...snapshot.purchases.map((p) => p.transaction_id),
  ]);
  const choices = snapshot.options.expenses.filter((t) => !used.has(t.id));
  return (
    <ActionDialog
      title="Vincular un gasto existente"
      action={linkCostTransaction}
      trigger={
        <button
          type="button"
          className="text-primary rounded-lg border px-3 py-2 text-sm"
        >
          Ya está en Movimientos
        </button>
      }
    >
      <input type="hidden" name="line_id" value={line.id} />
      <label className="grid gap-1 text-sm">
        Movimiento
        <FormSelect
          name="transaction_id"
          placeholder="Seleccionar gasto"
          options={choices.map((t) => ({
            value: t.id,
            label: `${t.date} · ${formatUSD(t.amount)} · ${t.description || "Gasto"}`,
          }))}
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="is_settled"
          defaultChecked
          className="accent-primary mt-1"
        />
        Este gasto completa el concepto.
      </label>
      <p className="text-muted-foreground text-xs">
        No crea otro gasto ni cambia tu saldo. Solo se vincula al viaje y al
        concepto.
      </p>
    </ActionDialog>
  );
}
