import { NewLoanDialog } from "@/features/loans/components/new-loan-dialog";
import { ExportButtons } from "@/features/exports/components/export-buttons";
import { getLoans } from "@/features/loans/queries";
import {
  CreateLoanForm,
  DebtForm,
  EditLoanForm,
  PayDebtForm,
  RepayLoanForm,
  WriteOffLoanForm,
} from "@/features/loans/components/loan-forms";
import Link from "next/link";
import { formatUSD } from "@/lib/format";
import { decimalToCents } from "@/features/finance/balances";
import { FormSelect } from "@/components/ui/form-select";
import { ActionForm } from "@/features/projects/components/action-form";
import { setLoanPerson } from "@/features/loans/actions";
import { LoanPersonForm, PersonAvatar } from "@/features/loans/components/person-form";
import { organizeLoans, readLoanFilters } from "@/features/loans/filters";
import type { Loan } from "@/features/loans/schemas";
export const metadata = { title: "Préstamos y deudas" };
type LoansPageProps = {
  searchParams: Promise<{ filter?: string; sort?: string; tab?: string }>;
};

function LoanCard({
  loan,
  data,
}: {
  loan: Loan;
  data: Awaited<ReturnType<typeof getLoans>>;
}) {
  const owed = loan.direction === "borrowed";
  const person = data.people.find((entry) => entry.id === loan.person_id);
  return (
    <article
      id={loan.id}
      className={`bg-card rounded-2xl border p-5 ${loan.overdue ? "border-destructive" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 font-semibold">
          {person && <PersonAvatar emoji={person.emoji} color={person.color} />}
          <span className="min-w-0 wrap-anywhere">{person?.name ?? loan.debtor}</span>
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm">
            {loan.status === "paid"
              ? owed
                ? "Pagada"
                : "Pagado"
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
                {owed ? (
                  <DebtForm debt={loan} today={data.today} />
                ) : (
                  <EditLoanForm loan={loan} accounts={data.sourceAccounts} />
                )}
              </div>
            </details>
          )}
        </div>
      </div>
      {person && person.name !== loan.debtor && (
        <p className="text-muted-foreground mt-1 text-xs">Nombre registrado: {loan.debtor}</p>
      )}
      <p className="mt-3 text-2xl font-semibold">{formatUSD(loan.pending)}</p>
      <p className="text-muted-foreground mt-1 text-sm">
        {owed
          ? `Te prestó ${formatUSD(loan.amount)} · Abonado ${formatUSD(loan.recovered)}`
          : `Prestado ${formatUSD(loan.lent)} · Recuperado ${formatUSD(loan.recovered)}`}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        Fecha: {loan.date}
        {loan.expected_payment_date
          ? ` · ${owed ? "Pagar antes de" : "Pago esperado"}: ${loan.expected_payment_date}`
          : ""}
      </p>
      {!owed && loan.source_account_name && (
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
      {data.canEdit && data.people.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm">{person ? "Cambiar persona vinculada" : "Vincular a una persona"}</summary>
          <ActionForm action={setLoanPerson} label="Guardar vínculo" className="mt-3 max-w-sm space-y-2">
            <input type="hidden" name="id" value={loan.id} />
            <label htmlFor={`person-${loan.id}`} className="text-sm">Persona del catálogo</label>
            <FormSelect
              key={loan.person_id ?? "manual"}
              id={`person-${loan.id}`}
              name="person_id"
              defaultValue={loan.person_id ?? "manual"}
              placeholder="Elige una persona"
              options={[
                { value: "manual", label: "Sin vincular" },
                ...data.people.map(({ id, name, emoji, color }) => ({
                  value: id, label: name, leading: <PersonAvatar emoji={emoji} color={color} />,
                })),
              ]}
            />
          </ActionForm>
        </details>
      )}
      {loan.status === "active" && (
        <>
          {data.canOperate && loan.pending > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm">
                Registrar abono
              </summary>
              <div className="mt-3">
                {owed ? (
                  <PayDebtForm debt={loan} today={data.today} accounts={data.sourceAccounts} />
                ) : (
                  <RepayLoanForm
                    loan={loan}
                    today={data.today}
                    accounts={data.depositAccounts}
                  />
                )}
              </div>
            </details>
          )}
          {data.canEdit && !owed && <WriteOffLoanForm loan={loan} />}
        </>
      )}
    </article>
  );
}

function LoansByPerson({ data }: { data: Awaited<ReturnType<typeof getLoans>> }) {
  const unlinked = data.loans.filter((loan) => !loan.person_id);
  return (
    <section aria-label="Préstamos por persona" className="space-y-4">
      {data.canEdit && (
        <details className="bg-card rounded-2xl border p-4">
          <summary className="cursor-pointer font-semibold">Agregar persona</summary>
          <LoanPersonForm />
        </details>
      )}
      {data.people.length === 0 && <p className="text-muted-foreground text-sm">Todavía no hay personas en el catálogo.</p>}
      {data.people.map((person) => {
        const loans = data.loans.filter((loan) => loan.person_id === person.id);
        const pending = (direction: Loan["direction"]) =>
          loans.reduce((total, loan) => total + (loan.direction === direction ? decimalToCents(loan.pending) : 0), 0) / 100;
        return (
          <details key={person.id} className="bg-card rounded-2xl border p-4">
            <summary className="cursor-pointer">
              <span className="inline-flex items-center gap-2 align-middle font-semibold">
                <PersonAvatar emoji={person.emoji} color={person.color} />
                {person.name}
              </span>
              <span className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>Me debe <strong className="text-foreground tabular-nums">{formatUSD(pending("lent"))}</strong></span>
                <span>Le debo <strong className="text-foreground tabular-nums">{formatUSD(pending("borrowed"))}</strong></span>
              </span>
            </summary>
            <div className="mt-4 space-y-3">
              {data.canEdit && (
                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm">Cambiar emoji y color</summary>
                  <LoanPersonForm person={person} />
                </details>
              )}
              {loans.length ? loans.map((loan) => <LoanCard key={loan.id} loan={loan} data={data} />) : (
                <p className="text-muted-foreground text-sm">Todavía no hay préstamos vinculados.</p>
              )}
            </div>
          </details>
        );
      })}
      {unlinked.length > 0 && (
        <details className="bg-card rounded-2xl border p-4">
          <summary className="cursor-pointer font-semibold">Sin persona vinculada ({unlinked.length})</summary>
          <div className="mt-4 space-y-3">
            {unlinked.map((loan) => <LoanCard key={loan.id} loan={loan} data={data} />)}
          </div>
        </details>
      )}
    </section>
  );
}

export default async function LoansPage({ searchParams }: LoansPageProps) {
  const data = await getLoans();
  const params = await searchParams;
  const { filter, sort } = readLoanFilters(params);
  const owed = params.tab === "debo";
  const byPerson = params.tab === "personas";
  const loans = data.loans.filter((l) => l.direction === (owed ? "borrowed" : "lent"));
  const organized = organizeLoans(loans, filter, sort);
  const tab = (value: string, label: string, active: boolean) => (
    <Link
      href={value ? `/loans?tab=${value}` : "/loans"}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-4 py-1.5 text-sm ${active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Préstamos y deudas</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {byPerson ? "Consulta los saldos y préstamos de cada persona." : owed
            ? "Lo que te prestaron o pagaron por ti, y lo que vas abonando."
            : "El dinero que prestas y lo que has recuperado."}
        </p>
      </header>
      <nav aria-label="Préstamos y deudas" className="bg-muted inline-flex flex-wrap rounded-xl p-1">
        {tab("", "Me deben", !owed && !byPerson)}
        {tab("debo", "Debo", owed)}
        {tab("personas", "Por persona", byPerson)}
      </nav>
        <div className="mt-4">
        <NewLoanDialog title={owed ? "Nueva deuda" : "Nuevo préstamo"}>
          {owed ? (
            data.canEdit ? (
              <DebtForm today={data.today} people={data.people} />
            ) : (
              <p className="text-muted-foreground text-sm">Necesitas permiso de edición en préstamos.</p>
            )
          ) : data.canOperate ? (
            <CreateLoanForm
              today={data.today}
              sourceAccounts={data.sourceAccounts}
              people={data.people}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Necesitas permiso de edición en préstamos y movimientos para
              registrar dinero prestado.
            </p>
          )}
        </NewLoanDialog>
        </div>
      {byPerson ? <LoansByPerson data={data} /> : <>
      <ExportButtons target="loans" />
      <div className="stagger grid gap-3 sm:grid-cols-3">
        {[
          {
            name: owed ? "Me prestaron" : "Prestado",
            value: loans.reduce((n, l) => n + (owed ? l.amount : l.lent), 0),
          },
          {
            name: owed ? "Abonado" : "Recuperado",
            value: loans.reduce((n, l) => n + l.recovered, 0),
          },
          {
            name: owed ? "Pendiente por pagar" : "Pendiente por cobrar",
            value: loans.reduce((n, l) => n + l.pending, 0),
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
      <div>
        <section className="space-y-4" aria-label="Préstamos">
          <form className="bg-card flex flex-wrap items-end gap-3 rounded-2xl border p-4">
            {owed && <input type="hidden" name="tab" value="debo" />}
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
            <h2 className="font-semibold">{owed ? "Por pagar" : "Por cobrar"}</h2>
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
              {owed ? "No debes nada en este filtro." : "No hay préstamos en este filtro."}
            </p>
          )}
          {(filter === "all" || filter === "paid") && (
            <details className="bg-card rounded-2xl border p-5">
              <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold">
                <span>{owed ? "Deudas pagadas e incobrables" : "Préstamos pagados e incobrables"}</span>
                <span className="text-muted-foreground text-sm">
                  {organized.paid.length}
                </span>
              </summary>
              <div className="mt-4 space-y-4">
              {organized.paid.length ? (
                organized.paid.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} data={data} />
                ))
              ) : (
                <p className="bg-card text-muted-foreground rounded-2xl border p-6 text-sm">
                  {owed ? "Aún no hay deudas pagadas." : "Aún no hay préstamos pagados."}
                </p>
              )}
              </div>
            </details>
          )}
        </section>

      </div>
      </>}
    </div>
  );
}
