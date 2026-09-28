"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Transaction } from "../queries";
import { saveTransaction } from "../actions";

type Options = {
  today: string;
  accounts: { id: string; name: string; is_archived: boolean }[];
  categories: {
    id: string;
    name: string;
    type: "income" | "expense";
    is_archived: boolean;
  }[];
  methods: { id: string; name: string; is_archived: boolean }[];
};

export function TransactionForm({
  transaction,
  options,
  quick = false,
  rememberDefaults = false,
}: {
  transaction?: Transaction;
  options: Options;
  quick?: boolean;
  rememberDefaults?: boolean;
}) {
  const [state, action, pending] = useActionState(saveTransaction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"income" | "expense" | "transfer">(
    transaction?.type === "income" || transaction?.type === "transfer"
      ? transaction.type
      : "expense",
  );
  const error = (field: string) => state?.fieldErrors?.[field]?.[0];
  const field =
    "border-input bg-background h-11 w-full rounded-lg border px-3 text-sm";
  const accounts = options.accounts.filter(
    (item) =>
      !item.is_archived ||
      item.id === transaction?.account_id ||
      item.id === transaction?.destination_account_id,
  );
  const categories = options.categories.filter(
    (item) =>
      item.type === type &&
      (!item.is_archived || item.id === transaction?.category_id),
  );
  const methods = options.methods.filter(
    (item) => !item.is_archived || item.id === transaction?.payment_method_id,
  );
  useEffect(() => {
    if (!(quick || rememberDefaults) || !formRef.current) return;
    try {
      const saved = JSON.parse(
        localStorage.getItem("transaction-quick-defaults") ?? "{}",
      ) as Record<string, string>;
      for (const name of ["account_id", "category_id", "payment_method_id"]) {
        const select = formRef.current.elements.namedItem(name);
        if (
          select instanceof HTMLSelectElement &&
          [...select.options].some((option) => option.value === saved[name])
        )
          select.value = saved[name];
      }
    } catch {
      /* Browser storage may be unavailable. */
    }
  }, [quick, rememberDefaults, type]);
  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => {
        if (!(quick || rememberDefaults)) return;
        try {
          const data = new FormData(event.currentTarget);
          localStorage.setItem(
            "transaction-quick-defaults",
            JSON.stringify(
              Object.fromEntries(
                ["account_id", "category_id", "payment_method_id"].map(
                  (name) => [name, String(data.get(name) ?? "")],
                ),
              ),
            ),
          );
        } catch {
          /* Browser storage may be unavailable. */
        }
      }}
      className="grid gap-4"
      noValidate
    >
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <div className="grid gap-1">
        <label htmlFor="transaction-amount" className="text-sm font-medium">
          Monto (USD)
        </label>
        <input
          id="transaction-amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          autoFocus={quick}
          defaultValue={transaction?.amount ?? ""}
          className={`${field} text-xl font-semibold tabular-nums`}
        />
        {error("amount") && (
          <p className="text-destructive text-xs">{error("amount")}</p>
        )}
      </div>
      <div className="grid gap-1">
        <label htmlFor="transaction-type" className="text-sm font-medium">
          Tipo
        </label>
        <select
          id="transaction-type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className={field}
        >
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
          <option value="transfer">Transferencia</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label htmlFor="transaction-date" className="text-sm font-medium">
          Fecha
        </label>
        <input
          id="transaction-date"
          name="date"
          type="date"
          required
          defaultValue={transaction?.date ?? options.today}
          className={field}
        />
        {error("date") && (
          <p className="text-destructive text-xs">{error("date")}</p>
        )}
      </div>
      <div className="grid gap-1">
        <label htmlFor="transaction-account" className="text-sm font-medium">
          {type === "transfer" ? "Cuenta origen" : "Cuenta"}
        </label>
        <select
          id="transaction-account"
          name="account_id"
          required
          defaultValue={transaction?.account_id ?? ""}
          className={field}
        >
          <option value="">Seleccionar cuenta</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {error("account_id") && (
          <p className="text-destructive text-xs">{error("account_id")}</p>
        )}
      </div>
      {type === "transfer" ? (
        <div className="grid gap-1">
          <label
            htmlFor="transaction-destination"
            className="text-sm font-medium"
          >
            Cuenta destino
          </label>
          <select
            id="transaction-destination"
            name="destination_account_id"
            required
            defaultValue={transaction?.destination_account_id ?? ""}
            className={field}
          >
            <option value="">Seleccionar cuenta</option>
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {error("destination_account_id") && (
            <p className="text-destructive text-xs">
              {error("destination_account_id")}
            </p>
          )}
        </div>
      ) : (
        <>
          <input type="hidden" name="destination_account_id" value="" />
          <div className="grid gap-1">
            <label
              htmlFor="transaction-category"
              className="text-sm font-medium"
            >
              Categoría
            </label>
            <select
              id="transaction-category"
              name="category_id"
              required
              defaultValue={transaction?.category_id ?? ""}
              key={type}
              className={field}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {error("category_id") && (
              <p className="text-destructive text-xs">{error("category_id")}</p>
            )}
          </div>
          <div className="grid gap-1">
            <label htmlFor="transaction-method" className="text-sm font-medium">
              Método de pago
            </label>
            <select
              id="transaction-method"
              name="payment_method_id"
              defaultValue={transaction?.payment_method_id ?? ""}
              className={field}
            >
              <option value="">Sin especificar</option>
              {methods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {error("payment_method_id") && (
              <p className="text-destructive text-xs">
                {error("payment_method_id")}
              </p>
            )}
          </div>
        </>
      )}
      {type === "transfer" && (
        <>
          <input type="hidden" name="category_id" value="" />
          <input type="hidden" name="payment_method_id" value="" />
        </>
      )}
      <div className="grid gap-1">
        <label
          htmlFor="transaction-description"
          className="text-sm font-medium"
        >
          Descripción
        </label>
        <input
          id="transaction-description"
          name="description"
          maxLength={240}
          defaultValue={transaction?.description ?? ""}
          placeholder="¿Qué fue?"
          className={field}
        />
        {error("description") && (
          <p className="text-destructive text-xs">{error("description")}</p>
        )}
      </div>
      {!quick && (
        <div className="grid gap-1">
          <label htmlFor="transaction-notes" className="text-sm font-medium">
            Notas
          </label>
          <textarea
            id="transaction-notes"
            name="notes"
            rows={3}
            defaultValue={transaction?.notes ?? ""}
            className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      )}
      {quick && <input type="hidden" name="notes" value="" />}
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
        disabled={pending}
        className="bg-primary text-primary-foreground h-11 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
      >
        {pending
          ? "Guardando…"
          : transaction
            ? "Guardar cambios"
            : "Guardar movimiento"}
      </button>
    </form>
  );
}
