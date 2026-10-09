"use client";

import { useActionState } from "react";
import { saveAccount } from "../actions";
import type { Account } from "../queries";
import type { FormState } from "../../auth/schemas";
import { FormSelect } from "@/components/ui/form-select";

const types = [
  ["cash", "Efectivo"],
  ["checking", "Cuenta corriente"],
  ["savings", "Ahorros"],
  ["credit_card", "Tarjeta de crédito"],
  ["investment", "Inversión"],
  ["other", "Otra"],
] as const;
const icons = [
  ["wallet", "Billetera"],
  ["landmark", "Banco"],
  ["piggy-bank", "Ahorros"],
  ["credit-card", "Tarjeta"],
  ["chart-no-axes-combined", "Inversión"],
  ["circle-dollar-sign", "Dinero"],
] as const;

export function AccountForm({
  account,
  onSuccess,
}: {
  account?: Account;
  onSuccess?: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await saveAccount(previous, data);
      if (result?.ok) onSuccess?.(result.ok);
      return result;
    },
    undefined,
  );
  const error = (field: string) => state?.fieldErrors?.[field]?.[0];
  return (
    <form action={action} className="grid gap-5" noValidate>
      {account && <input type="hidden" name="id" value={account.id} />}
      <div className="grid gap-1.5">
        <label htmlFor="account-name" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="account-name"
          name="name"
          maxLength={80}
          required
          defaultValue={account?.name}
          placeholder="Ej. Cuenta principal"
          className="border-input bg-background h-11 rounded-lg border px-3 text-sm"
          aria-invalid={Boolean(error("name"))}
        />
        {error("name") && (
          <p className="text-destructive text-xs">{error("name")}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="account-type" className="text-sm font-medium">
          Tipo
        </label>
        <FormSelect
          id="account-type"
          name="type"
          disabled={Boolean(account)}
          defaultValue={account?.type ?? "checking"}
          placeholder="Tipo de cuenta"
          options={types.map(([value, label]) => ({ value, label }))}
        />
        {error("type") && (
          <p className="text-destructive text-xs">{error("type")}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="account-balance" className="text-sm font-medium">
          Saldo inicial o deuda inicial (USD)
        </label>
        <input
          id="account-balance"
          name="opening_balance"
          type="number"
          inputMode="decimal"
          min="0"
          max="999999999999.99"
          step="0.01"
          required
          defaultValue={account?.opening_balance ?? 0}
          className="border-input bg-background h-11 rounded-lg border px-3 text-sm tabular-nums"
          aria-invalid={Boolean(error("opening_balance"))}
        />
        {error("opening_balance") && (
          <p className="text-destructive text-xs">{error("opening_balance")}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="account-color" className="text-sm font-medium">
            Color
          </label>
          <input
            id="account-color"
            name="color"
            type="color"
            defaultValue={account?.color ?? "#2563eb"}
            className="border-input bg-background h-11 w-full rounded-lg border p-1"
          />
          {error("color") && (
            <p className="text-destructive text-xs">{error("color")}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="account-icon" className="text-sm font-medium">
            Ícono
          </label>
          <FormSelect
            id="account-icon"
            name="icon"
            defaultValue={account?.icon ?? "wallet"}
            placeholder="Ícono"
            options={icons.map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>
      <fieldset className="grid gap-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">
          Solo para tarjetas de crédito
        </legend>
        <p className="text-muted-foreground text-xs">
          Completa estos datos si elegiste “Tarjeta de crédito”.
        </p>
        <div className="grid gap-1.5">
          <label htmlFor="credit-limit" className="text-sm font-medium">
            Límite de crédito (USD)
          </label>
          <input
            id="credit-limit"
            name="credit_limit"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            defaultValue={account?.credit_limit ?? ""}
            className="border-input bg-background h-11 rounded-lg border px-3 text-sm tabular-nums"
            aria-invalid={Boolean(error("credit_limit"))}
          />
          {error("credit_limit") && (
            <p className="text-destructive text-xs">{error("credit_limit")}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="closing-day" className="text-sm font-medium">
              Día de corte
            </label>
            <input
              id="closing-day"
              name="statement_closing_day"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              defaultValue={account?.statement_closing_day ?? ""}
              className="border-input bg-background h-11 rounded-lg border px-3 text-sm"
              aria-invalid={Boolean(error("statement_closing_day"))}
            />
            {error("statement_closing_day") && (
              <p className="text-destructive text-xs">
                {error("statement_closing_day")}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="due-day" className="text-sm font-medium">
              Día de pago estimado
            </label>
            <input
              id="due-day"
              name="payment_due_day"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              defaultValue={account?.payment_due_day ?? ""}
              className="border-input bg-background h-11 rounded-lg border px-3 text-sm"
              aria-invalid={Boolean(error("payment_due_day"))}
            />
            {error("payment_due_day") && (
              <p className="text-destructive text-xs">
                {error("payment_due_day")}
              </p>
            )}
          </div>
        </div>
      </fieldset>
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
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground focus-visible:ring-ring h-11 rounded-lg px-5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
      >
        {pending ? "Guardando…" : account ? "Guardar cambios" : "Crear cuenta"}
      </button>
    </form>
  );
}
