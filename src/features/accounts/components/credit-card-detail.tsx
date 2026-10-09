"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  CreditCard,
  CalendarDays,
  ArrowUpRight,
  Plus,
  Settings2,
  Pencil,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Database } from "@/lib/supabase/database.types";
import type { AccountWithBalance, CardPaymentSummary } from "../queries";
import {
  cardCutSummary,
  installmentProgress,
  type CardStatementSummary,
} from "../card-settlement";
import {
  InstallmentForm,
  CardPaymentForm,
  RemoveInstallmentForm,
} from "./card-forms";
import { CardStatementForm } from "./card-statement-form";
import { AccountForm } from "./account-form";
import { archiveAccount } from "../actions";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const date = (value: string) =>
  new Intl.DateTimeFormat("es-SV", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50";
const primary = `${button} bg-primary text-primary-foreground border-primary hover:bg-primary/90`;
type Props = {
  initialSection?: string;
  account: AccountWithBalance;
  canEdit: boolean;
  canTransact: boolean;
  today: string;
  firstClose: string;
  requestId: string;
  estimate: {
    closesOn: string;
    dueOn: string;
    balance: number;
    unpaid: number;
    future: number;
  };
  statements: CardStatementSummary[];
  plans: Database["public"]["Tables"]["card_installment_plans"]["Row"][];
  schedule: Database["public"]["Functions"]["card_installment_schedule"]["Returns"];
  categories: { id: string; name: string }[];
  paymentAccounts: AccountWithBalance[];
  payments: CardPaymentSummary[];
  movements: ReactNode;
};
type Modal =
  | { type: "statement"; statement?: CardStatementSummary }
  | { type: "payment"; payment?: CardPaymentSummary }
  | { type: "installment" }
  | { type: "settings" };

export function CreditCardDetail(props: Props) {
  const {
    account,
    today,
    estimate,
    statements,
    canEdit,
    canTransact,
    payments,
  } = props;
  const [section, setSection] = useState(
    ["summary", "installments", "history", "movements"].includes(
      props.initialSection ?? "",
    )
      ? props.initialSection!
      : "summary",
  );
  const [modal, setModal] = useState<Modal | null>(null);
  const cut = cardCutSummary(estimate, statements, today);
  const editable = canEdit && !account.is_archived;
  const settled = cut.confirmed && cut.unpaid === 0;
  const overdue = cut.confirmed && cut.unpaid > 0 && cut.dueOn < today;
  const available = Math.max(
    0,
    Number(account.credit_limit ?? 0) - account.balance,
  );
  const usage = account.credit_limit
    ? Math.max(0, Math.min(100, (account.balance / account.credit_limit) * 100))
    : 0;
  const lines = statements.flatMap((item) => item.installments);
  const plans = props.plans.map((plan) => ({
    plan,
    progress: installmentProgress(
      plan.paid_installments,
      props.schedule.filter((row) => row.plan_id === plan.id),
      lines,
    ),
  }));
  const active = plans.filter((item) => item.progress.remaining > 0);
  const finished = plans.filter((item) => item.progress.remaining === 0);
  const saved = (message: string) => {
    setModal(null);
    toast.success(message);
  };
  const totalPending =
    statements.reduce((sum, item) => sum + Math.round(item.unpaid * 100), 0) /
    100;

  function renderPlans(items: typeof plans) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(({ plan, progress }) => {
          const total = plan.installments + plan.paid_installments;
          return (
            <article
              key={plan.id}
              className="bg-card min-w-0 space-y-4 rounded-2xl border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 font-semibold break-words">
                  {plan.name}
                </h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${progress.remaining === 0 ? "bg-income/15 text-income" : "bg-primary/10 text-primary"}`}
                >
                  {progress.paidCount}/{total} pagadas
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`Cuotas pagadas de ${plan.name}`}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={progress.paidCount}
                className="bg-muted h-2 overflow-hidden rounded-full"
              >
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${(progress.paidCount / total) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Por cubrir</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {money.format(progress.remaining)}
                  </p>
                </div>
                {progress.next && (
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">
                      Cuota {progress.next.installment} de {total}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {money.format(progress.next.remaining)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {date(progress.next.due_date)}
                      {progress.next.status === "future" && " · estimado"}
                    </p>
                  </div>
                )}
              </div>
              {progress.rows.some((row) => row.needsReview) && (
                <p className="bg-warning/10 text-warning rounded-xl p-3 text-xs">
                  Una cuota está vinculada a otro corte. En Historial, registra
                  el estado de su corte correcto y corrige el pago que la cubrió
                  para recalcular la cobertura.
                </p>
              )}
              {plan.paid_installments > 0 && (
                <p className="text-muted-foreground text-xs">
                  {plan.paid_installments}{" "}
                  {plan.paid_installments === 1
                    ? "cuota pagada"
                    : "cuotas pagadas"}{" "}
                  antes del registro.
                  {plan.original_amount
                    ? ` Original: ${money.format(Number(plan.original_amount))}.`
                    : ""}
                </p>
              )}
              <details>
                <summary className="text-primary cursor-pointer py-1 text-sm font-medium">
                  Ver calendario y cobertura
                </summary>
                <ul className="mt-3 divide-y">
                  {progress.rows.map((row) => (
                    <li
                      key={row.installment}
                      className="flex items-start justify-between gap-3 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          Cuota {row.installment} · {date(row.close_date)}
                        </p>
                        <p
                          className={`text-xs ${row.status === "settled" ? "text-income" : "text-muted-foreground"}`}
                        >
                          {row.needsReview
                            ? "Vínculo de corte por revisar"
                            : row.status === "settled"
                              ? "Pagada · cubierta por el corte"
                              : row.status === "included"
                                ? `Incluida · ${row.paid > 0 ? `abono ${money.format(row.paid)} · ` : ""}vence ${date(row.due_date)}`
                                : row.close_date <= today
                                  ? "Corte pendiente de conciliar"
                                  : `Futura · pago estimado ${date(row.due_date)}`}
                        </p>
                      </div>
                      <strong className="shrink-0 tabular-nums">
                        {money.format(Number(row.amount))}
                      </strong>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-2 text-xs">
                  Las cuotas de un corte saldado están cubiertas por el pago de
                  contado del banco. Las futuras conservan su calendario y no
                  generan otro gasto.
                </p>
              </details>
              {editable &&
                progress.paidCount === plan.paid_installments &&
                !lines.some((line) => line.planId === plan.id) && (
                  <details>
                    <summary className="text-muted-foreground cursor-pointer text-xs">
                      Corregir un plan registrado por error
                    </summary>
                    <RemoveInstallmentForm id={plan.id} cardId={account.id} />
                  </details>
                )}
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 space-y-6">
      <Link
        href="/accounts"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Cuentas y tarjetas
      </Link>
      <header
        className="bg-card relative overflow-hidden rounded-3xl border p-5 sm:p-7"
        style={{ borderTopColor: account.color, borderTopWidth: 3 }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: account.color }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary/10 text-primary rounded-xl p-3">
              <CreditCard className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">
                {account.is_archived
                  ? "Tarjeta archivada"
                  : "Tarjeta de crédito"}
              </p>
              <h1 className="text-xl font-semibold break-words sm:text-2xl">
                {account.name}
              </h1>
            </div>
          </div>
          {editable && (
            <button
              className="text-muted-foreground hover:bg-muted rounded-xl p-3"
              title="Configurar tarjeta"
              aria-label="Configurar tarjeta"
              onClick={() => setModal({ type: "settings" })}
            >
              <Settings2 className="size-5" />
            </button>
          )}
        </div>
        <div className="relative mt-6 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-sm">
              {account.balance < 0 ? "Saldo a favor en la App" : "Deuda total"}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {money.format(Math.abs(account.balance))}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Incluye compras nuevas y cuotas futuras
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Crédito disponible</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {money.format(available)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Límite {money.format(Number(account.credit_limit ?? 0))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Próximo corte</p>
            <p className="mt-1 text-xl font-semibold">
              {date(props.firstClose)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Día {account.statement_closing_day} de cada mes
            </p>
          </div>
        </div>
        <div
          className="bg-muted relative mt-5 h-1.5 overflow-hidden rounded-full"
          aria-label={`${Math.round(usage)}% del límite utilizado`}
        >
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${usage}%` }}
          />
        </div>
      </header>
      <section
        className={`bg-card space-y-5 rounded-3xl border p-5 sm:p-7 ${settled ? "border-income/30" : overdue ? "border-destructive/40" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarDays className="text-muted-foreground size-5" />
            Este corte · {date(cut.closesOn)}
          </h2>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${settled ? "bg-income/15 text-income" : overdue ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}
          >
            {settled ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <Clock3 className="size-3.5" />
            )}
            {settled
              ? "Corte saldado"
              : !cut.confirmed
                ? "Por confirmar con el banco"
                : overdue
                  ? "Vencido"
                  : cut.bank?.status === "partial"
                    ? "Pago parcial"
                    : "Pendiente"}
          </span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">
              {cut.confirmed
                ? "Pendiente según el banco"
                : "Pago estimado por la App"}
            </p>
            <p
              className={`mt-1 text-4xl font-semibold tracking-tight tabular-nums ${settled ? "text-income" : ""}`}
            >
              {money.format(cut.unpaid)}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {settled
                ? "Ya cubriste el pago de contado de este corte y sus cuotas vinculadas."
                : `${cut.confirmed ? "Fecha límite" : "Fecha estimada"}: ${date(cut.dueOn)}`}
            </p>
          </div>
          <div className="bg-muted/40 rounded-2xl p-4">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {cut.confirmed
                  ? "Pago de contado del banco"
                  : "Total calculado al corte"}
              </span>
              <strong>{money.format(cut.bank?.bankDue ?? cut.appTotal)}</strong>
            </div>
            {cut.bank && (
              <>
                <div className="mt-3 flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Pagado a este corte
                  </span>
                  <strong className="text-income">
                    {money.format(cut.bank.paid)}
                  </strong>
                </div>
                <progress
                  aria-label="Pago del corte"
                  max={Math.max(1, cut.bank.bankDue)}
                  value={cut.bank.paid}
                  className="accent-primary mt-3 h-2 w-full"
                />
              </>
            )}
            <p className="text-muted-foreground mt-3 text-xs">
              Las cuotas de este corte ya están incluidas. Las futuras siguen
              dentro de la deuda total.
            </p>
          </div>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            {!cut.confirmed ? (
              <button
                className={primary}
                onClick={() => setModal({ type: "statement" })}
              >
                <Pencil className="size-4" />
                Confirmar estado del banco
              </button>
            ) : canTransact && !settled ? (
              <button
                className={primary}
                onClick={() => setModal({ type: "payment" })}
              >
                <ArrowUpRight className="size-4" />
                Pagar este corte
              </button>
            ) : null}
            {cut.confirmed && (
              <button
                className={button}
                onClick={() =>
                  setModal({ type: "statement", statement: cut.bank })
                }
              >
                <Pencil className="size-4" />
                Revisar dato del banco
              </button>
            )}
            {canTransact && (settled || !cut.confirmed) && (
              <button
                className={button}
                onClick={() => setModal({ type: "payment" })}
              >
                Registrar otro pago
              </button>
            )}
          </div>
        )}
        <details className="border-t pt-3">
          <summary className="text-muted-foreground cursor-pointer text-sm">
            Ver comparación Banco / App
          </summary>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <p>
              Calculado por la App:{" "}
              <strong>{money.format(cut.appTotal)}</strong>
            </p>
            <p>
              {cut.confirmed ? (
                <>
                  Diferencia:{" "}
                  <strong>{money.format(cut.difference ?? 0)}</strong>
                </>
              ) : (
                "Falta el estado oficial del banco."
              )}
            </p>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            La diferencia puede corresponder a compras procesadas en otro corte.
            Se conserva para comparar; no es un segundo pago obligatorio ni
            ajusta tus movimientos.
          </p>
          {cut.bank?.note && <p className="mt-3 text-sm">{cut.bank.note}</p>}
        </details>
        {totalPending > cut.unpaid && (
          <p className="text-warning text-sm">
            Hay otros cortes pendientes. Total según el banco:{" "}
            {money.format(totalPending)}. Los pagos se aplican al corte más
            antiguo primero.
          </p>
        )}
      </section>
      <nav
        aria-label="Secciones de la tarjeta"
        className="bg-muted/40 grid grid-cols-2 gap-1 rounded-2xl p-1.5 sm:flex"
      >
        {[
          ["summary", "Resumen"],
          ["installments", `Cuotas (${active.length})`],
          ["history", "Historial"],
          ["movements", "Movimientos"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={section === value}
            onClick={() => setSection(value)}
            className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors ${section === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {section === "summary" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="bg-card rounded-2xl border p-5">
            <h2 className="font-semibold">Compras a plazos</h2>
            <p className="mt-3 text-2xl font-semibold">
              {active.length} planes activos
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {money.format(estimate.future)} en cuotas futuras. Se pagan cuando
              se incorporan a su corte.
            </p>
            <button
              className={`${button} mt-4`}
              onClick={() => setSection("installments")}
            >
              Ver cuotas y avance
            </button>
          </div>
          <div className="bg-card rounded-2xl border p-5">
            <h2 className="font-semibold">Tu último pago</h2>
            {payments[0] ? (
              <>
                <p className="mt-3 text-2xl font-semibold">
                  {money.format(payments[0].amount)}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {date(payments[0].date)} ·{" "}
                  {payments[0].sources.map((item) => item.name).join(" + ")}
                </p>
                <button
                  className={`${button} mt-4`}
                  onClick={() => setSection("history")}
                >
                  Ver historial de pagos
                </button>
              </>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Todavía no hay pagos registrados.
              </p>
            )}
          </div>
        </section>
      )}
      {section === "installments" && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Compras a plazos</h2>
            {editable && (
              <button
                className={primary}
                onClick={() => setModal({ type: "installment" })}
              >
                <Plus className="size-4" />
                Añadir compra a plazos
              </button>
            )}
          </div>
          {active.length ? (
            renderPlans(active)
          ) : (
            <p className="text-muted-foreground bg-card rounded-2xl border p-5">
              No tienes compras a plazos pendientes.
            </p>
          )}
          {finished.length > 0 && (
            <details>
              <summary className="text-income cursor-pointer py-2 text-sm font-medium">
                Planes finalizados ({finished.length})
              </summary>
              <div className="mt-3">{renderPlans(finished)}</div>
            </details>
          )}
        </section>
      )}
      {section === "history" && (
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Estados del banco</h2>
              {editable && (
                <button
                  className={button}
                  onClick={() => setModal({ type: "statement" })}
                >
                  Registrar estado
                </button>
              )}
            </div>
            {[...statements].reverse().map((item) => (
              <article key={item.id} className="bg-card rounded-2xl border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">Corte {date(item.closesOn)}</h3>
                  <span
                    className={
                      item.status === "settled"
                        ? "text-income text-sm"
                        : "text-warning text-sm"
                    }
                  >
                    {item.status === "settled"
                      ? "Saldado"
                      : item.status === "partial"
                        ? "Parcial"
                        : "Pendiente"}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  Fecha límite {date(item.dueOn)}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  {[
                    ["Banco", item.bankDue],
                    ["App", item.appTotal],
                    ["Pagado", item.paid],
                    ["Pendiente", item.unpaid],
                  ].map(([label, amount]) => (
                    <div key={String(label)}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {money.format(Number(amount))}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-muted-foreground mt-4 text-xs">
                  {item.installments.length
                    ? `${item.installments.filter((line) => line.status === "settled" && !line.needsReview).length} de ${item.installments.length} cuotas vinculadas cubiertas`
                    : "Sin cuotas vinculadas a este corte"}
                </p>
                {editable && (
                  <button
                    className="text-primary mt-3 inline-flex min-h-9 items-center gap-2 text-sm"
                    onClick={() =>
                      setModal({ type: "statement", statement: item })
                    }
                  >
                    <Pencil className="size-3.5" />
                    Corregir estado
                  </button>
                )}
              </article>
            ))}
            {!statements.length && (
              <p className="text-muted-foreground">
                Aún no has confirmado estados del banco.
              </p>
            )}
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Pagos registrados</h2>
            {payments.map((payment) => (
              <article
                key={payment.id}
                className="bg-card space-y-3 rounded-2xl border p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {money.format(payment.amount)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {date(payment.date)}
                    </p>
                  </div>
                  {editable && payment.canCorrect && (
                    <button
                      className={button}
                      onClick={() => setModal({ type: "payment", payment })}
                    >
                      <Pencil className="size-4" />
                      Corregir pago
                    </button>
                  )}
                </div>
                <ul className="space-y-1 text-sm">
                  {payment.sources.map((source) => (
                    <li key={source.id} className="flex justify-between gap-3">
                      <span className="min-w-0 break-words">{source.name}</span>
                      <strong className="shrink-0">
                        {money.format(source.amount)}
                      </strong>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  {payment.allocations.length
                    ? payment.allocations
                        .map(
                          (line) =>
                            `Corte ${date(statements.find((item) => item.id === line.statementId)!.closesOn)}: ${money.format(line.amount)}`,
                        )
                        .join(" · ")
                    : "Sin aplicar a un corte registrado"}
                </p>
              </article>
            ))}
            {!payments.length && (
              <p className="text-muted-foreground">
                Aún no hay pagos registrados.
              </p>
            )}
          </div>
        </section>
      )}
      {section === "movements" && props.movements}
      <Dialog
        open={Boolean(modal)}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1rem)] overflow-y-auto p-5 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {modal?.type === "statement"
                ? "Estado del banco"
                : modal?.type === "installment"
                  ? "Añadir compra a plazos"
                  : modal?.type === "settings"
                    ? "Configurar tarjeta"
                    : modal?.type === "payment" && modal.payment
                      ? "Corregir pago completo"
                      : "Pagar tarjeta"}
            </DialogTitle>
            <DialogDescription>
              Guarda los cambios sin salir de tu tarjeta.
            </DialogDescription>
          </DialogHeader>
          {modal?.type === "statement" && (
            <CardStatementForm
              key={modal.statement?.id ?? "new"}
              cardId={account.id}
              closesOn={modal.statement?.closesOn ?? estimate.closesOn}
              appTotal={modal.statement?.appTotal ?? estimate.balance}
              requestId={props.requestId}
              today={today}
              existing={modal.statement}
              onSuccess={saved}
            />
          )}
          {modal?.type === "payment" && (
            <CardPaymentForm
              key={modal.payment?.id ?? "new"}
              cardId={account.id}
              today={today}
              requestId={props.requestId}
              accounts={props.paymentAccounts}
              cardBalance={account.balance}
              due={cut.confirmed ? cut.unpaid : 0}
              statements={statements}
              payment={modal.payment}
              onSuccess={saved}
            />
          )}
          {modal?.type === "installment" && (
            <InstallmentForm
              cardId={account.id}
              today={today}
              lastClose={estimate.closesOn}
              firstClose={props.firstClose}
              requestId={props.requestId}
              categories={props.categories}
              canPurchase={canTransact}
              onSuccess={saved}
            />
          )}
          {modal?.type === "settings" && (
            <>
              <AccountForm account={account} onSuccess={saved} />
              <form action={archiveAccount}>
                <input name="id" type="hidden" value={account.id} />
                <button className="text-destructive min-h-11 text-sm underline">
                  Archivar tarjeta
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
