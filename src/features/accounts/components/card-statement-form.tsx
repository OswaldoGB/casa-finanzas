"use client";
import { useActionState } from "react";
import { saveCardStatement } from "../card-actions";
const input =
  "border-input bg-background h-11 w-full rounded-lg border px-3 text-sm";
export function CardStatementForm({
  cardId,
  closesOn,
  appTotal,
  requestId,
}: {
  cardId: string;
  closesOn: string;
  appTotal: number;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(saveCardStatement, undefined);
  const error =
    state?.error ??
    Object.values(state?.fieldErrors ?? {})
      .flat()
      .join(". ");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="closes_on" value={closesOn} />
      <input type="hidden" name="request_id" value={requestId} />
      <p className="bg-muted rounded-lg p-3 text-sm sm:col-span-2">
        Calculado por la app: <strong>${appTotal.toFixed(2)}</strong>
      </p>
      <label className="grid gap-1 text-sm">
        Pago de contado según el banco
        <input
          required
          name="bank_cash_due"
          type="number"
          min="0.01"
          step="0.01"
          className={input}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Fecha límite de pago
        <input
          required
          name="due_on"
          type="date"
          min={closesOn}
          className={input}
        />
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        Nota opcional
        <textarea
          name="note"
          maxLength={500}
          className="border-input bg-background min-h-20 rounded-lg border p-3 text-sm"
          placeholder="Ej. Compra pendiente de procesamiento"
        />
      </label>
      {error && (
        <p className="text-destructive text-sm sm:col-span-2">{error}</p>
      )}
      {state?.ok && (
        <p className="text-income text-sm sm:col-span-2">{state.ok}</p>
      )}
      <button
        disabled={pending}
        className="bg-primary text-primary-foreground h-11 rounded-lg px-4 text-sm font-medium sm:col-span-2"
      >
        {pending ? "Guardando…" : "Guardar estado del banco"}
      </button>
    </form>
  );
}
