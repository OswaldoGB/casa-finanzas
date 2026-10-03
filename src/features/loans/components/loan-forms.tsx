"use client";
import { useActionState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { FormState } from "@/features/auth/schemas";
import { createLoan, repayLoan, updateLoan, writeOffLoan } from "../actions";
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
  accountLabel = "Cuenta",
}: {
  prefix: string;
  today: string;
  accounts: { id: string; name: string; type?: string }[];
  max?: number;
  accountLabel?: string;
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
        {accountLabel}
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
              {a.type === "credit_card" ? " · Tarjeta de crédito" : ""}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
export function CreateLoanForm({
  today,
  sourceAccounts,
}: {
  today: string;
  sourceAccounts: { id: string; name: string; type: string }[];
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
      <MoneyDateAccount
        prefix="new-loan"
        today={today}
        accounts={sourceAccounts}
        accountLabel="Cuenta o tarjeta desde la que prestaste"
      />
      <label className="grid gap-1.5 text-sm" htmlFor="loan-effect">
        ¿Cómo debe afectar el saldo?
        <select
          id="loan-effect"
          name="balance_effect"
          defaultValue="record_now"
          className={field}
        >
          <option value="record_now">Registrar la salida ahora</option>
          <option value="already_recorded">
            Ya estaba incluido en el saldo actual
          </option>
        </select>
      </label>
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
        Si ya estaba incluido, se conserva como préstamo por cobrar sin volver a
        cambiar el saldo. Una tarjeta puede ser el origen y aumenta su deuda
        cuando registras la salida ahora.
      </p>
      <Feedback state={state} />
      <button className={button} disabled={pending || !sourceAccounts.length}>
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
        accountLabel="Cuenta donde recibiste el dinero"
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
export function EditLoanForm({
  loan,
  accounts,
}: {
  loan: Loan;
  accounts: { id: string; name: string; type: string }[];
}) {
  const [state, action, pending] = useActionState(updateLoan, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={loan.id} />
      <label
        className="grid gap-1.5 text-sm"
        htmlFor={`edit-${loan.id}-debtor`}
      >
        Persona a quien prestas
        <input
          id={`edit-${loan.id}-debtor`}
          name="debtor"
          defaultValue={loan.debtor}
          maxLength={100}
          required
          className={field}
        />
      </label>
      <label
        className="grid gap-1.5 text-sm"
        htmlFor={`edit-${loan.id}-amount`}
      >
        Monto prestado (USD)
        <input
          id={`edit-${loan.id}-amount`}
          name="amount"
          type="number"
          min={loan.recovered || 0.01}
          step="0.01"
          inputMode="decimal"
          defaultValue={loan.amount}
          required
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`edit-${loan.id}-date`}>
        Fecha del préstamo
        <input
          id={`edit-${loan.id}-date`}
          name="date"
          type="date"
          defaultValue={loan.date}
          required
          className={field}
        />
      </label>
      <label
        className="grid gap-1.5 text-sm"
        htmlFor={`edit-${loan.id}-expected`}
      >
        Fecha esperada de pago (opcional)
        <input
          id={`edit-${loan.id}-expected`}
          name="expected_payment_date"
          type="date"
          defaultValue={loan.expected_payment_date ?? ""}
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        Cuenta o tarjeta de origen
        <select
          name="account_id"
          required
          defaultValue={loan.source_account_id ?? ""}
          className={field}
        >
          <option value="" disabled>
            Selecciona una cuenta
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
              {account.type === "credit_card" ? " · Tarjeta de crédito" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        Estado del saldo al prestar
        <select
          name="balance_effect"
          defaultValue={
            loan.already_recorded ? "already_recorded" : "record_now"
          }
          className={field}
        >
          <option value="record_now">La salida debe afectar el saldo</option>
          <option value="already_recorded">
            La salida ya estaba incluida en el saldo
          </option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`edit-${loan.id}-notes`}>
        Notas
        <textarea
          id={`edit-${loan.id}-notes`}
          name="notes"
          defaultValue={loan.notes ?? ""}
          maxLength={2000}
          className={`${field} h-20 py-2`}
        />
      </label>
      <p className="text-muted-foreground text-xs">
        Los abonos registrados se conservan. El monto no puede ser menor que lo
        ya recuperado ({loan.recovered.toFixed(2)} USD).
      </p>
      <Feedback state={state} />
      <button className={button} disabled={pending || !accounts.length}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
export function WriteOffLoanForm({ loan }: { loan: Loan }) {
  const [state, action, pending] = useActionState(writeOffLoan, undefined);
  return (
    <form
      id={`write-off-loan-${loan.id}`}
      action={action}
      className="mt-4 space-y-2"
    >
      <input type="hidden" name="id" value={loan.id} />
      <ConfirmDialog
        title={`¿Cerrar el préstamo a ${loan.debtor} como incobrable?`}
        description="Lo pendiente dejará de sumar al patrimonio y no se creará un gasto."
        confirmLabel="Cerrar préstamo"
        trigger={
          <button
            type="button"
            disabled={pending}
            className="text-destructive min-h-11 text-sm underline"
          >
            {pending ? "Cerrando…" : "Cerrar como incobrable"}
          </button>
        }
        actionProps={{
          type: "submit",
          form: `write-off-loan-${loan.id}`,
          disabled: pending,
        }}
      />
      <Feedback state={state} />
    </form>
  );
}
