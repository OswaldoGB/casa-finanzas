"use client";
import { useActionState, useState } from "react";
import type { FormState } from "../../auth/schemas";
import type { CardStatementSummary } from "../card-settlement";
import { saveCardStatement } from "../card-actions";
const input =
  "border-input bg-background h-11 w-full rounded-lg border px-3 text-sm";
export function CardStatementForm({
  cardId,
  closesOn,
  appTotal,
  requestId,
  today,
  existing,
  onSuccess,
}: {
  cardId: string;
  closesOn: string;
  appTotal: number;
  requestId: string;
  today: string;
  existing?: CardStatementSummary;
  onSuccess?: (message: string) => void;
}) {
  const [close, setClose] = useState(existing?.closesOn ?? closesOn);
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await saveCardStatement(previous, data);
      if (result?.ok) onSuccess?.(result.ok);
      return result;
    },
    undefined,
  );
  const error =
    state?.error ??
    Object.values(state?.fieldErrors ?? {})
      .flat()
      .join(". ");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="request_id" value={requestId} />
      <p className="bg-muted rounded-lg p-3 text-sm sm:col-span-2">
        App al corte {closesOn}: <strong>${appTotal.toFixed(2)}</strong>.
        {close !== closesOn &&
          " El importe de ese otro corte se calculará al guardar."}{" "}
        El monto del banco ya incluye las cuotas. No las sumes otra vez.
      </p>
      <label className="grid gap-1 text-sm sm:col-span-2">
        Fecha de corte
        <input
          name="closes_on"
          type="date"
          required
          max={today}
          value={close}
          onChange={(event) => setClose(event.target.value)}
          readOnly={Boolean(existing)}
          className={input}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Pago de contado según el banco
        <input
          required
          name="bank_cash_due"
          type="number"
          min="0"
          step="0.01"
          className={input}
          defaultValue={existing?.bankDue}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Fecha límite de pago
        <input
          required
          name="due_on"
          type="date"
          min={close}
          defaultValue={existing?.dueOn}
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
          defaultValue={existing?.note}
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
