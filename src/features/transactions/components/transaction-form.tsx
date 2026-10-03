"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Transaction } from "../queries";
import { saveTransaction } from "../actions";
import { FormSelect } from "@/components/ui/form-select";
import { CategoryIcon } from "@/features/catalogs/components/category-icon";

type Options = {
  today: string;
  accounts: { id: string; name: string; is_archived: boolean }[];
  categories: {
    id: string;
    name: string;
    type: "income" | "expense";
    color: string;
    icon: string;
    is_archived: boolean;
  }[];
  methods: { id: string; name: string; is_archived: boolean }[];
  projects: { id: string; name: string; status: string }[];
};

export function TransactionForm({
  transaction,
  options,
  quick = false,
  rememberDefaults = false,
  onSuccess,
}: {
  transaction?: Transaction;
  options: Options;
  quick?: boolean;
  rememberDefaults?: boolean;
  onSuccess?: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(saveTransaction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"income" | "expense" | "transfer">(
    transaction?.type === "income" || transaction?.type === "transfer"
      ? transaction.type
      : "expense",
  );
  const [accountId, setAccountId] = useState(transaction?.account_id ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [methodId, setMethodId] = useState(
    transaction?.payment_method_id ?? "",
  );
  const restoredDefaults = useRef(false);
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
    if (
      restoredDefaults.current ||
      !(quick || rememberDefaults) ||
      !formRef.current
    )
      return;
    restoredDefaults.current = true;
    try {
      const saved = JSON.parse(
        localStorage.getItem("transaction-quick-defaults") ?? "{}",
      ) as Record<string, string>;
      const frame = requestAnimationFrame(() => {
        if (options.accounts.some((account) => account.id === saved.account_id))
          setAccountId(saved.account_id);
        if (
          options.categories.some(
            (category) => category.id === saved.category_id,
          )
        )
          setCategoryId(saved.category_id);
        if (
          options.methods.some(
            (method) => method.id === saved.payment_method_id,
          )
        )
          setMethodId(saved.payment_method_id);
      });
      return () => cancelAnimationFrame(frame);
    } catch {
      /* Browser storage may be unavailable. */
    }
  }, [quick, rememberDefaults, options]);
  useEffect(() => {
    if (state?.ok) onSuccess?.(state.ok);
  }, [onSuccess, state?.ok]);
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
        <FormSelect
          id="transaction-type"
          name="type"
          value={type}
          onValueChange={(value) => {
            setType(value as typeof type);
            setCategoryId("");
          }}
          placeholder="Seleccionar tipo"
          options={[
            { value: "expense", label: "Gasto" },
            { value: "income", label: "Ingreso" },
            { value: "transfer", label: "Transferencia" },
          ]}
        />
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
        <FormSelect
          id="transaction-account"
          name="account_id"
          value={accountId}
          onValueChange={setAccountId}
          placeholder="Seleccionar cuenta"
          options={accounts.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />
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
          <FormSelect
            id="transaction-destination"
            name="destination_account_id"
            defaultValue={transaction?.destination_account_id ?? ""}
            placeholder="Seleccionar cuenta"
            options={accounts.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
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
            <FormSelect
              id="transaction-category"
              name="category_id"
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Seleccionar categoría"
              options={categories.map((item) => ({
                value: item.id,
                label: item.name,
                leading: <CategoryIcon icon={item.icon} color={item.color} />,
              }))}
            />
            {error("category_id") && (
              <p className="text-destructive text-xs">{error("category_id")}</p>
            )}
          </div>
          <div className="grid gap-1">
            <label htmlFor="transaction-method" className="text-sm font-medium">
              Método de pago
            </label>
            <FormSelect
              id="transaction-method"
              name="payment_method_id"
              value={methodId}
              onValueChange={setMethodId}
              placeholder="Sin especificar"
              options={methods.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
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
        <label className="grid gap-1 text-sm">
          Proyecto opcional
          <FormSelect
            name="project_id"
            defaultValue={transaction?.project_id ?? ""}
            placeholder="Sin proyecto"
            options={options.projects
              .filter(
                (item) =>
                  item.status !== "archived" ||
                  item.id === transaction?.project_id,
              )
              .map((item) => ({ value: item.id, label: item.name }))}
          />
        </label>
      )}
      {quick && <input type="hidden" name="project_id" value="" />}
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
