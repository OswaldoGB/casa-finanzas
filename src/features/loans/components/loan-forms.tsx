"use client";
import { useActionState } from "react";
import type { FormState } from "@/features/auth/schemas";
import { createLoan, repayLoan, writeOffLoan } from "../actions";
import type { Loan } from "../schemas";
const field =
  "border-input bg-background h-11 w-full rounded-lg border px-3 text-sm";
const button =
  "bg-primary text-primary-foreground h-11 rounded-lg px-4 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring";
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
function MoneyDateAccount({
  prefix,
  today,
  accounts,
  max,
}: {
  prefix: string;
  today: string;
  accounts: { id: string; name: string }[];
  max?: number;
}) {
  return (
    <>
      <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-amount`}>
        Monto (USD)
        <input
          id={`${prefix}-amount`}
          name="amount"
          type="number"
          min="0.01"
          max={max ?? 999999999999.99}
          step="0.01"
          inputMode="decimal"
          required
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-date`}>
        Fecha
        <input
          id={`${prefix}-date`}
          name="date"
          type="date"
          defaultValue={today}
          required
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-account`}>
        Cuenta
        <select
          id={`${prefix}-account`}
          name="account_id"
          defaultValue=""
          required
          className={field}
        >
          <option value="" disabled>
            Selecciona una cuenta
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
export function CreateLoanForm({
  today,
  accounts,
}: {
  today: string;
  accounts: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createLoan, undefined);
  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-sm" htmlFor="loan-debtor">
        Persona a quien prestas
        <input
          id="loan-debtor"
          name="debtor"
          maxLength={100}
          required
          className={field}
        />
      </label>
      <MoneyDateAccount prefix="new-loan" today={today} accounts={accounts} />
      <label className="grid gap-1.5 text-sm" htmlFor="loan-expected">
        Fecha esperada de pago (opcional)
        <input
          id="loan-expected"
          name="expected_payment_date"
          type="date"
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor="loan-notes">
        Notas
        <textarea
          id="loan-notes"
          name="notes"
          maxLength={2000}
          className={`${field} h-20 py-2`}
        />
      </label>
      <p className="text-muted-foreground text-xs">
        El dinero sale de esta cuenta y queda pendiente por cobrar. No cuenta
        como gasto.
      </p>
      <Feedback state={state} />
      <button className={button} disabled={pending || !accounts.length}>
        {pending ? "Registrando…" : "Registrar préstamo"}
      </button>
    </form>
  );
}
export function RepayLoanForm({
  loan,
  today,
  accounts,
}: {
  loan: Loan;
  today: string;
  accounts: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(repayLoan, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={loan.id} />
      <MoneyDateAccount
        prefix={loan.id}
        today={today}
        accounts={accounts}
        max={loan.pending}
      />
      <p className="text-muted-foreground text-xs">
        El abono entra en la cuenta elegida. No cuenta como ingreso.
      </p>
      <Feedback state={state} />
      <button className={button} disabled={pending || !accounts.length}>
        {pending ? "Registrando…" : "Registrar abono"}
      </button>
    </form>
  );
}
export function WriteOffLoanForm({ loan }: { loan: Loan }) {
  const [state, action, pending] = useActionState(writeOffLoan, undefined);
  return (
    <form
      action={action}
      className="mt-4 space-y-2"
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Cerrar el préstamo a ${loan.debtor} como incobrable? Lo pendiente dejará de sumar al patrimonio y no se creará un gasto.`,
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={loan.id} />
      <button
        disabled={pending}
        className="text-destructive min-h-11 text-sm underline"
      >
        {pending ? "Cerrando…" : "Cerrar como incobrable"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
