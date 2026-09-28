"use client";

import { useActionState, useState } from "react";
import { saveInstallment, payCard, removeInstallment } from "../card-actions";
import { installmentAmounts } from "../card-schemas";
import type { AccountWithBalance } from "../queries";
import type { FormState } from "../../auth/schemas";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const input =
  "border-input bg-background h-11 w-full rounded-lg border px-3 text-sm";
function Result({ state }: { state: FormState }) {
  const errors =
    state?.error ??
    Object.values(state?.fieldErrors ?? {})
      .flat()
      .join(". ");
  return (
    <div aria-live="polite">
      {errors && <p className="text-destructive text-sm">{errors}</p>}
      {state?.ok && (
        <p className="text-sm text-green-700 dark:text-green-400">{state.ok}</p>
      )}
    </div>
  );
}

export function InstallmentForm({
  cardId,
  today,
  lastClose,
  firstClose,
  requestId,
  categories,
  canPurchase,
}: {
  cardId: string;
  today: string;
  lastClose: string;
  firstClose: string;
  requestId: string;
  categories: { id: string; name: string }[];
  canPurchase: boolean;
}) {
  const [state, action, pending] = useActionState(saveInstallment, undefined);
  const [mode, setMode] = useState(canPurchase ? "new" : "existing");
  const [amountMode, setAmountMode] = useState<"remaining" | "original">(
    "remaining",
  );
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("12");
  const [paidInstallments, setPaidInstallments] = useState("0");
  const paid = mode === "existing" ? Number(paidInstallments) || 0 : 0;
  const calculation = installmentAmounts(
    Number(amount),
    Number(installments),
    paid,
    mode === "new" ? "original" : amountMode,
  );
  const resetForm = () => {
    setMode(canPurchase ? "new" : "existing");
    setAmountMode("remaining");
    setAmount("");
    setInstallments("12");
    setPaidInstallments("0");
  };
  return (
    <form action={action} onReset={resetForm} className="space-y-4">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="request_id" value={requestId} />
      <label className="grid gap-1.5 text-sm font-medium">
        Qué vas a registrar
        <select
          name="mode"
          className={input}
          value={mode}
          onChange={(event) => {
            setMode(event.target.value);
            if (event.target.value === "new") setPaidInstallments("0");
          }}
        >
          {canPurchase && (
            <option value="new">Compra nueva: sumar gasto y deuda</option>
          )}
          <option value="existing">Plan ya incluido en mi deuda</option>
        </select>
      </label>
      <p className="text-muted-foreground text-sm">
        {mode === "existing"
          ? "Indica el monto original o el saldo pendiente y cuántas cuotas ya pagaste. No se agrega otro gasto ni se vuelve a sumar la deuda."
          : "El importe financiado se registra una sola vez como gasto. Incluye los intereses o cargos que ya conozcas; las cuotas mensuales no generan otro gasto."}
      </p>
      <label className="grid gap-1.5 text-sm font-medium">
        Descripción
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Ej. Laptop"
          className={input}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          {mode === "existing" && amountMode === "original"
            ? "Monto original de la compra"
            : mode === "existing"
              ? "Saldo pendiente incluido en la deuda"
              : "Importe total financiado"}{" "}
          (USD)
          <input
            name="amount"
            required
            type="number"
            min="0.01"
            max="999999999999.99"
            step="0.01"
            inputMode="decimal"
            className={input}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          {mode === "existing" ? "Cuotas totales del plan" : "Número de cuotas"}
          <input
            name="installments"
            required
            type="number"
            min="1"
            max="120"
            value={installments}
            onChange={(event) => setInstallments(event.target.value)}
            className={input}
          />
        </label>
        {mode === "existing" && (
          <>
            <label className="grid gap-1.5 text-sm font-medium">
              Tipo de monto
              <select
                name="amount_mode"
                className={input}
                value={amountMode}
                onChange={(event) =>
                  setAmountMode(event.target.value as "remaining" | "original")
                }
              >
                <option value="remaining">Saldo pendiente</option>
                <option value="original">Monto original de la compra</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Cuotas ya pagadas
              <input
                name="paid_installments"
                required
                type="number"
                min="0"
                max="119"
                value={paidInstallments}
                onChange={(event) => setPaidInstallments(event.target.value)}
                className={input}
              />
            </label>
          </>
        )}
        {mode === "new" && (
          <>
            <input type="hidden" name="amount_mode" value="original" />
            <input type="hidden" name="paid_installments" value="0" />
          </>
        )}
        <label className="grid gap-1.5 text-sm font-medium">
          {mode === "existing"
            ? "Fecha del saldo registrado"
            : "Fecha de compra"}
          <input
            key={mode}
            name="purchase_date"
            required
            type="date"
            max={today}
            defaultValue={mode === "existing" ? lastClose : today}
            className={input}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          {mode === "existing"
            ? "Primer corte de la próxima cuota pendiente"
            : "Primer corte que incluye una cuota"}
          <input
            name="first_close"
            required
            type="date"
            defaultValue={firstClose}
            className={input}
          />
        </label>
      </div>
      {mode === "existing" && calculation && (
        <p className="bg-muted rounded-lg px-3 py-2 text-sm">
          Quedarán <strong>{money.format(calculation.pendingAmount)}</strong> en{" "}
          <strong>{calculation.pendingCount} cuotas</strong>. Próxima cuota:{" "}
          {paid + 1} de {installments}, por{" "}
          {money.format(calculation.monthlyAmount)}; la última ajusta los
          centavos.
        </p>
      )}
      {mode === "new" ? (
        <label className="grid gap-1.5 text-sm font-medium">
          Categoría del gasto
          <select name="category_id" required className={input} defaultValue="">
            <option value="" disabled>
              Elige una categoría
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="category_id" value="" />
      )}
      <p className="text-muted-foreground text-xs">
        Cuotas mensuales iguales; la última absorbe los centavos de redondeo.
        Usa el día de corte de tu tarjeta. Para una cuota de este corte,
        selecciona ese corte y una fecha de saldo anterior o igual.
      </p>
      <Result state={state} />
      <button
        disabled={pending}
        className="bg-primary text-primary-foreground h-11 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Registrar compra a plazos"}
      </button>
    </form>
  );
}

