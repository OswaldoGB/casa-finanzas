"use client";

import { MoneyInput } from "@/components/ui/money-input";

import { useActionState, useState } from "react";
import { saveAccount } from "../actions";
import type { Account } from "../queries";
import type { FormState } from "../../auth/schemas";
import { FormSelect } from "@/components/ui/form-select";
import { cardProductOptions, institutions, networks } from "../card-appearance";

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
  const [selectedType, setSelectedType] = useState(account?.type ?? "checking");
  const isCard = selectedType === "credit_card";
  const [selectedInstitution, setSelectedInstitution] = useState(
    account?.institution ?? "other",
  );
  const [selectedProduct, setSelectedProduct] = useState(
    account?.card_product ?? "",
  );
  function changeInstitution(institution: string) {
    setSelectedInstitution(institution);
    setSelectedProduct(cardProductOptions(institution)[0]?.value ?? "");
  }
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
          value={selectedType}
          onValueChange={(value) =>
            setSelectedType(value as typeof selectedType)
          }
          placeholder="Tipo de cuenta"
          options={types.map(([value, label]) => ({ value, label }))}
        />
        {error("type") && (
          <p className="text-destructive text-xs">{error("type")}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="account-balance" className="text-sm font-medium">
          {isCard ? "Deuda inicial (USD)" : "Saldo inicial (USD)"}
        </label>
        <MoneyInput
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
      {selectedType !== "cash" ? (
        <div className="grid gap-1.5">
          <label htmlFor="account-institution" className="text-sm font-medium">
            Banco o emisor
          </label>
          <FormSelect
            id="account-institution"
            name="institution"
            value={selectedInstitution}
            onValueChange={changeInstitution}
            placeholder="Selecciona un emisor"
            options={institutions.map(({ value, label }) => ({ value, label }))}
          />
          <p className="text-muted-foreground text-xs">
            Sirve para reconocer tu cuenta y mostrar su marca.
          </p>
        </div>
      ) : (
        <input type="hidden" name="institution" value="other" />
      )}
      {isCard && (
        <fieldset className="grid gap-4 rounded-xl border p-4">
          <legend className="px-1 text-sm font-medium">
            Datos de la tarjeta de crédito
          </legend>
          <div className="grid gap-1.5">
            <label htmlFor="credit-limit" className="text-sm font-medium">
              Límite de crédito (USD)
            </label>
            <MoneyInput
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
              <p className="text-destructive text-xs">
                {error("credit_limit")}
              </p>
            )}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="card-network" className="text-sm font-medium">
                Red de tarjeta
              </label>
              <FormSelect
                id="card-network"
                name="card_network"
                defaultValue={account?.card_network ?? "other"}
                placeholder="Red"
                options={networks.map(({ value, label }) => ({ value, label }))}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="card-product" className="text-sm font-medium">
                Variante
              </label>
              <FormSelect
                id="card-product"
                name="card_product"
                value={selectedProduct}
                onValueChange={setSelectedProduct}
                placeholder="Variante"
                options={cardProductOptions(selectedInstitution).map(
                  ({ value, label }) => ({ value, label }),
                )}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="card-last-four" className="text-sm font-medium">
              Últimos cuatro dígitos{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </label>
            <input
              id="card-last-four"
              name="card_last_four"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              defaultValue={account?.card_last_four ?? ""}
              placeholder="Ej. 2541"
              className="border-input bg-background h-11 rounded-lg border px-3 text-sm tabular-nums"
              aria-invalid={Boolean(error("card_last_four"))}
            />
            {error("card_last_four") && (
              <p className="text-destructive text-xs">
                {error("card_last_four")}
              </p>
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
      )}
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
