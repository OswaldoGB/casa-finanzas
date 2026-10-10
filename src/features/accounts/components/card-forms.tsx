"use client";

import { MoneyInput } from "@/components/ui/money-input";

import { useActionState, useState } from "react";
import { saveInstallment, payCard, removeInstallment } from "../card-actions";
import { installmentAmounts } from "../card-schemas";
import { paymentPreview } from "../card-payment-preview";
import type { AccountWithBalance } from "../queries";
import type { FormState } from "../../auth/schemas";
import { FormSelect } from "@/components/ui/form-select";

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
  onSuccess,
}: {
  cardId: string;
  today: string;
  lastClose: string;
  firstClose: string;
  requestId: string;
  categories: { id: string; name: string }[];
  canPurchase: boolean;
  onSuccess?: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(
    async (previous: FormState, form: FormData) => {
      const result = await saveInstallment(previous, form);
      if (result?.ok) onSuccess?.(result.ok);
      return result;
    },
    undefined,
  );
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
        <FormSelect
          name="mode"
          placeholder="Qué vas a registrar"
          value={mode}
          onValueChange={(value) => {
            setMode(value);
            if (value === "new") setPaidInstallments("0");
          }}
          options={[
            ...(canPurchase
              ? [{ value: "new", label: "Compra nueva: sumar gasto y deuda" }]
              : []),
            { value: "existing", label: "Plan ya incluido en mi deuda" },
          ]}
        />
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
          <MoneyInput
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
              <FormSelect
                name="amount_mode"
                placeholder="Tipo de monto"
                value={amountMode}
                onValueChange={(value) =>
                  setAmountMode(value as "remaining" | "original")
                }
                options={[
                  { value: "remaining", label: "Saldo pendiente" },
                  { value: "original", label: "Monto original de la compra" },
                ]}
              />
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
          <FormSelect
            name="category_id"
            placeholder="Elige una categoría"
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />
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
  statements = [],
  payment,
  onSuccess,
  cardBalance,
}: {
  cardId: string;
  today: string;
  requestId: string;
  accounts: AccountWithBalance[];
  due: number;
  statements?: {
    id: string;
    dueOn: string;
    closesOn: string;
    unpaid: number;
  }[];
  payment?: {
    id: string;
    date: string;
    sources: { id: string; amount: number }[];
  };
  onSuccess?: (message: string) => void;
  cardBalance: number;
}) {
  const [rows, setRows] = useState(
    payment?.sources.map((item) => ({
      id: item.id,
      amount: String(item.amount),
    })) ?? [{ id: "", amount: due > 0 ? due.toFixed(2) : "" }],
  );
  const [date, setDate] = useState(payment?.date ?? today);
  const [state, action, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await payCard(previous, data);
      if (result?.ok) onSuccess?.(result.ok);
      return result;
    },
    undefined,
  );
  const total =
    rows.reduce(
      (sum, row) => sum + Math.round((Number(row.amount) || 0) * 100),
      0,
    ) / 100;
  const totalDue = statements.reduce(
    (sum, statement) => sum + statement.unpaid,
    0,
  );
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
      {payment && <input type="hidden" name="payment_id" value={payment.id} />}
      <p className="text-muted-foreground text-sm">
        {payment
          ? "El pago anterior se revierte antes de aplicar los nuevos aportes. Sus cuentas y la conciliación se actualizarán juntas."
          : "Pendiente del corte: "}
        {!payment && (
          <strong className="text-foreground">{money.format(due)}</strong>
        )}
        {!payment && "."} Pendiente total según el banco:{" "}
        <strong className="text-foreground">{money.format(totalDue)}</strong>.
      </p>
      <label className="grid gap-1.5 text-sm font-medium">
        Fecha del pago
        <input
          name="date"
          type="date"
          max={today}
          value={date}
          onChange={(event) => setDate(event.target.value)}
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
            <FormSelect
              name="source_id"
              placeholder="Selecciona una cuenta"
              value={row.id}
              onValueChange={(value) =>
                setRows(
                  rows.map((item, i) =>
                    i === index ? { ...item, id: value } : item,
                  ),
                )
              }
              options={accounts.map((account) => ({
                value: account.id,
                label: `${account.name} · ${money.format(account.balance)}`,
                disabled: rows.some(
                  (other, i) => i !== index && other.id === account.id,
                ),
              }))}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Aporte (USD)
            <MoneyInput
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
      {total > 0 && (
        <p className="text-muted-foreground text-xs">
          Saldo contable después del pago:{" "}
          {money.format(
            cardBalance +
              (payment?.sources.reduce(
                (sum, source) => sum + source.amount,
                0,
              ) ?? 0) -
              total,
          )}
          . Si queda negativo, la App conserva ese saldo a favor; no añade un
          gasto para igualarlo al banco.
        </p>
      )}
      {!payment && total > 0 && (
        <p className="text-muted-foreground bg-muted rounded-lg p-3 text-xs">
          {paymentPreview(total, statements, date)} Se aplicará automáticamente
          del corte más antiguo al más reciente.
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Se registra una transferencia desde cada cuenta. El pago no se cuenta
        como otro gasto y se guarda completo o no se guarda.
      </p>
      <Result state={state} />
      <button
        disabled={
          pending ||
          total <= 0 ||
          rows.some((row) => !row.id || Number(row.amount) <= 0)
        }
        className="bg-primary text-primary-foreground h-11 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
      >
        {pending
          ? "Guardando…"
          : payment
            ? "Guardar corrección del pago"
            : "Registrar pago de tarjeta"}
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