export function CardPaymentForm({
  cardId,
  today,
  requestId,
  accounts,
  due,
}: {
  cardId: string;
  today: string;
  requestId: string;
  accounts: AccountWithBalance[];
  due: number;
}) {
  const [rows, setRows] = useState([{ id: "", amount: "" }]);
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await payCard(previous, data);
      if (result?.ok) setRows([{ id: "", amount: "" }]);
      return result;
    },
    undefined,
  );
  const total =
    rows.reduce(
      (sum, row) => sum + Math.round((Number(row.amount) || 0) * 100),
      0,
    ) / 100;
  if (!accounts.length)
    return (
      <p className="text-muted-foreground text-sm">
        Registra una cuenta de origen activa para pagar esta tarjeta.
      </p>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="request_id" value={requestId} />
      <p className="text-muted-foreground text-sm">
        Pendiente del último corte:{" "}
        <strong className="text-foreground">{money.format(due)}</strong>. Puedes
        hacer un abono parcial o pagar más para reducir la deuda total.
      </p>
      <label className="grid gap-1.5 text-sm font-medium">
        Fecha del pago
        <input
          name="date"
          type="date"
          max={today}
          defaultValue={today}
          required
          className={input}
        />
      </label>
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_160px_auto]"
        >
          <label className="grid gap-1.5 text-sm font-medium">
            Cuenta de origen {index + 1}
            <select
              name="source_id"
              required
              className={input}
              value={row.id}
              onChange={(event) =>
                setRows(
                  rows.map((item, i) =>
                    i === index ? { ...item, id: event.target.value } : item,
                  ),
                )
              }
            >
              <option value="" disabled>
                Selecciona una cuenta
              </option>
              {accounts.map((account) => (
                <option
                  key={account.id}
                  value={account.id}
                  disabled={rows.some(
                    (other, i) => i !== index && other.id === account.id,
                  )}
                >
                  {account.name} · {money.format(account.balance)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Aporte (USD)
            <input
              name="source_amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              required
              className={input}
              value={row.amount}
              onChange={(event) =>
                setRows(
                  rows.map((item, i) =>
                    i === index
                      ? { ...item, amount: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </label>
          {rows.length > 1 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setRows(rows.filter((_, i) => i !== index))}
              className="text-destructive self-end rounded-lg px-2 py-3 text-sm"
            >
              Quitar
            </button>
          )}
        </div>
      ))}
      {rows.length < Math.min(accounts.length, 20) && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setRows([...rows, { id: "", amount: "" }])}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Añadir otra cuenta
        </button>
      )}
      <p className="text-sm font-medium">
        Total del pago: {money.format(total)}
      </p>
      <p className="text-muted-foreground text-xs">
        Se registra una transferencia desde cada cuenta. El pago no se cuenta
        como otro gasto y se guarda completo o no se guarda.
      </p>
      <Result state={state} />
      <button
        disabled={pending || total <= 0}
        className="bg-primary text-primary-foreground h-11 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Registrando…" : "Registrar pago de tarjeta"}
      </button>
    </form>
  );
}

export function RemoveInstallmentForm({
  id,
  cardId,
}: {
  id: string;
  cardId: string;
}) {
  const [state, action, pending] = useActionState(removeInstallment, undefined);
  return (
    <form action={action} className="space-y-2 border-t pt-3">
      <input name="id" type="hidden" value={id} />
      <input name="card_id" type="hidden" value={cardId} />
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" name="confirm" required className="mt-0.5" />
        Entiendo que quitar la financiación conserva el gasto y convierte el
        importe pendiente en deuda al contado.
      </label>
      <button
        disabled={pending}
        className="text-destructive rounded px-2 py-2 text-sm"
      >
        Quitar financiación
      </button>
      <Result state={state} />
    </form>
  );
}
