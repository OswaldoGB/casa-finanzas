import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveAccount } from "@/features/accounts/actions";
import { AccountForm } from "@/features/accounts/components/account-form";
import { getAccount } from "@/features/accounts/queries";
import { randomUUID } from "node:crypto";
import {
  InstallmentForm,
  CardPaymentForm,
  RemoveInstallmentForm,
} from "@/features/accounts/components/card-forms";

export const metadata = { title: "Detalle de cuenta" };
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const movementLabel: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  loan_out: "Préstamo",
  loan_repayment: "Abono",
  goal_contribution: "Aporte",
  goal_withdrawal: "Retiro",
};
function movementStyle(type: string) {
  if (type === "income" || type === "loan_repayment")
    return {
      chip: "bg-income/15 text-income",
      amount: "text-income",
      sign: "+",
    };
  if (type === "expense")
    return {
      chip: "bg-destructive/15 text-destructive",
      amount: "text-destructive",
      sign: "−",
    };
  if (type === "loan_out")
    return {
      chip: "bg-warning/15 text-warning",
      amount: "text-warning",
      sign: "−",
    };
  return {
    chip: "bg-muted text-muted-foreground",
    amount: "text-info",
    sign: "",
  };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getAccount(id);
  if (!result?.account) notFound();
  const {
    account,
    canEdit,
    statement,
    history,
    plans,
    schedule,
    today,
    firstClose,
    categories,
    canTransact,
    paymentAccounts,
  } = result;
  const card = account.type === "credit_card";
  const utilization =
    card && account.credit_limit
      ? Math.max(
          0,
          Math.min(100, (account.balance / account.credit_limit) * 100),
        )
      : 0;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/accounts"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Cuentas y tarjetas
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {account.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {account.is_archived
              ? "Cuenta archivada"
              : card
                ? "Tarjeta de crédito"
                : "Cuenta activa"}
          </p>
        </div>
        <div className="bg-card rounded-xl border px-5 py-3 text-right">
          <p className="text-muted-foreground text-xs">
            {card ? "Deuda total, incluidas cuotas futuras" : "Saldo actual"}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {money.format(account.balance)}
          </p>
        </div>
      </header>
      {card && (
        <section
          aria-label="Detalles de la tarjeta"
          className="bg-card space-y-4 rounded-2xl border p-5 sm:p-6"
        >
          <div className="flex justify-between gap-3 text-sm">
            <span>Límite de crédito</span>
            <strong className="tabular-nums">
              {money.format(account.credit_limit ?? 0)}
            </strong>
          </div>
          <div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${utilization}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
              {Math.round(utilization)} % del límite utilizado
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Día de corte: <strong>{account.statement_closing_day}</strong>
            </p>
            <p>
              Día de pago: <strong>{account.payment_due_day}</strong>
            </p>
          </div>
          {statement && (
            <div className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
              <p>
                Último corte: <strong>{statement.closesOn}</strong>
              </p>
              <p>
                Fecha límite de pago: <strong>{statement.dueOn}</strong>
              </p>
              <p className="sm:col-span-2">
                Importe facturado al corte:{" "}
                <strong>{money.format(statement.balance)}</strong>
              </p>
              <p className="sm:col-span-2">
                Pendiente de pagar este corte:{" "}
                <strong className="text-lg">
                  {money.format(statement.unpaid)}
                </strong>
              </p>
              <p className="text-muted-foreground sm:col-span-2">
                Cuotas futuras incluidas en la deuda:{" "}
                <strong>{money.format(statement.future)}</strong>. Se incorporan
                al pago cuando llega su corte.
              </p>
            </div>
          )}
        </section>
      )}
      {card && plans.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Compras a plazos</h2>
          {plans.map((plan) => {
            const rows = schedule.filter((row) => row.plan_id === plan.id);
            const future = rows.filter(
              (row) => row.close_date > (statement?.closesOn ?? today),
            );
            const totalInstallments =
              plan.installments + plan.paid_installments;
            return (
              <article
                key={plan.id}
                className="bg-card space-y-3 rounded-xl border p-4"
              >
                <h3 className="font-medium">{plan.name}</h3>
                <p className="text-sm">
                  {money.format(Number(plan.amount))} pendientes en{" "}
                  {plan.installments} cuotas · {future.length} por facturar
                </p>
                {plan.paid_installments > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Registrado con {plan.paid_installments} de{" "}
                    {totalInstallments} cuotas ya pagadas
                    {plan.original_amount
                      ? ` · compra original: ${money.format(Number(plan.original_amount))}`
                      : ""}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  {plan.transaction_id
                    ? "Compra registrada como gasto una sola vez"
                    : "Plan que ya estaba incluido en la deuda"}
                </p>
                <details>
                  <summary className="cursor-pointer rounded py-2 text-sm">
                    Ver calendario de cuotas
                  </summary>
                  <ul className="mt-2 space-y-2 text-sm">
                    {rows.map((row) => (
                      <li
                        key={row.installment}
                        className="flex flex-wrap justify-between gap-2"
                      >
                        <span>
                          Cuota {row.installment} · Corte {row.close_date} ·
                          Pago {row.due_date}
                        </span>
                        <strong>{money.format(Number(row.amount))}</strong>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-3 text-xs">
                    Este calendario muestra lo facturado, no acredita pagos
                    individuales. Los abonos se descuentan del saldo de la
                    tarjeta.
                  </p>
                </details>
                {canEdit && !account.is_archived && (
                  <details>
                    <summary className="text-muted-foreground cursor-pointer rounded py-2 text-xs">
                      Corregir un plan registrado por error
                    </summary>
                    <RemoveInstallmentForm id={plan.id} cardId={account.id} />
                  </details>
                )}
              </article>
            );
          })}
        </section>
      )}
      {card && canEdit && !account.is_archived && statement && (
        <>
          <section className="bg-card space-y-4 rounded-2xl border p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Pagar tarjeta</h2>
            {canTransact ? (
              <CardPaymentForm
                cardId={account.id}
                today={today}
                requestId={randomUUID()}
                accounts={paymentAccounts}
                due={statement.unpaid}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Necesitas permiso de edición en Movimientos para registrar
                pagos.
              </p>
            )}
          </section>
          <section className="bg-card space-y-4 rounded-2xl border p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Añadir compra a plazos</h2>
            <InstallmentForm
              cardId={account.id}
              today={today}
              lastClose={statement.closesOn}
              firstClose={firstClose}
              requestId={randomUUID()}
              categories={categories}
              canPurchase={canTransact}
            />
          </section>
        </>
      )}
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Movimientos recientes</h2>
          <ul className="divide-border divide-y rounded-xl border">
            {history.map((item) => {
              const style = movementStyle(item.type);
              return (
                <li key={item.id}>
                  <Link
                    href={`/transactions/${item.id}`}
                    className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {item.description ||
                          movementLabel[item.type] ||
                          "Movimiento"}
                      </span>
                      <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                        <span
                          className={`rounded-full px-1.5 py-0.5 font-medium ${style.chip}`}
                        >
                          {movementLabel[item.type] ?? "Movimiento"}
                        </span>
                        {item.date}
                        {item.status === "pending" && "· Pendiente"}
                      </span>
                    </span>
                    <strong className={`shrink-0 tabular-nums ${style.amount}`}>
                      {style.sign}
                      {money.format(Number(item.amount))}
                    </strong>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {canEdit && !account.is_archived && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Editar cuenta</h2>
          <div className="bg-card rounded-2xl border p-5 sm:p-6">
            <AccountForm account={account} />
          </div>
          <form action={archiveAccount} className="pt-2">
            <input type="hidden" name="id" value={account.id} />
            <button
              type="submit"
              className="text-destructive focus-visible:ring-ring rounded text-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
            >
              Archivar cuenta
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
