import { ExportButtons } from "@/features/exports/components/export-buttons";
import Link from "next/link";
import { QuickEntry } from "@/features/transactions/components/quick-entry";
import { BulkToolbar } from "@/features/transactions/components/bulk-toolbar";
import { confirmTransaction } from "@/features/transactions/actions";
import {
  getTransactionOptions,
  getTransactions,
  type Filters,
} from "@/features/transactions/queries";

export const metadata = { title: "Movimientos" };
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const dateLabel = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const label = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  loan_out: "Préstamo",
  loan_repayment: "Abono",
  goal_contribution: "Aporte",
  goal_withdrawal: "Retiro",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const first = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";
  const filters: Filters = {
    from: first("from"),
    to: first("to"),
    type: first("type"),
    account: first("account"),
    category: first("category"),
    method: first("method"),
    user: first("user"),
    project: first("project"),
    q: first("q"),
  };
  const [transactions, options] = await Promise.all([
    getTransactions(filters),
    getTransactionOptions(),
  ]);
  const days = Map.groupBy(transactions, (item) => item.date);
  const selectClass =
    "border-input bg-background h-10 rounded-lg border px-2 text-sm";
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Movimientos</h1>
          <p className="text-muted-foreground text-sm">
            Ingresos, gastos y transferencias del hogar.
          </p>
        </div>
        {options.canEdit && (
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <QuickEntry options={options} />
            </div>
            <Link
              href="/transactions/new"
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
            >
              Nuevo movimiento
            </Link>
          </div>
        )}
      </header>
      <ExportButtons target="transactions" />
      <form className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-xs">
          Desde
          <input
            className={selectClass}
            type="date"
            name="from"
            defaultValue={filters.from}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Hasta
          <input
            className={selectClass}
            type="date"
            name="to"
            defaultValue={filters.to}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Tipo
          <select
            className={selectClass}
            name="type"
            defaultValue={filters.type}
          >
            <option value="">Todos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
            <option value="transfer">Transferencias</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Cuenta
          <select
            className={selectClass}
            name="account"
            defaultValue={filters.account}
          >
            <option value="">Todas</option>
            {options.accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Categoría
          <select
            className={selectClass}
            name="category"
            defaultValue={filters.category}
          >
            <option value="">Todas</option>
            {options.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Método
          <select
            className={selectClass}
            name="method"
            defaultValue={filters.method}
          >
            <option value="">Todos</option>
            {options.methods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Usuario
          <select
            className={selectClass}
            name="user"
            defaultValue={filters.user}
          >
            <option value="">Todos</option>
            {options.members.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Proyecto
          <select
            name="project"
            defaultValue={filters.project}
            className={selectClass}
          >
            <option value="">Todos</option>
            {options.projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Buscar
          <input
            className={selectClass}
            name="q"
            defaultValue={filters.q}
            placeholder="Descripción"
          />
        </label>
        <button className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2 text-sm font-medium sm:col-span-2 lg:col-span-4">
          Aplicar filtros
        </button>
      </form>
      {options.canEdit && transactions.length > 0 && (
        <BulkToolbar categories={options.categories} />
      )}
      {transactions.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed px-6 py-14 text-center">
          <p className="font-medium">No hay movimientos con estos filtros.</p>
          {options.canEdit && (
            <Link
              className="text-primary mt-2 inline-block text-sm underline"
              href="/transactions/new"
            >
              Registrar un movimiento
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {[...days].map(([day, items]) => {
            const income = items
              .filter(
                (item) => item.status === "posted" && item.type === "income",
              )
              .reduce((sum, item) => sum + Number(item.amount), 0);
            const expense = items
              .filter(
                (item) => item.status === "posted" && item.type === "expense",
              )
              .reduce((sum, item) => sum + Number(item.amount), 0);
            return (
              <section
                key={day}
                className="bg-card overflow-hidden rounded-2xl border"
              >
                <header className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <h2 className="font-medium capitalize">
                    {dateLabel.format(new Date(`${day}T00:00:00Z`))}
                  </h2>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    Ingresos {money.format(income)} · Gastos{" "}
                    {money.format(expense)}
                  </p>
                </header>
                <ExportButtons target="transactions" />
                <ul className="divide-y">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      {options.canEdit && (
                        <input
                          type="checkbox"
                          name="ids"
                          value={item.id}
                          form="bulk-transactions"
                          aria-label={`Seleccionar ${item.description || label[item.type]}`}
                          className="size-4 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/transactions/${item.id}`}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {item.description || label[item.type]}
                        </Link>
                        <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                          <span
                            className={`rounded-full px-1.5 py-0.5 font-medium ${item.type === "income" || item.type === "loan_repayment" ? "bg-income/15 text-income" : item.type === "expense" ? "bg-destructive/15 text-destructive" : item.type === "loan_out" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}
                          >
                            {label[item.type]}
                          </span>
                          {item.status === "pending" ? "Pendiente ·" : ""}
                          {options.members.find(
                            (member) => member.id === item.created_by,
                          )?.full_name ?? "Usuario"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`text-sm font-semibold tabular-nums ${item.type === "income" || item.type === "loan_repayment" ? "text-income" : item.type === "expense" ? "text-destructive" : item.type === "loan_out" ? "text-warning" : "text-info"}`}
                        >
                          {item.type === "expense" || item.type === "loan_out"
                            ? "−"
                            : item.type === "income" ||
                                item.type === "loan_repayment"
                              ? "+"
                              : ""}
                          {money.format(Number(item.amount))}
                        </span>
                        {item.status === "pending" && options.canEdit && (
                          <form action={confirmTransaction}>
                            <input type="hidden" name="id" value={item.id} />
                            <button className="text-primary text-xs font-medium underline">
                              Confirmar
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      {transactions.length === 500 && (
        <p className="text-muted-foreground text-center text-xs">
          Se muestran los 500 movimientos más recientes. Acota las fechas para
          ver otros.
        </p>
      )}
    </div>
  );
}
