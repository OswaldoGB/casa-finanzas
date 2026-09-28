import { ExportButtons } from "@/features/exports/components/export-buttons";
import { getLoans } from "@/features/loans/queries";
import {
  CreateLoanForm,
  RepayLoanForm,
  WriteOffLoanForm,
} from "@/features/loans/components/loan-forms";
import { formatUSD } from "@/lib/format";
export const metadata = { title: "Préstamos" };
export default async function LoansPage() {
  const data = await getLoans();
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
          {data.loans.length ? (
            data.loans.map((loan) => (
              <article
                key={loan.id}
                id={loan.id}
                className={`bg-card rounded-2xl border p-5 ${loan.overdue ? "border-destructive" : ""}`}
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <h2 className="font-semibold">{loan.debtor}</h2>
                  <span className="text-sm">
                    {loan.status === "paid"
                      ? "Pagado"
                      : loan.status === "written_off"
                        ? "Incobrable"
                        : loan.overdue
                          ? "Vencido"
                          : "Activo"}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold">
                  {formatUSD(loan.pending)}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Prestado {formatUSD(loan.lent)} · Recuperado{" "}
                  {formatUSD(loan.recovered)}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Fecha: {loan.date}
                  {loan.expected_payment_date
                    ? ` · Pago esperado: ${loan.expected_payment_date}`
                    : ""}
                </p>
                {loan.notes && (
                  <p className="mt-3 text-sm whitespace-pre-wrap">
                    {loan.notes}
                  </p>
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
                            accounts={data.accounts}
                          />
                        </div>
                      </details>
                    )}
                    {data.canEdit && <WriteOffLoanForm loan={loan} />}
                  </>
                )}
              </article>
            ))
          ) : (
            <p className="bg-card text-muted-foreground rounded-2xl border p-8">
              Aún no has registrado préstamos.
            </p>
          )}
        </section>
        <aside className="bg-card rounded-2xl border p-5">
          <h2 className="mb-4 font-semibold">Nuevo préstamo</h2>
          {data.canOperate ? (
            <CreateLoanForm today={data.today} accounts={data.accounts} />
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
