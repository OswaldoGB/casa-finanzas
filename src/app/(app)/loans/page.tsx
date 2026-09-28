import { ExportButtons } from "@/features/exports/components/export-buttons";
import { getLoans } from "@/features/loans/queries";
import {
  CreateLoanForm,
  EditLoanForm,
  RepayLoanForm,
  WriteOffLoanForm,
} from "@/features/loans/components/loan-forms";
import { formatUSD } from "@/lib/format";
import { organizeLoans, readLoanFilters } from "@/features/loans/filters";
import type { Loan } from "@/features/loans/schemas";
export const metadata = { title: "Préstamos" };
type LoansPageProps = {
  searchParams: Promise<{ filter?: string; sort?: string }>;
};

function LoanCard({
  loan,
  data,
}: {
  loan: Loan;
  data: Awaited<ReturnType<typeof getLoans>>;
}) {
  return (
    <article
      id={loan.id}
      className={`bg-card rounded-2xl border p-5 ${loan.overdue ? "border-destructive" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-semibold">{loan.debtor}</h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm">
            {loan.status === "paid"
              ? "Pagado"
              : loan.status === "written_off"
                ? "Incobrable"
                : loan.overdue
                  ? "Vencido"
                  : "Activo"}
          </span>
          {data.canOperate && loan.status !== "written_off" && (
            <details className="relative">
              <summary
                aria-label="Editar préstamo"
                title="Editar préstamo"
                className="bg-muted hover:bg-muted/70 cursor-pointer rounded-md px-2 py-1 text-sm"
              >
                ✎
              </summary>
              <div className="bg-card absolute top-9 right-0 z-10 w-80 rounded-xl border p-3 shadow-lg">
                <EditLoanForm loan={loan} accounts={data.sourceAccounts} />
              </div>
            </details>
          )}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold">{formatUSD(loan.pending)}</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Prestado {formatUSD(loan.lent)} · Recuperado {formatUSD(loan.recovered)}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        Fecha: {loan.date}
        {loan.expected_payment_date
          ? ` · Pago esperado: ${loan.expected_payment_date}`
          : ""}
      </p>
      {loan.source_account_name && (
        <p className="text-muted-foreground mt-2 text-xs">
          Origen: {loan.source_account_name}
          {loan.source_account_type === "credit_card"
            ? " · Tarjeta de crédito"
            : ""}
          {loan.already_recorded
            ? " · Ya incluido en el saldo al registrarlo"
            : ""}
        </p>
      )}
      {loan.notes && (
        <p className="mt-3 text-sm whitespace-pre-wrap">{loan.notes}</p>
      )}
      {loan.status === "active" && (
        <>
          {data.canOperate && loan.pending > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm">
                Registrar abono
              </summary>
              <div className="mt-3">
                <RepayLoanForm
                  loan={loan}
                  today={data.today}
                  accounts={data.depositAccounts}
                />
              </div>
            </details>
          )}
          {data.canEdit && <WriteOffLoanForm loan={loan} />}
        </>
      )}
    </article>
  );
}

export default async function LoansPage({ searchParams }: LoansPageProps) {
  const data = await getLoans();
  const { filter, sort } = readLoanFilters(await searchParams);
  const organized = organizeLoans(data.loans, filter, sort);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Préstamos otorgados</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          El dinero que prestas y lo que has recuperado.
        </p>
      </header>
      <ExportButtons target="loans" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            name: "Prestado",
            value: data.loans.reduce((n, l) => n + l.lent, 0),
          },
          {
            name: "Recuperado",
            value: data.loans.reduce((n, l) => n + l.recovered, 0),
          },
          {
            name: "Pendiente por cobrar",
            value: data.loans.reduce((n, l) => n + l.pending, 0),
          },
        ].map((item) => (
          <section key={item.name} className="bg-card rounded-2xl border p-5">
            <h2 className="text-muted-foreground text-sm">{item.name}</h2>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {formatUSD(item.value)}
            </p>
          </section>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4" aria-label="Préstamos">
          <form className="bg-card flex flex-wrap items-end gap-3 rounded-2xl border p-4">
            <label className="grid gap-1 text-sm" htmlFor="loan-filter">
              Ver
              <select
                id="loan-filter"
                name="filter"
                defaultValue={filter}
                className="border-input bg-background h-10 rounded-lg border px-3 text-sm"
              >
                <option value="all">Pendientes</option>
                <option value="active">Activos sin abonos</option>
                <option value="partial">Parciales</option>
                <option value="paid">Pagados</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm" htmlFor="loan-sort">
              Ordenar por
              <select
                id="loan-sort"
                name="sort"
                defaultValue={sort}
                className="border-input bg-background h-10 rounded-lg border px-3 text-sm"
              >
                <option value="date_desc">Más recientes</option>
                <option value="date_asc">Más antiguos</option>
                <option value="amount_desc">Mayor monto</option>
                <option value="amount_asc">Menor monto</option>
              </select>
            </label>
            <button className="bg-primary text-primary-foreground h-10 rounded-lg px-4 text-sm font-medium">
              Aplicar
            </button>
          </form>
          <div className="flex items-center justify-between gap-3 pt-2">
            <h2 className="font-semibold">Por cobrar</h2>
            <span className="text-muted-foreground text-sm">
              {organized.current.length}
            </span>
          </div>
          {organized.current.length ? (
            organized.current.map((loan) => (
              <LoanCard key={loan.id} loan={loan} data={data} />
            ))
          ) : (
            <p className="bg-card text-muted-foreground rounded-2xl border p-6 text-sm">
              No hay préstamos en este filtro.
            </p>
          )}
          {(filter === "all" || filter === "paid") && (
            <>
              <div className="flex items-center justify-between gap-3 pt-4">
                <h2 className="font-semibold">Préstamos pagados</h2>
                <span className="text-muted-foreground text-sm">
                  {organized.paid.length}
                </span>
              </div>
              {organized.paid.length ? (
                organized.paid.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} data={data} />
                ))
              ) : (
                <p className="bg-card text-muted-foreground rounded-2xl border p-6 text-sm">
                  Aún no hay préstamos pagados.
                </p>
              )}
            </>
          )}
        </section>
        <aside className="bg-card rounded-2xl border p-5">
          <h2 className="mb-4 font-semibold">Nuevo préstamo</h2>
          {data.canOperate ? (
            <CreateLoanForm
              today={data.today}
              sourceAccounts={data.sourceAccounts}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Necesitas permiso de edición en préstamos y movimientos para
              registrar dinero prestado.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
