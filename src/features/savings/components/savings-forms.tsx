"use client";
import { useActionState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { FormState } from "@/features/auth/schemas";
import { saveGoal, operateGoal, deleteGoal } from "../actions";
import type { SavingsGoal } from "../schemas";
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
export function GoalForm({
  goal,
  accounts,
}: {
  goal?: SavingsGoal;
  accounts: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveGoal, undefined);
  const prefix = goal?.id ?? "new-goal";
  const choices =
    goal?.account_id && !accounts.some((a) => a.id === goal.account_id)
      ? [
          ...accounts,
          { id: goal.account_id, name: "Cuenta vinculada archivada" },
        ]
      : accounts;
  return (
    <form action={action} className="grid gap-3">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-name`}>
        Nombre
        <input
          id={`${prefix}-name`}
          name="name"
          defaultValue={goal?.name}
          required
          maxLength={100}
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-type`}>
        Tipo
        <select
          id={`${prefix}-type`}
          name="type"
          defaultValue={goal?.type ?? "goal"}
          className={field}
        >
          <option value="goal">Meta de ahorro</option>
          <option value="provision">Provisión para un gasto futuro</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-target`}>
        Objetivo (USD)
        <input
          id={`${prefix}-target`}
          name="target_amount"
          type="number"
          min="0.01"
          max="999999999999.99"
          step="0.01"
          inputMode="decimal"
          required
          defaultValue={goal?.target_amount}
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-date`}>
        Fecha objetivo (opcional)
        <input
          id={`${prefix}-date`}
          name="target_date"
          type="date"
          defaultValue={goal?.target_date ?? ""}
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-account`}>
        Dónde apartas el dinero
        <select
          id={`${prefix}-account`}
          name="account_id"
          defaultValue={goal?.account_id ?? ""}
          className={field}
        >
          <option value="">Apartado virtual</option>
          {choices.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-muted-foreground text-xs">
        La cuenta y el tipo quedan fijos al registrar movimientos. Un apartado
        virtual no mueve dinero entre cuentas.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-color`}>
          Color
          <input
            id={`${prefix}-color`}
            name="color"
            type="color"
            defaultValue={goal?.color ?? "#10b981"}
            className={field}
          />
        </label>
        <label className="grid gap-1.5 text-sm" htmlFor={`${prefix}-icon`}>
          Ícono
          <select
            id={`${prefix}-icon`}
            name="icon"
            defaultValue={goal?.icon ?? "piggy-bank"}
            className={field}
          >
            <option value="piggy-bank">Ahorro</option>
            <option value="plane">Viaje</option>
            <option value="car">Carro</option>
            <option value="shield">Reserva</option>
            <option value="house">Hogar</option>
          </select>
        </label>
      </div>
      <Feedback state={state} />
      <button className={button} disabled={pending}>
        {pending
          ? "Guardando…"
          : goal
            ? "Guardar cambios"
            : "Crear meta o provisión"}
      </button>
    </form>
  );
}
export function GoalOperationForm({
  goal,
  today,
  accounts,
}: {
  goal: SavingsGoal;
  today: string;
  accounts: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(operateGoal, undefined);
  const choices = accounts.filter((a) => a.id !== goal.account_id);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={goal.id} />
      <label className="grid gap-1.5 text-sm" htmlFor={`${goal.id}-operation`}>
        Operación
        <select id={`${goal.id}-operation`} name="type" className={field}>
          <option value="goal_contribution">Aportar</option>
          <option value="goal_withdrawal">Retirar</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${goal.id}-amount`}>
        Monto (USD)
        <input
          id={`${goal.id}-amount`}
          name="amount"
          type="number"
          min="0.01"
          max="999999999999.99"
          step="0.01"
          inputMode="decimal"
          required
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm" htmlFor={`${goal.id}-opdate`}>
        Fecha
        <input
          id={`${goal.id}-opdate`}
          name="date"
          type="date"
          defaultValue={today}
          required
          className={field}
        />
      </label>
      {goal.account_id ? (
        <label
          className="grid gap-1.5 text-sm"
          htmlFor={`${goal.id}-counterparty`}
        >
          Otra cuenta (origen al aportar / destino al retirar)
          <select
            id={`${goal.id}-counterparty`}
            name="counterparty_account_id"
            defaultValue=""
            required
            className={field}
          >
            <option value="" disabled>
              Elige otra cuenta
            </option>
            {choices.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="counterparty_account_id" value="" />
      )}
      <p className="text-muted-foreground text-xs">
        {goal.account_id
          ? "Se registra una transferencia. El retiro no puede superar lo aportado."
          : "Se actualiza el apartado virtual sin cambiar los saldos de cuentas."}
      </p>
      <Feedback state={state} />
      <button
        className={button}
        disabled={pending || Boolean(goal.account_id && !choices.length)}
      >
        {pending ? "Registrando…" : "Registrar operación"}
      </button>
    </form>
  );
}
export function DeleteGoalForm({ goal }: { goal: SavingsGoal }) {
  const [state, action, pending] = useActionState(deleteGoal, undefined);
  return (
    <form
      id={`delete-goal-${goal.id}`}
      action={action}
      className="mt-4 space-y-2"
    >
      <input type="hidden" name="id" value={goal.id} />
      <ConfirmDialog
        title={`¿Eliminar ${goal.name}?`}
        description="Solo se eliminan metas sin movimientos."
        confirmLabel="Eliminar meta"
        trigger={
          <button
            type="button"
            disabled={pending}
            className="text-destructive min-h-11 text-sm underline"
          >
            Eliminar meta sin movimientos
          </button>
        }
        actionProps={{
          type: "submit",
          form: `delete-goal-${goal.id}`,
          disabled: pending,
        }}
      />
      <Feedback state={state} />
    </form>
  );
}
